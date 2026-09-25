import { useEffect, useRef, useState } from 'react'
import { Section } from '../../components/ui/Section'
import { t } from '../../i18n/translations'
import { useTypewriter } from './useTypewriter'
import { 关于我介绍行, type 文本片段, type 片段色调 } from '../../data/aboutLines'

const 关于我显现总毫秒 = 7200

const 色调类: Record<片段色调, string> = {
  plain: '',
  tech: 'text-primary font-medium',
  dim: 'text-muted',
  accent: 'text-accent font-semibold',
}

function 渲染片段(片段表: 文本片段[]) {
  return 片段表.map((段, i) => (
    <span key={i} className={色调类[段.tone]}>
      {段.text}
    </span>
  ))
}

function 读取减少动画(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface AboutSectionProps {
  /** 正文行片段表；默认取 about.introLines 数据源，供测试注入自定义行 */
  介绍行表?: 文本片段[][]
}

export function AboutSection({ 介绍行表 }: AboutSectionProps = {}) {
  const 减少动画 = 读取减少动画()
  const 段落行 = 介绍行表 ?? 关于我介绍行()
  const [开始打字, set开始打字] = useState(false)
  const 区块引用 = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (减少动画) {
      queueMicrotask(() => set开始打字(true))
      return
    }
    const 节点 = 区块引用.current
    if (!节点 || typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => set开始打字(true))
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

  const 纯文本表 = 段落行.map((行) => 行.map((段) => 段.text).join(''))
  const 总字数 = 纯文本表.reduce((n, 行) => n + 行.length, 0)
  const { 已显字符数 } = useTypewriter({
    每行文本: 纯文本表,
    开始: 开始打字,
    减少动画,
    每字毫秒: 总字数 > 0 ? 关于我显现总毫秒 / 总字数 : 48,
  })

  let 累计字符数 = 0
  const 行起点表 = 纯文本表.map((行) => {
    const 行起点 = 累计字符数
    累计字符数 += 行.length
    return 行起点
  })
  const 已完成行表 = 行起点表.map((行起点, 行号) => 已显字符数 >= 行起点 + (纯文本表[行号]?.length ?? 0))

  return (
    <Section id="about" title={t('about.title')} className="pt-12 pb-6 md:pt-16 md:pb-8">
      <div ref={区块引用} className="relative mx-auto max-w-4xl">
        <div
          data-about-console="true"
          role="region"
          aria-label={t('about.title')}
          className="relative isolate overflow-hidden rounded-2xl border border-border/70 bg-surface/55 shadow-[0_28px_90px_rgba(0,0,0,0.18)] ring-1 ring-inset ring-white/5 backdrop-blur-sm"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(0,217,255,0.10),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(165,94,234,0.08),transparent_38%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-3 h-3 w-3 border-l border-t border-primary/30"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-3 h-3 w-3 border-r border-t border-primary/30"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 left-3 h-3 w-3 border-b border-l border-primary/30"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b border-r border-primary/30"
          />

          <div
            data-console-status="true"
            className="relative flex items-center gap-4 border-b border-border/50 bg-white/[0.015] px-5 py-3 font-mono text-xs text-muted text-shadow-readable sm:px-7"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary/20" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_var(--color-primary)]" />
              </span>
              <span className="truncate tracking-[0.08em]">{t('about.caption.intro')}</span>
            </span>
            <span className="ml-auto hidden shrink-0 tracking-[0.06em] text-muted/65 sm:inline">
              {t('about.caption.meta')}
            </span>
          </div>

          <div className="relative px-3 py-4 sm:px-6 sm:py-6">
            <div
              aria-hidden="true"
              className="absolute bottom-5 left-0 top-5 w-px bg-gradient-to-b from-primary/45 via-primary/10 to-transparent"
            />
            {段落行.map((行, 行号) => {
              const 行文本 = 纯文本表[行号]
              const 行起点 = 行起点表[行号] ?? 0
              const 可见长度 = Math.max(0, Math.min(行文本.length, 已显字符数 - 行起点))
              const 已打完 = 可见长度 >= 行文本.length
              const 是当前行 = 开始打字 && 可见长度 > 0 && !已打完
              const 是强调行 = 行.some((段) => 段.tone === 'accent')
              const 显示光标 = 可见长度 > 0 && !已打完 && !减少动画
              let 片段偏移 = 0
              return (
                <div
                  key={行号}
                  data-console-line={行号 + 1}
                  data-about-active-line={是当前行 ? 'true' : 'false'}
                  className={[
                    'group relative grid grid-cols-[2rem_minmax(0,1fr)] gap-3 rounded-lg border border-transparent px-2 py-3 transition-colors duration-500 sm:grid-cols-[2.5rem_minmax(0,1fr)] sm:gap-4 sm:px-3',
                    是当前行 ? 'border-primary/10 bg-primary/[0.035]' : 'hover:border-border/40 hover:bg-white/[0.018]',
                  ].join(' ')}
                >
                  <span
                    aria-hidden="true"
                    className="w-full pt-1 text-right font-mono text-[11px] tabular-nums text-muted/45 text-shadow-readable transition-colors duration-300 group-hover:text-muted/80"
                  >
                    {String(行号 + 1).padStart(2, '0')}
                  </span>
                  <div className="relative min-w-0">
                    <span
                      aria-hidden="true"
                      className={[
                        'absolute -left-3 top-1.5 h-[calc(100%-0.75rem)] w-px origin-center bg-primary transition-opacity duration-500 sm:-left-3',
                        是当前行 ? 'opacity-100' : 'opacity-0 group-hover:opacity-35',
                      ].join(' ')}
                    />
                    <p
                      aria-label={行文本}
                      className={[
                        'relative font-sans text-base leading-7 text-text-primary text-shadow-readable transition-colors duration-500 sm:text-lg sm:leading-8',
                        是强调行 ? 'origin-left rotate-[-0.35deg]' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span aria-hidden="true" className="opacity-0">
                        {渲染片段(行)}
                      </span>
                      <span className="absolute inset-0">
                        {行.map((段, 段号) => {
                          const 段起点 = 片段偏移
                          片段偏移 += 段.text.length
                          const 段可见 = Math.max(0, Math.min(段.text.length, 可见长度 - 段起点))
                          if (段可见 <= 0) return null
                          return (
                            <span key={段号} className={色调类[段.tone]}>
                              {段.text.slice(0, 段可见)}
                            </span>
                          )
                        })}
                        {显示光标 && (
                          <span
                            aria-hidden="true"
                            className="caret-blink ml-0.5 inline-block h-[1.05em] w-[0.6ch] -translate-y-[0.12em] bg-primary align-middle shadow-[0_0_12px_var(--color-primary)]"
                          />
                        )}
                      </span>
                    </p>

                    {是强调行 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-1 left-0 h-px w-28 origin-left bg-gradient-to-r from-accent via-secondary to-transparent opacity-85"
                      />
                    )}

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-primary/60 via-border to-transparent transition-all duration-500 group-hover:w-full"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="relative flex items-center gap-5 border-t border-border/50 bg-black/[0.035] px-5 py-3 font-mono text-xs text-muted text-shadow-readable sm:px-7">
            <span className="tracking-[0.08em]">{t('about.caption.eof')}</span>
            <div className="ml-auto flex w-24 items-center gap-1.5" aria-hidden="true">
              {已完成行表.map((已完成, 行号) => (
                <span
                  key={行号}
                  data-console-progress-step={已完成 ? 'done' : 'pending'}
                  aria-hidden="true"
                  className={[
                    'h-0.5 flex-1 rounded-full transition-colors duration-500',
                    已完成 ? 'bg-primary shadow-[0_0_8px_var(--color-primary)]' : 'bg-border',
                  ].join(' ')}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
