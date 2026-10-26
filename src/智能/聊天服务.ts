import { useMutation } from '@tanstack/react-query'
import type { AI消息, AI工具元数据 } from '../状态/应用状态仓库'
import { 检索知识块 } from './检索引擎'
import { 提取信封正文, 有可见正文 } from './结构化输出'
import { 深度求索最大令牌, 深度求索检索条数 } from './深度求索配置'
import { 解析模型, 聊天超时毫秒, type 思考强度, type 模型定义 } from './模型'
import { 取本地答案, 选择组件 } from './本地引擎'
import { useYingYongZhuangTai, type 回退原因 } from '../状态/应用状态仓库'
import { t, type 翻译键 } from '../国际化/翻译'

export interface 聊天选项 {
  模型?: string

  focus?: string

  signal?: AbortSignal

  进度回调?: (进度: { 思考内容: string; content: string }) => void
}

export interface 聊天服务结果 {
  message: AI消息

  meta: AI工具元数据
}

export function 取依据来源(块: Array<{ 元数据: { 分类: string } }>): string[] {
  return [
    ...new Set(
      块.map((项) => {
        const 键 = `ai.sources.${项.元数据.分类}` as unknown as 翻译键
        const 译名 = t(键)

        return 译名 === 键 ? 项.元数据.分类 : 译名
      })
    ),
  ]
}

function 获取最后用户内容(消息表: AI消息[]): string {
  for (let i = 消息表.length - 1; i >= 0; i--) {
    if (消息表[i].role === 'user') {
      return 消息表[i].content
    }
  }
  return ''
}

function 构建系统提示词(上下文: string): string {
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
${上下文}`
}

export function 是否中断错误(错误: unknown): boolean {
  return 错误 instanceof DOMException && 错误.name === 'AbortError'
}

export function 是否超时错误(错误: unknown): boolean {
  return 错误 instanceof DOMException && 错误.name === 'TimeoutError'
}

function 合并中断信号(用户信号?: AbortSignal, 超时毫秒?: number): { 信号: AbortSignal | undefined; 清理: () => void } {
  if (!用户信号 && !(超时毫秒 && 超时毫秒 > 0)) {
    return { 信号: 用户信号, 清理: () => {} }
  }
  const 控制器 = new AbortController()
  const 清理项: Array<() => void> = []
  if (用户信号) {
    if (用户信号.aborted) {
      控制器.abort((用户信号 as AbortSignal & { 原因?: unknown }).原因)
    } else {
      const 转发中断 = () => 控制器.abort((用户信号 as AbortSignal & { 原因?: unknown }).原因)
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

function 抛出响应错误(响应: Response): never {
  const 错误 = new Error(`LLM 请求失败：HTTP ${响应.status}`) as Error & { http状态?: number }
  错误.http状态 = 响应.status
  throw 错误
}

function 分类回退原因(错误: unknown): { 回退原因: 回退原因; http状态?: number } {
  if (是否超时错误(错误)) return { 回退原因: 'timeout' }
  const 状态 = (错误 as { http状态?: unknown } | null)?.http状态
  if (typeof 状态 === 'number') return { 回退原因: 'http', http状态: 状态 }
  if (错误 instanceof Error && 错误.message.includes('返回格式异常')) return { 回退原因: 'format' }
  return { 回退原因: 'network' }
}

function 构造无正文兜底(用户问题: string, 思考流: string, 检索命中数: number, 原因: 回退原因): AI消息 {
  const 兜底正文 = 取本地答案(用户问题)
  if (思考流.length > 0) 兜底正文.思考内容 = 思考流
  兜底正文.meta = {
    命中数: 检索命中数,
    耗时毫秒: 0,
    本地兜底: true,
    回退原因: 原因,
  }
  return 兜底正文
}

function 到Api消息(消息: AI消息): Record<string, unknown> {
  const 有图片 = 消息.role === 'user' && !!消息.图片表 && 消息.图片表.length > 0
  if (!有图片) {
    return { role: 消息.role, content: 消息.content }
  }
  return {
    role: 消息.role,
    content: [
      { type: 'text', text: 消息.content },
      ...(消息.图片表 ?? []).map((地址) => ({ type: 'image_url', image_url: { url: 地址 } })),
    ],
  }
}

function 思考体OpenAI(强度: 思考强度): Record<string, unknown> {
  if (强度 === 'off') return { thinking: { type: 'disabled' } }
  return { thinking: { type: 'enabled' }, reasoning_effort: 强度 }
}

export function 累加流式增量(
  增量: { 思考原文?: unknown; content?: unknown },
  累加: { 思考内容: string; content: string }
): void {
  if (typeof 增量.思考原文 === 'string' && 增量.思考原文.length > 0) {
    累加.思考内容 += 增量.思考原文
  }
  if (typeof 增量.content === 'string' && 增量.content.length > 0) {
    累加.content += 增量.content
  }
}

export function 解析SSE行(行: string): { 思考原文?: string; content?: string; 结束原因?: string } | null {
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
  const 结果: { 思考原文?: string; content?: string; 结束原因?: string } = {}
  if (增量 && typeof 增量 === 'object') {
    if (typeof 增量.reasoning_content === 'string') 结果.思考原文 = 增量.reasoning_content
    if (typeof 增量.content === 'string') 结果.content = 增量.content
  }

  if (typeof 选择?.finish_reason === 'string') 结果.结束原因 = 选择.finish_reason

  return Object.keys(结果).length === 0 ? null : 结果
}

async function 调用OpenAI补全(
  模型: 模型定义,
  消息表: AI消息[],
  系统提示词: string,
  思考强度档: 思考强度,
  中止信号?: AbortSignal,
  处理进度?: (进度: { 思考内容: string; content: string }) => void,
  检索命中数 = 0
): Promise<AI消息> {
  const 主体: Record<string, unknown> = {
    model: 模型.id,
    messages: [{ role: 'system', content: 系统提示词 }, ...消息表.map(到Api消息)],
    temperature: 0.6,
    max_tokens: 深度求索最大令牌,
    stream: true,
    ...思考体OpenAI(思考强度档),
  }
  const 用户问题 = 获取最后用户内容(消息表)

  const 响应 = await 带超时请求(
    模型.端点,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(主体),
    },
    中止信号,
    聊天超时毫秒
  )

  if (!响应.ok) {
    抛出响应错误(响应)
  }

  if (!响应.body || typeof (响应.body as ReadableStream<Uint8Array>).getReader !== 'function') {
    const 数据 = await 响应.json()
    const 原始内容 = 数据.choices?.[0]?.message?.content

    if (typeof 原始内容 !== 'string') {
      throw new Error('LLM 返回格式异常')
    }

    const 截断 = 数据.choices?.[0]?.finish_reason === 'length'
    if (!有可见正文(原始内容)) {
      return 构造无正文兜底(用户问题, '', 检索命中数, 截断 ? 'truncated' : 'format')
    }
    const 消息: AI消息 = { role: 'assistant', content: 原始内容 }
    if (截断) 消息.meta = { 命中数: 检索命中数, 耗时毫秒: 0, 本地兜底: false, 截断: true }
    return 消息
  }

  const 读取器 = (响应.body as ReadableStream<Uint8Array>).getReader()
  const 解码器 = new TextDecoder()
  let 缓冲 = ''
  let 截断 = false
  const 累加 = { 思考内容: '', content: '' }
  const 推送 = () => {
    if (处理进度) 处理进度({ 思考内容: 累加.思考内容, content: 累加.content })
  }
  const 中断拒因 = (): unknown =>
    (中止信号 as AbortSignal & { 原因?: unknown })?.原因 ?? new DOMException('The operation was aborted.', 'AbortError')
  const 推送行 = (行: string): void => {
    const 增量 = 解析SSE行(行)
    if (!增量) return
    if (增量.结束原因 === 'length') 截断 = true
    const 前思考长 = 累加.思考内容.length
    const 前回答长 = 累加.content.length
    累加流式增量(增量, 累加)
    if (累加.思考内容.length !== 前思考长 || 累加.content.length !== 前回答长) 推送()
  }
  try {
    for (;;) {
      if (中止信号?.aborted) throw 中断拒因()
      const { done: 完成, value } = await 读取器.read()
      if (完成) break
      if (中止信号?.aborted) throw 中断拒因()
      缓冲 += 解码器.decode(value, { stream: true })
      const 行列表 = 缓冲.split('\n')
      缓冲 = 行列表.pop() ?? ''
      for (const 行 of 行列表) 推送行(行)
    }
    if (缓冲.trim() !== '') 推送行(缓冲)
  } catch (读取错) {
    try {
      读取器.releaseLock()
    } catch {}
    throw 读取错
  }
  读取器.releaseLock()

  if (中止信号?.aborted) throw 中断拒因()

  if (!有可见正文(累加.content)) {
    return 构造无正文兜底(用户问题, 累加.思考内容, 检索命中数, 截断 ? 'truncated' : 'format')
  }

  const 消息: AI消息 = { role: 'assistant', content: 累加.content }
  if (累加.思考内容.length > 0) 消息.思考内容 = 累加.思考内容

  if (截断) 消息.meta = { 命中数: 检索命中数, 耗时毫秒: 0, 本地兜底: false, 截断: true }
  return 消息
}

function 解析本次模型(选项: 聊天选项): 模型定义 {
  const 存储模型 = useYingYongZhuangTai.getState().AI模型
  return 解析模型(选项.模型 ?? 存储模型)
}

async function 调用聊天模型(
  消息表: AI消息[],
  系统提示词: string,
  思考强度档: 思考强度,
  选项: 聊天选项,
  检索命中数 = 0
): Promise<AI消息> {
  return 调用OpenAI补全(解析本次模型(选项), 消息表, 系统提示词, 思考强度档, 选项.signal, 选项.进度回调, 检索命中数)
}

export async function 发送聊天消息(消息表: AI消息[], 选项: 聊天选项 = {}): Promise<聊天服务结果> {
  const 用户问题 = 获取最后用户内容(消息表)
  const 上下文分块 = 检索知识块(用户问题, 深度求索检索条数)
  const 安全上下文块 = 上下文分块.filter((块) => 块.id !== 'personal-info-contact')
  const 上下文 = 安全上下文块.map((分块, 下标) => `[${下标 + 1}] ${分块.content}`).join('\n\n')
  const 依据来源 = 取依据来源(安全上下文块)
  const 开始毫秒 = Date.now()

  try {
    const { AI思考强度 } = useYingYongZhuangTai.getState()
    const 回答 = await 调用聊天模型(消息表, 构建系统提示词(上下文), AI思考强度, 选项, 安全上下文块.length)
    const 落定耗时 = Date.now() - 开始毫秒

    const 组件 = 回答.组件 ?? 选择组件(用户问题)
    const 挂载 = 组件 ? { 组件 } : {}
    const 截断标注 = 回答.meta?.截断 ? { 截断: true } : {}
    if (回答.meta?.本地兜底) {
      return {
        message: { ...回答, ...挂载, meta: undefined },
        meta: {
          命中数: 安全上下文块.length,
          耗时毫秒: 回答.meta.耗时毫秒 || 落定耗时,
          本地兜底: true,
          依据来源,
          ...(回答.meta.回退原因 ? { 回退原因: 回答.meta.回退原因 } : {}),
        },
      }
    }
    return {
      message: { ...回答, ...挂载, meta: undefined },
      meta: { 命中数: 安全上下文块.length, 耗时毫秒: 落定耗时, 本地兜底: false, 依据来源, ...截断标注 },
    }
  } catch (错误) {
    if (是否中断错误(错误)) throw 错误
    const 分类 = 分类回退原因(错误)
    return {
      message: 取本地答案(用户问题),
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

export async function 压缩对话(消息表: AI消息[], 选项: 聊天选项 = {}): Promise<string> {
  const 对话序列化 = 消息表.map((消息) => `${消息.role === 'user' ? '用户' : '助手'}：${消息.content}`).join('\n')
  const 压缩指令 =
    '你是对话压缩器。把用户给出的对话历史压缩为一段简明中文摘要，保留关键事实与未完成的诉求。必须以 JSON 格式回复：{"text": "摘要内容"}' +
    (选项.focus ? `\n聚焦说明：${选项.focus}` : '')

  const 模型 = 解析本次模型(选项)
  const 响应 = await 带超时请求(
    模型.端点,
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
    选项.signal,
    聊天超时毫秒
  )
  if (!响应.ok) {
    throw new Error(`压缩请求失败：HTTP ${响应.status}`)
  }
  const 数据 = await 响应.json()
  const 原始内容: unknown = 数据.choices?.[0]?.message?.content

  const 摘要 = typeof 原始内容 === 'string' ? 提取信封正文(原始内容) : ''
  if (!有可见正文(摘要)) {
    throw new Error('压缩返回格式异常')
  }
  return 摘要
}

export function useLiaoTianFuWu(选项: 聊天选项 = {}) {
  return useMutation({
    mutationFn: async ({
      消息表,
      signal,
      模型,
      进度回调,
    }: {
      消息表: AI消息[]
      signal?: AbortSignal
      模型?: string
      进度回调?: (进度: { 思考内容: string; content: string }) => void
    }) => {
      return 发送聊天消息(消息表, {
        ...选项,
        ...(模型 ? { 模型 } : {}),
        signal,
        ...(进度回调 ? { 进度回调 } : {}),
      })
    },
  })
}
