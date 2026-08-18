import { useMutation } from '@tanstack/react-query'
import type { AiMessage } from '../store/useAppStore'
import { retrieveChunks } from './ragEngine'
import { personalInfo } from '../data/personalInfo'
import { getLocalAnswer } from './localEngine'
import { extractJsonFromText, parseAssistantPayload, type AssistantPayload } from './structuredOutput'
import {
  DEEPSEEK_API_KEY,
  DEEPSEEK_MODEL,
  DEEPSEEK_MAX_TOKENS,
  DEEPSEEK_RETRIEVE_TOP_K,
  DEEPSEEK_ENDPOINT,
} from './deepseekConfig'

export interface ChatOptions {
  deepseekApiKey?: string
  model?: string
  maxContextChunks?: number
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
  return `你是玄锐暮的简历 AI 助手，只能根据下方提供的简历上下文回答问题。如果上下文无法回答，请引导用户通过邮箱 ${personalInfo.email} 联系。

你必须以 JSON 格式回复，格式如下：
{
  "text": "回复文本（必填）",
  "component": {
    "type": "ProjectCard" | "Timeline" | "ContactForm"
    // ProjectCard 额外字段：projectId: "xrm" | "admin" | "aiConsole" | "slimefun"
    // Timeline 额外字段：scope?: "experience" | "media" | "education"
  }
}

component 字段可选，仅在用户询问项目、经历/时间线或联系方式时返回对应组件。

简历上下文：
${context}`
}

function parseDeepSeekResponse(rawContent: string): AssistantPayload {
  const extracted = extractJsonFromText(rawContent)
  return parseAssistantPayload(extracted)
}

async function callDeepSeek(messages: AiMessage[], apiKey: string, model: string): Promise<AiMessage> {
  const userQuestion = 获取最后用户内容(messages)
  const contextChunks = retrieveChunks(userQuestion, DEEPSEEK_RETRIEVE_TOP_K)
  const context = contextChunks.map((chunk, index) => `[${index + 1}] ${chunk.content}`).join('\n\n')
  const systemPrompt = buildSystemPrompt(context)

  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((message) => ({ role: message.role, content: message.content })),
      ],
      temperature: 0.6,
      max_tokens: DEEPSEEK_MAX_TOKENS,
      response_format: { type: 'json_object' },
    }),
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
    const answer = await callDeepSeek(messages, apiKey, options.model ?? DEEPSEEK_MODEL)
    return { message: answer }
  } catch {
    // 任何网络/配额异常都回退到本地 RAG 兜底，保证对话不中断
    return { message: getLocalAnswer(userQuestion) }
  }
}

export function useChatService(options: ChatOptions = {}) {
  const deepseekApiKey = options.deepseekApiKey ?? DEEPSEEK_API_KEY

  return useMutation({
    mutationFn: async (messages: AiMessage[]) => {
      return sendChatMessage(messages, { ...options, deepseekApiKey })
    },
  })
}
