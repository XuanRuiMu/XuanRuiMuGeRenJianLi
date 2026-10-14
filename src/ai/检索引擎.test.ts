import { describe, it, expect } from 'vitest'
import { 检索知识块 } from './检索引擎'
import { RAG检索最低分 } from './深度求索配置'

describe('ragEngine', () => {
  it('returns filtered chunks for a question（阈值过滤后不再恒返topK）', () => {
    const results = 检索知识块('你是谁', 3)
    expect(results.length).toBeGreaterThan(0)
    expect(results.length).toBeLessThanOrEqual(3)
    expect(results[0].score).toBeGreaterThanOrEqual(RAG检索最低分)
    expect(results.every((r) => r.score >= RAG检索最低分)).toBe(true)
  })

  it('ranks personal info highly for identity questions', () => {
    const results = 检索知识块('你叫什么名字', 5)
    const topCategories = results.slice(0, 2).map((result) => result.metadata.category)
    expect(topCategories).toContain('personalInfo')
  })

  it('ranks tech stack highly for tech stack questions', () => {
    const results = 检索知识块('你的技术栈是什么', 8)
    const categories = results.map((result) => result.metadata.category)
    expect(categories).toContain('techStack')
  })

  it('ranks projects highly for project questions', () => {
    const results = 检索知识块('介绍一下暮澜纪元', 5)
    const topCategories = results.slice(0, 3).map((result) => result.metadata.category)
    expect(topCategories).toContain('projects')
  })

  it('ranks education highly for education questions', () => {
    const results = 检索知识块('你的教育背景', 5)
    const topCategories = results.slice(0, 2).map((result) => result.metadata.category)
    expect(topCategories).toContain('education')
  })

  it('ranks contact info for contact questions', () => {
    const results = 检索知识块('怎么联系你', 5)
    const topCategories = results.slice(0, 2).map((result) => result.metadata.category)
    expect(topCategories).toContain('personalInfo')
  })

  it('handles empty input gracefully（空输入返回空上下文而非硬塞）', () => {
    const results = 检索知识块('', 5)
    expect(results.length).toBe(0)
  })

  it('returns stable results for common preset questions（真实问答仍有命中）', () => {
    const questions = [
      '你是谁',
      '你最擅长什么',
      '你的技术栈',
      '介绍一下暮澜纪元',
      '你的项目经验',
      '你的教育背景',
      '你的联系方式',
      '目标岗位',
      '你会什么编程语言',
      '你的设计作品',
    ]

    for (const question of questions) {
      const results = 检索知识块(question, 3)
      expect(results.length).toBeGreaterThan(0)
      expect(results.length).toBeLessThanOrEqual(3)
      expect(results[0].content.length).toBeGreaterThan(0)
      expect(results.every((r) => r.score >= RAG检索最低分)).toBe(true)
    }
  })

  it('问候与寒暄返回空上下文（你好/您好/hi/hello/谢谢/再见）', () => {
    for (const q of ['你好', '您好', 'hi', 'hello', '谢谢', '再见']) {
      expect(检索知识块(q, 8)).toEqual([])
    }
  })

  it('低分片段被阈值过滤（自定义高阈值下真实问答也被清空）', () => {
    const results = 检索知识块('你是谁', 8, 99)
    expect(results).toEqual([])
  })

  it('学校口语问法首屏即学校事实（用户原话回归）', () => {
    const results = 检索知识块('他是哪个学校毕业的?', 3)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toMatch(/personal-info-education/)
    expect(results[0].content).toContain('天津仁爱学院')
  })

  it('文职评估问法召回经历与教育事实而非空上下文', () => {
    const results = 检索知识块('他能否胜任文职工作?', 8)
    expect(results.length).toBeGreaterThan(0)
    expect(results.some((r) => r.metadata.category === 'experience')).toBe(true)
  })

  it('暮澜纪元不再双倍加分（重复规则已删，分数回归单次加成）', () => {
    const results = 检索知识块('介绍一下暮澜纪元', 5)
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].score).toBeLessThan(1.4)
    expect(results[0].score).toBeGreaterThanOrEqual(RAG检索最低分)
  })
})
