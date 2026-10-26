import { useEffect, useCallback, useRef, type KeyboardEvent as React键盘事件 } from 'react'
import { Command } from 'cmdk'
import { Search, Sun, Moon, Monitor, MessageSquare, Mail, Link, Download } from 'lucide-react'
import { useYingYongZhuangTai, 板块顺序, type 应用板块, type 应用主题 } from '../../状态/应用状态仓库'
import { useZhuTiXiTong } from '../主题切换/useZhuTiXiTong'
import { t, type 翻译键 } from '../../国际化/翻译'
import { 个人信息 } from '../../数据/个人信息'
import { 下载简历 } from '../../库/简历'
import { 合并类名 } from '../../库/工具'
import { 启动视图过渡 } from '../../工具/视图过渡'
import { 平滑滚动引用 } from '../../库/平滑滚动实例'

function 区块标签(区块: 应用板块): string {
  return t(`nav.${区块}` as unknown as 翻译键)
}

function 格式化命令数(序号: number): string {
  return String(序号).padStart(2, '0')
}

const 命令项类 =
  'group relative mb-1 flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-sm text-text-primary outline-none transition-colors last:mb-0 hover:border-border hover:bg-surface-elevated/80 focus-visible:ring-2 focus-visible:ring-primary/40 aria-selected:border-primary/40 aria-selected:bg-primary/10 aria-selected:shadow-[inset_3px_0_0_var(--color-primary)]'

const 命令图标类 =
  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-surface-elevated/60 text-primary'

const 可聚焦选择器 = 'input, button, a[href], [tabindex]:not([tabindex="-1"])'

function 保持对话框焦点(键盘事件: React键盘事件<HTMLDivElement>) {
  if (键盘事件.key !== 'Tab') return
  const 候选元素 = Array.from(键盘事件.currentTarget.querySelectorAll<HTMLElement>(可聚焦选择器)).filter(
    (元素) => !元素.hasAttribute('disabled') && 元素.getAttribute('aria-hidden') !== 'true'
  )
  if (候选元素.length === 0) {
    键盘事件.preventDefault()
    return
  }
  const 首元素 = 候选元素[0]
  const 尾元素 = 候选元素[候选元素.length - 1]
  const 当前元素 = document.activeElement
  if (当前元素 === 首元素 && 键盘事件.shiftKey) {
    键盘事件.preventDefault()
    尾元素.focus()
    return
  }
  if (当前元素 === 尾元素 && !键盘事件.shiftKey) {
    键盘事件.preventDefault()
    首元素.focus()
    return
  }
  if (!候选元素.includes(当前元素 as HTMLElement)) {
    键盘事件.preventDefault()
    首元素.focus()
  }
}

export function MingLingMianBan() {
  const open = useYingYongZhuangTai((状态) => 状态.命令面板打开)
  const 设置展开 = useYingYongZhuangTai((状态) => 状态.设置命令面板打开)
  const 切换聊天 = useYingYongZhuangTai((状态) => 状态.切换聊天)
  const 切换区块 = useYingYongZhuangTai((状态) => 状态.切换到区块)
  const { theme: 主题, setTheme: 设置主题 } = useZhuTiXiTong()
  const 触发元素引用 = useRef<HTMLElement | null>(null)
  const 跳过焦点恢复引用 = useRef(false)
  const 目标打开状态引用 = useRef(open)
  const 切换序号引用 = useRef(0)

  useEffect(() => {
    目标打开状态引用.current = open
  }, [open])

  const 带过渡设置展开 = useCallback(
    (value: boolean) => {
      目标打开状态引用.current = value
      const 切换序号 = ++切换序号引用.current
      if (value && typeof document !== 'undefined') {
        const 当前焦点 = document.activeElement
        触发元素引用.current = 当前焦点 instanceof HTMLElement ? 当前焦点 : null
      }
      if (value) {
        void 启动视图过渡(() => {
          if (切换序号 !== 切换序号引用.current || !目标打开状态引用.current) return
          设置展开(value)
        })
      } else {
        设置展开(value)
      }
    },
    [设置展开]
  )

  useEffect(() => {
    const 处理按键 = (事件: KeyboardEvent) => {
      if ((事件.metaKey || 事件.ctrlKey) && 事件.key.toLowerCase() === 'k') {
        事件.preventDefault()
        带过渡设置展开(!目标打开状态引用.current)
      }
      if (事件.key === 'Escape') {
        带过渡设置展开(false)
      }
    }
    window.addEventListener('keydown', 处理按键)
    return () => window.removeEventListener('keydown', 处理按键)
  }, [open, 带过渡设置展开])

  useEffect(() => {
    if (open) return
    const 触发元素 = 触发元素引用.current
    触发元素引用.current = null
    if (跳过焦点恢复引用.current) {
      跳过焦点恢复引用.current = false
      return
    }
    if (触发元素 && document.contains(触发元素)) {
      触发元素.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const 原滚动位置 = window.scrollY
    const 原页面溢出 = document.body.style.overflow
    const 滚动实例 = 平滑滚动引用.current
    滚动实例?.stop()
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 原页面溢出
      滚动实例?.start()
      if (window.scrollY !== 原滚动位置) {
        window.scrollTo(0, 原滚动位置)
      }
    }
  }, [open])

  const 运行 = useCallback(
    (动作: () => void) => {
      动作()
      带过渡设置展开(false)
    },
    [带过渡设置展开]
  )

  const 关闭后执行 = useCallback(
    (目标区块: string, 动作: () => void) => {
      跳过焦点恢复引用.current = true
      带过渡设置展开(false)
      window.requestAnimationFrame(() => {
        动作()
        const 锚点 = document.getElementById(目标区块)
        const 目标容器 = 锚点?.closest('section') ?? 锚点
        const 目标标题 = 目标容器?.querySelector<HTMLElement>('h1, h2, h3') ?? 目标容器
        if (目标标题) {
          目标标题.setAttribute('tabindex', '-1')
          目标标题.focus()
        }
      })
    },
    [带过渡设置展开]
  )

  const 切换主题 = useCallback(() => {
    const 下一个: 应用主题 = 主题 === 'dark' ? 'light' : 主题 === 'light' ? 'system' : 'dark'
    设置主题(下一个)
  }, [主题, 设置主题])

  const 复制邮箱 = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(个人信息.邮箱)
    } catch {}
  }, [])

  const 复制GitHub = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(个人信息.GitHub)
    } catch {}
  }, [])

  const 处理下载简历 = useCallback(() => {
    下载简历()
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex min-h-full items-start justify-center overflow-x-hidden overflow-y-auto overscroll-contain bg-black/55 p-3 pt-[10dvh] backdrop-blur-md sm:p-6 sm:pt-[12dvh]"
      onClick={() => 带过渡设置展开(false)}
      onKeyDown={保持对话框焦点}
      role="dialog"
      aria-modal="true"
      aria-label={t('command.title')}
      style={{ viewTransitionName: 'command-palette' }}
    >
      <Command
        className={合并类名(
          'flex min-w-0 max-h-[calc(90dvh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border/90 bg-surface/95 shadow-[0_24px_80px_-24px_var(--color-panel-shadow)] ring-1 ring-inset ring-border/70 backdrop-blur-xl',
          'sm:max-h-[calc(88dvh-1.5rem)]'
        )}
        onClick={(点击事件) => 点击事件.stopPropagation()}
        label={t('command.title')}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border/80 bg-surface-elevated/35 px-3 py-2 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
            <span className="truncate">{t('command.title')}</span>
          </div>
          <div aria-hidden="true" className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/80" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
            <span className="hidden h-1.5 w-1.5 rounded-full bg-muted/40 sm:block" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3 border-b border-border/70 bg-surface/80 px-3 py-3 transition-colors focus-within:border-primary/40 focus-within:ring-1 focus-within:ring-primary/20 sm:px-4">
          <Search size={17} className="shrink-0 text-primary" aria-hidden="true" />
          <Command.Input
            autoFocus
            className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-muted/80"
            placeholder={t('command.placeholder')}
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-surface-elevated/60 px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline-block">
            ESC
          </kbd>
        </div>
        <Command.List
          label={t('command.suggestions')}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2 scrollbar-thin sm:p-3"
        >
          <Command.Empty className="m-2 rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            {t('command.empty')}
          </Command.Empty>
          <Command.Group
            heading={
              <div className="mb-1 flex items-center gap-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                <span aria-hidden="true" className="h-px w-4 bg-primary/70" />
                {t('command.sections')}
              </div>
            }
            className="space-y-1"
          >
            {板块顺序.map((区块, 序号) => (
              <Command.Item
                key={区块}
                value={`section-${区块} ${区块标签(区块)}`}
                onSelect={() => 关闭后执行(区块, () => 切换区块(区块))}
                data-command-index={格式化命令数(序号 + 1)}
                className={命令项类}
              >
                <span
                  aria-hidden="true"
                  className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted/60"
                >
                  {格式化命令数(序号 + 1)}
                </span>
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-surface-elevated/60"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                <span className="min-w-0 flex-1 truncate">{区块标签(区块)}</span>
                <span aria-hidden="true" className="font-mono text-xs text-muted/40">
                  ↵
                </span>
              </Command.Item>
            ))}
          </Command.Group>
          <Command.Separator className="my-3 h-px bg-border/60" />
          <Command.Group
            heading={
              <div className="mb-1 flex items-center gap-2 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                <span aria-hidden="true" className="h-px w-4 bg-primary/70" />
                {t('command.actions')}
              </div>
            }
            className="space-y-1"
          >
            <Command.Item
              value={t('command.toggleTheme')}
              onSelect={() => 运行(切换主题)}
              data-command-index={格式化命令数(板块顺序.length + 1)}
              className={命令项类}
            >
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted/60"
              >
                {格式化命令数(板块顺序.length + 1)}
              </span>
              <span className={命令图标类}>
                {主题 === 'dark' ? <Moon size={15} /> : 主题 === 'light' ? <Sun size={15} /> : <Monitor size={15} />}
              </span>
              <span className="min-w-0 flex-1 truncate">{t('command.toggleTheme')}</span>
              <span aria-hidden="true" className="font-mono text-xs text-muted/40">
                ↵
              </span>
            </Command.Item>
            <Command.Item
              value={t('command.copyEmail')}
              onSelect={() => 运行(复制邮箱)}
              data-command-index={格式化命令数(板块顺序.length + 2)}
              className={命令项类}
            >
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted/60"
              >
                {格式化命令数(板块顺序.length + 2)}
              </span>
              <span className={命令图标类}>
                <Mail size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate">{t('command.copyEmail')}</span>
              <span aria-hidden="true" className="font-mono text-xs text-muted/40">
                ↵
              </span>
            </Command.Item>
            <Command.Item
              value={t('command.copyGithub')}
              onSelect={() => 运行(复制GitHub)}
              data-command-index={格式化命令数(板块顺序.length + 3)}
              className={命令项类}
            >
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted/60"
              >
                {格式化命令数(板块顺序.length + 3)}
              </span>
              <span className={命令图标类}>
                <Link size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate">{t('command.copyGithub')}</span>
              <span aria-hidden="true" className="font-mono text-xs text-muted/40">
                ↵
              </span>
            </Command.Item>
            <Command.Item
              value={t('command.openChat')}
              onSelect={() => 运行(切换聊天)}
              data-command-index={格式化命令数(板块顺序.length + 4)}
              className={命令项类}
            >
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted/60"
              >
                {格式化命令数(板块顺序.length + 4)}
              </span>
              <span className={命令图标类}>
                <MessageSquare size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate">{t('command.openChat')}</span>
              <span aria-hidden="true" className="font-mono text-xs text-muted/40">
                ↵
              </span>
            </Command.Item>
            <Command.Item
              value={t('command.downloadResume')}
              onSelect={() => 运行(处理下载简历)}
              data-command-index={格式化命令数(板块顺序.length + 5)}
              className={命令项类}
            >
              <span
                aria-hidden="true"
                className="w-6 shrink-0 text-right font-mono text-[10px] tabular-nums text-muted/60"
              >
                {格式化命令数(板块顺序.length + 5)}
              </span>
              <span className={命令图标类}>
                <Download size={15} />
              </span>
              <span className="min-w-0 flex-1 truncate">{t('command.downloadResume')}</span>
              <span aria-hidden="true" className="font-mono text-xs text-muted/40">
                ↵
              </span>
            </Command.Item>
          </Command.Group>
        </Command.List>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/80 bg-surface-elevated/40 px-3 py-2 sm:px-4">
          <div aria-hidden="true" className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary/50" />
            <span className="h-1.5 w-1.5 rounded-full bg-border" />
          </div>
          <div aria-hidden="true" className="flex items-center gap-1.5 font-mono text-[10px] text-muted">
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">↑</kbd>
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">↓</kbd>
            <kbd className="rounded border border-border bg-surface px-1.5 py-0.5">↵</kbd>
          </div>
        </div>
      </Command>
    </div>
  )
}
