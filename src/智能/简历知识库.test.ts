import { describe, it, expect } from 'vitest'
import { 构建简历知识库, 简历知识库 } from './简历知识库'

describe('resumeKnowledgeBase', () => {
  it('builds chunks with content and metadata', () => {
    const 分块表 = 构建简历知识库()
    expect(分块表.length).toBeGreaterThan(10)

    for (const 分块 of 分块表) {
      expect(分块.id).toBeTruthy()
      expect(分块.content.length).toBeGreaterThan(0)
      expect(分块.元数据.分类).toBeTruthy()
      expect(分块.元数据.来源).toMatch(/\.ts$|^workspace$/)
    }
  })

  it('covers all resume categories', () => {
    const 分块表 = 构建简历知识库()
    const 分类表 = new Set(分块表.map((分块) => 分块.元数据.分类))

    expect(分类表.has('personalInfo')).toBe(true)
    expect(分类表.has('projects')).toBe(true)
    expect(分类表.has('experience')).toBe(true)
    expect(分类表.has('education')).toBe(true)
    expect(分类表.has('design')).toBe(true)
    expect(分类表.has('skills')).toBe(true)
    expect(分类表.has('media')).toBe(true)
    expect(分类表.has('music')).toBe(false)
  })

  it('exports a pre-built knowledge base', () => {
    expect(简历知识库.length).toBeGreaterThan(10)
    expect(简历知识库[0]).toHaveProperty('元数据')
  })

  it('includes project-specific chunks', () => {
    const 分块表 = 构建简历知识库()
    const 项目分块 = 分块表.filter((分块) => 分块.元数据.分类 === 'projects')
    expect(项目分块.length).toBeGreaterThanOrEqual(3)
  })

  it('contact chunk carries no sensitive direct data', async () => {
    const { 个人信息 } = await import('../数据/个人信息')
    const 分块表 = 构建简历知识库()
    const 联系方式 = 分块表.find((分块) => 分块.id === 'personal-info-contact')
    expect(联系方式).toBeDefined()
    expect(联系方式?.content).not.toContain(个人信息.邮箱)
    expect(联系方式?.content).not.toContain(个人信息.电话)
    expect(联系方式?.content).not.toContain(个人信息.QQ)
    expect(联系方式?.content).not.toContain(个人信息.wechat)
  })

  it('GitHub 快照进入知识库且不含被排除仓库', () => {
    const 分块表 = 构建简历知识库()
    const 仓库块 = 分块表.filter((分块) => 分块.元数据.分类 === 'github')
    expect(仓库块.length).toBeGreaterThan(1)
    expect(仓库块.some((分块) => 分块.id === 'github-overview')).toBe(true)

    for (const 分块 of 仓库块.filter((项) => 项.id !== 'github-overview')) {
      expect(分块.content).toContain('https://github.com/')
    }
    for (const 分块 of 分块表) {
      expect(分块.content).not.toContain('LianAiBaGuanLiZhongXin')
      expect(分块.content).not.toContain('恋爱吧管理中心')
    }
  })

  it('羊来项目块含整蛊直播间事实且无旧称残留', () => {
    const 分块表 = 构建简历知识库()
    const 羊来 = 分块表.find((分块) => 分块.id === 'project-yangLai')
    expect(羊来).toBeDefined()
    expect(羊来?.content).toContain('羊来')
    expect(羊来?.content).toContain('https://xuanruimu.github.io/YangLai/')
    for (const 分块 of 分块表) {
      expect(分块.content).not.toContain('恋爱吧管理中心')
      expect(分块.content).not.toContain('LianAiBaGuanLiZhongXin')
    }
    const 旧称 = String.fromCharCode(0x6570, 0x636e, 0x4e2d, 0x5fc3)
    for (const 分块 of 分块表) {
      expect(分块.content).not.toContain(旧称)
    }
  })
})
