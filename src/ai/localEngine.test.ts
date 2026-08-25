import { describe, it, expect } from 'vitest'
import { getLocalAnswer } from './localEngine'
import { personalInfo } from '../data/personalInfo'

describe('localEngine', () => {
  it('returns text answer for name question', () => {
    const result = getLocalAnswer('你叫什么')
    expect(result.role).toBe('assistant')
    expect(result.content).toContain(personalInfo.name)
    expect(result.component).toBeUndefined()
  })

  it('returns ContactForm for contact question', () => {
    const result = getLocalAnswer('联系方式')
    expect(result.content).toContain(personalInfo.email)
    expect(result.component).toEqual({ type: 'ContactForm' })
  })

  it('returns ProjectCard with xrm for project name question', () => {
    const result = getLocalAnswer('介绍一下已删除的经历')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('detects lovewithme project from input', () => {
    const result = getLocalAnswer('介绍一下和我恋爱吧')
    expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'lovewithme' })
  })

  it('detects aiConsole project from input', () => {
    const result = getLocalAnswer('AI 总控制台')
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
    expect(result.content).toContain(personalInfo.email)
    expect(result.component).toBeUndefined()
  })
})
