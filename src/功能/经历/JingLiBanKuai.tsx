import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Gamepad2, Heart, BookOpen, GraduationCap, Swords, Bot, ExternalLink, type LucideIcon } from 'lucide-react'
import { 经历表 } from '../../数据/经历'
import { BanKuai } from '../../组件/基础组件/BanKuai'
import { t } from '../../国际化/翻译'
import { useJianShaoDongHua } from '../../钩子/useJianShaoDongHua'
import { useShuZiGunDong } from '../../钩子/useShuZiGunDong'

const 时间线进度变量 = '--timeline-progress'

const 经历图标表: Record<string, { 图标: LucideIcon; 颜色: string }> = {
  mcserver: { 图标: Gamepad2, 颜色: '#00cea8' },
  bachelor: { 图标: BookOpen, 颜色: '#56ccf2' },
  educator: { 图标: GraduationCap, 颜色: '#38ef7d' },
  wowguild: { 图标: Swords, 颜色: '#f472b6' },
  aiengineer: { 图标: Bot, 颜色: '#a78bfa' },
  indie: { 图标: Heart, 颜色: '#fb7185' },
}

const 成就渐变表 = ['text-gradient-blue', 'text-gradient-green', 'text-gradient-pink']

function useShiJianXianJinDu(ref: React.RefObject<HTMLElement | null>, 数量: number): number {
  const 偏好减少动画 = useJianShaoDongHua()
  const [进度, 设置进度] = useState(偏好减少动画 ? 1 : 0)

  useEffect(() => {
    if (偏好减少动画 || !ref.current) {
      设置进度(1)
      return
    }

    const 元素 = ref.current
    let 帧编号 = 0
    let 上次进度 = -1

    const 节点表 = Array.from(元素.querySelectorAll<HTMLElement>('[data-timeline-index] .timeline-node'))

    const 更新进度 = () => {
      const 矩形 = 元素.getBoundingClientRect()
      const 视口中心 = window.innerHeight * 0.5
      const 时间线高度 = 矩形.height
      const 比例 = 时间线高度 > 0 ? Math.min(1, Math.max(0, (视口中心 - 矩形.top) / 时间线高度)) : 0

      if (Math.abs(比例 - 上次进度) > 0.005) {
        上次进度 = 比例
        元素.style.setProperty(时间线进度变量, String(比例))
        设置进度(比例)
      }

      for (const 节点 of 节点表) {
        const 节点矩形 = 节点.getBoundingClientRect()
        const 节点中心 = 节点矩形.top + 节点矩形.height * 0.5
        const 节点比例 = 时间线高度 > 0 ? Math.min(1, Math.max(0, (节点中心 - 矩形.top) / 时间线高度)) : 0
        节点.classList.toggle('is-active', 比例 >= 节点比例)
      }

      帧编号 = 0
    }

    const 处理滚动 = () => {
      if (帧编号) return
      帧编号 = requestAnimationFrame(更新进度)
    }

    更新进度()
    window.addEventListener('scroll', 处理滚动, { passive: true })
    window.addEventListener('resize', 处理滚动, { passive: true })

    return () => {
      window.removeEventListener('scroll', 处理滚动)
      window.removeEventListener('resize', 处理滚动)
      if (帧编号) cancelAnimationFrame(帧编号)
    }
  }, [偏好减少动画, ref, 数量])

  return 进度
}

function useShiJianXianTiaoMu(数量: number) {
  const 偏好减少动画 = useJianShaoDongHua()

  useEffect(() => {
    if (偏好减少动画) return

    const 观察器表: IntersectionObserver[] = []

    for (let 下标 = 0; 下标 < 数量; 下标++) {
      const 元素 = document.querySelector(`[data-timeline-index="${下标}"]`)
      if (!元素) continue

      const 观察器 = new IntersectionObserver(
        ([条目]) => {
          if (条目.isIntersecting) {
            元素.classList.add('is-visible')
            观察器.disconnect()
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
      )
      观察器.observe(元素)
      观察器表.push(观察器)
    }

    return () => {
      for (const 观察器 of 观察器表) 观察器.disconnect()
    }
  }, [数量, 偏好减少动画])
}

interface 经历卡片属性 {
  条目: (typeof 经历表)[number]
  是否偶数: boolean
  减少动画: boolean
}

function JingLiKaPian({ 条目, 是否偶数, 减少动画 }: 经历卡片属性) {
  const 外层引用 = useRef<HTMLDivElement>(null)
  const 动画帧引用 = useRef(0)

  const [在视口内, 设置在视口内] = useState(false)
  useEffect(() => {
    const 元素 = 外层引用.current
    if (!元素) return
    const 观察器 = new IntersectionObserver(
      ([条目]) => {
        if (条目.isIntersecting) {
          设置在视口内(true)
          观察器.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    观察器.observe(元素)
    return () => 观察器.disconnect()
  }, [外层引用])

  const 倾斜可用 = !减少动画

  useEffect(() => {
    if (!倾斜可用) return
    const 外层 = 外层引用.current
    if (!外层) return
    const 当前 = { x: 0.5, y: 0.5 }
    const 目标 = { x: 0.5, y: 0.5 }
    let 悬停中 = false
    let 按压中 = false
    let 上次指针: { x: number; y: number } | null = null
    const 系数 = 28
    const 插值 = 0.12
    const 应用 = () => {
      const 偏移X = 目标.x - 0.5
      const 偏移Y = 目标.y - 0.5
      const 旋转X = -偏移Y * 系数
      const 旋转Y = 偏移X * 系数
      const 放大 = 按压中 ? 0.985 : 悬停中 ? 1.06 : 1
      const 平移X = 偏移X * (按压中 ? 0 : 16)
      const 平移Y = 偏移Y * (按压中 ? 0 : 16)
      外层.style.transform =
        `translate3d(${平移X.toFixed(2)}px, ${平移Y.toFixed(2)}px, 0px) ` +
        `perspective(1000px) rotateX(${旋转X.toFixed(2)}deg) rotateY(${旋转Y.toFixed(2)}deg) scale(${放大})`
    }
    const 推进 = () => {
      当前.x += (目标.x - 当前.x) * 插值
      当前.y += (目标.y - 当前.y) * 插值
      目标.x = 当前.x
      目标.y = 当前.y
      应用()
      const 静止 = Math.abs(目标.x - 0.5) < 0.001 && Math.abs(目标.y - 0.5) < 0.001
      if (悬停中 || !静止) {
        动画帧引用.current = requestAnimationFrame(推进)
      } else {
        外层.style.transform = ''
        动画帧引用.current = 0
      }
    }
    const 启动 = () => {
      if (动画帧引用.current) return
      动画帧引用.current = requestAnimationFrame(推进)
    }
    const 由指针同步 = (水平: number, 垂直: number, 是否按压 = 按压中) => {
      const 矩形 = 外层.getBoundingClientRect()
      if (!(矩形.width > 0 && 矩形.height > 0)) return
      const 有限水平 = Number.isFinite(水平) ? 水平 : 矩形.left + 目标.x * 矩形.width
      const 有限垂直 = Number.isFinite(垂直) ? 垂直 : 矩形.top + 目标.y * 矩形.height
      const 归一X = Math.min(1, Math.max(0, (有限水平 - 矩形.left) / 矩形.width))
      const 归一Y = Math.min(1, Math.max(0, (有限垂直 - 矩形.top) / 矩形.height))
      上次指针 = { x: 有限水平, y: 有限垂直 }
      悬停中 = true
      按压中 = 是否按压
      外层.classList.toggle('is-pressed', 是否按压)
      if (是否按压) {
        目标.x = 0.5
        目标.y = 0.5
        当前.x = 0.5
        当前.y = 0.5
      } else {
        目标.x = 归一X
        目标.y = 归一Y
        当前.x = 归一X
        当前.y = 归一Y
      }
      应用()
      启动()
    }
    const 移入 = (事件: PointerEvent) => 由指针同步(事件.clientX, 事件.clientY, false)
    const 移动 = (事件: PointerEvent) => 由指针同步(事件.clientX, 事件.clientY, 按压中)
    const 按下 = (事件: PointerEvent | MouseEvent) => {
      由指针同步(事件.clientX, 事件.clientY, true)
    }
    const 抬起 = () => {
      按压中 = false
      外层.classList.remove('is-pressed')
      if (悬停中) 应用()
    }
    const 离开 = () => {
      悬停中 = false
      按压中 = false
      外层.classList.remove('is-pressed')
      上次指针 = null
      目标.x = 0.5
      目标.y = 0.5
      当前.x = 0.5
      当前.y = 0.5
      启动()
    }
    const 视口变化 = () => {
      if (!上次指针 || !悬停中) return
      由指针同步(上次指针.x, 上次指针.y)
    }
    外层.classList.add('tilt-card', 'will-change-transform')
    外层.addEventListener('pointerenter', 移入)
    外层.addEventListener('pointermove', 移动)
    外层.addEventListener('pointerdown', 按下)
    外层.addEventListener('mousedown', 按下)
    外层.addEventListener('pointerup', 抬起)
    外层.addEventListener('pointercancel', 抬起)
    外层.addEventListener('mouseup', 抬起)
    外层.addEventListener('pointerleave', 离开)
    window.addEventListener('scroll', 视口变化, { capture: true, passive: true })
    window.addEventListener('resize', 视口变化, { passive: true })
    window.addEventListener('wheel', 视口变化, { passive: true })
    return () => {
      外层.classList.remove('tilt-card', 'will-change-transform', 'is-pressed')
      外层.removeEventListener('pointerenter', 移入)
      外层.removeEventListener('pointermove', 移动)
      外层.removeEventListener('pointerdown', 按下)
      外层.removeEventListener('mousedown', 按下)
      外层.removeEventListener('pointerup', 抬起)
      外层.removeEventListener('pointercancel', 抬起)
      外层.removeEventListener('mouseup', 抬起)
      外层.removeEventListener('pointerleave', 离开)
      window.removeEventListener('scroll', 视口变化, { capture: true })
      window.removeEventListener('resize', 视口变化)
      window.removeEventListener('wheel', 视口变化)
      if (动画帧引用.current) cancelAnimationFrame(动画帧引用.current)
      动画帧引用.current = 0
      外层.style.transform = ''
    }
  }, [倾斜可用])

  const { 显示: 周期显示 } = useShuZiGunDong({
    值: t(条目.周期键),
    启用: !减少动画,
    开始: 在视口内,
  })

  const 图标配置 = 经历图标表[条目.id] ?? 经历图标表.mcserver
  const TuBiaoZuJian = 图标配置.图标

  return (
    <div
      ref={外层引用}
      data-experience-card={条目.id}
      data-tilt-outer="true"
      tabIndex={0}
      className={`experience-card group relative rounded-2xl outline-none ${
        是否偶数 ? 'md:col-start-1 md:col-end-2 md:row-start-1' : 'md:col-start-3 md:col-end-4 md:row-start-1'
      }`}
    >
      <div className="experience-gradient-border rounded-2xl p-px shadow-[0px_35px_120px_-15px_var(--color-panel-shadow)]">
        <div className="rounded-2xl bg-panel px-6 py-5">
          <div className="mb-2 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id={`experience-title-${条目.id}`} className="text-[20px] font-bold leading-snug text-text-primary">
                {t(条目.标题键)}
              </h3>
              {条目.机构键 && (
                <span className="mt-1.5 inline-block rounded-full border border-border px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                  {t(条目.机构键)}
                </span>
              )}
            </div>
            <TuBiaoZuJian
              size={40}
              style={{ color: 图标配置.颜色 } as CSSProperties}
              className="h-10 w-10 shrink-0"
              aria-hidden="true"
            />
          </div>

          <p className="text-gradient-green mb-2 font-display text-sm font-bold tracking-wide">{周期显示}</p>

          <ul className="space-y-1">
            {条目.描述键表.map((key) => (
              <li key={key} className="text-sm leading-relaxed text-text-secondary">
                {t(key)}
              </li>
            ))}
          </ul>

          <div className={`experience-achievements mt-3 ${减少动画 ? 'is-visible' : ''}`}>
            <ul className="space-y-1.5">
              {(条目.成就键表 ?? []).map((key, 下标) => (
                <li key={key} className={`text-[13px] leading-relaxed ${成就渐变表[下标 % 3]}`}>
                  <span className="mr-1" aria-hidden="true">
                    #
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          {条目.链接表 && 条目.链接表.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {条目.链接表.map((链接) => (
                <a
                  key={链接.url}
                  href={链接.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-primary/70 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  aria-label={`${t(条目.标题键)}：${t(链接.标签键)}`}
                >
                  <span>{t(链接.标签键)}</span>
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function JingLiBanKuai() {
  const 时间线引用 = useRef<HTMLOListElement>(null)
  const 偏好减少动画 = useJianShaoDongHua()
  useShiJianXianJinDu(时间线引用, 经历表.length)
  useShiJianXianTiaoMu(经历表.length)

  const 处理时间线按键 = (事件: React.KeyboardEvent<HTMLOListElement>) => {
    if (事件.key !== 'ArrowLeft' && 事件.key !== 'ArrowRight') return
    const target = 事件.target as HTMLElement
    if (!target.classList.contains('experience-card')) return
    const 卡片表 = Array.from(事件.currentTarget.querySelectorAll<HTMLElement>('.experience-card'))
    const 当前下标 = 卡片表.indexOf(target)
    if (当前下标 === -1) return
    事件.preventDefault()
    const 方向 = 事件.key === 'ArrowRight' ? 1 : -1
    const 下一个下标 = (当前下标 + 方向 + 卡片表.length) % 卡片表.length
    卡片表[下一个下标]?.focus()
  }

  return (
    <BanKuai id="experience" title={t('experience.title')}>
      <ol
        ref={时间线引用}
        className="timeline relative mx-auto max-w-5xl list-none py-4 md:py-8"
        aria-label={t('experience.timelineLabel')}
        onKeyDown={处理时间线按键}
      >
        {经历表.map((条目, 下标) => {
          const 是否偶数 = 下标 % 2 === 0

          return (
            <li
              key={条目.id}
              data-timeline-index={下标}
              className={`timeline-item grid grid-cols-[auto_1fr] gap-4 md:grid-cols-[1fr_auto_1fr] md:gap-6 ${
                偏好减少动画 ? 'is-visible' : ''
              }`}
              aria-labelledby={`experience-title-${条目.id}`}
            >
              <div
                className={`timeline-card-wrapper relative order-2 md:order-none ${
                  是否偶数 ? 'md:col-start-1 md:col-end-2 md:row-start-1' : 'md:col-start-3 md:col-end-4 md:row-start-1'
                }`}
              >
                <JingLiKaPian 条目={条目} 是否偶数={是否偶数} 减少动画={偏好减少动画} />
              </div>

              <div className="order-1 flex w-10 flex-col items-center md:order-none md:col-start-2 md:col-end-3 md:w-20 md:justify-center">
                <div
                  className="timeline-node relative z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-bg bg-muted transition-transform duration-300"
                  aria-hidden="true"
                >
                  <span className="h-2 w-2 rounded-full bg-bg" />
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </BanKuai>
  )
}
