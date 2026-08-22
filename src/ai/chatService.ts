import { useMutation } from '@tanstack/react-query'
import type { AiMessage } from '../store/useAppStore'
import { retrieveChunks } from './ragEngine'
import { getLocalAnswer } from './localEngine'
import { extractJsonFromText, parseAssistantPayload, type AssistantPayload } from './structuredOutput'
import {
  DEEPSEEK_API_KEY,
  DEEPSEEK_MAX_TOKENS,
  DEEPSEEK_RETRIEVE_TOP_K,
  DEEPSEEK_ENDPOINT,
  DEEPSEEK_MODEL,
} from './deepseekConfig'
import { useAppStore } from '../store/useAppStore'

export interface ChatOptions {
  deepseekApiKey?: string
  model?: string
  maxContextChunks?: number
  /** 中断信号（对齐 Claude Code 的 Esc 中断语义）；abort 时抛出 AbortError，不回退本地兜底 */
  signal?: AbortSignal
}

export interface ChatServiceResult {
  message: AiMessage
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
    "type": "ProjectCard" | "Timeline" | "ContactForm"
    // ProjectCard 额外字段：projectId: "xrm" | "admin" | "aiConsole" | "slimefun"
    // Timeline 额外字段：scope?: "experience" | "media" | "education"
  }
}

component 字段可选，仅在用户询问项目、经历/时间线或联系方式时返回对应组件。用户发来图片时，结合图片内容回答。

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

async function callDeepSeek(messages: AiMessage[], apiKey: string, signal?: AbortSignal): Promise<AiMessage> {
  // 思考开关来自全局 store；上下文默认拉满：每次请求发送完整对话历史（API 无状态需自行携带）。
  const { aiThinking } = useAppStore.getState()
  const userQuestion = 获取最后用户内容(messages)
  const contextChunks = retrieveChunks(userQuestion, DEEPSEEK_RETRIEVE_TOP_K)
  const context = contextChunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join('\n\n')
  const systemPrompt = buildSystemPrompt(context)

  const body: Record<string, unknown> = {
    model: DEEPSEEK_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map(到Api消息),
    ],
    temperature: 0.6,
    max_tokens: DEEPSEEK_MAX_TOKENS,
    response_format: { type: 'json_object' },
    thinking: { type: aiThinking ? 'enabled' : 'disabled' },
  }

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`LLM 请求失败：${response.status} ${text}`)
  }

  const data = await response.json()
  const rawContent = data.choices?.[0]?.message?.content

  if (typeof rawContent !== 'string') {
    throw new Error('LLM 返回格式异常')
  }

  const payload = parseDeepSeekResponse(rawContent)
  return { role: 'assistant', content: payload.text, component: payload.component }
}

export async function sendChatMessage(messages: AiMessage[], options: ChatOptions = {}): Promise<ChatServiceResult> {
  const apiKey = options.deepseekApiKey ?? DEEPSEEK_API_KEY
  const userQuestion = 获取最后用户内容(messages)

  try {
    const answer = await callDeepSeek(messages, apiKey, options.signal)
    return { message: answer }
  } catch (err) {
    // 用户主动中断（Esc，对齐 Claude Code）：原样上抛，不得吞掉后回退本地回复
    if (是否中断错误(err)) throw err
    // 其他网络/配额异常回退到本地 RAG 兜底，保证对话不中断
    return { message: getLocalAnswer(userQuestion) }
  }
}

/**
 * /compact 指令（对齐 Claude Code）：调用模型把历史对话压缩为一段语义摘要。
 * 与 /clear 的区别：保留语义而非完全清空。失败原样上抛（不本地兜底，
 * 因为兜底会伪造摘要，违反压缩语义）。
 */
export async function compactConversation(messages: AiMessage[], options: ChatOptions = {}): Promise<string> {
  const apiKey = options.deepseekApiKey ?? DEEPSEEK_API_KEY
  const 对话序列化 = messages.map((message) => `${message.role === 'user' ? '用户' : '助手'}：${message.content}`).join('\n')

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content:
            '你是对话压缩器。把用户给出的对话历史压缩为一段简明中文摘要，保留关键事实与未完成的诉求。必须以 JSON 格式回复：{"text": "摘要内容"}',
        },
        { role: 'user', content: 对话序列化 },
      ],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      thinking: { type: 'disabled' },
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(`压缩请求失败：${response.status}`)
  }
  const data = await response.json()
  const rawContent = data.choices?.[0]?.message?.content
  if (typeof rawContent !== 'string') {
    throw new Error('压缩返回格式异常')
  }
  return parseDeepSeekResponse(rawContent).text
}

export function useChatService(options: ChatOptions = {}) {
  const deepseekApiKey = options.deepseekApiKey ?? DEEPSEEK_API_KEY

  return useMutation({
    mutationFn: async ({ messages, signal }: { messages: AiMessage[]; signal?: AbortSignal }) => {
      return sendChatMessage(messages, { ...options, deepseekApiKey, signal })
    },
  })
}
