import { describe, it, expect } from 'vitest'
import { getLocalAnswer } from './localEngine'
import { personalInfo } from '../data/personalInfo'
import { t } from '../i18n/translations'

describe('localEngine', () => {
  it('returns text answer for name question', () => {
    const result = getLocalAnswer('你叫什么')
    expect(result.role).toBe('assistant')
    expect(result.content).toContain(personalInfo.name)
    expect(result.component).toBeUndefined()
  })

  it('returns ContactLinks for contact question', () => {
    const result = getLocalAnswer('联系方式')
    expect(result.content).not.toContain(personalInfo.email)
    expect(result.content).not.toContain(personalInfo.phone)
    expect(result.component).toEqual({ type: 'ContactLinks' })
  })

  it('qq微信手机稳定命中ContactLinks且无直给', () => {
    for (const q of ['怎么联系你', '你的微信是多少', 'qq多少', '手机号多少', '邮箱是什么']) {
      const result = getLocalAnswer(q)
      expect(result.component).toEqual({ type: 'ContactLinks' })
      expect(result.content).not.toContain(personalInfo.email)
      expect(result.content).not.toContain(personalInfo.phone)
    }
  })

  it('github项目问法不被联系意图污染', () => {
    const result = getLocalAnswer('你的github项目有哪些')
    expect(result.component).not.toEqual({ type: 'ContactLinks' })
  })

  it('returns ProjectCard with xrm for project name question', () => {
    const result = getLocalAnswer('介绍一下暮澜纪元')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('detects lovewithme project from input', () => {
    const result = getLocalAnswer('介绍一下和我恋爱吧')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'lovewithme' })
  })

  it('蜂来问法落到蜂来项目卡片', () => {
    const result = getLocalAnswer('蜂来是做什么的')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'fengLai' })
  })

  it('detects aiConsole project from input', () => {
    const result = getLocalAnswer('介绍一下循环工程skill')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'aiConsole' })
  })

  it('returns skills text answer (no component) for skill question', () => {
    const result = getLocalAnswer('你的技术栈')
    expect(result.role).toBe('assistant')
    expect(result.component).toBeUndefined()
  })

  it('returns Timeline with education scope for education question', () => {
    const result = getLocalAnswer('教育背景')
    expect(result.component).toEqual({ type: 'Timeline', scope: 'education' })
  })

  it('returns Timeline with experience scope for experience question', () => {
    const result = getLocalAnswer('工作经历')
    expect(result.component).toEqual({ type: 'Timeline', scope: 'experience' })
  })

  it('returns fallback text for unknown question', () => {
    const result = getLocalAnswer('宇宙终极答案')
    expect(result.content).not.toContain(personalInfo.email)
    expect(result.content).not.toContain(personalInfo.phone)
    expect(result.component).toBeUndefined()
  })

  it('问候语返回问候终态而非没准备答案（你好/您好/hi/hello）', () => {
    const 期望问候 = t('chat.answers.greeting')
    for (const q of ['你好', '您好', 'hi', 'hello']) {
      const result = getLocalAnswer(q)
      expect(result.role).toBe('assistant')
      expect(result.content).toBe(期望问候)
      expect(result.content).not.toContain('没准备答案')
      expect(result.component).toBeUndefined()
    }
  })

  it('谢谢返回感谢终态', () => {
    const result = getLocalAnswer('谢谢')
    expect(result.content).toBe(t('chat.answers.thanks'))
    expect(result.content).not.toContain('没准备答案')
  })

  it('再见返回告别终态', () => {
    const result = getLocalAnswer('再见')
    expect(result.content).toBe(t('chat.answers.farewell'))
  })
})
