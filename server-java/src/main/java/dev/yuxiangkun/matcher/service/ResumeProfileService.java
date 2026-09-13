package dev.yuxiangkun.matcher.service;

import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 候选人技能画像：与个人简历完全对应的技术栈清单（含同义词）。
 * 规则引擎与 LLM 提示词都从这里取数据，保证口径一致。
 */
@Service
public class ResumeProfileService {

    /** 技能 -> JD 中的同义写法（命中任意一个即算掌握该技能） */
    private static final Map<String, List<String>> SKILL_SYNONYMS = buildSkills();

    private static Map<String, List<String>> buildSkills() {
        Map<String, List<String>> skills = new LinkedHashMap<>();
        skills.put("AI Agent 开发", List.of("agent", "智能体", "多智能体", "multi-agent", "编排"));
        skills.put("RAG 检索增强", List.of("rag", "检索增强", "向量检索", "embedding", "知识库"));
        skills.put("MCP 协议", List.of("mcp", "model context protocol", "工具调用", "function calling"));
        skills.put("Prompt 工程", List.of("prompt", "提示词"));
        skills.put("Python", List.of("python"));
        skills.put("FastAPI", List.of("fastapi", "异步框架"));
        skills.put("Java", List.of("java", "jdk"));
        skills.put("Spring Boot", List.of("spring boot", "springboot", "spring"));
        skills.put("MySQL", List.of("mysql", "sql", "数据库"));
        skills.put("Redis", List.of("redis", "缓存"));
        skills.put("RESTful API", List.of("restful", "rest api", "接口开发", "api 开发"));
        skills.put("TypeScript", List.of("typescript", "ts"));
        skills.put("React", List.of("react"));
        skills.put("Vue", List.of("vue"));
        skills.put("前端工程化", List.of("vite", "前端工程化", "前端构建"));
        skills.put("Docker", List.of("docker", "容器", "容器化"));
        skills.put("Git", List.of("git", "版本控制"));
        skills.put("自动化测试", List.of("测试", "pytest", "junit", "playwright", "e2e"));
        return skills;
    }

    public Map<String, List<String>> skillSynonyms() {
        return SKILL_SYNONYMS;
    }

    public List<String> allSkills() {
        return List.copyOf(SKILL_SYNONYMS.keySet());
    }

    /** 拼接给 LLM 的技能清单文本 */
    public String skillsText() {
        return String.join("、", SKILL_SYNONYMS.keySet());
    }
}
