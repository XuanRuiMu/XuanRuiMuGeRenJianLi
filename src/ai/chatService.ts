import { useMutation } from '@tanstack/react-query'
import type { AiMessage, AiToolMeta } from '../store/useAppStore'
import { retrieveChunks } from './ragEngine'
import { getLocalAnswer } from './localEngine'
import { extractJsonFromText, parseAssistantPayload, type AssistantPayload } from './structuredOutput'
import { DEEPSEEK_MAX_TOKENS, DEEPSEEK_RETRIEVE_TOP_K } from './deepseekConfig'
import { 解析模型, 聊天超时毫秒, type 思考强度, type 模型定义 } from './models'
import { useAppStore, type 回退原因 } from '../store/useAppStore'

export interface ChatOptions {
  model?: string
  maxContextChunks?: number
  /** /compact 可选聚焦说明 */
  focus?: string
  /** 中断信号（对齐 Claude Code 的 Esc 中断语义）；abort 时抛出 AbortError，不回退本地兜底 */
  signal?: AbortSignal
  /** SSE 流式增量回调：reasoning 阶段与 content 阶段分别回调，先思考流后回答流 */
  onProgress?: (进度: { reasoning: string; content: string }) => void
}

export interface ChatServiceResult {
  message: AiMessage
  /** 检索轨迹元数据 */
  meta: AiToolMeta
}

function 获取最后用户内容(messages: AiMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content
    }
  }
  return ''
}

function buildSystemPrompt(context: string): string {
  return `你是玄锐暮的简历 AI 助手。你可以自由与用户交流任何话题，但不得生成违法违规内容；涉及玄锐暮本人信息时，以下方简历上下文为准，上下文没有的信息不要编造。

你必须以 JSON 格式回复，格式如下：
{
  "text": "回复文本（必填）",
  "component": {
    "type": "ProjectCard" | "Timeline" | "ContactLinks"
    // ProjectCard 额外字段：projectId: "xrm" | "lovewithme" | "aiConsole" | "fengLai"
    // Timeline 额外字段：scope?: "experience" | "media" | "education"
    // ContactLinks 无额外字段
  }
}

component 字段可选，仅在用户询问项目、经历/时间线或联系方式时返回对应组件。用户询问联系方式时，只返回 ContactLinks 组件，文本用引导语，不得在文本中直接给出邮箱、电话、QQ、微信号。用户发来图片时，结合图片内容回答。

简历上下文：
${context}`
}

function parseDeepSeekResponse(rawContent: string): AssistantPayload {
  const extracted = extractJsonFromText(rawContent)
  return parseAssistantPayload(extracted)
}

export function 是否中断错误(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError'
}

export function 是否超时错误(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'TimeoutError'
}

function 合并中断信号(用户信号?: AbortSignal, 超时毫秒?: number): { 信号: AbortSignal | undefined; 清理: () => void } {
  if (!用户信号 && !(超时毫秒 && 超时毫秒 > 0)) {
    return { 信号: 用户信号, 清理: () => {} }
  }
  const 控制器 = new AbortController()
  const 清理项: Array<() => void> = []
  if (用户信号) {
    if (用户信号.aborted) {
      控制器.abort((用户信号 as AbortSignal & { reason?: unknown }).reason)
    } else {
      const 转发中断 = () => 控制器.abort((用户信号 as AbortSignal & { reason?: unknown }).reason)
      用户信号.addEventListener('abort', 转发中断, { once: true })
      清理项.push(() => 用户信号.removeEventListener('abort', 转发中断))
    }
  }
  if (超时毫秒 && 超时毫秒 > 0) {
    const 计时器 = setTimeout(() => {
      控制器.abort(new DOMException('请求超时', 'TimeoutError'))
    }, 超时毫秒)
    清理项.push(() => clearTimeout(计时器))
  }
  return {
    信号: 控制器.signal,
    清理: () => {
      for (const 清理单项 of 清理项) 清理单项()
    },
  }
}

async function 带超时请求(
  地址: string,
  初始化: RequestInit,
  用户信号?: AbortSignal,
  超时毫秒?: number
): Promise<Response> {
  const { 信号, 清理 } = 合并中断信号(用户信号, 超时毫秒)
  try {
    return await fetch(地址, 信号 ? { ...初始化, signal: 信号 } : 初始化)
  } finally {
    清理()
  }
}

function 抛出响应错误(响应: Response, 正文: string): never {
  const 错误 = new Error(`LLM 请求失败：${响应.status} ${正文.slice(0, 300)}`) as Error & { http状态?: number }
  错误.http状态 = 响应.status
  throw 错误
}

function 分类回退原因(err: unknown): { 回退原因: 回退原因; http状态?: number } {
  if (是否超时错误(err)) return { 回退原因: 'timeout' }
  const 状态 = (err as { http状态?: unknown } | null)?.http状态
  if (typeof 状态 === 'number') return { 回退原因: 'http', http状态: 状态 }
  if (err instanceof Error && err.message.includes('返回格式异常')) return { 回退原因: 'format' }
  return { 回退原因: 'network' }
}

/**
 * 把一条 AiMessage 转为 API 消息体。
 * 带 images 的 user 消息按 vision 格式拆块数组（text 块 + image_url 块）；
 * 其余（含 assistant）保持纯字符串——API 限制图片仅允许出现在 user 消息中。
 */
function 到Api消息(message: AiMessage): Record<string, unknown> {
  const hasImages = message.role === 'user' && !!message.images && message.images.length > 0
  if (!hasImages) {
    return { role: message.role, content: message.content }
  }
  return {
    role: message.role,
    content: [
      { type: 'text', text: message.content },
      ...(message.images ?? []).map((url) => ({ type: 'image_url', image_url: { url } })),
    ],
  }
}

/**
 * DeepSeek(OpenAI 兼容)思考体：官方 thinking_mode 档位——关闭即 thinking.disabled 且不带
 * reasoning_effort；开启档 thinking.enabled + reasoning_effort 直传 low/high/max。
 */
function 思考体OpenAI(强度: 思考强度): Record<string, unknown> {
  if (强度 === 'off') return { thinking: { type: 'disabled' } }
  return { thinking: { type: 'enabled' }, reasoning_effort: 强度 }
}

/**
 * SSE 行解析：按 DeepSeek 官方 thinking_mode 流式示例累加 delta。
 * 同 chunk 双字段各自累加，禁丢 content；choices 空数组（如 [DONE] 后 usage 块）跳过。
 */
export function 累加流式增量(
  增量: { reasoning_content?: unknown; content?: unknown },
  累加: { reasoning: string; content: string }
): void {
  if (typeof 增量.reasoning_content === 'string' && 增量.reasoning_content.length > 0) {
    累加.reasoning += 增量.reasoning_content
  }
  if (typeof 增量.content === 'string' && 增量.content.length > 0) {
    累加.content += 增量.content
  }
}

export function 解析SSE行(行: string): { reasoning_content?: string; content?: string } | null {
  const 去首空格 = 行.trim()
  if (去首空格 === '' || !去首空格.startsWith('data:')) return null
  const 载荷 = 去首空格.slice('data:'.length).trim()
  if (载荷 === '' || 载荷 === '[DONE]') return null
  let 解析值: unknown
  try {
    解析值 = JSON.parse(载荷)
  } catch {
    return null
  }
  const 增量 = (解析值 as { choices?: Array<{ delta?: unknown }> })?.choices?.[0]?.delta as
    Record<string, unknown> | undefined
  if (!增量 || typeof 增量 !== 'object') return null
  const 结果: { reasoning_content?: string; content?: string } = {}
  if (typeof 增量.reasoning_content === 'string') 结果.reasoning_content = 增量.reasoning_content
  if (typeof 增量.content === 'string') 结果.content = 增量.content
  return 结果
}

async function callOpenAICompletions(
  模型: 模型定义,
  messages: AiMessage[],
  systemPrompt: string,
  思考强度档: 思考强度,
  signal?: AbortSignal,
  onProgress?: (进度: { reasoning: string; content: string }) => void
): Promise<AiMessage> {
  const body: Record<string, unknown> = {
    model: 模型.id,
    messages: [{ role: 'system', content: systemPrompt }, ...messages.map(到Api消息)],
    temperature: 0.6,
    max_tokens: DEEPSEEK_MAX_TOKENS,
    response_format: { type: 'json_object' },
    stream: true,
    ...思考体OpenAI(思考强度档),
  }

  // 凭据由同源反代注入：前端不得构造鉴权头（credentialGuard）
  const response = await 带超时请求(
    模型.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
    signal,
    聊天超时毫秒
  )

  if (!response.ok) {
    const text = await response.text()
    抛出响应错误(response, text)
  }

  if (!response.body || typeof (response.body as ReadableStream<Uint8Array>).getReader !== 'function') {
    const data = await response.json()
    const rawContent = data.choices?.[0]?.message?.content

    if (typeof rawContent !== 'string') {
      throw new Error('LLM 返回格式异常')
    }

    const payload = parseDeepSeekResponse(rawContent)
    return { role: 'assistant', content: payload.text, component: payload.component }
  }

  const 读取器 = (response.body as ReadableStream<Uint8Array>).getReader()
  const 解码器 = new TextDecoder()
  let 缓冲 = ''
  const 累加 = { reasoning: '', content: '' }
  const 推送 = () => {
    if (onProgress) onProgress({ reasoning: 累加.reasoning, content: 累加.content })
  }
  const 中断拒因 = (): unknown =>
    (signal as AbortSignal & { reason?: unknown })?.reason ??
    new DOMException('The operation was aborted.', 'AbortError')
  const 推送行 = (行: string): void => {
    const 增量 = 解析SSE行(行)
    if (!增量) return
    const 前思考长 = 累加.reasoning.length
    const 前回答长 = 累加.content.length
    累加流式增量(增量, 累加)
    if (累加.reasoning.length !== 前思考长 || 累加.content.length !== 前回答长) 推送()
  }
  try {
    for (;;) {
      if (signal?.aborted) throw 中断拒因()
      const { done, value } = await 读取器.read()
      if (done) break
      if (signal?.aborted) throw 中断拒因()
      缓冲 += 解码器.decode(value, { stream: true })
      const 行列表 = 缓冲.split('\n')
      缓冲 = 行列表.pop() ?? ''
      for (const 行 of 行列表) 推送行(行)
    }
    if (缓冲.trim() !== '') 推送行(缓冲)
  } catch (读取错) {
    try {
      读取器.releaseLock()
    } catch {
      // 释放锁失败不掩盖原始错误
    }
    throw 读取错
  }
  读取器.releaseLock()

  if (signal?.aborted) throw 中断拒因()

  if (typeof 累加.content !== 'string' || 累加.content.length === 0) {
    throw new Error('LLM 返回格式异常')
  }

  const payload = parseDeepSeekResponse(累加.content)
  const 消息: AiMessage = { role: 'assistant', content: payload.text, component: payload.component }
  if (累加.reasoning.length > 0) 消息.reasoning = 累加.reasoning
  return 消息
}

function 解析本次模型(options: ChatOptions): 模型定义 {
  const storeModel = useAppStore.getState().aiModel
  return 解析模型(options.model ?? storeModel)
}

async function callChatModel(
  messages: AiMessage[],
  systemPrompt: string,
  思考强度档: 思考强度,
  options: ChatOptions
): Promise<AiMessage> {
  return callOpenAICompletions(
    解析本次模型(options),
    messages,
    systemPrompt,
    思考强度档,
    options.signal,
    options.onProgress
  )
}

export async function sendChatMessage(messages: AiMessage[], options: ChatOptions = {}): Promise<ChatServiceResult> {
  const userQuestion = 获取最后用户内容(messages)
  const contextChunks = retrieveChunks(userQuestion, DEEPSEEK_RETRIEVE_TOP_K)
  const 安全上下文块 = contextChunks.filter((块) => 块.id !== 'personal-info-contact')
  const context = 安全上下文块.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join('\n\n')
  const 开始毫秒 = Date.now()

  try {
    // 思考开关来自全局 store；上下文默认拉满：每次请求发送完整对话历史（API 无状态需自行携带）。
    const { aiThinking } = useAppStore.getState()
    const answer = await callChatModel(messages, buildSystemPrompt(context), aiThinking, options)
    return {
      message: answer,
      meta: { 命中数: 安全上下文块.length, 耗时毫秒: Date.now() - 开始毫秒, 本地兜底: false },
    }
  } catch (err) {
    if (是否中断错误(err)) throw err
    const 分类 = 分类回退原因(err)
    return {
      message: getLocalAnswer(userQuestion),
      meta: {
        命中数: 安全上下文块.length,
        耗时毫秒: Date.now() - 开始毫秒,
        本地兜底: true,
        回退原因: 分类.回退原因,
        ...(typeof 分类.http状态 === 'number' ? { http状态: 分类.http状态 } : {}),
      },
    }
  }
}

/**
 * /compact 指令（对齐 Claude Code）：调用模型把历史对话压缩为一段语义摘要。
 * 与 /clear 的区别：保留语义而非完全清空。失败原样上抛（不本地兜底，
 * 因为兜底会伪造摘要，违反压缩语义）。
 */
export async function compactConversation(messages: AiMessage[], options: ChatOptions = {}): Promise<string> {
  const 对话序列化 = messages
    .map((message) => `${message.role === 'user' ? '用户' : '助手'}：${message.content}`)
    .join('\n')
  const 压缩指令 =
    '你是对话压缩器。把用户给出的对话历史压缩为一段简明中文摘要，保留关键事实与未完成的诉求。必须以 JSON 格式回复：{"text": "摘要内容"}' +
    (options.focus ? `\n聚焦说明：${options.focus}` : '')

  const 模型 = 解析本次模型(options)
  const response = await 带超时请求(
    模型.endpoint,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 模型.id,
        messages: [
          { role: 'system', content: 压缩指令 },
          { role: 'user', content: 对话序列化 },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: 'json_object' },
        thinking: { type: 'disabled' },
      }),
    },
    options.signal,
    聊天超时毫秒
  )
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`压缩请求失败：${response.status} ${text.slice(0, 300)}`)
  }
  const data = await response.json()
  const rawContent: unknown = data.choices?.[0]?.message?.content
  if (typeof rawContent !== 'string') {
    throw new Error('压缩返回格式异常')
  }
  return parseDeepSeekResponse(rawContent).text
}

export function useChatService(options: ChatOptions = {}) {
  return useMutation({
    mutationFn: async ({
      messages,
      signal,
      model,
      onProgress,
    }: {
      messages: AiMessage[]
      signal?: AbortSignal
      model?: string
      onProgress?: (进度: { reasoning: string; content: string }) => void
    }) => {
      return sendChatMessage(messages, {
        ...options,
        ...(model ? { model } : {}),
        signal,
        ...(onProgress ? { onProgress } : {}),
      })
    },
  })
}
