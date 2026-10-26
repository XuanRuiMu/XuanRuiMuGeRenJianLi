import { describe, it, expect } from 'vitest'
import { 检索知识块 } from './检索引擎'
import { RAG检索最低分 } from './深度求索配置'

describe('ragEngine', () => {
  it('returns filtered chunks for a question（阈值过滤后不再恒返topK）', () => {
    const 结果表 = 检索知识块('你是谁', 3)
    expect(结果表.length).toBeGreaterThan(0)
    expect(结果表.length).toBeLessThanOrEqual(3)
    expect(结果表[0].得分).toBeGreaterThanOrEqual(RAG检索最低分)
    expect(结果表.every((r) => r.得分 >= RAG检索最低分)).toBe(true)
  })

  it('ranks personal info highly for identity questions', () => {
    const 结果表 = 检索知识块('你叫什么名字', 5)
    const 顶级分类 = 结果表.slice(0, 2).map((结果) => 结果.元数据.分类)
    expect(顶级分类).toContain('personalInfo')
  })

  it('ranks tech stack highly for tech stack questions', () => {
    const 结果表 = 检索知识块('你的技术栈是什么', 8)
    const 分类表 = 结果表.map((结果) => 结果.元数据.分类)
    expect(分类表).toContain('techStack')
  })

  it('ranks projects highly for project questions', () => {
    const 结果表 = 检索知识块('介绍一下暮澜纪元', 5)
    const 顶级分类 = 结果表.slice(0, 3).map((结果) => 结果.元数据.分类)
    expect(顶级分类).toContain('projects')
  })

  it('ranks education highly for education questions', () => {
    const 结果表 = 检索知识块('你的教育背景', 5)
    const 顶级分类 = 结果表.slice(0, 2).map((结果) => 结果.元数据.分类)
    expect(顶级分类).toContain('education')
  })

  it('ranks contact info for contact questions', () => {
    const 结果表 = 检索知识块('怎么联系你', 5)
    const 顶级分类 = 结果表.slice(0, 2).map((结果) => 结果.元数据.分类)
    expect(顶级分类).toContain('personalInfo')
  })

  it('handles empty input gracefully（空输入返回空上下文而非硬塞）', () => {
    const 结果表 = 检索知识块('', 5)
    expect(结果表.length).toBe(0)
  })

  it('returns stable results for common preset questions（真实问答仍有命中）', () => {
    const 问题表 = [
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

    for (const 问题 of 问题表) {
      const 结果表 = 检索知识块(问题, 3)
      expect(结果表.length).toBeGreaterThan(0)
      expect(结果表.length).toBeLessThanOrEqual(3)
      expect(结果表[0].content.length).toBeGreaterThan(0)
      expect(结果表.every((r) => r.得分 >= RAG检索最低分)).toBe(true)
    }
  })

  it('问候与寒暄返回空上下文（你好/您好/hi/hello/谢谢/再见）', () => {
    for (const q of ['你好', '您好', 'hi', 'hello', '谢谢', '再见']) {
      expect(检索知识块(q, 8)).toEqual([])
    }
  })

  it('低分片段被阈值过滤（自定义高阈值下真实问答也被清空）', () => {
    const 结果表 = 检索知识块('你是谁', 8, 99)
    expect(结果表).toEqual([])
  })

  it('学校口语问法首屏即学校事实（用户原话回归）', () => {
    const 结果表 = 检索知识块('他是哪个学校毕业的?', 3)
    expect(结果表.length).toBeGreaterThan(0)
    expect(结果表[0].id).toMatch(/personal-info-education/)
    expect(结果表[0].content).toContain('天津仁爱学院')
  })

  it('文职评估问法召回经历与教育事实而非空上下文', () => {
    const 结果表 = 检索知识块('他能否胜任文职工作?', 8)
    expect(结果表.length).toBeGreaterThan(0)
    expect(结果表.some((r) => r.元数据.分类 === 'experience')).toBe(true)
  })

  it('暮澜纪元不再双倍加分（重复规则已删，分数回归单次加成）', () => {
    const 结果表 = 检索知识块('介绍一下暮澜纪元', 5)
    expect(结果表.length).toBeGreaterThan(0)
    expect(结果表[0].得分).toBeLessThan(1.4)
    expect(结果表[0].得分).toBeGreaterThanOrEqual(RAG检索最低分)
  })
})
