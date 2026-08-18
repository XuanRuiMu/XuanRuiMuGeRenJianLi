import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendChatMessage } from './chatService'
import { personalInfo } from '../data/personalInfo'
import { DEEPSEEK_MODEL, DEEPSEEK_ENDPOINT } from './deepseekConfig'

const mockFetch = vi.fn()

describe('chatService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('attempts the DeepSeek API and falls back to the local answer when the call fails', async () => {
    // mockFetch 默认返回 undefined → callDeepSeek 抛错 → 回退本地 RAG 兜底
    const result = await sendChatMessage([{ role: 'user', content: '你叫什么' }])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.message.role).toBe('assistant')
    expect(result.message.content).toContain(personalInfo.name)
    expect(result.message.component).toBeUndefined()
  })

  it('falls back to the local ContactForm component for contact questions when the call fails', async () => {
    const result = await sendChatMessage([{ role: 'user', content: '怎么联系你' }])

    expect(result.message.content).toContain(personalInfo.email)
    expect(result.message.component).toEqual({ type: 'ContactForm' })
  })

  it('falls back to the local ProjectCard component for project questions when the call fails', async () => {
    const result = await sendChatMessage([{ role: 'user', content: '介绍一下已删除的经历' }])

    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('falls back to a skills text answer (no component) when the call fails', async () => {
    const result = await sendChatMessage([{ role: 'user', content: '你的技术栈' }])

    expect(result.message.component).toBeUndefined()
  })

  it('falls back to the local Timeline component for education questions when the call fails', async () => {
    const result = await sendChatMessage([{ role: 'user', content: '教育背景' }])

    expect(result.message.component).toEqual({ type: 'Timeline', scope: 'education' })
  })

  it('calls the DeepSeek endpoint with the configured model and API key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '{"text":"DeepSeek 回答"}' } }],
      }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '你是谁' }], {
      deepseekApiKey: 'sk-test',
    })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(callArgs[0]).toBe(DEEPSEEK_ENDPOINT)
    expect((callArgs[1].headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(body.model).toBe(DEEPSEEK_MODEL)
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(result.message.content).toBe('DeepSeek 回答')
  })

  it('parses structured JSON response from DeepSeek', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                text: '推荐已删除的经历项目',
                component: { type: 'ProjectCard', projectId: 'xrm' },
              }),
            },
          },
        ],
      }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '推荐一个项目' }], {
      deepseekApiKey: 'sk-test',
    })

    expect(result.message.content).toBe('推荐已删除的经历项目')
    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('falls back to text when DeepSeek returns plain text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '纯文本回答' } }],
      }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '你好' }], {
      deepseekApiKey: 'sk-test',
    })

    expect(result.message.content).toBe('纯文本回答')
    expect(result.message.component).toBeUndefined()
  })

  it('falls back to local answer when LLM response is not ok (4xx)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    })

    const result = await sendChatMessage([{ role: 'user', content: '怎么联系你' }], { deepseekApiKey: 'bad-key' })

    expect(result.message.content).toContain(personalInfo.email)
    expect(result.message.component).toEqual({ type: 'ContactForm' })
  })

  it('falls back to local answer when LLM response is not ok (5xx)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    })

    const result = await sendChatMessage([{ role: 'user', content: '介绍一下已删除的经历' }], { deepseekApiKey: 'sk-test' })

    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('falls back to local answer when LLM request times out', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'))

    const result = await sendChatMessage([{ role: 'user', content: '你的技术栈' }], { deepseekApiKey: 'sk-test' })

    expect(result.message.component).toBeUndefined()
  })

  it('falls back to local answer when LLM response format is invalid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '教育背景' }], { deepseekApiKey: 'sk-test' })

    expect(result.message.component).toEqual({ type: 'Timeline', scope: 'education' })
  })
})
