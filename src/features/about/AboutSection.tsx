import { useEffect, useRef, useState } from 'react'
import { Section } from '../../components/ui/Section'
import { t } from '../../i18n/translations'
import { useTypewriter } from './useTypewriter'
import { 关于我介绍行, type 文本片段, type 片段色调 } from '../../data/aboutLines'

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
    每字毫秒: 总字数 > 0 ? 1800 / 总字数 : 48,
  })

  let 已用 = 0
  return (
    <Section id="about" title={t('about.title')} className="pt-12 pb-6 md:pt-16 md:pb-8">
      <div ref={区块引用} className="relative mx-auto max-w-4xl">
        <div className="border-y border-border/60 py-8 sm:py-12">
          <div className="mb-6 flex items-center gap-3 font-mono text-sm text-muted text-shadow-readable">
            <span aria-hidden="true">{'//'}</span>
            <span>{t('about.caption.intro')}</span>
            <span className="ml-auto hidden text-xs opacity-60 sm:inline" aria-hidden="true">
              {t('about.caption.meta')}
            </span>
          </div>

          <div>
            {段落行.map((行, 行号) => {
              const 行文本 = 纯文本表[行号]
              const 行起点 = 已用
              已用 += 行文本.length
              const 可见长度 = Math.max(0, Math.min(行文本.length, 已显字符数 - 行起点))
              const 已打完 = 可见长度 >= 行文本.length
              const 是强调行 = 行.some((段) => 段.tone === 'accent')
              const 显示光标 = 可见长度 > 0 && !已打完 && !减少动画
              let 片段偏移 = 0
              return (
                <div key={行号} className="group flex items-start gap-3 py-2 sm:gap-5 sm:py-3">
                  <span
                    aria-hidden="true"
                    className="w-6 shrink-0 pt-0.5 text-right font-mono text-xs tabular-nums text-muted/50 text-shadow-readable transition-colors duration-200 group-hover:text-muted sm:w-8"
                  >
                    {String(行号 + 1).padStart(2, '0')}
                  </span>
                  <div className="relative min-w-0 flex-1">
                    <p
                      aria-label={行文本}
                      className={[
                        'relative font-mono text-base leading-relaxed text-text-primary text-shadow-readable sm:text-lg',
                        是强调行 ? 'origin-left rotate-[-0.6deg]' : '',
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
                            className="caret-blink ml-0.5 inline-block h-[1.05em] w-[0.6ch] -translate-y-[0.12em] bg-current align-middle"
                          />
                        )}
                      </span>
                    </p>

                    {是强调行 && (
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -bottom-1 left-0 h-[2px] w-24 origin-left rounded-full bg-gradient-to-r from-accent via-secondary to-transparent opacity-80"
                      />
                    )}

                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -bottom-0.5 left-0 h-px w-0 bg-gradient-to-r from-border via-border/70 to-transparent transition-all duration-300 group-hover:w-full"
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex items-center gap-3 font-mono text-sm text-muted text-shadow-readable">
            <span aria-hidden="true">{'//'}</span>
            <span>{t('about.caption.eof')}</span>
          </div>
        </div>
      </div>
    </Section>
  )
}
