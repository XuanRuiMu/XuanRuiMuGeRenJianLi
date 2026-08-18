import { describe, it, expect } from 'vitest'
import { retrieveChunks } from './ragEngine'

describe('ragEngine', () => {
  it('returns top-k chunks for a question', () => {
    const results = retrieveChunks('你是谁', 3)
    expect(results.length).toBe(3)
    expect(results[0].score).toBeGreaterThanOrEqual(0)
  })

  it('ranks personal info highly for identity questions', () => {
    const results = retrieveChunks('你叫什么名字', 5)
    const topCategories = results.slice(0, 2).map((result) => result.metadata.category)
    expect(topCategories).toContain('personalInfo')
  })

  it('ranks tech stack highly for tech stack questions', () => {
    const results = retrieveChunks('你的技术栈是什么', 8)
    const categories = results.map((result) => result.metadata.category)
    expect(categories).toContain('techStack')
  })

  it('ranks projects highly for project questions', () => {
    const results = retrieveChunks('介绍一下已删除的经历', 5)
    const topCategories = results.slice(0, 3).map((result) => result.metadata.category)
    expect(topCategories).toContain('projects')
  })

  it('ranks education highly for education questions', () => {
    const results = retrieveChunks('你的教育背景', 5)
    const topCategories = results.slice(0, 2).map((result) => result.metadata.category)
    expect(topCategories).toContain('education')
  })

  it('ranks contact info for contact questions', () => {
    const results = retrieveChunks('怎么联系你', 5)
    const topCategories = results.slice(0, 2).map((result) => result.metadata.category)
    expect(topCategories).toContain('personalInfo')
  })

  it('handles empty input gracefully', () => {
    const results = retrieveChunks('', 5)
    expect(results.length).toBe(5)
    expect(results.every((result) => result.score === 0)).toBe(true)
  })

  it('returns stable results for common preset questions', () => {
    const questions = [
      '你是谁',
      '你最擅长什么',
      '你的技术栈',
      '介绍一下已删除的经历',
      '你的项目经验',
      '你的教育背景',
      '你的联系方式',
      '目标岗位',
      '你会什么编程语言',
      '你的设计作品',
    ]

    for (const question of questions) {
      const results = retrieveChunks(question, 3)
      expect(results.length).toBe(3)
      expect(results[0].content.length).toBeGreaterThan(0)
    }
  })
})
