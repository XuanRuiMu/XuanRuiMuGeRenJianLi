import { useEffect, useRef, useState } from 'react'
import { Section } from '../../components/ui/Section'
import { t } from '../../i18n/translations'
import { useTypewriter } from './useTypewriter'

function chaiFenJianJie(text: string): string[] {
  const 去空 = text.trim()
  if (!去空) return []
  return 去空
    .split(/(?<=[。；])/)
    .map((段) => 段.trim())
    .filter(Boolean)
}

function 读取减少动画(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function AboutSection() {
  const 减少动画 = 读取减少动画()
  const 段落行 = chaiFenJianJie(t('about.intro'))
  const [开始打字, set开始打字] = useState(false)
  const 区块引用 = useRef<HTMLDivElement | null>(null)

  // 进入视口（threshold≈0.3）触发一次打字；reduced-motion 或无 IO 时直接呈现
  useEffect(() => {
    if (减少动画) {
      set开始打字(true)
      return
    }
    const 节点 = 区块引用.current
    if (!节点 || typeof IntersectionObserver === 'undefined') {
      set开始打字(true)
      return
    }
    const 观察器 = new IntersectionObserver(
      (条目) => {
        for (const 条 of 条目) {
          if (条.isIntersecting) {
            set开始打字(true)
            观察器.disconnect()
            break
          }
        }
      },
      { threshold: 0.3 }
    )
    观察器.observe(节点)
    return () => 观察器.disconnect()
  }, [减少动画])

  const { 已显字符数, 已打完 } = useTypewriter({ 每行文本: 段落行, 开始: 开始打字, 减少动画 })

  // 预计算每行在累计字符流中的起始偏移
  const 行偏移: number[] = []
  let 累计 = 0
  for (const 行 of 段落行) {
    行偏移.push(累计)
    累计 += 行.length
  }

  return (
    <Section id="about" title={t('about.title')}>
      <div ref={区块引用} className="relative mx-auto max-w-4xl">
        <div className="border-y border-border/60 py-8 sm:py-12">
          <div className="mb-6 flex items-center gap-3 text-sm text-muted font-mono text-shadow-readable">
            <span aria-hidden="true">{'//'}</span>
            <span>{t('about.caption.intro')}</span>
            <span className="ml-auto hidden text-xs opacity-60 sm:inline" aria-hidden="true">
              {t('about.caption.meta')}
            </span>
          </div>

          <div className="space-y-0">
            {段落行.map((行, 索引) => {
              const 行号 = String(索引 + 1).padStart(2, '0')
              const 是强调行 = 索引 === 3
              const 是技术行 = 索引 === 1
              const 起始 = 行偏移[索引] ?? 0
              const 本行已显 = Math.max(0, Math.min(行.length, 已显字符数 - 起始))
              // 始终渲染完整行文本：已打出部分可见，未打出部分用 opacity-0 占位保留高度，
              // 使文字出现前后该行乃至整段高度恒定，杜绝打字过程中页面高度抖动。
              const 已显文本 = 行.slice(0, 本行已显)
              const 未显文本 = 行.slice(本行已显)

              const 尚未完成 = !已打完
              const 是激活行 = 开始打字 && 尚未完成 && 已显字符数 >= 起始 && 已显字符数 < 起始 + 行.length
              const 完成后末行 = 开始打字 && 已打完 && 索引 === 段落行.length - 1
              const 显示光标 = (是激活行 || 完成后末行) && !减少动画

              return (
                <div key={索引} className="group flex items-start gap-3 sm:gap-5 py-2 sm:py-3">
                  <span
                    className="select-none pt-0.5 text-right text-xs text-muted/70 font-mono tabular-nums text-shadow-readable w-6 sm:w-8 shrink-0"
                    aria-hidden="true"
                  >
                    {行号}
                  </span>

                  <div className="relative flex-1">
                    <p
                      className={[
                        'text-base leading-relaxed sm:text-lg text-shadow-readable',
                        是强调行
                          ? 'font-display tracking-wide rotate-[-0.8deg] origin-left text-accent'
                          : 'font-mono tracking-tight text-text-primary',
                        是技术行 ? 'text-primary' : '',
                      ].join(' ')}
                      aria-label={行}
                    >
                      <span aria-hidden="true">{已显文本}</span>
                      <span aria-hidden="true" className="opacity-0">
                        {未显文本}
                      </span>
                      {显示光标 && (
                        <span
                          aria-hidden="true"
                          className="caret-blink ml-0.5 inline-block h-[1.05em] w-[0.6ch] -translate-y-[0.12em] bg-current align-middle"
                        />
                      )}
                    </p>

                    {是强调行 && (
                      <span
                        className="pointer-events-none absolute -bottom-1 left-0 h-[2px] w-24 origin-left rounded-full bg-gradient-to-r from-accent via-secondary to-transparent opacity-80"
                        aria-hidden="true"
                      />
                    )}

                    <span
                      className="absolute -bottom-0.5 left-0 h-px w-0 bg-border transition-all duration-300 group-hover:w-full"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex items-center gap-3 text-sm text-muted font-mono text-shadow-readable">
            <span aria-hidden="true">{'//'}</span>
            <span>{t('about.caption.eof')}</span>
          </div>
        </div>
      </div>
    </Section>
  )
}
