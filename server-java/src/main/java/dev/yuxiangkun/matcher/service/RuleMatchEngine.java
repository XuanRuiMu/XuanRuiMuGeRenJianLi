package dev.yuxiangkun.matcher.service;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * 本地规则匹配引擎：JD 关键词扫描 + 加权评分。
 * 作为 LLM 不可用（无 key / 超时 / 报错）时的降级方案，
 * 保证服务在任何环境下都可用（可观测的优雅降级，而非直接 500）。
 */
@Service
public class RuleMatchEngine {

    private final ResumeProfileService profile;

    public RuleMatchEngine(ResumeProfileService profile) {
        this.profile = profile;
    }

    public record RuleResult(int totalScore, List<String> matchedSkills, List<String> missingSkills, String summary) {}

    public RuleResult analyze(String jdText) {
        String normalized = jdText.toLowerCase();
        Map<String, List<String>> synonyms = profile.skillSynonyms();

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        for (Map.Entry<String, List<String>> entry : synonyms.entrySet()) {
            boolean hit = entry.getValue().stream().anyMatch(word -> normalized.contains(word.toLowerCase()));
            if (hit) {
                matched.add(entry.getKey());
            } else {
                missing.add(entry.getKey());
            }
        }

        int total = synonyms.isEmpty() ? 0 : Math.round(matched.size() * 100f / synonyms.size());
        String summary = String.format(
                "基于本地规则引擎分析：JD 提到的技术与你的技能画像匹配 %d 项 / 共 %d 项。"
                        + "命中：%s。建议优先补齐：%s。",
                matched.size(), synonyms.size(),
                String.join("、", matched),
                missing.isEmpty() ? "无，匹配度很高" : String.join("、", missing.subList(0, Math.min(3, missing.size()))));

        return new RuleResult(total, matched, missing, summary);
    }

    /** 从 LLM 自由文本中提取 0-100 的整数分（容错解析） */
    public static int parseScore(String text) {
        var matcher = Pattern.compile("(\\d{1,3})\\s*(?:分|/100|\\/100)").matcher(text);
        if (matcher.find()) {
            return Math.min(100, Math.max(0, Integer.parseInt(matcher.group(1))));
        }
        var bare = Pattern.compile("\\b(\\d{2,3})\\b").matcher(text);
        if (bare.find()) {
            return Math.min(100, Math.max(0, Integer.parseInt(bare.group(1))));
        }
        return 0;
    }
}
