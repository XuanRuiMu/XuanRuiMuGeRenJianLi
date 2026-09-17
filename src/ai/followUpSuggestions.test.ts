import { describe, it, expect } from 'vitest'
import { 生成追问建议 } from './followUpSuggestions'
import { ta } from '../i18n/translations'

describe('追问建议根因：每次回答后3个可继续选项', () => {
  it('技术栈问题返回技术追问三元', () => {
    const 建议 = 生成追问建议('和我恋爱吧项目用了什么技术栈')
    expect(建议).toHaveLength(3)
    expect(建议).toEqual(ta('ai.followUps.tech'))
  })

  it('暮澜纪元问题返回项目追问三元', () => {
    const 建议 = 生成追问建议('介绍一下暮澜纪元')
    expect(建议).toEqual(ta('ai.followUps.projectsXrm'))
  })

  it('恋爱项目问题返回恋爱追问三元', () => {
    const 建议 = 生成追问建议('和我恋爱吧是做什么的')
    expect(建议).toEqual(ta('ai.followUps.projectsLove'))
  })

  it('蜂来问法命中蜂来追问且选项含蜂来玩法', () => {
    const 建议 = 生成追问建议('蜂来是做什么的')
    expect(建议).toEqual(ta('ai.followUps.projectsFengLai'))
    expect(ta('ai.followUps.projectsFengLai').join('')).toContain('蜂来')
  })

  it('本地与LLM链路共用同一引擎：组件信号优先于文本', () => {
    const 本地建议 = 生成追问建议('随便问问', {
      role: 'assistant',
      content: '答',
      component: { type: 'ProjectCard', projectId: 'xrm' },
    })
    expect(本地建议).toEqual(ta('ai.followUps.projectsXrm'))
    const 大模型建议 = 生成追问建议('换个问法', {
      role: 'assistant',
      content: '答',
      component: { type: 'Timeline', scope: 'experience' },
    })
    expect(大模型建议).toEqual(ta('ai.followUps.experience'))
  })

  it('问候与空输入有兜底三元且无空字符串', () => {
    for (const 输入 of ['你好', '', '谢谢', '再见']) {
      const 建议 = 生成追问建议(输入)
      expect(建议).toHaveLength(3)
      for (const 项 of 建议) expect(项.trim().length).toBeGreaterThan(0)
    }
  })

  it('未知问题回退到通用三元', () => {
    expect(生成追问建议('今天天气怎么样')).toEqual(ta('ai.followUps.fallback'))
  })
})
