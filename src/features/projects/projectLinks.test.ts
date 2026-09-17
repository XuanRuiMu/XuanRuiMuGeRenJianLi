import { describe, it, expect } from 'vitest'
import { projects, lovewithmeGithubUrl, fengLaiWebUrl, 暮澜链接 } from '../../data/projects'
import { experiences, educatorBilibiliUrl, wowguildVideoUrl, 暮澜链接 as 经历暮澜链接 } from '../../data/experience'
import { 暮澜链接 as 展示暮澜链接, showcaseRows } from '../../data/showcase'
import { personalInfo } from '../../data/personalInfo'

describe('项目链接完整性', () => {
  it('每个项目至少有一个有效链接', () => {
    expect(projects.length).toBeGreaterThan(0)
    for (const 项目 of projects) {
      expect(项目.links.length).toBeGreaterThan(0)
      for (const 链接 of 项目.links) {
        expect(链接.url.startsWith('https://')).toBe(true)
      }
    }
  })

  it('暮澜纪元便签展示指定GitHub链接', () => {
    expect(暮澜链接).toBe('https://github.com/XuanRuiMu/XRMChaJian')
    const 暮澜 = projects.find((项目) => 项目.id === 'xrm')
    expect(暮澜).toBeDefined()
    expect(暮澜?.links ?? []).toHaveLength(1)
    expect(暮澜?.links[0].url).toBe('https://github.com/XuanRuiMu/XRMChaJian')
  })

  it('蜂来项目链接精确等于用户指定地址且显示网页链接', () => {
    expect(fengLaiWebUrl).toBe('https://xuanruimu.github.io/FengLai/index.html')
    const 蜂来 = projects.find((项目) => 项目.id === 'fengLai')
    expect(蜂来).toBeDefined()
    expect(蜂来?.links[0].url).toBe('https://xuanruimu.github.io/FengLai/index.html')
    expect(蜂来?.links[0].labelKey).toBe('projects.link.web')
  })

  it('恋爱吧项目链接常量全库唯一源', () => {
    const 恋爱吧项目 = projects.find((项目) => 项目.id === 'lovewithme')
    expect(恋爱吧项目?.links[0].url).toBe(lovewithmeGithubUrl)
  })

  it('FP-05：经历外链地址与用户指定一致', () => {
    const 教育 = experiences.find((条目) => 条目.id === 'educator')
    expect(教育?.links?.[0].url).toBe('https://space.bilibili.com/383504924/upload/video')
    expect(教育?.links?.[0].url).toBe(educatorBilibiliUrl)
    const 公会 = experiences.find((条目) => 条目.id === 'wowguild')
    expect(公会?.links?.[0].url).toBe(wowguildVideoUrl)
    expect(公会?.links?.[0].url.startsWith('https://www.bilibili.com/video/BV18jS9YvEyC/')).toBe(true)
    const 独立开发 = experiences.find((条目) => 条目.id === 'indie')
    expect(独立开发?.links?.[0].url).toBe(personalInfo.github)
  })

  it('FP-05：无链接经历仅限无外链两条', () => {
    expect(experiences).toHaveLength(6)
    for (const 条目 of experiences) {
      if (条目.id === 'bachelor' || 条目.id === 'aiengineer') {
        expect(条目.links).toBeUndefined()
      } else {
        expect(条目.links?.length).toBeGreaterThan(0)
      }
    }
  })

  it('FP-01：四处暮澜链接均为指定地址', () => {
    const 指定地址 = 'https://github.com/XuanRuiMu/XRMChaJian'
    expect(暮澜链接).toBe(指定地址)
    expect(经历暮澜链接).toBe(指定地址)
    expect(展示暮澜链接).toBe(指定地址)
    const 便签 = projects.find((项目) => 项目.id === 'xrm')
    expect(便签?.links[0].url).toBe(指定地址)
    const 经历首条 = experiences.find((条目) => 条目.id === 'mcserver')
    expect(经历首条?.links?.[0].url).toBe(指定地址)
    const 所有卡片 = showcaseRows.flatMap((行) => 行.cards)
    const 展示暮澜 = 所有卡片.find((卡片) => 卡片.id === 'xrmUi')
    const 游戏世界 = 所有卡片.find((卡片) => 卡片.id === 'gameWorld')
    expect(展示暮澜?.href).toBe(指定地址)
    expect(游戏世界?.href).toBe(指定地址)
  })
})
