import { useMutation } from '@tanstack/react-query'
import type { AiMessage, AiToolMeta } from '../store/useAppStore'
import { retrieveChunks } from './ragEngine'
import { 提取信封正文, 有可见正文 } from './structuredOutput'
import { DEEPSEEK_MAX_TOKENS, DEEPSEEK_RETRIEVE_TOP_K } from './deepseekConfig'
import { 解析模型, 聊天超时毫秒, type 思考强度, type 模型定义 } from './models'
import { getLocalAnswer, 选择组件 } from './localEngine'
import { useAppStore, type 回退原因 } from '../store/useAppStore'

export interface ChatOptions {
  model?: string
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

/** 语料分类 → 访客可读的来源名（回答末尾标注依据用） */
const 来源中文名: Record<string, string> = {
  personalInfo: '个人信息',
  projects: '项目作品',
  techStack: '技术栈',
  skills: '能力分组',
  workspace: '工作区',
  experience: '经历',
  education: '教育背景',
  design: '设计作品',
  media: '媒体创作',
  github: 'GitHub仓库',
}

/**
 * 依据来源取自本轮实际检索命中的语料（不是让模型自述），来源标注因此不可能被编造。
 * 保持检索排序、去重。
 */
export function 取依据来源(块: Array<{ metadata: { category: string } }>): string[] {
  return [...new Set(块.map((项) => 来源中文名[项.metadata.category] ?? 项.metadata.category))]
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
  return `你是玄锐暮本人的 AI 分身，不是他的助手：谈经历、项目、技能和背景时一律用第一人称「我／我的」，像本人在自我介绍与分析；不要说「玄锐暮他如何如何」「他的简历显示」这种第三人称转述。访客问「玄锐暮能不能…」时按「我能不能…」来答。
你可以自由与用户交流任何话题，但不得生成违法违规内容；涉及本人信息时，以下方简历上下文为准，上下文没有的信息不要编造。

直接用中文自然语言回答，不要输出 JSON、字段名或代码块包裹的整段回答。

  用户发来图片时，必须结合图片内容回答。
  用户问联系方式时，不要在回答里直接写出邮箱、电话、QQ、微信号，只引导访客使用页面上提供的联系方式入口。
  用户问教育/学校/毕业时，必须包含学校、专业、学制三要素。
  用户问「能不能胜任/适合做什么/够不够格」等评估类问题时，必须给出明确结论，按四步答：
  1 先给结论：能胜任/基本能胜任/暂不适合，并点明匹配程度，禁止用「我无法替他下结论」「只有本人知道」这类话搪塞；
  2 挂证据：每条结论必须紧跟一条来自下方简历上下文的具体事实（哪段经历、哪个项目、哪项技能），无证据的结论不许写；
  3 讲缺口：岗位要求里简历没有直接证据的部分，直说「简历未体现」，不得脑补补全；
  4 收尾再建议联系本人确认细节与意愿。
  事实与推断必须分开措辞（推断句写成「从……看，倾向于……」）；上下文没写的信息一律不得编造。
  回答末尾的「依据：…」由系统按本轮实际检索到的语料自动附加，回答里不要再写来源标注。

简历上下文：
${context}`
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
 * 「模型没给出可见正文」的唯一出口：本地预制答案接手，思考流原样保留。
 * 访客因此永远拿得到正文，工具轨迹也会诚实标注兜底原因，不会出现只有思考过程、
 * 没有任何回答的空回合。原因随实测传入（预算耗尽与格式异常不是一回事）。
 */
function 构造无正文兜底(用户问题: string, 思考流: string, 检索命中数: number, 原因: 回退原因): AiMessage {
  const 兜底正文 = getLocalAnswer(用户问题)
  if (思考流.length > 0) 兜底正文.reasoning = 思考流
  兜底正文.meta = {
    命中数: 检索命中数,
    耗时毫秒: 0,
    本地兜底: true,
    回退原因: 原因,
  }
  return 兜底正文
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
 *
 * 为什么全程不发 response_format: json_object：官方限制表明确「不推荐同时启用
 * thinking.type=enabled 与 response_format.type=json_object」。实测（真实 API，thinking=high）
 * 同开时长回答会把整段 JSON 正文写进 reasoning_content、content 只剩 200+ 空格 padding，
 * 界面于是只剩工具轨迹与思考过程、没有回答（技术栈/项目类长回答 3/3 复现）。
 * 因此聊天链路改为纯自然语言正文，组件由意图表判定；只有 /compact 走官方推荐的
 * 「thinking.disabled + json_object」组合，那里 JSON 是硬要求。
 */
function 思考体OpenAI(强度: 思考强度): Record<string, unknown> {
  if (强度 === 'off') return { thinking: { type: 'disabled' } }
  return { thinking: { type: 'enabled' }, reasoning_effort: 强度 }
}

/**
 * SSE 行解析：按 DeepSeek 官方 thinking_mode 流式示例累加 delta。
 * 同 chunk 双字段各自累加，禁丢 content；choices 空数组（如 [DONE] 后 usage 块）返回 null 跳过；
 * finish_reason 单独透传（没有 delta 的结束帧也要读得到，否则无法判断正文是否被 max_tokens 截断）。
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

export function 解析SSE行(行: string): { reasoning_content?: string; content?: string; finish_reason?: string } | null {
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
  const 选择 = (解析值 as { choices?: Array<{ delta?: unknown; finish_reason?: unknown }> })?.choices?.[0] as
    { delta?: unknown; finish_reason?: unknown } | undefined
  const 增量 = 选择?.delta as Record<string, unknown> | undefined
  const 结果: { reasoning_content?: string; content?: string; finish_reason?: string } = {}
  if (增量 && typeof 增量 === 'object') {
    if (typeof 增量.reasoning_content === 'string') 结果.reasoning_content = 增量.reasoning_content
    if (typeof 增量.content === 'string') 结果.content = 增量.content
  }
  // finish_reason 是判断「正文是否被 max_tokens 截断」的唯一信号，读到就必须透传，
  // 否则截断的回答会与完整回答长得一模一样，访客无从分辨
  if (typeof 选择?.finish_reason === 'string') 结果.finish_reason = 选择.finish_reason
  // usage-only 块（choices 空数组）没有任何可累加也没有结束信号，必须整行跳过
  return Object.keys(结果).length === 0 ? null : 结果
}

async function callOpenAICompletions(
  模型: 模型定义,
  messages: AiMessage[],
  systemPrompt: string,
  思考强度档: 思考强度,
  signal?: AbortSignal,
  onProgress?: (进度: { reasoning: string; content: string }) => void,
  检索命中数 = 0
): Promise<AiMessage> {
  const body: Record<string, unknown> = {
    model: 模型.id,
    messages: [{ role: 'system', content: systemPrompt }, ...messages.map(到Api消息)],
    temperature: 0.6,
    max_tokens: DEEPSEEK_MAX_TOKENS,
    stream: true,
    ...思考体OpenAI(思考强度档),
  }
  const 用户问题 = 获取最后用户内容(messages)

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

    const 截断 = data.choices?.[0]?.finish_reason === 'length'
    if (!有可见正文(rawContent)) {
      return 构造无正文兜底(用户问题, '', 检索命中数, 截断 ? 'truncated' : 'format')
    }
    const 消息: AiMessage = { role: 'assistant', content: rawContent }
    if (截断) 消息.meta = { 命中数: 检索命中数, 耗时毫秒: 0, 本地兜底: false, 截断: true }
    return 消息
  }

  const 读取器 = (response.body as ReadableStream<Uint8Array>).getReader()
  const 解码器 = new TextDecoder()
  let 缓冲 = ''
  let 截断 = false
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
    if (增量.finish_reason === 'length') 截断 = true
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

  // 唯一空正文闸门（流式与非流式共用）：正文为空或只有不可见字符一律当失败，转本地兜底。
  // 聊天正文是纯自然语言，这里不做任何 JSON 改写——访客主动索要 JSON 时他的内容必须原样送达。
  if (!有可见正文(累加.content)) {
    return 构造无正文兜底(用户问题, 累加.reasoning, 检索命中数, 截断 ? 'truncated' : 'format')
  }

  const 消息: AiMessage = { role: 'assistant', content: 累加.content }
  if (累加.reasoning.length > 0) 消息.reasoning = 累加.reasoning
  // 截断不是兜底：如实打标让工具轨迹显示「回答已截断」，半截回答不许冒充完整回答
  if (截断) 消息.meta = { 命中数: 检索命中数, 耗时毫秒: 0, 本地兜底: false, 截断: true }
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
  options: ChatOptions,
  检索命中数 = 0
): Promise<AiMessage> {
  return callOpenAICompletions(
    解析本次模型(options),
    messages,
    systemPrompt,
    思考强度档,
    options.signal,
    options.onProgress,
    检索命中数
  )
}

export async function sendChatMessage(messages: AiMessage[], options: ChatOptions = {}): Promise<ChatServiceResult> {
  const userQuestion = 获取最后用户内容(messages)
  const contextChunks = retrieveChunks(userQuestion, DEEPSEEK_RETRIEVE_TOP_K)
  const 安全上下文块 = contextChunks.filter((块) => 块.id !== 'personal-info-contact')
  const context = 安全上下文块.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join('\n\n')
  const 依据来源 = 取依据来源(安全上下文块)
  const 开始毫秒 = Date.now()

  try {
    // 思考开关来自全局 store；上下文默认拉满：每次请求发送完整对话历史（API 无状态需自行携带）。
    const { aiThinking } = useAppStore.getState()
    const answer = await callChatModel(messages, buildSystemPrompt(context), aiThinking, options, 安全上下文块.length)
    const 落定耗时 = Date.now() - 开始毫秒
    // 组件由意图表判定后挂载（模型不再产出组件，见 思考体OpenAI 注释）：在线与本地兜底同源。
    // 本地兜底路径 getLocalAnswer 已带 component，短路避免重复判定。
    const 组件 = answer.component ?? 选择组件(userQuestion)
    const 挂载 = 组件 ? { component: 组件 } : {}
    const 截断标注 = answer.meta?.截断 ? { 截断: true } : {}
    if (answer.meta?.本地兜底) {
      return {
        message: { ...answer, ...挂载, meta: undefined },
        meta: {
          命中数: 安全上下文块.length,
          耗时毫秒: answer.meta.耗时毫秒 || 落定耗时,
          本地兜底: true,
          依据来源,
          ...(answer.meta.回退原因 ? { 回退原因: answer.meta.回退原因 } : {}),
        },
      }
    }
    return {
      message: { ...answer, ...挂载, meta: undefined },
      meta: { 命中数: 安全上下文块.length, 耗时毫秒: 落定耗时, 本地兜底: false, 依据来源, ...截断标注 },
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
 *
 * 这里保留 json_object：它是官方推荐的「thinking.disabled + json_object」组合，
 * JSON 是硬要求（摘要必须是结构化文本），与聊天链路不同，故不受同开冲突影响。
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
  // 空摘要等于没压缩成功：宁可报错让 /compact 提示失败，也不写入空历史
  const 摘要 = typeof rawContent === 'string' ? 提取信封正文(rawContent) : ''
  if (!有可见正文(摘要)) {
    throw new Error('压缩返回格式异常')
  }
  return 摘要
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
