import { useRef, useState, useEffect, useCallback, useMemo, startTransition } from 'react'
import { X, Loader2, RefreshCw, ImagePlus } from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import type { AiMessage } from '../../store/useAppStore'
import { cn } from '../../lib/utils'
import { t, ta } from '../../i18n/translations'
import { useChatService, compactConversation, 是否中断错误 } from '../../ai/chatService'
import { 模型列表, 循环思考强度, 步进思考强度, 思考强度顺序, type 思考强度 } from '../../ai/models'
import { UiComponentRenderer } from './UiComponentRegistry'
import { 生成追问建议 } from '../../ai/followUpSuggestions'

interface AIChatProps {
  className?: string
}

// vision 输入约束（对齐官方文档）：格式按内容判定，此处前端按 MIME 预过滤；
// 单张 ≤16MiB（API 上限 32MiB，留足请求体余量），每条消息 ≤4 张。
const 图片MIME白名单 = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const 单图上限字节 = 16 * 1024 * 1024
const 每条消息图片上限 = 4
const 默认面板宽 = 416
const 默认面板高 = 544
const 最小面板宽 = 320
const 最小面板高 = 400

/** 排队项（对齐 Claude Code 的 queued 语义）：忙时发送的消息连同其图片一起排队 */
interface QueuedItem {
  content: string
  images?: string[]
}

/** 待发区图片：所有图统一用 objectURL 做缩略图（避免大 dataURL 双份内存），合格图另存 dataURL 供发送 */
interface 待发图片 {
  key: string
  previewUrl: string
  dataUrl?: string
  ok: boolean
}

function 是合法图片(file: File): boolean {
  return file.size > 0 && file.size <= 单图上限字节 && 图片MIME白名单.includes(file.type)
}

function 读取为DataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function 走历史可行(输入框: HTMLTextAreaElement, 方向: 'up' | 'down'): boolean {
  const 值 = 输入框.value
  if (!值.includes('\n')) return true
  const 光标 = 输入框.selectionStart ?? 0
  if (方向 === 'up') return !值.slice(0, 光标).includes('\n')
  return !值.slice(光标).includes('\n')
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

function ToolBlock({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="my-1 font-mono text-[12px] leading-relaxed">
      <div className="flex items-center gap-1.5 text-[#d97757]">
        <span>{name}</span>
      </div>
      <div className="flex items-center gap-1.5 pl-5 text-[#9aa0aa]">
        <span aria-hidden="true">⎿</span>
        <span>{detail}</span>
      </div>
    </div>
  )
}

function 工具轨迹描述(消息: AiMessage): string {
  const 元 = 消息.meta
  if (!元) return t('ai.toolGeneric')
  const 基础 = `${t('ai.toolHits')} ${元.命中数} ${t('ai.toolSegments')} · ${元.耗时毫秒}ms`
  if (!元.本地兜底) return 基础
  const 原因 =
    元.回退原因 === 'timeout'
      ? ` · ${t('ai.toolTimeout')}`
      : 元.回退原因 === 'http'
        ? ` · ${t('ai.toolHttpError')}${typeof 元.http状态 === 'number' ? ` ${元.http状态}` : ''}`
        : 元.回退原因 === 'network'
          ? ` · ${t('ai.toolNetworkError')}`
          : 元.回退原因 === 'format'
            ? ` · ${t('ai.toolFormatError')}`
            : ''
  return `${基础} · ${t('ai.toolLocalFallback')}${原因}`
}

const 已知指令 = ['/help', '/clear', '/new', '/resume', '/model', '/compact', '/think', '/status'] as const

const 努力符号表: Record<思考强度, string> = { off: '○', low: '○', high: '●', max: '◉' }

function 最接近指令(输入: string): string | undefined {
  let 最佳: string | undefined
  let 最小 = 3
  for (const 候选 of 已知指令) {
    const 矩阵: number[][] = Array.from({ length: 输入.length + 1 }, (_, i) => [i])
    for (let j = 1; j <= 候选.length; j++) 矩阵[0][j] = j
    for (let i = 1; i <= 输入.length; i++) {
      for (let j = 1; j <= 候选.length; j++) {
        矩阵[i][j] = Math.min(
          矩阵[i - 1][j] + 1,
          矩阵[i][j - 1] + 1,
          矩阵[i - 1][j - 1] + (输入[i - 1] === 候选[j - 1] ? 0 : 1)
        )
      }
    }
    const 距离 = 矩阵[输入.length][候选.length]
    if (距离 < 最小) {
      最小 = 距离
      最佳 = 候选
    }
  }
  return 最佳
}

export function AIChat({ className }: AIChatProps) {
  const chatOpen = useAppStore((state) => state.chatOpen)
  const setChatOpen = useAppStore((state) => state.setChatOpen)
  const aiMessages = useAppStore((state) => state.aiMessages)
  const addAiMessage = useAppStore((state) => state.addAiMessage)
  const updateAiMessage = useAppStore((state) => state.updateAiMessage)
  const clearAiMessages = useAppStore((state) => state.clearAiMessages)
  const aiModel = useAppStore((state) => state.aiModel)
  const setAiModel = useAppStore((state) => state.setAiModel)
  const stashedSession = useAppStore((state) => state.stashedSession)
  const stashSession = useAppStore((state) => state.stashSession)
  const restoreSession = useAppStore((state) => state.restoreSession)

  const [input, setInput] = useState('')
  const [sendError, setSendError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 会话代数（根因守护）：/clear、重置等开启新会话时自增。abort 的拒绝是异步到达的，
  // 仅靠「先 abort 后 clear」的顺序无法阻止孤儿请求写入已清空的新会话；
  // 所有异步写入前比对代数，代数已变则丢弃。
  const generationRef = useRef(0)
  const chatMutation = useChatService()
  const isPending = chatMutation.isPending

  const aiThinking = useAppStore((state) => state.aiThinking)
  const setAiThinking = useAppStore((state) => state.setAiThinking)

  // 指令输出（/help /status /compact /未知指令）：瞬态本地状态，不进对话历史，
  // 避免污染发给模型的上下文（Claude Code 的指令输出同样不属于会话历史）。
  const [systemLines, setSystemLines] = useState<string[]>([])
  // 消息队列（对齐 Claude Code）：忙时发送的消息排队，当前回合结束后依次发出。
  const [queued, setQueued] = useState<QueuedItem[]>([])
  const [compacting, setCompacting] = useState(false)
  // 待发送图片：随下一条用户消息一起发出；不合格图仅作红字标记展示，永不入发送队列
  const [pendingImages, setPendingImages] = useState<待发图片[]>([])
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)
  // 同步最新待发图片到 ref：顺序读取循环中取实时长度，避免闭包过期；卸载清理也读它
  const pendingImagesRef = useRef(pendingImages)
  useEffect(() => {
    pendingImagesRef.current = pendingImages
  }, [pendingImages])
  const 图片序号Ref = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  // 排队泄放与手动发送共用同一闸门，防止 isPending 翻转间隙双发。
  const sendingRef = useRef(false)
  // 同步最新历史到 ref：排队泄放时闭包中的 aiMessages 可能已过期。
  const aiMessagesRef = useRef(aiMessages)
  useEffect(() => {
    aiMessagesRef.current = aiMessages
  }, [aiMessages])
  // 指令闭包同理：/status /model /resume 读到的模型与暂存会话必须是最新值。
  const aiModelRef = useRef(aiModel)
  useEffect(() => {
    aiModelRef.current = aiModel
  }, [aiModel])
  const stashedSessionRef = useRef(stashedSession)
  useEffect(() => {
    stashedSessionRef.current = stashedSession
  }, [stashedSession])

  // 可见消息即 store 历史：占位先行后 addAiMessage 同步落盘即时回显，
  // useOptimistic 层已冗余（再叠加会与真实消息重复），直接渲染 store。
  const 可见消息 = aiMessages

  const [输入历史, set输入历史] = useState<string[]>([])
  const 历史下标Ref = useRef(-1)
  const 草稿Ref = useRef('')
  const 记录输入历史 = useCallback((内容: string) => {
    set输入历史((prev) => (prev[prev.length - 1] === 内容 ? prev : [...prev.slice(-49), 内容]))
    历史下标Ref.current = -1
  }, [])

  const 走输入历史 = useCallback(
    (方向: 1 | -1) => {
      if (输入历史.length === 0) return
      if (历史下标Ref.current === -1) {
        if (方向 === -1) return
        草稿Ref.current = input
      }
      const 下一个 = 历史下标Ref.current + 方向
      if (下一个 < -1 || 下一个 >= 输入历史.length) return
      历史下标Ref.current = 下一个
      setInput(下一个 === -1 ? 草稿Ref.current : 输入历史[输入历史.length - 1 - 下一个])
    },
    [input, 输入历史]
  )

  const [思考秒数, set思考秒数] = useState(0)
  useEffect(() => {
    if (!isPending && !compacting) {
      set思考秒数(0)
      return
    }
    set思考秒数(0)
    const 计时器 = window.setInterval(() => set思考秒数((秒) => 秒 + 1), 1000)
    return () => window.clearInterval(计时器)
  }, [isPending, compacting])

  const 指令表 = useMemo(
    () => [
      { 指令: '/help', 描述: t('ai.cmdDesc.help') },
      { 指令: '/clear', 描述: t('ai.cmdDesc.clear') },
      { 指令: '/new', 描述: t('ai.cmdDesc.news') },
      { 指令: '/resume', 描述: t('ai.cmdDesc.resume') },
      { 指令: '/model', 描述: t('ai.cmdDesc.model') },
      { 指令: '/compact', 描述: t('ai.cmdDesc.compact') },
      { 指令: '/think', 描述: t('ai.cmdDesc.think') },
      { 指令: '/status', 描述: t('ai.cmdDesc.status') },
    ],
    []
  )
  const 斜杠首词 = input.startsWith('/') && !input.includes('\n') ? input.split(/\s+/)[0].toLowerCase() : ''
  const 补全候选 = useMemo(
    () => (斜杠首词 ? 指令表.filter((项) => 项.指令.startsWith(斜杠首词)) : []),
    [指令表, 斜杠首词]
  )
  const [补全下标, set补全下标] = useState(0)
  useEffect(() => {
    set补全下标(0)
  }, [input])
  // 模型选择器（对齐 Claude Code 的 /model 交互）：/model 无参开启后，
  // ↑/↓移动高亮、←/→切思考开关、⏎确认、esc取消；null 表示选择器关闭。
  const [模型选择下标, set模型选择下标] = useState<number | null>(null)
  const 模型选择中 = 模型选择下标 !== null
  const [会话模型, set会话模型] = useState<string | null>(null)
  const 会话模型Ref = useRef<string | null>(null)
  useEffect(() => {
    会话模型Ref.current = 会话模型
  }, [会话模型])
  const [面板尺寸, set面板尺寸] = useState({ 宽: 默认面板宽, 高: 默认面板高 })
  const 面板尺寸Ref = useRef(面板尺寸)
  useEffect(() => {
    面板尺寸Ref.current = 面板尺寸
  }, [面板尺寸])
  const 有效模型 = 会话模型 ?? aiModel
  const 努力名表 = ta('ai.modelPicker.effortNames')
  const 努力标签 = `${努力名表[思考强度顺序.indexOf(aiThinking)] ?? aiThinking} ${t('ai.modelPicker.effortUnit')}`
  // 仅输入为空时方向键才交由选择器；用户一旦打字即恢复 caret/历史语义
  const 选择器接管 = 模型选择中 && input.trim() === ''
  const 补全打开 = 斜杠首词 !== '' && 补全候选.length > 0 && !isPending && !compacting
  const 补全可见数 = 5
  const 补全起始 =
    补全候选.length <= 补全可见数
      ? 0
      : Math.min(Math.max(补全下标 - Math.floor(补全可见数 / 2), 0), 补全候选.length - 补全可见数)
  const 确认补全 = useCallback(() => {
    const 选中 = 补全候选[补全下标] ?? 补全候选[0]
    if (!选中) return
    const 首词长 = input.split(/\s+/)[0].length
    const 后缀 = input.slice(首词长)
    setInput(选中.指令 + (后缀.startsWith(' ') ? 后缀 : ''))
    inputRef.current?.focus()
  }, [补全候选, 补全下标, input])

  const [拖拽中, set拖拽中] = useState(false)

  /**
   * JSON envelope 增量宽容抽取（下游打字机）：response_format=json_object 下 SSE content
   * 为 `{"text":"..."}` 前缀流。逐帧对 content 累加串抽 `"text":"<已到字符>"` 片段，
   * 未闭合也显示已到字符；reasoning 上游已是原文，直接直出；两者皆空回退空（禁闪烁）。
   */
  const 抽取流式回答 = (累加内容: string): string => {
    if (累加内容.length === 0) return ''
    const 键位 = 累加内容.indexOf('"text"')
    if (键位 === -1) return ''
    const 冒号位 = 累加内容.indexOf(':', 键位 + 6)
    if (冒号位 === -1) return ''
    const 引号位 = 累加内容.indexOf('"', 冒号位 + 1)
    if (引号位 === -1) return ''
    let 结果 = ''
    let 转义中 = false
    for (let 下标 = 引号位 + 1; 下标 < 累加内容.length; 下标 += 1) {
      const 字符 = 累加内容[下标]
      if (转义中) {
        if (字符 === 'n') 结果 += '\n'
        else if (字符 === 't') 结果 += '\t'
        else if (字符 === 'r') 结果 += '\r'
        else 结果 += 字符 ?? ''
        转义中 = false
        continue
      }
      if (字符 === '\\') {
        转义中 = true
        continue
      }
      if (字符 === '"') break
      结果 += 字符
    }
    return 结果
  }

  /**
   * 发送单条消息（对齐 Claude Code）：发送后立即清空输入栏（由调用方 setInput('')），
   * 携带 AbortController 支持 Esc 中断；中断时保留已发消息并记一条中断提示，
   * 其他错误走错误栏。SSE 流式增量经 onProgress 落到占位助手消息，逐字显示。
   */
  const sendMessage = useCallback(
    async (用户消息: AiMessage) => {
      const gen = generationRef.current
      setSendError(null)
      const controller = new AbortController()
      abortRef.current = controller
      const mutateInput: {
        messages: AiMessage[]
        signal: AbortSignal
        model?: string
        onProgress?: (增量: { reasoning: string; content: string }) => void
      } = {
        messages: [...aiMessagesRef.current, 用户消息],
        signal: controller.signal,
        ...(会话模型Ref.current ? { model: 会话模型Ref.current } : {}),
      }
      // 占位先行：await 前先落用户消息与空助手占位并记下标，使 await 期间
      // onProgress 能落屏（占位下标<0 的代数 guard 保留）。用户消息先占位符合
      // “先显示问题回显+思考计时+Retrieve占位”既有语义；落定后仅补全结果。
      addAiMessage(用户消息)
      const 占位下标 = aiMessagesRef.current.length + 1
      addAiMessage({ role: 'assistant', content: '' })
      // 下游打字机：每帧直接 updateAiMessage（禁 setTimeout 节流），reasoning 原文
      // 直出，content 对 JSON envelope 做增量宽容抽取。
      mutateInput.onProgress = (增量: { reasoning: string; content: string }) => {
        if (generationRef.current !== gen || 占位下标 < 0) return
        const 思考文本 = 增量.reasoning
        const 回答文本 = 抽取流式回答(增量.content)
        if (思考文本.length === 0 && 回答文本.length === 0) return
        updateAiMessage(占位下标, {
          ...(思考文本.length > 0 ? { reasoning: 思考文本 } : {}),
          ...(回答文本.length > 0 ? { content: 回答文本 } : {}),
        })
      }
      try {
        const result = await chatMutation.mutateAsync(mutateInput)
        // 会话已在等待期间被切换（/clear、重置）：丢弃写入，不让孤儿回合污染新会话
        if (generationRef.current !== gen) return
        updateAiMessage(占位下标, result.meta ? { ...result.message, meta: result.meta } : result.message)
      } catch (err) {
        if (generationRef.current !== gen) return
        if (是否中断错误(err)) {
          // Claude Code：中断后已发出的消息保留，当前回合终止
          setSystemLines([t('ai.commands.interrupted')])
        } else {
          setSendError(t('ai.error'))
        }
      } finally {
        abortRef.current = null
      }
    },
    [chatMutation, addAiMessage, updateAiMessage]
  )

  /** 排队泄放：空闲时把队首消息发出（Claude Code 的 queued 语义） */
  useEffect(() => {
    if (sendingRef.current || isPending || compacting || queued.length === 0) return
    sendingRef.current = true
    const [next, ...rest] = queued
    setQueued(rest)
    const 用户消息: AiMessage = {
      role: 'user',
      content: next.content,
      ...(next.images && next.images.length > 0 ? { images: next.images } : {}),
    }
    startTransition(async () => {
      try {
        await sendMessage(用户消息)
      } finally {
        sendingRef.current = false
      }
    })
  }, [isPending, compacting, queued, sendMessage])

  const 打开模型选择 = useCallback((选中: number) => {
    const 列表 = 模型列表()
    if (列表.length === 0) return
    const 安全选中 = ((选中 % 列表.length) + 列表.length) % 列表.length
    set模型选择下标(安全选中)
  }, [])

  const 切换思考 = useCallback(() => {
    const 下一个 = 循环思考强度(aiThinking)
    setAiThinking(下一个)
    if (模型选择下标 === null) {
      setSystemLines([t('ai.thinkLevel').replace('{level}', 下一个)])
    }
  }, [aiThinking, setAiThinking, 模型选择下标])

  const 切换到下一个模型 = useCallback(() => {
    const 列表 = 模型列表()
    const 当前 = 列表.findIndex((模型) => 模型.id === (会话模型Ref.current ?? aiModelRef.current))
    const 下一个 = 列表[(当前 + 1) % 列表.length] ?? 列表[0]
    if (!下一个) return
    setAiModel(下一个.id)
    set会话模型(null)
    set模型选择下标(null)
    setSystemLines([`${t('ai.commands.modelSwitchedPrefix')}${下一个.id}`])
  }, [setAiModel])

  /** 指令分发（对齐 Claude Code 语义）：/clear 新会话、/resume 恢复、/model 切换、/compact 语义压缩、/think /help /status、未知指令报错 */
  const runCommand = useCallback(
    async (raw: string) => {
      const parts = raw.split(/\s+/)
      const cmd = parts[0].toLowerCase()
      const arg = parts.slice(1).join(' ').trim().toLowerCase()
      // 非裸 /model 指令接管输出区：先关选择器，后续分支重写 systemLines
      if (!(cmd === '/model' && !arg)) set模型选择下标(null)
      const stashCurrentSession = () => {
        if (aiMessagesRef.current.length > 0) {
          stashSession([...aiMessagesRef.current])
        }
      }
      switch (cmd) {
        case '/help':
          setSystemLines([...t('ai.commands.help').split('\n'), ...t('ai.shortcuts').split('\n')])
          break
        case '/clear':
        case '/new': {
          // /clear：清全部历史开新会话。/new 为兼容别名。
          // 先自增代数再 abort：异步到达的中断拒绝会被代数校验丢弃，不污染新会话。
          // 清空前暂存，供 /resume 恢复。
          generationRef.current += 1
          abortRef.current?.abort()
          stashCurrentSession()
          clearAiMessages()
          chatMutation.reset()
          setQueued([])
          setSystemLines([])
          set模型选择下标(null)
          set会话模型(null)
          setSendError(null)
          setCompacting(false)
          // 新会话不残留上一轮待发图片（与 handleReset 同一语义），预览 objectURL 一并释放
          for (const 图片 of pendingImagesRef.current) URL.revokeObjectURL(图片.previewUrl)
          setPendingImages([])
          break
        }
        case '/status': {
          const 历史数 = aiMessagesRef.current.length
          const 生效模型 = 会话模型Ref.current ?? aiModelRef.current
          const 当前模型 = 模型列表().find((模型) => 模型.id === 生效模型)?.id ?? 生效模型
          setSystemLines([
            `${t('ai.commands.statusModel')}：${当前模型}${会话模型Ref.current ? ` · ${t('ai.modelPicker.sessionBadge')}` : ''}`,
            `${t('ai.commands.statusThinking')}：${aiThinking}`,
            `${t('ai.commands.statusMessages')}：${历史数}`,
            `${t('ai.commands.statusQueued')}：${queued.length}`,
            `${t('ai.commands.statusContext')}：${模型列表().find((模型) => 模型.id === 生效模型)?.contextLabel ?? '—'}`,
          ])
          break
        }
        case '/model': {
          const 列表 = 模型列表()
          if (!arg) {
            const 当前 = 列表.findIndex((模型) => 模型.id === (会话模型Ref.current ?? aiModelRef.current))
            打开模型选择(当前 === -1 ? 0 : 当前)
            break
          }
          const 目标 = 列表.find((模型, index) => 模型.id.toLowerCase() === arg || String(index + 1) === arg)
          if (!目标) {
            setSystemLines([`${t('ai.commands.modelUnknownPrefix')}${arg}${t('ai.commands.unknownSuffix')}`])
            break
          }
          setAiModel(目标.id)
          set会话模型(null)
          setSystemLines([`${t('ai.commands.modelSwitchedPrefix')}${目标.id}`])
          break
        }
        case '/resume': {
          if (stashedSessionRef.current.length === 0) {
            setSystemLines([t('ai.commands.resumeEmpty')])
            break
          }
          generationRef.current += 1
          abortRef.current?.abort()
          restoreSession([...stashedSessionRef.current])
          chatMutation.reset()
          setQueued([])
          setSystemLines([t('ai.commands.resumeRestored')])
          break
        }
        case '/think': {
          切换思考()
          break
        }
        case '/compact': {
          if (isPending || sendingRef.current || compacting) {
            // 在途回合未被序列化前不得压缩，否则旧回合会在压缩后复活，语义压缩名存实亡
            setSystemLines([t('ai.commands.compactBusy')])
            break
          }
          if (aiMessagesRef.current.length === 0) {
            setSystemLines([t('ai.commands.compactEmpty')])
            break
          }
          const gen = generationRef.current
          const controller = new AbortController()
          abortRef.current = controller
          setCompacting(true)
          setSystemLines([t('ai.commands.compacting')])
          try {
            const 聚焦 = raw.slice('/compact'.length).trim()
            const 摘要 = await compactConversation(aiMessagesRef.current, {
              signal: controller.signal,
              ...(会话模型Ref.current ? { model: 会话模型Ref.current } : {}),
              ...(聚焦 ? { focus: 聚焦 } : {}),
            })
            // 压缩期间会话已被 /clear 切换：丢弃摘要，不回填新会话
            if (generationRef.current !== gen) break
            clearAiMessages()
            addAiMessage({ role: 'user', content: `[${t('ai.commands.compactSummaryPrefix')}] ${摘要}` })
            setSystemLines([t('ai.commands.compacted')])
          } catch (err) {
            if (generationRef.current === gen) {
              setSystemLines([t(是否中断错误(err) ? 'ai.commands.compactInterrupted' : 'ai.commands.compactFailed')])
            }
          } finally {
            abortRef.current = null
            setCompacting(false)
          }
          break
        }
        default: {
          const 行 = [`${t('ai.commands.unknownPrefix')}${cmd}${t('ai.commands.unknownSuffix')}`]
          const 联想 = 最接近指令(cmd)
          if (联想 && 联想 !== cmd) 行.push(`${t('ai.commands.didYouMean')} ${联想}`)
          setSystemLines(行)
        }
      }
    },
    [
      aiThinking,
      isPending,
      compacting,
      queued,
      clearAiMessages,
      addAiMessage,
      chatMutation,
      切换思考,
      setAiModel,
      stashSession,
      restoreSession,
      打开模型选择,
    ]
  )

  /** 输入提交统一入口：指令分流；忙时排队；空闲时发送。仅合格图随消息发出；待发区（含失败图）消费后整体清空 */
  const submitInput = useCallback(
    (raw: string) => {
      const content = raw.trim()
      if (!content) return
      setInput('')
      记录输入历史(content)
      if (content === '?') {
        setSystemLines([...t('ai.commands.help').split('\n'), ...t('ai.shortcuts').split('\n')])
        return
      }
      if (content.startsWith('!')) {
        setSystemLines([t('ai.shellUnsupported')])
        return
      }
      if (content.startsWith('/')) {
        void runCommand(content)
        return
      }
      const images = pendingImages
        .filter((图片) => 图片.ok && typeof 图片.dataUrl === 'string')
        .map((图片) => 图片.dataUrl as string)
      // 排队项带走的是独立 dataURL 字符串，释放 objectURL 不影响已入队消息
      for (const 图片 of pendingImages) URL.revokeObjectURL(图片.previewUrl)
      setPendingImages([])
      if (isPending || sendingRef.current || compacting) {
        setQueued((prev) => [...prev, { content, images: images.length > 0 ? images : undefined }])
        return
      }
      // 新动作即清除指令输出（瞬态语义：不滞留在消息流），同时关闭模型选择器；
      // 排队时不得清空 systemLines，否则 pending 中系统行被吞掉无回显。
      setSystemLines([])
      set模型选择下标(null)
      const 用户消息: AiMessage = {
        role: 'user',
        content,
        ...(images.length > 0 ? { images } : {}),
      }
      sendingRef.current = true
      startTransition(async () => {
        try {
          await sendMessage(用户消息)
        } finally {
          sendingRef.current = false
        }
      })
    },
    [isPending, compacting, runCommand, sendMessage, pendingImages, 记录输入历史]
  )

  /**
   * 文件统一入口（按钮选取与剪贴板粘贴共用）：合格图转 dataURL 进待发区；
   * image/* 不支持格式或无 MIME 的截图流仍生成缩略图并标红（ok:false），不入发送队列；
   * 非 image 文件与读取失败维持系统行提示。上限 4 张对合格与失败图一并计数。
   */
  const 接收图片文件 = useCallback(async (files: FileList | File[] | null) => {
    const 文件数组 = Array.from(files ?? [])
    if (文件数组.length === 0) return
    let rejected = false
    const 新增: 待发图片[] = []
    for (const file of 文件数组) {
      if (pendingImagesRef.current.length + 新增.length >= 每条消息图片上限) {
        rejected = true
        continue
      }
      // key 在自增时立刻固化：await 期间若另一批文件进入，计数器已前移，读 ref 会撞 key
      const 图片key = `pending-img-${(图片序号Ref.current += 1)}`
      if (!是合法图片(file)) {
        if (file.type === '' || file.type.startsWith('image/')) {
          新增.push({ key: 图片key, previewUrl: URL.createObjectURL(file), ok: false })
        } else {
          rejected = true
        }
        continue
      }
      try {
        const dataUrl = await 读取为DataUrl(file)
        新增.push({
          key: 图片key,
          previewUrl: URL.createObjectURL(file),
          dataUrl,
          ok: true,
        })
      } catch {
        rejected = true
      }
    }
    if (新增.length > 0) {
      setPendingImages((prev) => [...prev, ...新增])
    }
    if (rejected) {
      setSystemLines([t('ai.imageUploadFailed')])
    }
  }, [])

  /** 移除单张待发图：先释放其预览 objectURL 再出列，防内存泄漏 */
  const 移除待发图片 = useCallback((key: string) => {
    const 目标 = pendingImagesRef.current.find((图片) => 图片.key === key)
    if (目标) URL.revokeObjectURL(目标.previewUrl)
    setPendingImages((prev) => prev.filter((图片) => 图片.key !== key))
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const 开始调整尺寸 = (方向: '宽' | '高' | '双向') => (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return
    const 起点X = event.clientX
    const 起点Y = event.clientY
    const 起点宽 = 面板尺寸Ref.current.宽
    const 起点高 = 面板尺寸Ref.current.高
    const 移动 = (e: PointerEvent) => {
      if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return
      const 宽上限 = Math.max(最小面板宽, window.innerWidth - 32)
      const 高上限 = Math.max(最小面板高, window.innerHeight - 32)
      set面板尺寸({
        宽: 方向 === '高' ? 起点宽 : Math.min(Math.max(起点宽 + 起点X - e.clientX, 最小面板宽), 宽上限),
        高: 方向 === '宽' ? 起点高 : Math.min(Math.max(起点高 + 起点Y - e.clientY, 最小面板高), 高上限),
      })
    }
    const 结束 = () => {
      window.removeEventListener('pointermove', 移动)
      window.removeEventListener('pointerup', 结束)
      window.removeEventListener('pointercancel', 结束)
    }
    window.addEventListener('pointermove', 移动)
    window.addEventListener('pointerup', 结束)
    window.addEventListener('pointercancel', 结束)
  }

  useEffect(() => {
    if (chatOpen) {
      scrollToBottom()
      inputRef.current?.focus()
    }
  }, [chatOpen, 可见消息.length, scrollToBottom])

  const handleQuickQuestion = useCallback(
    (question: string) => {
      if (isPending) return
      submitInput(question)
    },
    [submitInput, isPending]
  )

  const 追问建议 = useMemo(() => {
    let 最后用户问题 = ''
    let 最后助手消息: AiMessage | undefined
    for (const 消息 of 可见消息) {
      if (消息.role === 'user') 最后用户问题 = 消息.content
      if (消息.role === 'assistant') 最后助手消息 = 消息
    }
    if (!最后助手消息) return []
    return 生成追问建议(最后用户问题, 最后助手消息)
  }, [可见消息])

  const handleReset = useCallback(() => {
    generationRef.current += 1
    abortRef.current?.abort()
    if (aiMessagesRef.current.length > 0) {
      stashSession([...aiMessagesRef.current])
    }
    clearAiMessages()
    chatMutation.reset()
    setInput('')
    setQueued([])
    setSystemLines([])
    set模型选择下标(null)
    set会话模型(null)
    setSendError(null)
    setCompacting(false)
    for (const 图片 of pendingImagesRef.current) URL.revokeObjectURL(图片.previewUrl)
    setPendingImages([])
    setLightboxSrc(null)
  }, [clearAiMessages, chatMutation, stashSession])

  // 卸载兜底：释放所有未消费的预览 objectURL，防内存泄漏（发送/移除路径已各自释放）
  useEffect(() => {
    return () => {
      for (const 图片 of pendingImagesRef.current) URL.revokeObjectURL(图片.previewUrl)
    }
  }, [])

  // 灯箱打开时：Esc 仅关灯箱（capture 阶段拦截，避免同时触发面板 Esc 关闭/中断语义）
  useEffect(() => {
    if (!lightboxSrc) return
    const 关闭灯箱 = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopImmediatePropagation()
        setLightboxSrc(null)
      }
    }
    window.addEventListener('keydown', 关闭灯箱, true)
    return () => window.removeEventListener('keydown', 关闭灯箱, true)
  }, [lightboxSrc])

  useEffect(() => {
    if (!chatOpen || lightboxSrc) return
    const 全局快捷 = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return
      const 目标 = event.target
      if (目标 instanceof HTMLElement && 目标.tagName !== 'BODY' && !目标.closest('[role="dialog"]')) return
      const 键 = event.key.toLowerCase()
      if (键 === 't') {
        event.preventDefault()
        切换思考()
      } else if (键 === 'p') {
        event.preventDefault()
        切换到下一个模型()
      }
    }
    window.addEventListener('keydown', 全局快捷)
    return () => window.removeEventListener('keydown', 全局快捷)
  }, [chatOpen, lightboxSrc, 切换思考, 切换到下一个模型])

  useEffect(() => {
    const 输入框 = inputRef.current
    if (!输入框) return
    const 自适应 = () => {
      输入框.style.height = 'auto'
      输入框.style.height = `${Math.min(输入框.scrollHeight, 160)}px`
    }
    自适应()
    window.addEventListener('resize', 自适应)
    return () => window.removeEventListener('resize', 自适应)
  }, [input, chatOpen])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Tab' && event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
        event.preventDefault()
        切换到下一个模型()
        return
      }
      if (选择器接管 && !event.nativeEvent.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey) {
        if (event.key === 's' || event.key === 'S') {
          event.preventDefault()
          const 目标 = 模型列表()[模型选择下标 ?? 0]
          if (目标) {
            set会话模型(目标.id)
            setSystemLines([
              `${t('ai.modelPicker.sessionOnlyPrefix')} ${目标.id} ${t('ai.modelPicker.sessionOnlySuffix')}`,
            ])
          }
          set模型选择下标(null)
          return
        }
        if (/^[1-9]$/.test(event.key)) {
          event.preventDefault()
          const 目标 = 模型列表()[Number(event.key) - 1]
          if (目标) {
            setAiModel(目标.id)
            set会话模型(null)
            setSystemLines([`${t('ai.commands.modelSwitchedPrefix')}${目标.id}`])
          }
          set模型选择下标(null)
          return
        }
      }
      if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
        if (选择器接管) {
          event.preventDefault()
          const 目标 = 模型列表()[模型选择下标 ?? 0]
          if (目标) {
            setAiModel(目标.id)
            set会话模型(null)
            setSystemLines([`${t('ai.commands.modelSwitchedPrefix')}${目标.id}`])
          }
          set模型选择下标(null)
          return
        }
        event.preventDefault()
        submitInput(input)
        return
      }
      if (event.key === 'Tab' && 补全打开) {
        event.preventDefault()
        确认补全()
        return
      }
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (event.nativeEvent.isComposing) return
        if (选择器接管) {
          event.preventDefault()
          if (模型列表().length > 0) {
            打开模型选择((模型选择下标 ?? 0) + (event.key === 'ArrowUp' ? -1 : 1))
          }
          return
        }
        if (补全打开) {
          event.preventDefault()
          set补全下标((下标) =>
            event.key === 'ArrowUp' ? (下标 - 1 + 补全候选.length) % 补全候选.length : (下标 + 1) % 补全候选.length
          )
          return
        }
        if (走历史可行(event.currentTarget, event.key === 'ArrowUp' ? 'up' : 'down')) {
          event.preventDefault()
          走输入历史(event.key === 'ArrowUp' ? 1 : -1)
        }
        return
      }
      if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && 选择器接管) {
        if (event.nativeEvent.isComposing) return
        event.preventDefault()
        const 下一个 = 步进思考强度(aiThinking, event.key === 'ArrowRight' ? 1 : -1)
        if (下一个 !== aiThinking) {
          setAiThinking(下一个)
        }
        return
      }
      if (event.key.toLowerCase() === 'j' && event.ctrlKey && !event.altKey && !event.metaKey) {
        event.preventDefault()
        const 输入框 = event.currentTarget
        const 起点 = 输入框.selectionStart ?? input.length
        const 终点 = 输入框.selectionEnd ?? input.length
        const 下一个 = `${input.slice(0, 起点)}\n${input.slice(终点)}`
        setInput(下一个)
        requestAnimationFrame(() => {
          输入框.selectionStart = 起点 + 1
          输入框.selectionEnd = 起点 + 1
        })
        return
      }
      if (event.key === 'Escape') {
        // 选择器开启时 Esc 优先关闭选择器，不最小化面板
        if (模型选择中) {
          event.preventDefault()
          set模型选择下标(null)
          setSystemLines([])
          return
        }
        // Esc 空闲即最小化面板；忙时中断当前请求
        if (isPending || compacting) {
          event.preventDefault()
          abortRef.current?.abort()
        } else {
          setChatOpen(false)
        }
      }
    },
    [
      setChatOpen,
      isPending,
      compacting,
      补全打开,
      补全候选,
      input,
      submitInput,
      确认补全,
      走输入历史,
      模型选择下标,
      模型选择中,
      选择器接管,
      打开模型选择,
      aiThinking,
      setAiThinking,
      setAiModel,
      set会话模型,
      切换到下一个模型,
    ]
  )

  // 会话判定（根因）：只要存在任何会话痕迹（消息/指令输出/排队/在途请求）就渲染会话视图，
  // 仅完全空白且空闲时展示主页。占位先行后：用户消息与空助手占位已落 store，
  // 全局 pending-thinking 行不再重复渲染（避免 Retrieve 双轨迹），pending 行退化为
  // 无占位时的纯在途兜底（历史上不可能出现，但保留防竞态）。
  const 有会话 =
    可见消息.length > 0 || systemLines.length > 0 || queued.length > 0 || isPending || compacting || 模型选择中
  const 显示全局思考行 = (isPending || compacting) && 可见消息.every((消息) => 消息.role !== 'assistant')

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
        <span className="font-mono text-lg font-bold">❯_</span>
      </button>
    )
  }

  return (
    <div
      // 面板内滚轮归面板：阻止 Lenis 根级 smoothWheel 劫持，对话列表改为原生滚动
      data-lenis-prevent=""
      className={cn(
        'fixed bottom-4 right-4 z-[70] flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-[#262626] bg-[#0a0a0a] font-mono text-[#e6e6e6] shadow-2xl',
        className
      )}
      style={{ width: 面板尺寸.宽, height: 面板尺寸.高 }}
      role="dialog"
      aria-modal="true"
      aria-label={t('ai.title')}
      onDragOver={(event) => {
        if (Array.from(event.dataTransfer.types).includes('Files')) {
          event.preventDefault()
          set拖拽中(true)
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        set拖拽中(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        set拖拽中(false)
        void 接收图片文件(event.dataTransfer.files)
      }}
    >
      {拖拽中 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-sm text-[#d97757]">
          {t('ai.dropHint')}
        </div>
      )}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('ai.resizeWidth')}
        data-testid="resize-left"
        onPointerDown={开始调整尺寸('宽')}
        className="absolute bottom-0 left-0 top-0 z-20 w-2 cursor-ew-resize touch-none hover:bg-[#d77757]/40"
      />
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={t('ai.resizeHeight')}
        data-testid="resize-top"
        onPointerDown={开始调整尺寸('高')}
        className="absolute left-0 right-0 top-0 z-20 h-2 cursor-ns-resize touch-none hover:bg-[#d77757]/40"
      />
      <div
        role="separator"
        aria-label={t('ai.resizeBoth')}
        data-testid="resize-corner"
        onPointerDown={开始调整尺寸('双向')}
        className="absolute left-0 top-0 z-30 h-4 w-4 cursor-nwse-resize touch-none hover:bg-[#d77757]/60"
      />
      {/* 终端标题栏 */}
      <div className="flex items-start justify-between border-b border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-col leading-tight">
            <div className="text-sm">
              <span className="font-semibold tracking-tight xuan-harness-rolling-gradient" data-testid="header-name">
                {t('ai.headerName')}
              </span>
              <span className="text-[#999999]">{` ${t('ai.headerVersion')}`}</span>
            </div>
            <div className="truncate text-[10px] text-[#999999]" data-testid="chat-header-status">
              {`${有效模型} · ${t('ai.headerBilling')}`}
            </div>
            <div className="truncate text-[10px] text-[#999999]">{t('ai.headerCwd')}</div>
          </div>
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

      <div
        data-testid="chat-messages"
        data-lenis-prevent=""
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-thin"
      >
        {有会话 ? (
          <div className="flex flex-col gap-3">
            {可见消息.map((message, index) =>
              message.role === 'user' ? (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                  className="flex gap-2 text-[13px] leading-relaxed text-[#ededed]"
                >
                  <span className="select-none text-[#d97757]" aria-hidden="true">
                    ❯
                  </span>
                  <div className="min-w-0 flex-1">
                    {message.images && message.images.length > 0 && (
                      <div className="mb-1.5 flex flex-wrap gap-1.5" data-testid="message-images">
                        {message.images.map((src, imageIndex) => (
                          <button
                            key={`${imageIndex}-${src.slice(-12)}`}
                            type="button"
                            onClick={() => setLightboxSrc(src)}
                            className="overflow-hidden rounded border border-[#2a2a2a] transition-colors hover:border-[#d97757]"
                          >
                            <img src={src} alt="" className="h-16 w-16 object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                    {message.content && <span className="whitespace-pre-wrap break-words">{message.content}</span>}
                  </div>
                </div>
              ) : (
                <div
                  key={`${message.role}-${index}-${message.content.slice(0, 12)}`}
                  className="flex gap-2 text-[13px] leading-relaxed text-[#e6e6e6]"
                  data-testid="assistant-placeholder"
                >
                  {message.content.length > 0 && (
                    <span className="select-none pt-0.5 text-[#d97757]" aria-hidden="true">
                      ⏺
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {message.content.length > 0 ? (
                      <ToolBlock name={t('ai.toolName')} detail={工具轨迹描述(message)} />
                    ) : (
                      <div
                        data-testid="pending-thinking"
                        className="flex min-w-0 flex-1 flex-col text-[13px] text-[#9aa0aa]"
                      >
                        <div className="flex items-center gap-1.5">
                          <Loader2 size={13} className="animate-spin text-[#d97757]" />
                          <span>{`${t('ai.thinking')} · ${思考秒数}s · ${t('ai.cancelHint')}`}</span>
                        </div>
                        <ToolBlock name={t('ai.toolName')} detail={t('ai.toolRetrieving')} />
                      </div>
                    )}
                    {message.reasoning && message.reasoning.length > 0 && (
                      <div
                        data-testid="message-reasoning"
                        className="my-1 whitespace-pre-wrap break-words text-[12px] text-[#9aa0aa]"
                      >
                        {message.reasoning}
                      </div>
                    )}
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />
                    {message.component && <UiComponentRenderer component={message.component} />}
                  </div>
                </div>
              )
            )}
            {显示全局思考行 && (
              <div data-testid="pending-thinking" className="flex gap-2 text-[13px] text-[#9aa0aa]">
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-[#d97757]" />
                    <span>
                      {compacting
                        ? t('ai.commands.compacting')
                        : `${t('ai.thinking')} · ${思考秒数}s · ${t('ai.cancelHint')}`}
                    </span>
                  </div>
                  {!compacting && <ToolBlock name={t('ai.toolName')} detail={t('ai.toolRetrieving')} />}
                </div>
              </div>
            )}
            {模型选择中 && (
              <div
                className="border-t border-[#b1b9f9] pt-2 font-mono text-[12px] leading-relaxed"
                data-testid="model-picker"
              >
                <div className="font-bold text-[#b1b9f9]">{t('ai.modelPicker.selectTitle')}</div>
                <div className="whitespace-pre-wrap text-[#9aa0aa]">{t('ai.modelPicker.selectDesc')}</div>
                {会话模型 && (
                  <div className="text-[#9aa0aa]">{`${t('ai.modelPicker.sessionLinePrefix')} ${会话模型} ${t('ai.modelPicker.sessionLineSuffix')}`}</div>
                )}
                <div className="mt-1 flex flex-col">
                  {模型列表().map((模型, index) => {
                    const 高亮 = index === 模型选择下标
                    const 当前生效 = 模型.id === 有效模型
                    return (
                      <div key={模型.id} data-testid={`model-option-${index + 1}`} className="flex items-center gap-1">
                        <span className={高亮 ? 'text-[#b1b9f9]' : 'text-transparent'} aria-hidden="true">
                          ❯
                        </span>
                        <span className="text-[#9aa0aa]">{`${index + 1}.`}</span>
                        <span className={当前生效 ? 'text-[#4eba65]' : 高亮 ? 'text-[#b1b9f9]' : 'text-[#9aa0aa]'}>
                          {模型.id}
                          {当前生效 && <span className="text-[#af87ff]"> ✓</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-1">
                  <span className="text-[#d77757]">{`${努力符号表[aiThinking]} ${努力标签}`}</span>
                  <span className="text-[#505050]">{` ${t('ai.modelPicker.effortAdjust')}`}</span>
                </div>
                <div className="italic text-[#9aa0aa]">{t('ai.modelPicker.confirmHint')}</div>
              </div>
            )}
            {systemLines.length > 0 && (
              <div className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[#9aa0aa]">
                {systemLines.map((line, index) => (
                  <div key={`${index}-${line.slice(0, 8)}`}>{line}</div>
                ))}
              </div>
            )}
            {!isPending && !compacting && !模型选择中 && 追问建议.length === 3 && (
              <div className="mt-1" data-testid="follow-up-suggestions">
                <p className="mb-1.5 text-[11px] text-[#666]">{t('ai.followUps.label')}</p>
                <div className="flex flex-wrap gap-2">
                  {追问建议.map((建议) => (
                    <button
                      key={建议}
                      type="button"
                      disabled={isPending || compacting}
                      onClick={() => handleQuickQuestion(建议)}
                      className="rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1 text-xs text-[#cfcfcf] transition-colors hover:border-[#d97757] hover:text-[#f0f0f0] disabled:opacity-50"
                    >
                      {建议}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center gap-2 text-[13px]">
            <p data-testid="welcome-line">
              <span className="xuan-harness-fixed-orange" data-testid="welcome-full">
                <span aria-hidden="true">✻ </span>
                {t('ai.welcomePrefix')}&nbsp;{t('ai.welcomeTitle')}
                {t('ai.welcomeTitleSuffix')}
              </span>
            </p>
            <p className="text-[#cfcfcf]">{t('ai.empty')}</p>
            <p className="text-xs text-[#9aa0aa]">{t('ai.welcomeIntro')}</p>
            <p className="text-[11px] text-[#666]">{t('ai.welcomeTips')}</p>
            <p className="mt-1 text-[11px] text-[#666]">{t('ai.extendedLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {ta('ai.quickQuestions').map((question) => (
                <button
                  key={question}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleQuickQuestion(question)}
                  className="rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1 text-xs text-[#cfcfcf] transition-colors hover:border-[#d97757] hover:text-[#f0f0f0] disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {sendError && (
        <div className="border-t border-[#2a2a2a] bg-[#3b1d1d] px-3 py-2 text-xs text-[#f0a0a0]" role="alert">
          {sendError}
        </div>
      )}

      {/* 消息队列（对齐 Claude Code）：忙时发送的消息显示在输入框上方，回复结束后依次发出 */}
      {queued.length > 0 && (
        <div className="border-t border-[#1f1f1f] bg-[#0d0d0d] px-3 py-1.5 font-mono text-[11px] text-[#9aa0aa]">
          {queued.map((item, index) => (
            <div key={`${index}-${item.content.slice(0, 8)}`} className="truncate">
              ⏳ {t('ai.queue.label')} {index + 1}：{item.content}
              {item.images && item.images.length > 0 ? ` [${item.images.length} img]` : ''}
            </div>
          ))}
          <div className="text-[#666]">{t('ai.queue.hint')}</div>
        </div>
      )}

      <form
        onSubmit={(event) => {
          // 指令与排队分流统一由 submitInput 处理（对齐 Claude Code 的输入语义）
          event.preventDefault()
          submitInput(input)
        }}
        className="relative border-t border-[#1f1f1f] bg-[#0a0a0a] p-2.5"
      >
        {补全打开 && (
          <div
            role="listbox"
            aria-label={t('ai.commands.modelHint')}
            data-testid="command-palette"
            className="absolute inset-x-2.5 bottom-full z-10 mb-1 overflow-hidden rounded border border-[#2a2a2a] bg-[#121212] py-1 shadow-2xl"
          >
            {补全候选.map((项, 下标) =>
              下标 < 补全起始 || 下标 >= 补全起始 + 补全可见数 ? null : (
                <button
                  key={项.指令}
                  type="button"
                  role="option"
                  aria-selected={下标 === 补全下标}
                  onMouseDown={(event) => {
                    event.preventDefault()
                    set补全下标(下标)
                    确认补全()
                  }}
                  onMouseEnter={() => set补全下标(下标)}
                  className={cn(
                    'flex w-full items-center gap-3 px-2.5 py-1.5 text-left text-[12px]',
                    下标 === 补全下标 ? 'text-[#b1b9f9]' : 'text-[#9aa0aa]'
                  )}
                >
                  <span className="shrink-0 font-mono">{项.指令}</span>
                  <span className="truncate">{项.描述}</span>
                </button>
              )
            )}
          </div>
        )}
        {pendingImages.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5" data-testid="pending-images">
            {pendingImages.map((图片) => (
              <span key={图片.key} className="relative inline-block">
                <img
                  src={图片.previewUrl}
                  alt=""
                  className={cn(
                    'h-12 w-12 rounded object-cover',
                    图片.ok ? 'ring-1 ring-[#2a2a2a]' : 'ring-2 ring-red-500'
                  )}
                />
                {!图片.ok && (
                  <span
                    data-testid="pending-images-failed"
                    className="absolute inset-0 flex items-center justify-center rounded bg-black/60 p-0.5 text-center text-[10px] font-semibold leading-tight text-red-500"
                  >
                    {t('ai.imageRejected')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => 移除待发图片(图片.key)}
                  aria-label={t('ai.removeImage')}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#333] text-[10px] leading-none text-[#eee] hover:bg-[#d97757]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-start gap-2 rounded-none border-x-0 border-y border-[#888] bg-[#121212] px-2.5 py-2 transition-colors focus-within:border-[#a6a6a6]">
          <span className="select-none pt-0.5 text-[#e6e6e6]" aria-hidden="true">
            ❯
          </span>
          <textarea
            ref={inputRef}
            name="message"
            rows={1}
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              历史下标Ref.current = -1
            }}
            onKeyDown={handleKeyDown}
            onPaste={(event) => {
              // 剪贴板含图片文件时走统一上传入口并阻止默认插入；纯文本粘贴不受影响
              const 剪贴板文件 = event.clipboardData?.files
              if (!剪贴板文件 || 剪贴板文件.length === 0) return
              const 图片文件 = Array.from(剪贴板文件).filter(
                (file) => file.type.startsWith('image/') || file.type === ''
              )
              if (图片文件.length > 0) {
                event.preventDefault()
                void 接收图片文件(图片文件)
              }
            }}
            aria-label={t('ai.title')}
            data-lenis-prevent=""
            className="max-h-40 flex-1 resize-none overflow-y-auto overscroll-contain bg-transparent text-[13px] leading-relaxed text-[#e6e6e6] outline-none"
            maxLength={2000}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-[#666] transition-colors hover:text-[#d97757]"
            aria-label={t('ai.attachImage')}
            title={t('ai.attachImage')}
          >
            <ImagePlus size={16} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(event) => {
              void 接收图片文件(event.target.files)
              event.target.value = ''
            }}
          />
          <span
            aria-hidden="true"
            className={cn('inline-block h-4 w-[7px] bg-[#e6e6e6]', !isPending && 'animate-pulse')}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
          <span className="min-w-0 flex-1 truncate" data-testid="chat-status-line">
            <span className="text-[#ff6b80]" aria-hidden="true">
              {'>> '}
            </span>
            <span className="text-[#ff6b80]">{`${有效模型} · think ${aiThinking}${会话模型 ? ` · ${t('ai.modelPicker.sessionBadge')}` : ''}`}</span>
            <span className="text-[#666]">{` ${t('ai.statusCycle')}`}</span>
          </span>
          <span className="shrink-0 text-[#666]">{isPending || compacting ? t('ai.busyHint') : t('ai.idleHint')}</span>
        </div>
      </form>

      {/* 灯箱：点击缩略图全屏查看原图，点遮罩或 Esc 关闭 */}
      {lightboxSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('ai.title')}
          data-testid="chat-lightbox"
          onClick={() => setLightboxSrc(null)}
          className="fixed inset-0 z-[80] flex cursor-zoom-out items-center justify-center bg-black/85 p-6"
        >
          <img
            src={lightboxSrc}
            alt=""
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
