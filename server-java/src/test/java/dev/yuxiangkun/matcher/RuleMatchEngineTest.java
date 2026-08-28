package dev.yuxiangkun.matcher;

import dev.yuxiangkun.matcher.service.ResumeProfileService;
import dev.yuxiangkun.matcher.service.RuleMatchEngine;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * 规则引擎单元测试：命中识别、评分、降级文本生成。
 */
class RuleMatchEngineTest {

    private final RuleMatchEngine engine = new RuleMatchEngine(new ResumeProfileService());

    @Test
    void 应识别JD中的技术关键词() {
        var result = engine.analyze("岗位要求：精通 Java 和 Spring Boot，熟悉 MySQL、Redis 缓存，会用 Docker 部署。");

        assertTrue(result.matchedSkills().contains("Java"));
        assertTrue(result.matchedSkills().contains("Spring Boot"));
        assertTrue(result.matchedSkills().contains("MySQL"));
        assertTrue(result.matchedSkills().contains("Redis"));
        assertTrue(result.matchedSkills().contains("Docker"));
        assertFalse(result.matchedSkills().contains("Vue"));
    }

    @Test
    void 评分为零到一百() {
        var all = engine.analyze("要求精通 " + String.join(" ",
                new ResumeProfileService().skillSynonyms().values().stream()
                        .flatMap(java.util.List::stream).toList()));
        assertEquals(100, all.totalScore());

        var none = engine.analyze("招聘厨师一名，会做川菜。");
        assertEquals(0, none.totalScore());
        assertEquals(new ResumeProfileService().allSkills().size(), none.missingSkills().size());
    }

    @Test
    void 分析结论应包含命中与缺失信息() {
        var result = engine.analyze("需要 Python 和 FastAPI 后端开发经验");
        assertTrue(result.summary().contains("命中"));
        assertTrue(result.summary().contains("Python"));
    }

    @Test
    void 分数解析容错() {
        assertEquals(85, RuleMatchEngine.parseScore("匹配度 85 分"));
        assertEquals(92, RuleMatchEngine.parseScore("score: 92/100"));
        assertEquals(70, RuleMatchEngine.parseScore("大概 70 的匹配度"));
        assertEquals(0, RuleMatchEngine.parseScore("没有分数"));
    }
}
