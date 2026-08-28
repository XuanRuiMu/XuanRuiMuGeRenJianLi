package dev.yuxiangkun.matcher.dto;

import java.time.Instant;
import java.util.List;

/**
 * 匹配结果响应。
 */
public record MatchResponse(
        long id,
        int totalScore,
        List<String> matchedSkills,
        List<String> missingSkills,
        String summary,
        String engine,
        boolean cacheHit,
        Instant createdAt
) {}
