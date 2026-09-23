import { useEffect, useRef, useState } from 'react'
import { Section } from '../../components/ui/Section'
import { t } from '../../i18n/translations'
import { 关于我介绍行, type 关于我行, type 关于我样式 } from '../../data/aboutLines'
import { useTypewriter } from './useTypewriter'

/**
 * 样式类由行的 style 标记决定，与行序号无关。
 * tech 只挂 text-primary：重构前它与 text-text-primary 同时存在，Tailwind 按字母序把
 * .text-primary 排在 .text-text-primary 之前，同优先级下后者胜出，导致高亮行实际不可见。
 */
const 正文样式: Record<关于我样式, string> = {
  normal: 'font-mono tracking-tight text-text-primary',
  tech: 'font-mono tracking-tight text-primary',
  accent: 'font-display tracking-wide rotate-[-0.8deg] origin-left text-accent',
}

function 读取减少动画(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 整段正文的揭示总时长（毫秒）：时长恒定，不随字数线性膨胀（正文 503 字时按 48ms/字要 24 秒） */
const 正文揭示总时长毫秒 = 7000

/** 单字间隔下限（毫秒）：文案再长也不快过此值，否则逐字揭示退化成闪屏 */
const 每字最小毫秒 = 12

interface AboutSectionProps {
  /** 正文行；默认取 about.introLines 数据源，供测试注入自定义行序 */
  介绍行表?: 关于我行[]
}

export function AboutSection({ 介绍行表: 段落行 = 关于我介绍行() }: AboutSectionProps) {
  const 减少动画 = 读取减少动画()
  const [开始打字, set开始打字] = useState(false)
  const 区块引用 = useRef<HTMLDivElement | null>(null)

  // 进入视口（threshold≈0.3）触发一次打字；reduced-motion 或无 IO 时直接呈现
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

  const 每行文本 = 段落行.map(({ text: 文本 }) => 文本)
  // 字间隔由总字数归一（而非固定每字时长）：整段揭示恒为约 7 秒，正文增删不再线性拉长等待
  const 总字数 = 每行文本.reduce((总和, 文本) => 总和 + 文本.length, 0)
  const 每字毫秒 = Math.max(每字最小毫秒, Math.round(正文揭示总时长毫秒 / (总字数 || 1)))
  const { 已显字符数, 已打完 } = useTypewriter({ 每行文本, 开始: 开始打字, 减少动画, 每字毫秒 })

  // 预计算每行在累计字符流中的起始偏移
  const 行偏移: number[] = []
  let 累计 = 0
  for (const 文本 of 每行文本) {
    行偏移.push(累计)
    累计 += 文本.length
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
              const 是强调行 = 行.style === 'accent'
              const 文本 = 行.text
              const 起始 = 行偏移[索引] ?? 0
              const 本行已显 = Math.max(0, Math.min(文本.length, 已显字符数 - 起始))
              // 始终渲染完整行文本：已打出部分可见，未打出部分用 opacity-0 占位保留高度，
              // 使文字出现前后该行乃至整段高度恒定，杜绝打字过程中页面高度抖动。
              const 已显文本 = 文本.slice(0, 本行已显)
              const 未显文本 = 文本.slice(本行已显)

              const 尚未完成 = !已打完
              const 是激活行 = 开始打字 && 尚未完成 && 已显字符数 >= 起始 && 已显字符数 < 起始 + 文本.length
              const 显示光标 = 是激活行 && !减少动画

              return (
                <div key={行.id} className="group flex items-start gap-3 sm:gap-5 py-2 sm:py-3">
                  <span
                    className="select-none pt-0.5 text-right text-xs text-muted/70 font-mono tabular-nums text-shadow-readable w-6 sm:w-8 shrink-0"
                    aria-hidden="true"
                  >
                    {行号}
                  </span>

                  <div className="relative flex-1">
                    <p
                      className={['text-base leading-relaxed sm:text-lg text-shadow-readable', 正文样式[行.style]].join(
                        ' '
                      )}
                      aria-label={文本}
                    >
                      <span aria-hidden="true">{已显文本}</span>
                      {显示光标 && (
                        <span
                          aria-hidden="true"
                          className="caret-blink ml-0.5 inline-block h-[1.05em] w-[0.6ch] -translate-y-[0.12em] bg-current align-middle"
                        />
                      )}
                      {/* 未显文本占位保持行高恒定；光标插在已显/未显之间，随打字逐字前移 */}
                      <span aria-hidden="true" className="opacity-0">
                        {未显文本}
                      </span>
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
