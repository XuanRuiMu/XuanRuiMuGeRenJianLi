import { useRef, useState, useEffect, useCallback, useOptimistic, useActionState, startTransition } from 'react'
import { X, Loader2, RefreshCw } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { cn } from '../../lib/utils'
import { t, ta } from '../../i18n/translations'
import { useChatService } from '../../ai/chatService'
import { UiComponentRenderer } from './UiComponentRegistry'
import type { AiMessage } from '../../store/useAppStore'

interface AIChatProps {
  className?: string
}

/** Claude 风格星标（双峰/星芒），用于右下角入口与面板标识 */
function ClaudeMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2c.4 3.9 1.9 5.4 5.8 5.8-3.9.4-5.4 1.9-5.8 5.8-.4-3.9-1.9-5.4-5.8-5.8C10.1 7.4 11.6 5.9 12 2Z"
        fill="currentColor"
      />
      <path
        d="M18.5 13.5c.2 2 .9 2.7 2.9 2.9-2 .2-2.7.9-2.9 2.9-.2-2-1-2.7-2.9-2.9 2-.2 2.7-.9 2.9-2.9Z"
        fill="currentColor"
        opacity="0.7"
      />
      <path
        d="M5.5 13.5c.2 2 .9 2.7 2.9 2.9-2 .2-2.7.9-2.9 2.9-.2-2-1-2.7-2.9-2.9 2-.2 2.7-.9 2.9-2.9Z"
        fill="currentColor"
        opacity="0.7"
      />
    </svg>
  )
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function renderMarkdown(content: string): string {
  const escaped = escapeHtml(content)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre class="overflow-x-auto rounded-lg bg-black/60 p-2 text-xs">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/60 px-1 py-0.5 text-xs text-[#e6b3a3]">$1</code>')
    .replace(/\n/g, '<br />')
}

interface SendState {
  error: string | null
}

export function AIChat({ className }: AIChatProps) {
  const chatOpen = useAppStore((state) => state.chatOpen)
  const setChatOpen = useAppStore((state) => state.setChatOpen)
  const aiMessages = useAppStore((state) => state.aiMessages)
  const addAiMessage = useAppStore((state) => state.addAiMessage)
  const clearAiMessages = useAppStore((state) => state.clearAiMessages)

  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const chatMutation = useChatService()

  const [optimisticMessages, addOptimisticMessage] = useOptimistic<AiMessage[], AiMessage>(
    aiMessages,
    (state, message) => [...state, message]
  )

  const [sendState, formAction, isPending] = useActionState<SendState, FormData>(
    async (_prevState, formData) => {
      const content = formData.get('message')?.toString().trim() ?? ''
      if (!content || chatMutation.isPending) return { error: null }

      const userMessage: AiMessage = { role: 'user', content }
      addOptimisticMessage(userMessage)
      setInput('')

      try {
        const result = await chatMutation.mutateAsync([...aiMessages, userMessage])
        addAiMessage(userMessage)
        addAiMessage(result.message)
        return { error: null }
      } catch {
        return { error: t('ai.error') }
      }
    },
    { error: null }
  )

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom()
      inputRef.current?.focus()
    }
  }, [chatOpen, optimisticMessages.length, scrollToBottom])

  const handleQuickQuestion = useCallback(
    (question: string) => {
      if (isPending) return
      const formData = new FormData()
      formData.set('message', question)
      startTransition(() => {
        formAction(formData)
      })
    },
    [formAction, isPending]
  )

  const handleReset = useCallback(() => {
    clearAiMessages()
    chatMutation.reset()
    setInput('')
  }, [clearAiMessages, chatMutation])

  if (!chatOpen) {
    return (
      <button
        type="button"
        onClick={() => setChatOpen(true)}
        className={cn(
          'fixed bottom-4 right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-xl',
          'bg-[#1a1a1a] text-[#d97757] shadow-2xl ring-1 ring-[#2a2a2a] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]',
          className
        )}
        aria-label={t('ai.title')}
      >
        <ClaudeMark className="h-6 w-6" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-[70] flex h-[34rem] w-80 flex-col overflow-hidden rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] font-mono text-[#e6e6e6] shadow-2xl',
        'sm:w-96',
        className
      )}
      role="dialog"
      aria-modal="true"
      aria-label={t('ai.title')}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between border-b border-[#2a2a2a] bg-[#161616] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ClaudeMark className="h-4 w-4 text-[#d97757]" />
          <span className="text-sm font-semibold tracking-tight text-[#f0f0f0]">Claude Code</span>
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-[#4ade80]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" aria-hidden="true" />
            online
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleReset}
            className="rounded p-1.5 text-[#888] transition-colors hover:bg-white/10 hover:text-[#e6e6e6]"
            aria-label={t('ai.reset')}
            title={t('ai.reset')}
          >
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(false)}
            className="rounded p-1.5 text-[#888] transition-colors hover:bg-white/10 hover:text-[#e6e6e6]"
            aria-label={t('ai.close')}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        {optimisticMessages.length === 0 ? (
          <div className="flex h-full flex-col justify-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-[#d97757]">
              <ClaudeMark className="h-5 w-5" />
              <span className="font-semibold text-[#f0f0f0]">Claude Code</span>
            </div>
            <p className="text-[#e6e6e6]">
              <span className="text-[#d97757]">✻ </span>
              <span>{t('ai.empty')}</span>
            </p>
            <p className="text-xs text-[#9aa0aa]">我可以回答关于玄锐暮简历、技术栈与项目的问题。</p>
            <p className="text-xs text-[#6b7280]">/help 查看指令 · /clear 清空对话</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {ta('ai.quickQuestions').map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleQuickQuestion(question)}
                  className="rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1.5 text-xs text-[#cfcfcf] transition-colors hover:border-[#d97757] hover:text-[#f0f0f0] disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3.5">
            {optimisticMessages.map((message, index) =>
              message.role === 'user' ? (
                <div key={`${message.role}-${index}`} className="flex gap-2 text-sm leading-relaxed text-[#ededed]">
                  <span className="select-none text-[#d97757]" aria-hidden="true">
                    ❯
                  </span>
                  <span className="whitespace-pre-wrap break-words">{message.content}</span>
                </div>
              ) : (
                <div key={`${message.role}-${index}`} className="flex gap-2 text-sm leading-relaxed text-[#e6e6e6]">
                  <span className="select-none pt-0.5 text-[#d97757]" aria-hidden="true">
                    ⏺
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-1.5 text-xs text-[#9aa0aa]">
                      <span>✦ 检索知识库 (RAG)</span>
                      <span className="text-[#4ade80]">✓</span>
                    </div>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                    {message.component && <UiComponentRenderer component={message.component} />}
                  </div>
                </div>
              )
            )}
            {isPending && (
              <div className="flex gap-2 text-sm text-[#9aa0aa]">
                <span className="select-none pt-0.5 text-[#d97757]" aria-hidden="true">
                  ⏺
                </span>
                <div className="flex items-center gap-1.5">
                  <Loader2 size={14} className="animate-spin text-[#d97757]" />
                  <span>✦ 检索知识库 (RAG)…</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {sendState.error && (
        <div className="border-t border-[#2a2a2a] bg-[#3b1d1d] px-4 py-2 text-xs text-[#f0a0a0]" role="alert">
          {sendState.error}
        </div>
      )}

      <form action={formAction} className="border-t border-[#2a2a2a] bg-[#0d0d0d] p-3">
        <div className="flex items-center gap-2 rounded-lg border border-[#2a2a2a] bg-[#161616] px-3 py-2 transition-colors focus-within:border-[#d97757]">
          <span className="select-none text-[#d97757]" aria-hidden="true">
            ❯
          </span>
          <input
            ref={inputRef}
            name="message"
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t('ai.placeholder')}
            className="flex-1 bg-transparent text-sm text-[#e6e6e6] outline-none placeholder:text-[#666]"
            disabled={isPending}
            maxLength={200}
          />
          <button
            type="submit"
            disabled={!input.trim() || isPending}
            aria-label={t('ai.send')}
            className="flex items-center gap-1 rounded px-1.5 py-1 text-[#9aa0aa] transition-colors hover:bg-white/10 hover:text-[#d97757] disabled:opacity-40"
          >
            <span className="text-sm leading-none" aria-hidden="true">
              ⏎
            </span>
          </button>
        </div>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#6b7280]">
          <span>esc 中断 · ⏎ 发送</span>
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80]" aria-hidden="true" />
            deepseek-chat
          </span>
        </div>
      </form>
    </div>
  )
}
