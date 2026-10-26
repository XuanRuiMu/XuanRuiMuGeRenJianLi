import type { AI消息 } from '../../状态/应用状态仓库'
import { t } from '../../国际化/翻译'

export interface 排队项 {
  content: string
  图片表?: string[]
}

export interface 待发图片 {
  key: string
  预览地址: string
  数据地址?: string
  ok: boolean
}

export const 图片MIME白名单 = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
export const 单图上限字节 = 16 * 1024 * 1024
export const 每条消息图片上限 = 4
export const 默认面板宽 = 416
export const 默认面板高 = 544
export const 最小面板宽 = 320
export const 最小面板高 = 400

export function 是合法图片(文件: File): boolean {
  return 文件.size > 0 && 文件.size <= 单图上限字节 && 图片MIME白名单.includes(文件.type)
}

export function 读取为DataUrl(文件: File): Promise<string> {
  return new Promise((完成, 拒绝) => {
    const 读取器 = new FileReader()
    读取器.onload = () => 完成(读取器.result as string)
    读取器.onerror = () => 拒绝(读取器.error)
    读取器.readAsDataURL(文件)
  })
}

export function 走历史可行(输入框: HTMLTextAreaElement, 方向: 'up' | 'down'): boolean {
  const 值 = 输入框.value
  if (!值.includes('\n')) return true
  const 光标 = 输入框.selectionStart ?? 0
  if (方向 === 'up') return !值.slice(0, 光标).includes('\n')
  return !值.slice(光标).includes('\n')
}

export function 转义网页文本(文本: string): string {
  return 文本
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function 渲染Markdown(content: string): string {
  const 已转义 = 转义网页文本(content)
  return 已转义
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    .replace(/```([\s\S]*?)```/g, '<pre class="overflow-x-auto rounded-lg bg-black/60 p-2 text-xs">$1</pre>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-black/60 px-1 py-0.5 text-xs text-[#e6b3a3]">$1</code>')
    .replace(/\n/g, '<br />')
}

export function 工具轨迹描述(消息: AI消息): string {
  const 元 = 消息.meta
  if (!元) return t('ai.toolGeneric')
  const 基础 = `${t('ai.toolHits')} ${元.命中数} ${t('ai.toolSegments')} · ${元.耗时毫秒}ms`
  const 依据 = 元.依据来源 && 元.依据来源.length > 0 ? ` · ${t('ai.toolSources')}：${元.依据来源.join('、')}` : ''
  const 截断 = 元.截断 ? ` · ${t('ai.toolTruncated')}` : ''
  if (!元.本地兜底) return `${基础}${依据}${截断}`
  const 原因 =
    元.回退原因 === 'timeout'
      ? ` · ${t('ai.toolTimeout')}`
      : 元.回退原因 === 'http'
        ? ` · ${t('ai.toolHttpError')}${typeof 元.http状态 === 'number' ? ` ${元.http状态}` : ''}`
        : 元.回退原因 === 'network'
          ? ` · ${t('ai.toolNetworkError')}`
          : 元.回退原因 === 'truncated'
            ? ` · ${t('ai.toolBudgetExhausted')}`
            : 元.回退原因 === 'format'
              ? ` · ${t('ai.toolFormatError')}`
              : ''
  return `${基础} · ${t('ai.toolLocalFallback')}${原因}`
}

export const 已知指令 = ['/help', '/clear', '/new', '/resume', '/model', '/compact', '/think', '/status'] as const

export const 努力符号表: Record<'off' | 'low' | 'high' | 'max', string> = {
  off: '○',
  low: '○',
  high: '●',
  max: '◉',
}

export function 最接近指令(输入: string): string | undefined {
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
