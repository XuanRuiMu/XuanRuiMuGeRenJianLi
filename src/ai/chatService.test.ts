import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendChatMessage, compactConversation, 是否超时错误, 是否中断错误 } from './chatService'
import { personalInfo } from '../data/personalInfo'
import { DEEPSEEK_MODEL, DEEPSEEK_ENDPOINT } from './deepseekConfig'
import { useAppStore } from '../store/useAppStore'

const mockFetch = vi.fn()

describe('chatService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    // 锁定思考强度（默认 high）与模型（默认 DeepSeek），避免跨用例状态污染
    useAppStore.setState({ aiThinking: 'high', aiModel: 'deepseek-v4.1-flash-expires-on-0910' })
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
    // 工具轨迹元数据：兜底必须诚实标注且保留真实检索命中数（FP-02根因修复）
    expect(result.meta.本地兜底).toBe(true)
    expect(result.meta.命中数).toBeGreaterThan(0)
    expect(result.meta.回退原因).toBe('network')
    expect(result.meta.耗时毫秒).toBeGreaterThanOrEqual(0)
  })

  it('falls back to the local ContactLinks component for contact questions when the call fails', async () => {
    const result = await sendChatMessage([{ role: 'user', content: '怎么联系你' }])

    expect(result.message.content).not.toContain(personalInfo.email)
    expect(result.message.content).not.toContain(personalInfo.phone)
    expect(result.message.component).toEqual({ type: 'ContactLinks' })
  })

  it('falls back to the local ProjectCard component for project questions when the call fails', async () => {
    const result = await sendChatMessage([{ role: 'user', content: '介绍一下暮澜纪元' }])

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

    const result = await sendChatMessage([{ role: 'user', content: '你是谁' }])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(callArgs[0]).toBe(DEEPSEEK_ENDPOINT)
    // 零密钥契约：前端不得构造鉴权头，凭据由同源反代注入
    expect((callArgs[1].headers as Record<string, string>).Authorization).toBeUndefined()
    expect((callArgs[1].headers as Record<string, string>)['Content-Type']).toBe('application/json')
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(body.model).toBe(DEEPSEEK_MODEL)
    expect(body.thinking).toEqual({ type: 'enabled' })
    // 默认强度 high：官方档位 reasoning_effort 直传
    expect(body.reasoning_effort).toBe('high')
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(result.message.content).toBe('DeepSeek 回答')
    // 远程成功时标注非兜底并给出检索命中数
    expect(result.meta.本地兜底).toBe(false)
    expect(result.meta.命中数).toBeGreaterThanOrEqual(0)
  })

  it('sends user images as vision content blocks（图片消息按官方块数组格式）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"text":"图里是一只猫"}' } }] }),
    })

    const result = await sendChatMessage(
      [
        {
          role: 'user',
          content: '这张图里有什么？',
          images: ['data:image/png;base64,QUJD', 'data:image/jpeg;base64,REVG'],
        },
      ]
    )

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(body.model).toBe(DEEPSEEK_MODEL)
    // 第一条是 system，第二条才是带图的用户消息
    const apiUserMessage = body.messages[1]
    expect(apiUserMessage.role).toBe('user')
    expect(apiUserMessage.content[0]).toEqual({ type: 'text', text: '这张图里有什么？' })
    expect(apiUserMessage.content[1]).toEqual({ type: 'image_url', image_url: { url: 'data:image/png;base64,QUJD' } })
    expect(apiUserMessage.content[2]).toEqual({
      type: 'image_url',
      image_url: { url: 'data:image/jpeg;base64,REVG' },
    })
    expect(result.message.content).toBe('图里是一只猫')
  })

  it('keeps plain string content for messages without images and for assistant history', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"text":"回答"}' } }] }),
    })

    await sendChatMessage(
      [
        { role: 'user', content: '问题一' },
        { role: 'assistant', content: '回答一' },
        { role: 'user', content: '问题二' },
      ]
    )

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(body.messages[1].content).toBe('问题一')
    expect(body.messages[2].content).toBe('回答一')
    expect(body.messages[3].content).toBe('问题二')
  })

  it('parses structured JSON response from DeepSeek', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                text: '推荐暮澜纪元项目',
                component: { type: 'ProjectCard', projectId: 'xrm' },
              }),
            },
          },
        ],
      }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '推荐一个项目' }])

    expect(result.message.content).toBe('推荐暮澜纪元项目')
    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('LLM链路蜂来问答同样可配追问信号（组件透传不断链）', async () => {
    const { 生成追问建议 } = await import('./followUpSuggestions')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                text: '蜂来介绍',
                component: { type: 'ProjectCard', projectId: 'fengLai' },
              }),
            },
          },
        ],
      }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '蜂来是做什么的' }])

    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'fengLai' })
    expect(生成追问建议('蜂来是做什么的', result.message)).toHaveLength(3)
  })

  it('falls back to text when DeepSeek returns plain text', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '纯文本回答' } }],
      }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '你好' }])

    expect(result.message.content).toBe('纯文本回答')
    expect(result.message.component).toBeUndefined()
  })

  it('falls back to local answer when LLM response is not ok (4xx)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => 'Unauthorized',
    })

    const result = await sendChatMessage([{ role: 'user', content: '怎么联系你' }], {})

    expect(result.message.content).not.toContain(personalInfo.email)
    expect(result.message.component).toEqual({ type: 'ContactLinks' })
  })

  it('falls back to local answer when LLM response is not ok (5xx)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: async () => 'Service Unavailable',
    })

    const result = await sendChatMessage([{ role: 'user', content: '介绍一下暮澜纪元' }])

    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('falls back to local answer when LLM request times out', async () => {
    mockFetch.mockRejectedValueOnce(new Error('timeout'))

    const result = await sendChatMessage([{ role: 'user', content: '你的技术栈' }])

    expect(result.message.component).toBeUndefined()
  })

  it('超时回退并标注timeout原因', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('请求超时', 'TimeoutError'))
    const result = await sendChatMessage([{ role: 'user', content: '介绍一下暮澜纪元' }])
    expect(result.meta.本地兜底).toBe(true)
    expect(result.meta.回退原因).toBe('timeout')
    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('falls back to local answer when LLM response format is invalid', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '教育背景' }])

    expect(result.message.component).toEqual({ type: 'Timeline', scope: 'education' })
  })

  it('passes the abort signal through to fetch（Claude Code Esc 中断链路）', async () => {
    const controller = new AbortController()
    let 捕获信号: AbortSignal | undefined
    mockFetch.mockImplementationOnce(async (_url: unknown, init?: RequestInit) => {
      捕获信号 = init?.signal as AbortSignal | undefined
      expect(捕获信号).toBeInstanceOf(AbortSignal)
      expect(捕获信号?.aborted).toBe(false)
      controller.abort()
      expect(捕获信号?.aborted).toBe(true)
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"text":"回答"}' } }] }),
      }
    })

    await sendChatMessage([{ role: 'user', content: '你是谁' }], {
      signal: controller.signal,
    })

    expect(捕获信号?.aborted).toBe(true)
  })

  it('rethrows AbortError without falling back to the local answer（中断不得被兜底吞掉）', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'))

    await expect(
      sendChatMessage([{ role: 'user', content: '你是谁' }])
    ).rejects.toMatchObject({
      name: 'AbortError',
    })
  })

  it('maps thinking intensity levels to official DeepSeek wire params', async () => {
    for (const [强度, thinking, reasoning_effort] of [
      ['low', { type: 'enabled' }, 'low'],
      ['max', { type: 'enabled' }, 'max'],
      ['off', { type: 'disabled' }, undefined],
    ] as const) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"text":"ok"}' } }] }),
      })
      useAppStore.setState({ aiThinking: 强度 })

      await sendChatMessage([{ role: 'user', content: '你是谁' }])

      const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
      const body = JSON.parse((callArgs[1].body as string) ?? '{}')
      expect(body.thinking).toEqual(thinking)
      expect(body.reasoning_effort).toBe(reasoning_effort)
    }
  })

  it('是否超时错误仅识别TimeoutError', () => {
    expect(是否超时错误(new DOMException('请求超时', 'TimeoutError'))).toBe(true)
    expect(是否超时错误(new DOMException('aborted', 'AbortError'))).toBe(false)
    expect(是否中断错误(new DOMException('aborted', 'AbortError'))).toBe(true)
    expect(是否中断错误(new DOMException('timeout', 'TimeoutError'))).toBe(false)
  })

  it('错误体截断且请求头不含鉴权材料', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500, text: async () => `x`.repeat(1000) })
    const result = await sendChatMessage([{ role: 'user', content: '你是谁' }], {})
    expect(result.meta.回退原因).toBe('http')
    const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
    const headers = callArgs[1].headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
    expect(JSON.stringify(headers)).not.toMatch(/Bearer|sk-/)
  })

  it('失败路径保留真实检索命中数（暮澜纪元失败仍有命中非0）', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service Unavailable' })
    const result = await sendChatMessage([{ role: 'user', content: '介绍一下暮澜纪元' }])
    expect(result.meta.本地兜底).toBe(true)
    expect(result.meta.命中数).toBeGreaterThan(0)
    expect(result.meta.回退原因).toBe('http')
    expect(result.meta.http状态).toBe(503)
    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
  })

  it('你好失败回退为问候语非没准备答案且命中0诚实', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    const { t } = await import('../i18n/translations')
    const result = await sendChatMessage([{ role: 'user', content: '你好' }])
    expect(result.message.content).toBe(t('chat.answers.greeting'))
    expect(result.message.content).not.toContain('没准备答案')
    expect(result.meta.本地兜底).toBe(true)
    expect(result.meta.命中数).toBe(0)
    expect(result.meta.回退原因).toBe('network')
  })

  it('你好成功时检索为空且非兜底（空上下文而非硬塞）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"text":"你好呀"}' } }] }),
    })
    const result = await sendChatMessage([{ role: 'user', content: '你好' }])
    expect(result.message.content).toBe('你好呀')
    expect(result.meta.本地兜底).toBe(false)
    expect(result.meta.命中数).toBe(0)
    const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(JSON.stringify(body)).not.toContain('暮澜纪元')
  })

  it('联系问法发给模型的上下文过滤邮箱直给块', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: JSON.stringify({ text: '点按钮联系', component: { type: 'ContactLinks' } }) } },
        ],
      }),
    })
    const result = await sendChatMessage([{ role: 'user', content: '怎么联系你' }])
    expect(result.message.component).toEqual({ type: 'ContactLinks' })
    const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    const 系统提示 = String(body.messages?.[0]?.content ?? '')
    expect(系统提示).not.toContain(personalInfo.email)
    expect(系统提示).not.toContain(personalInfo.phone)
    expect(系统提示).toContain('ContactLinks')
    expect(系统提示).not.toContain('ContactForm')
  })

  function 构造SSE响应(块列表: string[]): { ok: boolean; body: ReadableStream<Uint8Array> } {
    const 编码 = new TextEncoder()
    return {
      ok: true,
      body: new ReadableStream<Uint8Array>({
        start(控制器) {
          for (const 块 of 块列表) 控制器.enqueue(编码.encode(块))
          控制器.close()
        },
      }),
    }
  }

  function 构造SSE分片响应(块列表: string[]): { ok: boolean; body: ReadableStream<Uint8Array> } {
    const 编码 = new TextEncoder()
    let 下标 = 0
    return {
      ok: true,
      body: new ReadableStream<Uint8Array>({
        pull(控制器) {
          if (下标 >= 块列表.length) {
            控制器.close()
            return
          }
          控制器.enqueue(编码.encode(块列表[下标]))
          下标 += 1
        },
      }),
    }
  }

  function sse行(增量: Record<string, string>): string {
    return `data: ${JSON.stringify({ choices: [{ delta: 增量 }] })}\n\n`
  }

  it('请求体携带stream:true走SSE', async () => {
    mockFetch.mockResolvedValueOnce(构造SSE响应([sse行({ content: '{"text":"流式回答"}' }), 'data: [DONE]\n\n']))

    const result = await sendChatMessage([{ role: 'user', content: '你是谁' }])

    const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(body.stream).toBe(true)
    expect(body.response_format).toEqual({ type: 'json_object' })
    expect(result.message.content).toBe('流式回答')
  })

  it('reasoning与content先后增量到达onProgress且文本递增', async () => {
    const 内容前半 = '{"text":"答'
    const 内容后半 = '案"}'
    mockFetch.mockResolvedValueOnce(
      构造SSE分片响应([
        sse行({ reasoning_content: '思考一' }),
        sse行({ reasoning_content: '思考二' }),
        sse行({ content: 内容前半 }),
        sse行({ content: 内容后半 }),
        'data: [DONE]\n\n',
      ])
    )

    const 快照: Array<{ reasoning: string; content: string }> = []
    const result = await sendChatMessage([{ role: 'user', content: '你是谁' }], {
      onProgress: (进度) => 快照.push({ ...进度 }),
    })

    expect(快照.map((帧) => `${帧.reasoning}|${帧.content}`)).toEqual([
      '思考一|',
      '思考一思考二|',
      '思考一思考二|{"text":"答',
      '思考一思考二|{"text":"答案"}',
    ])
    const 首个回答帧 = 快照.findIndex((帧) => 帧.content.length > 0)
    expect(首个回答帧).toBeGreaterThan(1)
    expect(快照[快照.length - 1].content).toContain('{"text"')
    expect(result.message.content).toBe('答案')
    expect(result.message.reasoning).toBe('思考一思考二')
  })

  it('同chunk双字段不丢content', async () => {
    mockFetch.mockResolvedValueOnce(
      构造SSE响应([sse行({ reasoning_content: 'R', content: '{"text":"AB"}' }), 'data: [DONE]\n\n'])
    )

    const 快照: Array<{ reasoning: string; content: string }> = []
    const result = await sendChatMessage([{ role: 'user', content: '你是谁' }], {
      onProgress: (进度) => 快照.push({ ...进度 }),
    })

    expect(result.message.content).toBe('AB')
    expect(result.message.reasoning).toBe('R')
    expect(快照[快照.length - 1].content).toContain('AB')
  })

  it('data空行与[DONE]后usage空choices块被跳过', async () => {
    mockFetch.mockResolvedValueOnce(
      构造SSE响应([
        '\n',
        sse行({ content: '{"text":"OK"}' }),
        '\n',
        'data: [DONE]\n\n',
        'data: {"choices":[],"usage":{"prompt_tokens":1}}\n\n',
      ])
    )

    const result = await sendChatMessage([{ role: 'user', content: '你好' }])
    expect(result.message.content).toBe('OK')
  })

  it('流式中断抛AbortError且已累积增量保留、不进兜底', async () => {
    const 编码 = new TextEncoder()
    const 中断错 = new DOMException('The operation was aborted.', 'AbortError')
    const 控制器 = new AbortController()
    let 读次 = 0
    mockFetch.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        body: new ReadableStream<Uint8Array>({
          pull(流控) {
            读次 += 1
            if (读次 === 1) {
              流控.enqueue(编码.encode(sse行({ reasoning_content: '已累积' })))
              return Promise.resolve()
            }
            return Promise.resolve().then(() => {
              throw 中断错
            })
          },
        }),
      })
    )

    const 快照: Array<{ reasoning: string; content: string }> = []
    await expect(
      sendChatMessage([{ role: 'user', content: '你是谁' }], {
        signal: 控制器.signal,
        onProgress: (进度) => 快照.push({ ...进度 }),
      })
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(快照.length).toBeGreaterThanOrEqual(1)
    expect(快照[0].reasoning).toContain('已累积')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})

describe('compactConversation（/compact 语义压缩）', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    useAppStore.setState({ aiThinking: 'high', aiModel: 'deepseek-v4.1-flash-expires-on-0910' })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('returns the model summary text on success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"text":"用户询问了技术栈"}' } }] }),
    })

    const 摘要 = await compactConversation([
      { role: 'user', content: '你的技术栈是什么' },
      { role: 'assistant', content: 'React + TypeScript' },
    ])

    expect(摘要).toBe('用户询问了技术栈')
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(body.thinking).toEqual({ type: 'disabled' })
  })

  it('appends the focus instruction when provided（/compact [instructions]）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"text":"聚焦摘要"}' } }] }),
    })

    const 摘要 = await compactConversation([{ role: 'user', content: '介绍项目' }], { focus: '只看项目' })

    expect(摘要).toBe('聚焦摘要')
    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(JSON.stringify(body)).toContain('只看项目')
  })

  it('throws on failure instead of fabricating a local summary（压缩失败不得伪造摘要）', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 503, text: async () => 'Service Unavailable' })

    await expect(compactConversation([{ role: 'user', content: '你好' }])).rejects.toThrow()
  })
})

