import { useCallback, useEffect, useRef, useState } from 'react'
import { Archive, ChevronDown, Download } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { t, type TranslationKey } from '../../i18n/translations'
import { downloadResume } from '../../lib/resume'
import { 下载佐证材料包 } from '../../lib/evidence'

/**
 * 图标以元素形式放进数据表：汉字标识符当 JSX 组件类型用时，经 React Compiler + 压缩后引用丢绑定，
 * 运行时抛 ReferenceError 并整页崩，且 vitest 走 dev 转译复现不了。守卫见 src/jsxComponentGuard.test.ts。
 */
const 菜单项表 = [
  {
    id: 'resume',
    labelKey: 'hero.cta.downloadResume',
    icon: <Download size={18} aria-hidden="true" />,
    run: downloadResume,
  },
  {
    id: 'evidence',
    labelKey: 'hero.downloadMenu.evidence',
    icon: <Archive size={18} aria-hidden="true" />,
    run: 下载佐证材料包,
  },
] as const

/**
 * 「下载简历」拆分为按钮 + 菜单：主按钮保持原有直接下载行为不变，
 * 右侧箭头展开菜单，菜单内可选「下载佐证材料.zip」。
 */
export function DownloadMenu() {
  const [展开, set展开] = useState(false)
  const [高亮, set高亮] = useState(0)
  const 容器引用 = useRef<HTMLDivElement | null>(null)
  const 箭头引用 = useRef<HTMLButtonElement | null>(null)
  const 项引用表 = useRef<Array<HTMLButtonElement | null>>([])
  const 待聚焦索引 = useRef(0)

  const 关闭 = useCallback((回到箭头: boolean) => {
    set展开(false)
    if (回到箭头) 箭头引用.current?.focus()
  }, [])

  const 聚焦项 = useCallback((索引: number) => {
    项引用表.current[索引]?.focus()
  }, [])

  /** 展开时焦点必须落进菜单：否则方向键与回车都打在触发按钮上，回车只会把菜单再关掉一次。 */
  const 打开 = (索引: number) => {
    待聚焦索引.current = 索引
    set高亮(索引)
    set展开(true)
  }

  useEffect(() => {
    if (!展开) return
    const 索引 = 待聚焦索引.current
    待聚焦索引.current = 0
    聚焦项(索引)
  }, [展开, 聚焦项])

  useEffect(() => {
    if (!展开) return
    const 指针按下 = (事件: PointerEvent) => {
      if (!容器引用.current?.contains(事件.target as Node)) set展开(false)
    }
    document.addEventListener('pointerdown', 指针按下)
    return () => document.removeEventListener('pointerdown', 指针按下)
  }, [展开])

  const 移动 = (索引: number) => {
    set高亮(索引)
    聚焦项(索引)
  }

  const 菜单按键 = (事件: React.KeyboardEvent<HTMLDivElement>) => {
    const 项数 = 菜单项表.length
    if (!展开) {
      if (事件.key === 'ArrowDown') {
        事件.preventDefault()
        打开(0)
      } else if (事件.key === 'ArrowUp') {
        事件.preventDefault()
        打开(项数 - 1)
      }
      return
    }
    if (事件.key === 'Escape') {
      事件.preventDefault()
      关闭(true)
    } else if (事件.key === 'ArrowDown') {
      事件.preventDefault()
      移动((高亮 + 1) % 项数)
    } else if (事件.key === 'ArrowUp') {
      事件.preventDefault()
      移动((高亮 - 1 + 项数) % 项数)
    } else if (事件.key === 'Home') {
      事件.preventDefault()
      移动(0)
    } else if (事件.key === 'End') {
      事件.preventDefault()
      移动(项数 - 1)
    } else if (事件.key === 'Enter' || 事件.key === ' ') {
      事件.preventDefault()
      执行(菜单项表[高亮])
    } else if (事件.key === 'Tab') {
      关闭(false)
    }
  }

  const 执行 = (项: (typeof 菜单项表)[number]) => {
    项.run()
    关闭(true)
  }

  return (
    <div ref={容器引用} className="relative inline-flex" onKeyDown={菜单按键}>
      <Button
        variant="secondary"
        onClick={downloadResume}
        icon={<Download size={32} />}
        className="h-16 rounded-r-none px-10 pr-8 text-lg"
      >
        {t('hero.cta.downloadResume')}
      </Button>
      <button
        ref={箭头引用}
        type="button"
        aria-haspopup="menu"
        aria-expanded={展开}
        aria-controls="hero-download-menu"
        aria-label={t('hero.downloadMenu.trigger')}
        onClick={() => {
          if (展开) 关闭(false)
          else 打开(0)
        }}
        className="inline-flex h-16 items-center justify-center rounded-full rounded-l-none bg-secondary py-0 pl-5 pr-6 text-white transition-all hover:bg-secondary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <ChevronDown
          size={22}
          aria-hidden="true"
          className={展开 ? 'rotate-180 transition-transform' : 'transition-transform'}
        />
      </button>

      {展开 && (
        <div
          id="hero-download-menu"
          role="menu"
          aria-label={t('hero.downloadMenu.label')}
          className="absolute left-0 top-[calc(100%+0.5rem)] z-30 w-64 overflow-hidden rounded-2xl border border-border/60 bg-surface/95 p-1 shadow-xl backdrop-blur"
        >
          {菜单项表.map((项, 索引) => (
            <button
              key={项.id}
              type="button"
              role="menuitem"
              ref={(节点) => {
                项引用表.current[索引] = 节点
              }}
              tabIndex={索引 === 高亮 ? 0 : -1}
              data-active={索引 === 高亮 ? 'true' : undefined}
              onMouseEnter={() => set高亮(索引)}
              onClick={() => 执行(项)}
              className={[
                'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition-colors focus:outline-none',
                索引 === 高亮
                  ? 'bg-primary/15 text-primary focus:bg-primary/15 focus:text-primary'
                  : 'text-text-primary hover:bg-white/10',
              ].join(' ')}
            >
              {项.icon}
              {t(项.labelKey as TranslationKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
