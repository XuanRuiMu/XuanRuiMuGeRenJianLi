import { useEffect, useMemo, useRef } from 'react'
import { techstackV2, type TechCard } from '../../data/techStack'
import { useReducedMotion } from '../../hooks/useReducedMotion'

/**
 * 技术（原 My Technologies）· 1:1 移植参考站（localhost:8110/#contact）的「技术球」意向。
 *
 * 根因取舍：旧版用横向跑马灯卡片（InfiniteMovingCards / InfiniteLogoSlider），
 * 与参考站的「旋转技术球」形态不符，且两套 marquee 组件仅此一处使用即成死代码。
 * 现改为 JS 驱动的 3D 球面标签云（Fibonacci 均匀分布 + 绕 Y 轴自转 + 固定 X 倾角），
 * 每帧直接写入 DOM transform/opacity（不触发 React 重渲染，性能极致），
 * 标签始终朝向相机（billboard），深度决定缩放/透明度/层级，呈现真实的「技术球」体积感。
 *
 * 交互（本次需求）：
 *  - 自转速度已降为初版的 1/2（SPIN_SPEED 0.0008），更舒缓；
 *  - 鼠标悬停球体区域 → 暂停自转（暂停时便于精准点击）；
 *  - 单击任一技术球 → 新标签页打开对应官网（GitHub 指向个人主页 https://github.com/XuanRuiMu）。
 * reduced-motion 时静态成球。
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const SPHERE_RADIUS = 150 // 球面投影半径（px）
const TILT_X = (16 * Math.PI) / 180 // 固定 X 轴倾角，制造俯视立体感
const SPIN_SPEED = 0.0008 // 每毫秒绕 Y 轴弧度，初版的 1/2（更舒缓）

interface OrbPoint {
  card: TechCard
  bx: number
  by: number
  bz: number
}

function buildSphere(n: number): OrbPoint[] {
  const points: OrbPoint[] = []
  for (let i = 0; i < n; i++) {
    // Fibonacci 球：y 均匀铺开，水平面按黄金角旋转铺满
    const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = GOLDEN_ANGLE * i
    const x = Math.cos(theta) * ring
    const z = Math.sin(theta) * ring
    // 先绕 X 轴固定倾斜，得到初始姿态
    const by = y * Math.cos(TILT_X) - z * Math.sin(TILT_X)
    const bz = y * Math.sin(TILT_X) + z * Math.cos(TILT_X)
    points.push({ card: techstackV2[i], bx: x, by, bz })
  }
  return points
}

export function TechStack() {
  const reducedMotion = useReducedMotion()
  const wrapRef = useRef<HTMLDivElement>(null)
  const orbRefs = useRef<Array<HTMLAnchorElement | null>>([])
  const angleRef = useRef(0)
  const pausedRef = useRef(false)

  const orbs = useMemo(() => buildSphere(techstackV2.length), [])

  useEffect(() => {
    if (reducedMotion) {
      // 静态成球：按初始角度投影一次
      renderFrame(0)
      return
    }
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = now - last
      last = now
      // 悬停暂停：不清空角度，移开后无缝续转
      if (!pausedRef.current) angleRef.current += SPIN_SPEED * dt
      renderFrame(angleRef.current)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, orbs])

  const renderFrame = (angle: number) => {
    const cosA = Math.cos(angle)
    const sinA = Math.sin(angle)
    for (let i = 0; i < orbs.length; i++) {
      const el = orbRefs.current[i]
      if (!el) continue
      const { bx, by, bz } = orbs[i]
      // 绕 Y 轴自转
      const x = bx * cosA + bz * sinA
      const z = -bx * sinA + bz * cosA
      const y = by
      const depth = (z + 1) / 2 // 0(后) → 1(前)
      const scale = 0.5 + 0.75 * depth
      const opacity = 0.32 + 0.68 * depth
      el.style.transform = `translate(-50%, -50%) translate(${x * SPHERE_RADIUS}px, ${y * SPHERE_RADIUS}px) scale(${scale})`
      el.style.opacity = String(opacity)
      el.style.zIndex = String(Math.round(depth * 100))
    }
  }

  return (
    <div className="w-full flex flex-col items-center" aria-label="技术">
      <h2 className="font-display mb-4 text-center text-3xl font-bold md:text-4xl">
        <span className="bg-gradient-to-r from-[#A594F9] via-[#7dd3fc] to-[#6EFFB1] bg-clip-text text-transparent">
          技术
        </span>
      </h2>

      <div
        ref={wrapRef}
        className="relative mx-auto"
        style={{ width: 380, height: 380 }}
        role="group"
        aria-label={`技术栈技术球：${techstackV2.map((t) => t.name).join('、')}`}
        onMouseEnter={() => {
          pausedRef.current = true
        }}
        onMouseLeave={() => {
          pausedRef.current = false
        }}
      >
        {/* 核心光晕 */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(124,211,252,0.18) 0%, rgba(165,148,249,0.10) 45%, transparent 70%)',
            filter: 'blur(6px)',
          }}
        />
        {orbs.map((orb, i) => (
          <a
            key={orb.card.name}
            ref={(el) => {
              orbRefs.current[i] = el
            }}
            href={orb.card.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${orb.card.name} 官网`}
            className="tech-orb group absolute left-1/2 top-1/2 flex cursor-pointer flex-col items-center justify-center gap-1 will-change-transform no-underline"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-[#0e1424]/90 shadow-[0_0_18px_rgba(124,211,252,0.25)] backdrop-blur-sm transition-transform duration-200 group-hover:scale-110 group-hover:border-[#7dd3fc]/60 light:bg-white/95 light:border-slate-300/70 light:shadow-[0_4px_14px_rgba(15,23,42,0.14)] light:group-hover:border-[#0369a1]/80">
              <img
                src={orb.card.icon}
                alt=""
                aria-hidden="true"
                className="h-8 w-8 object-contain"
                loading="eager"
              />
            </div>
            <span className="rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium text-[#dfe6f2] whitespace-nowrap">
              {orb.card.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  )
}
