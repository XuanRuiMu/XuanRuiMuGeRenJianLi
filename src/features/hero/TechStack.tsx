import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { techstackV2, companies, type TechCard, type Company } from '../../data/techStack'

/* ── InfiniteMovingCards：1:1 移植 12-next-spline-3d (acertenity) ──
 * 克隆子节点实现无缝循环；--animation-duration / --animation-direction 由 props 注入；
 * 两侧 mask 渐隐；鼠标悬停暂停。 */
function InfiniteMovingCards({
  items,
  direction = 'left',
  speed = 'fast',
  pauseOnHover = true,
  className,
}: {
  items: TechCard[]
  direction?: 'left' | 'right'
  speed?: 'fast' | 'normal' | 'slow'
  pauseOnHover?: boolean
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [start, setStart] = useState(false)

  const getDirection = useCallback(() => {
    if (!containerRef.current) return
    containerRef.current.style.setProperty('--animation-direction', direction === 'left' ? 'forwards' : 'reverse')
  }, [direction])

  const getSpeed = useCallback(() => {
    if (!containerRef.current) return
    const duration = speed === 'fast' ? '20s' : speed === 'normal' ? '40s' : '80s'
    containerRef.current.style.setProperty('--animation-duration', duration)
  }, [speed])

  const addAnimation = useCallback(() => {
    const container = containerRef.current
    const scroller = scrollerRef.current
    if (!container || !scroller) return
    scroller.querySelectorAll('[data-cloned="true"]').forEach((node) => node.remove())
    Array.from(scroller.children).forEach((item) => {
      const clone = item.cloneNode(true) as HTMLElement
      clone.setAttribute('data-cloned', 'true')
      clone.setAttribute('aria-hidden', 'true')
      scroller.appendChild(clone)
    })
    getDirection()
    getSpeed()
    setStart(true)
  }, [getDirection, getSpeed])

  useEffect(() => {
    addAnimation()
  }, [addAnimation, items])

  return (
    <div
      ref={containerRef}
      className={cn(
        'scroller quantico-regular relative z-20 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]',
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          'flex quantico-regular min-w-full shrink-0 gap-16 py-4 w-max flex-nowrap',
          start && 'animate-scroll',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
      >
        {items.map((item, idx) => (
          <li
            key={item.name + idx}
            className="w-[78vw] max-w-[22rem] quantico-regular relative flex-shrink-0 rounded-2xl border border-slate-800 p-5 md:w-[20rem] md:py-6"
            style={{ background: 'linear-gradient(to right, #0c1225, #0c243e, #0b3557)' }}
          >
            <img
              src={item.icon}
              alt=""
              aria-hidden="true"
              className="mb-3 h-9 w-9 object-contain"
              loading="lazy"
            />
            <blockquote>
              <span className="relative z-20 block text-base leading-[1.6] text-white/90 md:text-lg">
                {item.quote}
              </span>
              <div className="relative z-20 mt-6 flex flex-col">
                <span className="text-xl font-bold leading-[1.6] text-white md:text-2xl">{item.name}</span>
                <span className="bg-gradient-to-r from-[#fde047] via-[#f472b6] to-[#a855f7] bg-clip-text text-base font-normal leading-[1.6] text-transparent md:text-xl">
                  {item.title}
                </span>
              </div>
            </blockquote>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── InfiniteLogoSlider：1:1 移植 12-next-spline-3d ── */
function InfiniteLogoSlider({
  items,
  direction = 'left',
  speed = 'fast',
  pauseOnHover = true,
  className,
}: {
  items: ReactNode[]
  direction?: 'left' | 'right'
  speed?: 'fast' | 'normal' | 'slow'
  pauseOnHover?: boolean
  className?: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLUListElement>(null)
  const [start, setStart] = useState(false)

  const getDirection = useCallback(() => {
    if (!containerRef.current) return
    containerRef.current.style.setProperty('--animation-direction', direction === 'left' ? 'forwards' : 'reverse')
  }, [direction])

  const getSpeed = useCallback(() => {
    if (!containerRef.current) return
    const duration = speed === 'fast' ? '20s' : speed === 'normal' ? '40s' : '80s'
    containerRef.current.style.setProperty('--animation-duration', duration)
  }, [speed])

  const addAnimation = useCallback(() => {
    const container = containerRef.current
    const scroller = scrollerRef.current
    if (!container || !scroller) return
    scroller.querySelectorAll('[data-cloned="true"]').forEach((node) => node.remove())
    Array.from(scroller.children).forEach((item) => {
      const clone = item.cloneNode(true) as HTMLElement
      clone.setAttribute('data-cloned', 'true')
      clone.setAttribute('aria-hidden', 'true')
      scroller.appendChild(clone)
    })
    getDirection()
    getSpeed()
    setStart(true)
  }, [getDirection, getSpeed])

  useEffect(() => {
    addAnimation()
  }, [addAnimation, items])

  return (
    <div
      ref={containerRef}
      className={cn(
        'scroller relative z-20 w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,white_20%,white_80%,transparent)]',
        className
      )}
    >
      <ul
        ref={scrollerRef}
        className={cn(
          'flex min-w-full shrink-0 gap-16 py-4 w-max flex-nowrap',
          start && 'animate-scroll',
          pauseOnHover && 'hover:[animation-play-state:paused]'
        )}
      >
        {items.map((item, idx) => (
          <li key={idx} className="flex-shrink-0">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/**
 * 我的技术栈 · 1:1 移植 8112 的 TECH STACK 区块：
 * 渐变标题 + 技术卡横向跑马灯(slow) + 公司/服务条跑马灯(fast，含 docker/cloudinary)。
 */
export function TechStack() {
  return (
    <div className="w-full" aria-label="我的技术栈">
      <h2 className="quantico-regular mb-8 text-center text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#6EFFB1] to-[#A594F9] md:text-4xl">
        TECH{' '}
        <span className="quantico-regular bg-gradient-to-r from-[#fde047] via-[#f472b6] to-[#a855f7] bg-clip-text text-transparent">
          STACK
        </span>
      </h2>

      <InfiniteMovingCards items={techstackV2} direction="right" speed="slow" />

      <div className="mt-6">
        <InfiniteLogoSlider
          direction="left"
          speed="fast"
          items={companies.map((company: Company) => (
            <div
              key={company.id}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-slate-800 p-4 transition-transform duration-300 hover:scale-105 md:flex-row md:max-w-60 max-w-40 bg-gradient-to-r from-[#0c1225] via-[#0c243e] to-[#0b3557]"
            >
              <img
                src={company.img}
                alt={company.name}
                className="h-10 w-10 object-contain md:h-12 md:w-12"
                loading="lazy"
              />
              <img
                src={company.nameImg}
                alt={`${company.name} logo`}
                className="h-8 w-20 max-w-[6rem] object-contain md:h-8"
                loading="lazy"
              />
            </div>
          ))}
        />
      </div>
    </div>
  )
}
