import { describe, it, expect } from 'vitest'
import { 项目表, 恋爱吧GitHub地址, 羊来官网地址, 暮澜链接 } from '../../数据/项目'
import { 经历表, 教育者B站地址, 公会视频地址, 暮澜链接 as 经历暮澜链接 } from '../../数据/经历'
import { 暮澜链接 as 展示暮澜链接, 展示行表 } from '../../数据/展示'
import { 个人信息 } from '../../数据/个人信息'

describe('项目链接完整性', () => {
  it('每个项目至少有一个有效链接', () => {
    expect(项目表.length).toBeGreaterThan(0)
    for (const 项目 of 项目表) {
      expect(项目.链接表.length).toBeGreaterThan(0)
      for (const 链接 of 项目.链接表) {
        expect(链接.url.startsWith('https://')).toBe(true)
      }
    }
  })

  it('暮澜纪元便签展示指定GitHub链接', () => {
    expect(暮澜链接).toBe('https://github.com/XuanRuiMu/XRMChaJian')
    const 暮澜 = 项目表.find((项目) => 项目.id === 'xrm')
    expect(暮澜).toBeDefined()
    expect(暮澜?.链接表 ?? []).toHaveLength(1)
    expect(暮澜?.链接表[0].url).toBe('https://github.com/XuanRuiMu/XRMChaJian')
  })

  it('羊来项目链接精确等于用户指定地址且显示网页链接', () => {
    expect(羊来官网地址).toBe('https://xuanruimu.github.io/YangLai/')
    const 羊来 = 项目表.find((项目) => 项目.id === 'yangLai')
    expect(羊来).toBeDefined()
    expect(羊来?.链接表[0].url).toBe('https://xuanruimu.github.io/YangLai/')
    expect(羊来?.链接表[0].标签键).toBe('projects.link.web')
  })

  it('恋爱吧项目链接常量全库唯一源', () => {
    const 恋爱吧项目 = 项目表.find((项目) => 项目.id === 'lovewithme')
    expect(恋爱吧项目?.链接表[0].url).toBe(恋爱吧GitHub地址)
  })

  it('FP-05：经历外链地址与用户指定一致', () => {
    const 教育 = 经历表.find((条目) => 条目.id === 'educator')
    expect(教育?.链接表?.[0].url).toBe('https://space.bilibili.com/383504924/upload/video')
    expect(教育?.链接表?.[0].url).toBe(教育者B站地址)
    const 公会 = 经历表.find((条目) => 条目.id === 'wowguild')
    expect(公会?.链接表?.[0].url).toBe(公会视频地址)
    expect(公会?.链接表?.[0].url.startsWith('https://www.bilibili.com/video/BV18jS9YvEyC/')).toBe(true)
    const 独立开发 = 经历表.find((条目) => 条目.id === 'indie')
    expect(独立开发?.链接表?.[0].url).toBe(个人信息.GitHub)
  })

  it('FP-05：无链接经历仅限无外链两条', () => {
    expect(经历表).toHaveLength(6)
    for (const 条目 of 经历表) {
      if (条目.id === 'bachelor' || 条目.id === 'aiengineer') {
        expect(条目.链接表).toBeUndefined()
      } else {
        expect(条目.链接表?.length).toBeGreaterThan(0)
      }
    }
  })

  it('FP-01：四处暮澜链接均为指定地址', () => {
    const 指定地址 = 'https://github.com/XuanRuiMu/XRMChaJian'
    expect(暮澜链接).toBe(指定地址)
    expect(经历暮澜链接).toBe(指定地址)
    expect(展示暮澜链接).toBe(指定地址)
    const 便签 = 项目表.find((项目) => 项目.id === 'xrm')
    expect(便签?.链接表[0].url).toBe(指定地址)
    const 经历首条 = 经历表.find((条目) => 条目.id === 'mcserver')
    expect(经历首条?.链接表?.[0].url).toBe(指定地址)
    const 所有卡片 = 展示行表.flatMap((行) => 行.卡片表)
    const 展示暮澜 = 所有卡片.find((卡片) => 卡片.id === 'xrmUi')
    const 游戏世界 = 所有卡片.find((卡片) => 卡片.id === 'gameWorld')
    expect(展示暮澜?.href).toBe(指定地址)
    expect(游戏世界?.href).toBe(指定地址)
  })
})
