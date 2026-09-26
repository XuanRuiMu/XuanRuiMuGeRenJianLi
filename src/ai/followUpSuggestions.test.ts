import { describe, it, expect } from 'vitest'
import { 生成追问建议 } from './followUpSuggestions'
import { getLocalAnswer } from './localEngine'
import { t, ta } from '../i18n/translations'

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

describe('兜底答案的追问分组（FP-04b）：诚实兜底与预制答案各归各组', () => {
  const 诚实兜底 = t('chat.answers.fallback')

  const 答非所问句 = [
    '你好。请问，玄锐暮可以胜任文职工作吗',
    '项目管理是你的核心能力吗',
    '电话会议怎么开',
    '今天天气怎么样',
    '我在找工作',
    '工作的意义是什么',
    '我的手机壳丢了',
    '这个组件的时间线怎么画',
    '推荐几首歌',
    '这个技术难点怎么攻克',
  ]

  const 真实简历意图追问组: Array<{ 问句: string; 组: string }> = [
    { 问句: '联系方式', 组: 'fallback' },
    { 问句: '怎么联系你', 组: 'fallback' },
    { 问句: '你微信多少', 组: 'fallback' },
    { 问句: '邮箱是什么', 组: 'fallback' },
    { 问句: '介绍项目', 组: 'projectsXrm' },
    { 问句: '你做过哪些项目', 组: 'projectsXrm' },
    { 问句: '你的作品有哪些', 组: 'projectsXrm' },
    { 问句: '我的工作经历', 组: 'experience' },
    { 问句: '有没有实习经历', 组: 'experience' },
    { 问句: '教育背景', 组: 'education' },
    { 问句: '什么学历', 组: 'education' },
    { 问句: '他是哪个学校毕业的?', 组: 'education' },
    { 问句: '你的技术栈', 组: 'tech' },
    { 问句: '你擅长什么', 组: 'tech' },
    { 问句: '介绍一下暮澜纪元', 组: 'projectsXrm' },
    { 问句: '和我恋爱吧是做什么的', 组: 'projectsLove' },
    { 问句: '蜂来是做什么的', 组: 'projectsFengLai' },
    { 问句: '循环工程是什么', 组: 'projectsLove' },
  ]

  it('答非所问句整条链路同时诚实：答案诚实兜底 + 追问回落 fallback 组', () => {
    for (const 问句 of 答非所问句) {
      const 助手消息 = getLocalAnswer(问句)
      expect(助手消息.content, `「${问句}」应诚实兜底`).toBe(诚实兜底)
      expect(生成追问建议(问句, 助手消息), `「${问句}」的追问不该假装相关`).toEqual(ta('ai.followUps.fallback'))
    }
  })

  it('真实简历意图的追问各自归组', () => {
    for (const 项 of 真实简历意图追问组) {
      expect(生成追问建议(项.问句, getLocalAnswer(项.问句)), `「${项.问句}」的追问组不符`).toEqual(
        ta(`ai.followUps.${项.组}` as never)
      )
    }
  })
})
