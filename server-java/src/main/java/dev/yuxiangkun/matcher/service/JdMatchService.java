package dev.yuxiangkun.matcher.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.yuxiangkun.matcher.dto.MatchRequest;
import dev.yuxiangkun.matcher.dto.MatchResponse;
import dev.yuxiangkun.matcher.entity.MatchRecord;
import dev.yuxiangkun.matcher.repository.MatchRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.List;

/**
 * 核心服务：JD 匹配流水线。
 *
 * 请求 -> 限流检查 -> 缓存查询（Redis/内存，按 JD 内容哈希）
 *      -> LLM 分析（无 key 或失败时降级规则引擎）
 *      -> 结果持久化（MySQL/H2）-> 返回。
 */
@Service
public class JdMatchService {

    private static final Logger log = LoggerFactory.getLogger(JdMatchService.class);

    private final KvCache cache;
    private final LlmClient llm;
    private final RuleMatchEngine ruleEngine;
    private final ResumeProfileService profile;
    private final MatchRecordRepository repository;
    private final ObjectMapper objectMapper;

    private final long cacheTtlSeconds;
    private final long requestsPerMinute;

    public JdMatchService(
            KvCache cache,
            LlmClient llm,
            RuleMatchEngine ruleEngine,
            ResumeProfileService profile,
            MatchRecordRepository repository,
            ObjectMapper objectMapper,
            @Value("${app.cache.cache-ttl-minutes:10}") long cacheTtlMinutes,
            @Value("${app.rate-limit.requests-per-minute:20}") long requestsPerMinute) {
        this.cache = cache;
        this.llm = llm;
        this.ruleEngine = ruleEngine;
        this.profile = profile;
        this.repository = repository;
        this.objectMapper = objectMapper;
        this.cacheTtlSeconds = Duration.ofMinutes(cacheTtlMinutes).toSeconds();
        this.requestsPerMinute = requestsPerMinute;
    }

    /** 固定窗口限流：超限抛异常，由全局异常处理器转 429 */
    public void checkRateLimit(String clientKey) {
        long count = cache.increment("ratelimit:" + clientKey, 60);
        if (count > requestsPerMinute) {
            throw new RateLimitException("请求过于频繁，请一分钟后再试");
        }
    }

    public MatchResponse match(MatchRequest request, String clientKey) {
        checkRateLimit(clientKey);

        String normalized = request.jdText().strip();
        String cacheKey = "jdmatch:" + sha256(normalized);

        // 1. 缓存命中直接返回
        String cached = cache.get(cacheKey);
        if (cached != null) {
            MatchResponse response = fromJson(cached);
            if (response != null) {
                return new MatchResponse(response.id(), response.totalScore(), response.matchedSkills(),
                        response.missingSkills(), response.summary(), response.engine(), true, response.createdAt());
            }
        }

        // 2. LLM 分析，失败降级规则引擎
        String engine = "llm";
        int totalScore;
        List<String> matched;
        List<String> missing;
        String summary;
        if (llm.isEnabled()) {
            try {
                AnalysisResult result = analyzeWithLlm(normalized);
                totalScore = result.score;
                matched = result.matched;
                missing = result.missing;
                summary = result.summary;
            } catch (Exception e) {
                log.warn("LLM 分析失败，降级规则引擎: {}", e.getMessage());
                engine = "rule";
                RuleMatchEngine.RuleResult result = ruleEngine.analyze(normalized);
                totalScore = result.totalScore();
                matched = result.matchedSkills();
                missing = result.missingSkills();
                summary = result.summary();
            }
        } else {
            engine = "rule";
            RuleMatchEngine.RuleResult result = ruleEngine.analyze(normalized);
            totalScore = result.totalScore();
            matched = result.matchedSkills();
            missing = result.missingSkills();
            summary = result.summary();
        }

        // 3. 持久化 + 写缓存
        MatchRecord record = new MatchRecord();
        record.setJdText(normalized.length() > 2000 ? normalized.substring(0, 2000) : normalized);
        record.setTotalScore(totalScore);
        record.setMatchedSkills(String.join(",", matched));
        record.setMissingSkills(String.join(",", missing));
        record.setSummary(summary);
        record.setEngine(engine);
        record.setCacheHit(false);
        MatchRecord saved = repository.save(record);

        MatchResponse response = new MatchResponse(saved.getId(), totalScore, matched, missing, summary, engine,
                false, Instant.now());
        cache.put(cacheKey, toJson(response), cacheTtlSeconds);
        return response;
    }

    public List<MatchResponse> history() {
        return repository.findTop20ByOrderByCreatedAtDesc().stream()
                .map(r -> new MatchResponse(
                        r.getId(),
                        r.getTotalScore(),
                        split(r.getMatchedSkills()),
                        split(r.getMissingSkills()),
                        r.getSummary(),
                        r.getEngine(),
                        r.isCacheHit(),
                        r.getCreatedAt()))
                .toList();
    }

    private record AnalysisResult(int score, List<String> matched, List<String> missing, String summary) {}

    /**
     * LLM 结构化分析：要求模型按 JSON 返回，
     * 解析失败抛异常走降级，保证接口永远有可用结果。
     */
    private AnalysisResult analyzeWithLlm(String jdText) {
        String systemPrompt = """
                你是资深技术招聘分析师。根据候选人技能画像和职位描述（JD）做匹配分析。
                候选人技能画像：%s
                严格按以下 JSON 格式返回，不要输出任何其他内容：
                {"score": 0-100整数, "matched": ["命中的技能", ...], "missing": ["JD要求但候选人缺失的技能", ...], "summary": "两三句话的中文分析结论，指出匹配亮点与最值得补齐的1-2项"}
                """.formatted(profile.skillsText());
        String content = llm.chat(systemPrompt, "职位描述：\n" + jdText);

        String json = extractJson(content);
        try {
            JsonNode node = objectMapper.readTree(json);
            int score = Math.min(100, Math.max(0, node.path("score").asInt(0)));
            List<String> matched = readStringArray(node.path("matched"));
            List<String> missing = readStringArray(node.path("missing"));
            String summary = node.path("summary").asText("");
            return new AnalysisResult(score, matched, missing, summary);
        } catch (Exception e) {
            // JSON 解析失败但拿到了文本：尽力提取分数与原文
            int score = RuleMatchEngine.parseScore(content);
            return new AnalysisResult(score, List.of(), List.of(), content.strip());
        }
    }

    private static String extractJson(String content) {
        int start = content.indexOf('{');
        int end = content.lastIndexOf('}');
        return (start >= 0 && end > start) ? content.substring(start, end + 1) : content;
    }

    private static List<String> readStringArray(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (node.isArray()) {
            node.forEach(item -> values.add(item.asText()));
        }
        return values;
    }

    private String toJson(MatchResponse response) {
        try {
            return objectMapper.writeValueAsString(response);
        } catch (Exception e) {
            return null;
        }
    }

    private MatchResponse fromJson(String json) {
        try {
            return objectMapper.readValue(json, MatchResponse.class);
        } catch (Exception e) {
            return null;
        }
    }

    private static List<String> split(String joined) {
        if (joined == null || joined.isBlank()) {
            return List.of();
        }
        return List.of(joined.split(","));
    }

    private static String sha256(String text) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(text.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            return String.valueOf(text.hashCode());
        }
    }

    public static class RateLimitException extends RuntimeException {
        public RateLimitException(String message) {
            super(message);
        }
    }
}
