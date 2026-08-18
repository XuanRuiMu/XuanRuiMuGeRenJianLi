import { describe, it, expect } from 'vitest'
import { extractJsonFromText, parseAssistantPayload } from './structuredOutput'

describe('structuredOutput', () => {
  describe('extractJsonFromText', () => {
    it('returns parsed object from JSON string', () => {
      const result = extractJsonFromText('{"text":"hello"}')
      expect(result).toEqual({ text: 'hello' })
    })

    it('extracts JSON from markdown code block', () => {
      const result = extractJsonFromText('```json\n{"text":"hello"}\n```')
      expect(result).toEqual({ text: 'hello' })
    })

    it('extracts inline object from text', () => {
      const result = extractJsonFromText('AI 回复：{"text":"hello"}')
      expect(result).toEqual({ text: 'hello' })
    })

    it('returns original text when no JSON found', () => {
      const result = extractJsonFromText('纯文本回答')
      expect(result).toBe('纯文本回答')
    })
  })

  describe('parseAssistantPayload', () => {
    it('parses string input as text', () => {
      const result = parseAssistantPayload('hello')
      expect(result.text).toBe('hello')
      expect(result.component).toBeUndefined()
    })

    it('parses object with text and component', () => {
      const result = parseAssistantPayload({
        text: '项目介绍',
        component: { type: 'ProjectCard', projectId: 'xrm' },
      })
      expect(result.text).toBe('项目介绍')
      expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
    })

    it('uses content field when text is missing', () => {
      const result = parseAssistantPayload({
        content: '使用 content 字段',
        component: { type: 'ProjectCard', projectId: 'xrm' },
      })
      expect(result.text).toBe('使用 content 字段')
      expect(result.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
    })

    it('drops invalid component and keeps text', () => {
      const result = parseAssistantPayload({
        text: '有效文本',
        component: { type: 'UnknownComponent' },
      })
      expect(result.text).toBe('有效文本')
      expect(result.component).toBeUndefined()
    })

    it('stringifies non-object non-string input', () => {
      const result = parseAssistantPayload(123)
      expect(result.text).toBe('123')
      expect(result.component).toBeUndefined()
    })
  })
})
