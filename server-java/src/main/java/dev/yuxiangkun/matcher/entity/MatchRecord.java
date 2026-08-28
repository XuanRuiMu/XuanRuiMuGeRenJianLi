package dev.yuxiangkun.matcher.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * 匹配记录：每次 JD 分析的输入、得分与结论，用于历史查询与效果回溯。
 */
@Entity
@Table(name = "match_record")
public class MatchRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** JD 原文（截断存储，避免超长文本撑爆行） */
    @Lob
    private String jdText;

    /** 匹配总分 0-100 */
    private int totalScore;

    /** 命中的技能（逗号分隔） */
    private String matchedSkills;

    /** 缺失的技能（逗号分隔） */
    private String missingSkills;

    /** 分析结论（LLM 生成或规则引擎生成） */
    @Lob
    private String summary;

    /** engine=llm | rule，标识本次分析走的大模型还是本地降级引擎 */
    private String engine;

    /** 是否命中缓存 */
    private boolean cacheHit;

    private Instant createdAt = Instant.now();

    public Long getId() { return id; }

    public String getJdText() { return jdText; }
    public void setJdText(String jdText) { this.jdText = jdText; }

    public int getTotalScore() { return totalScore; }
    public void setTotalScore(int totalScore) { this.totalScore = totalScore; }

    public String getMatchedSkills() { return matchedSkills; }
    public void setMatchedSkills(String matchedSkills) { this.matchedSkills = matchedSkills; }

    public String getMissingSkills() { return missingSkills; }
    public void setMissingSkills(String missingSkills) { this.missingSkills = missingSkills; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getEngine() { return engine; }
    public void setEngine(String engine) { this.engine = engine; }

    public boolean isCacheHit() { return cacheHit; }
    public void setCacheHit(boolean cacheHit) { this.cacheHit = cacheHit; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
