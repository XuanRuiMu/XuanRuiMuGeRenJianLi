import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendChatMessage, compactConversation, 是否超时错误, 是否中断错误 } from './chatService'
import { 有可见正文 } from './structuredOutput'
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
    const result = await sendChatMessage([{ role: 'user', content: '介绍一下暮澜纪元' }])

    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(result.message.role).toBe('assistant')
    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'xrm' })
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
        choices: [{ message: { content: 'DeepSeek 回答' } }],
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
    expect(result.message.content).toBe('DeepSeek 回答')
    // 远程成功时标注非兜底并给出检索命中数
    expect(result.meta.本地兜底).toBe(false)
    expect(result.meta.命中数).toBeGreaterThanOrEqual(0)
  })

  it('聊天链路全程不发 response_format（官方不推荐与 thinking 同开）', async () => {
    // 根因回归：thinking.enabled + json_object 同开时，长回答的正文会整段落进 reasoning_content，
    // content 只剩 200+ 空格 padding，界面于是只剩工具轨迹与思考过程。逐档断言请求体。
    for (const 强度 of ['off', 'low', 'high', 'max'] as const) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '正文' } }] }),
      })
      useAppStore.setState({ aiThinking: 强度 })

      await sendChatMessage([{ role: 'user', content: '你的技术栈是什么？' }])

      const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
      const body = JSON.parse((callArgs[1].body as string) ?? '{}')
      expect(body.response_format, `思考档「${强度}」不得下发 json_object`).toBeUndefined()
      // 正文通道必须是纯文本形态：提示词不再要求 JSON
      expect(body.messages[0].content).not.toContain('"component"')
    }
  })

  it('远程回答的 meta 带依据来源（取自本轮检索命中的语料分类）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"text":"ok"}' } }] }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '他是哪个学校毕业的?' }])

    expect(result.meta.本地兜底).toBe(false)
    expect(result.meta.依据来源).toBeDefined()
    expect(result.meta.依据来源).toContain('教育背景')
    // 来源是检索出来的，不是模型自述的：必须与命中数同源
    expect(result.meta.依据来源!.length).toBeGreaterThan(0)
    expect(result.meta.依据来源!.length).toBeLessThanOrEqual(result.meta.命中数)
  })

  it('系统提示词约束教育三要素与评估问法须给带依据结论', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"text":"ok"}' } }] }),
    })

    await sendChatMessage([{ role: 'user', content: '他是哪个学校毕业的?' }])

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    const 系统提示: string = body.messages[0].content
    expect(系统提示).toContain('学校、专业、学制三要素')
    // 第一人称扮演本人：不许再出现「他的简历」式第三人称转述
    expect(系统提示).toContain('你是玄锐暮本人的 AI 分身')
    expect(系统提示).toContain('第一人称')
    expect(系统提示).not.toContain('你是玄锐暮的简历 AI 助手')
    // 评估类问题不得再搪塞拒绝：必须给结论 + 挂证据 + 讲缺口
    expect(系统提示).toContain('必须给出明确结论')
    expect(系统提示).toContain('我无法替他下结论')
    expect(系统提示).toContain('简历未体现')
    expect(系统提示).toContain('事实与推断必须分开措辞')
    // 上下文缺失仍不得编造，是保留下来的硬约束
    expect(系统提示).toContain('不得编造')
  })

  it('系统提示词已无 JSON/组件协议（思考流无从泄漏输出格式取舍）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    })

    await sendChatMessage([{ role: 'user', content: '你是谁' }])

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    const 系统提示: string = body.messages[0].content
    // 输出协议整体下线：正文是纯自然语言，组件由意图表决定，提示词里不得再出现协议残留
    expect(系统提示).not.toContain('component')
    expect(系统提示).not.toContain('ProjectCard')
    expect(系统提示).not.toContain('ContactLinks')
    expect(系统提示).not.toContain('"text"')
    expect(系统提示).toMatch(/直接用中文自然语言回答/)
    // 联系渠道不直给仍是硬约束（联系方式组件只给入口，不给号码与邮箱）
    expect(系统提示).toMatch(/不要在回答里直接写出邮箱、电话、QQ、微信号/)
  })

  it('sends user images as vision content blocks（图片消息按官方块数组格式）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '图里是一只猫' } }] }),
    })

    const result = await sendChatMessage([
      {
        role: 'user',
        content: '这张图里有什么？',
        images: ['data:image/png;base64,QUJD', 'data:image/jpeg;base64,REVG'],
      },
    ])

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

    await sendChatMessage([
      { role: 'user', content: '问题一' },
      { role: 'assistant', content: '回答一' },
      { role: 'user', content: '问题二' },
    ])

    const callArgs = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(body.messages[1].content).toBe('问题一')
    expect(body.messages[2].content).toBe('回答一')
    expect(body.messages[3].content).toBe('问题二')
  })

  it('模型正文里的 component 一律忽略：组件只认意图表判定', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '推荐暮澜纪元项目，另外附一个联系方式组件。',
            },
          },
        ],
      }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '推荐一个项目' }])

    expect(result.message.content).toBe('推荐暮澜纪元项目，另外附一个联系方式组件。')
    expect(result.message.component).toBeUndefined()
  })

  it('组件与本地兜底同源：问项目/联系/教育时在线也挂同一张卡片', async () => {
    for (const [问句, 期望组件] of [
      ['介绍一下暮澜纪元', { type: 'ProjectCard', projectId: 'xrm' }],
      ['怎么联系你', { type: 'ContactLinks' }],
      ['教育背景', { type: 'Timeline', scope: 'education' }],
      ['你的技术栈', undefined],
    ] as const) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '模型正文' } }] }),
      })

      const result = await sendChatMessage([{ role: 'user', content: 问句 }])

      expect(result.message.content).toBe('模型正文')
      expect(result.message.component, `「${问句}」组件判定`).toEqual(期望组件)
      expect(result.meta.本地兜底).toBe(false)
    }
  })

  it('LLM链路羊来问答同样可配追问信号（组件由意图表挂载不断链）', async () => {
    const { 生成追问建议 } = await import('./followUpSuggestions')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '羊来介绍' } }],
      }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '羊来是做什么的' }])

    expect(result.message.component).toEqual({ type: 'ProjectCard', projectId: 'yangLai' })
    expect(生成追问建议('羊来是做什么的', result.message)).toHaveLength(3)
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

  it('学校口语问法失败回退仍命中教育预制答案与时间线（用户原话回归）', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'))
    const result = await sendChatMessage([{ role: 'user', content: '他是哪个学校毕业的?' }])
    expect(result.meta.本地兜底).toBe(true)
    expect(result.message.content).toContain('天津仁爱学院')
    expect(result.message.component).toEqual({ type: 'Timeline', scope: 'education' })
  })

  it('流式content为空时保留reasoning并回退本地兜底（有思考无结果根因）', async () => {
    mockFetch.mockResolvedValueOnce(构造SSE响应([sse行({ reasoning_content: '只有思考' }), 'data: [DONE]\n\n']))
    const 快照: Array<{ reasoning: string; content: string }> = []
    const result = await sendChatMessage([{ role: 'user', content: '他是哪个学校毕业的?' }], {
      onProgress: (进度) => 快照.push({ ...进度 }),
    })
    expect(快照.length).toBeGreaterThanOrEqual(1)
    expect(快照[0].reasoning).toContain('只有思考')
    expect(result.meta.本地兜底).toBe(true)
    expect(result.meta.回退原因).toBe('format')
    expect(result.message.content).toContain('天津仁爱学院')
    expect(result.message.reasoning).toContain('只有思考')
    expect(result.message.component).toEqual({ type: 'Timeline', scope: 'education' })
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

    await expect(sendChatMessage([{ role: 'user', content: '你是谁' }])).rejects.toMatchObject({
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
      json: async () => ({ choices: [{ message: { content: '你好呀' } }] }),
    })
    const result = await sendChatMessage([{ role: 'user', content: '你好' }])
    expect(result.message.content).toBe('你好呀')
    expect(result.meta.本地兜底).toBe(false)
    expect(result.meta.命中数).toBe(0)
    const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(JSON.stringify(body)).not.toContain('暮澜纪元')
  })

  it('联系问法发给模型的上下文过滤邮箱直给块（组件只给入口）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '点按钮联系' } }] }),
    })
    const result = await sendChatMessage([{ role: 'user', content: '怎么联系你' }])
    // ContactLinks 现在由意图表挂载，不再依赖模型吐出组件
    expect(result.message.component).toEqual({ type: 'ContactLinks' })
    const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    const 系统提示 = String(body.messages?.[0]?.content ?? '')
    expect(系统提示).not.toContain(personalInfo.email)
    expect(系统提示).not.toContain(personalInfo.phone)
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

  it('请求体携带stream:true走SSE且不再下发json_object', async () => {
    mockFetch.mockResolvedValueOnce(构造SSE响应([sse行({ content: '流式回答' }), 'data: [DONE]\n\n']))

    const result = await sendChatMessage([{ role: 'user', content: '你是谁' }])

    const callArgs = mockFetch.mock.calls.at(-1) as [string, RequestInit]
    const body = JSON.parse((callArgs[1].body as string) ?? '{}')
    expect(body.stream).toBe(true)
    expect(body.response_format).toBeUndefined()
    expect(result.message.content).toBe('流式回答')
  })

  it('reasoning与content先后增量到达onProgress且文本递增', async () => {
    const 内容前半 = '答'
    const 内容后半 = '案'
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
      '思考一思考二|答',
      '思考一思考二|答案',
    ])
    expect(result.message.content).toBe('答案')
    expect(result.message.reasoning).toBe('思考一思考二')
  })

  it('同chunk双字段不丢content', async () => {
    mockFetch.mockResolvedValueOnce(构造SSE响应([sse行({ reasoning_content: 'R', content: 'AB' }), 'data: [DONE]\n\n']))

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
        sse行({ content: 'OK' }),
        '\n',
        'data: [DONE]\n\n',
        'data: {"choices":[],"usage":{"prompt_tokens":1}}\n\n',
      ])
    )

    const result = await sendChatMessage([{ role: 'user', content: '你好' }])
    expect(result.message.content).toBe('OK')
  })

  /**
   * 根因回归组：thinking 与 json_object 同开时上游把正文整段挤进 reasoning、content 只剩空白 padding。
   * 三种空正文形态（纯空白 / 空信封 / 空串）都必须落到本地兜底，绝不能把空白当答案落库。
   */
  it.each([
    ['纯空白padding', ' '.repeat(232)],
    ['零宽字符', '\u200b'.repeat(232)],
    ['制表与换行', '\n\t \n'],
    ['空串', ''],
  ])('content 为%s时回退本地兜底且保留思考流', async (标签, 原始正文) => {
    mockFetch.mockResolvedValueOnce(
      构造SSE响应([sse行({ reasoning_content: '只有思考' }), sse行({ content: 原始正文 }), 'data: [DONE]\n\n'])
    )

    const result = await sendChatMessage([{ role: 'user', content: '你的技术栈是什么？' }])

    expect(result.meta.本地兜底, `${标签} 必须兜底`).toBe(true)
    expect(result.meta.回退原因).toBe('format')
    expect(result.message.content.trim().length, `${标签} 兜底正文不得为空白`).toBeGreaterThan(0)
    expect(result.message.reasoning).toContain('只有思考')
    expect(result.meta.依据来源).toEqual(expect.any(Array))
  })

  it('非流式空白正文同样走兜底（非流式分支曾只看 typeof string）', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '   \n  ' } }] }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '教育背景' }])

    expect(result.meta.本地兜底).toBe(true)
    expect(result.meta.回退原因).toBe('format')
    expect(result.message.content).toContain('天津仁爱学院')
    expect(result.message.component).toEqual({ type: 'Timeline', scope: 'education' })
  })

  it('JSON 信封被 token 截断时原样送达（聊天链路不改写正文），截断如实标注', async () => {
    mockFetch.mockResolvedValueOnce(
      构造SSE响应([
        sse行({ reasoning_content: '思考' }),
        sse行({ content: '核心技术栈：Java 25、Node.js。' }),
        'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n',
        'data: [DONE]\n\n',
      ])
    )

    const result = await sendChatMessage([{ role: 'user', content: '你的技术栈是什么？' }])

    expect(result.message.content).toBe('核心技术栈：Java 25、Node.js。')
    expect(result.meta.本地兜底).toBe(false)
    expect(result.meta.截断).toBe(true)
  })

  it('finish_reason=length 且正文为空时按「输出预算耗尽」而非「格式异常」兜底（原因必须诚实）', async () => {
    mockFetch.mockResolvedValueOnce(
      构造SSE响应([
        sse行({ reasoning_content: '思考很长吃满预算' }),
        sse行({ content: '   ' }),
        'data: {"choices":[{"delta":{},"finish_reason":"length"}]}\n\n',
        'data: [DONE]\n\n',
      ])
    )

    const result = await sendChatMessage([{ role: 'user', content: '教育背景' }])

    expect(result.meta.本地兜底).toBe(true)
    expect(result.meta.回退原因).toBe('truncated')
    expect(result.message.content).toContain('天津仁爱学院')
  })

  it('访客索要 JSON 时正文原样送达（聊天链路绝不吞掉或改写真实答案）', async () => {
    const 访客要的JSON = '{"text":["a","b"],"count":2}'
    mockFetch.mockResolvedValueOnce(构造SSE响应([sse行({ content: 访客要的JSON }), 'data: [DONE]\n\n']))

    const result = await sendChatMessage([{ role: 'user', content: '给我一段 JSON 示例' }])

    expect(result.message.content).toBe(访客要的JSON)
    expect(result.meta.本地兜底).toBe(false)
  })

  it('非流式分支同样透传 finish_reason 截断标记', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '半截回答' }, finish_reason: 'length' }] }),
    })

    const result = await sendChatMessage([{ role: 'user', content: '你做过哪些项目' }])

    expect(result.message.content).toBe('半截回答')
    expect(result.meta.截断).toBe(true)
    expect(result.meta.本地兜底).toBe(false)
  })

  /**
   * 逐帧驱动（每帧 3~6 字，模拟真实 SSE 分片）：长回答下每一帧都必须与「整段累加后」的
   * 结果一致，且落定值等于最后一帧值。e2e 的 route.fulfill 是一次性投喂、无法真正分帧，
   * 流式路径的逐帧行为只能在这里被证明。
   */
  it('长回答逐帧分片：每帧可见且落定值等于最后一帧（流式与落定不分叉）', async () => {
    const 原文 =
      '核心技术栈：Java 25 与 GraalVM 跑 Spigot/Purpur 服务端插件，Node.js 走 Express 全栈，Python 做自动化与 AI 工具链。'
    const 帧列表: string[] = []
    for (let 下标 = 0; 下标 < 原文.length; 下标 += 5) 帧列表.push(sse行({ content: 原文.slice(下标, 下标 + 5) }))
    mockFetch.mockResolvedValueOnce(构造SSE分片响应([...帧列表, 'data: [DONE]\n\n']))

    const 快照: Array<string> = []
    const result = await sendChatMessage([{ role: 'user', content: '你的技术栈是什么？' }], {
      onProgress: (进度) => 快照.push(进度.content),
    })

    // 每帧都是原答案的递增前缀（逐字直写，不做任何改写）
    expect(快照.length).toBe(帧列表.length)
    快照.forEach((帧, 序) => {
      expect(帧).toBe(原文.slice(0, (序 + 1) * 5))
      expect(有可见正文(帧)).toBe(true)
    })
    expect(快照[快照.length - 1]).toBe(原文)
    expect(result.message.content).toBe(原文)
    expect(result.meta.本地兜底).toBe(false)
  })

  it('思考帧先于正文帧到达时，中途不误判为「无正文」', async () => {
    mockFetch.mockResolvedValueOnce(
      构造SSE分片响应([
        sse行({ reasoning_content: '先想' }),
        sse行({ reasoning_content: '再想' }),
        sse行({ content: '第一段' }),
        sse行({ content: '第二段' }),
        'data: [DONE]\n\n',
      ])
    )

    const 快照: Array<{ reasoning: string; content: string }> = []
    const result = await sendChatMessage([{ role: 'user', content: '你是谁' }], {
      onProgress: (进度) => 快照.push({ ...进度 }),
    })

    expect(快照.slice(0, 2).map((帧) => 帧.content)).toEqual(['', ''])
    expect(result.message.reasoning).toBe('先想再想')
    expect(result.message.content).toBe('第一段第二段')
    expect(result.meta.本地兜底).toBe(false)
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

  it.each([
    ['空信封', '{"text":""}'],
    ['没有text字段', '{"answer":"别的字段名"}'],
    ['纯空白文本', '   '],
    ['非字符串', undefined],
  ])('压缩返回%s时报错而非写入空摘要（空历史会让后续对话失忆）', async (标签, rawContent) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: rawContent } }] }),
    })

    await expect(compactConversation([{ role: 'user', content: '你好' }]), 标签).rejects.toThrow('压缩返回格式异常')
  })
})
