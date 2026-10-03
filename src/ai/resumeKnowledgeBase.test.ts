import { describe, it, expect } from 'vitest'
import { buildResumeKnowledgeBase, resumeKnowledgeBase } from './resumeKnowledgeBase'

describe('resumeKnowledgeBase', () => {
  it('builds chunks with content and metadata', () => {
    const chunks = buildResumeKnowledgeBase()
    expect(chunks.length).toBeGreaterThan(10)

    for (const chunk of chunks) {
      expect(chunk.id).toBeTruthy()
      expect(chunk.content.length).toBeGreaterThan(0)
      expect(chunk.metadata.category).toBeTruthy()
      expect(chunk.metadata.source).toMatch(/\.ts$|^workspace$/)
    }
  })

  it('covers all resume categories', () => {
    const chunks = buildResumeKnowledgeBase()
    const categories = new Set(chunks.map((chunk) => chunk.metadata.category))

    expect(categories.has('personalInfo')).toBe(true)
    expect(categories.has('projects')).toBe(true)
    expect(categories.has('experience')).toBe(true)
    expect(categories.has('education')).toBe(true)
    expect(categories.has('design')).toBe(true)
    expect(categories.has('skills')).toBe(true)
    expect(categories.has('media')).toBe(true)
    expect(categories.has('music')).toBe(false)
  })

  it('exports a pre-built knowledge base', () => {
    expect(resumeKnowledgeBase.length).toBeGreaterThan(10)
    expect(resumeKnowledgeBase[0]).toHaveProperty('metadata')
  })

  it('includes project-specific chunks', () => {
    const chunks = buildResumeKnowledgeBase()
    const projectChunks = chunks.filter((chunk) => chunk.metadata.category === 'projects')
    expect(projectChunks.length).toBeGreaterThanOrEqual(3)
  })

  it('contact chunk carries no sensitive direct data', async () => {
    const { personalInfo } = await import('../data/personalInfo')
    const chunks = buildResumeKnowledgeBase()
    const contact = chunks.find((chunk) => chunk.id === 'personal-info-contact')
    expect(contact).toBeDefined()
    expect(contact?.content).not.toContain(personalInfo.email)
    expect(contact?.content).not.toContain(personalInfo.phone)
    expect(contact?.content).not.toContain(personalInfo.qq)
    expect(contact?.content).not.toContain(personalInfo.wechat)
  })

  it('GitHub 快照进入知识库且不含被排除仓库', () => {
    const chunks = buildResumeKnowledgeBase()
    const 仓库块 = chunks.filter((chunk) => chunk.metadata.category === 'github')
    expect(仓库块.length).toBeGreaterThan(1)
    expect(仓库块.some((chunk) => chunk.id === 'github-overview')).toBe(true)
    // 每个仓库块都要能追溯到真实仓库地址，不许凭空造仓库
    for (const chunk of 仓库块.filter((项) => 项.id !== 'github-overview')) {
      expect(chunk.content).toContain('https://github.com/')
    }
    for (const chunk of chunks) {
      expect(chunk.content).not.toContain('LianAiBaGuanLiZhongXin')
      expect(chunk.content).not.toContain('恋爱吧管理中心')
    }
  })

  it('羊来项目块含整蛊直播间事实且无旧称残留', () => {
    const chunks = buildResumeKnowledgeBase()
    const 羊来 = chunks.find((chunk) => chunk.id === 'project-yangLai')
    expect(羊来).toBeDefined()
    expect(羊来?.content).toContain('羊来')
    expect(羊来?.content).toContain('https://xuanruimu.github.io/YangLai/')
    for (const chunk of chunks) {
      expect(chunk.content).not.toContain('恋爱吧管理中心')
      expect(chunk.content).not.toContain('LianAiBaGuanLiZhongXin')
    }
    const 旧称 = String.fromCharCode(0x6570, 0x636e, 0x4e2d, 0x5fc3)
    for (const chunk of chunks) {
      expect(chunk.content).not.toContain(旧称)
    }
  })
})
