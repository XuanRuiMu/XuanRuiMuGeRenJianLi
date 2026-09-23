import { useEffect, useRef, useState, type RefObject } from 'react'
import { ExternalLink } from 'lucide-react'
import { projects } from '../../data/projects'
import type { Project } from '../../data/types'
import { t } from '../../i18n/translations'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useProjectsWindStore } from '../../store/useProjectsWindStore'
import { 晾衣架物理引擎, 晾衣架配置, type 晾衣架快照 } from './clotheslinePhysics'
import { useNoteAutoFit } from './useNoteAutoFit'

/** 桌面断点：低于此宽度时物理晾衣架无法容纳便签（互相重叠、字号过小），切换为静态卡片网格 */
const 桌面断点 = '(min-width: 768px)'

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.matchMedia(桌面断点).matches)

  useEffect(() => {
    const query = window.matchMedia(桌面断点)
    const handleChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}

// canvas 无法直接引用 CSS 变量，非 CSS 环境（如测试）下的兜底色；浏览器中始终以 index.css 的 --rope-* 变量为准
const 兜底绳色 = {
  银亮: '#e8eaed',
  银中: '#9aa0a6',
  银暗: '#5f6368',
  棕亮: '#a9743d',
  棕暗: '#6b4423',
} as const

function 读取绳色(容器: HTMLElement) {
  const 样式 = getComputedStyle(容器)
  const 读 = (名: string, 兜底: string) => 样式.getPropertyValue(名).trim() || 兜底
  return {
    银亮: 读('--rope-silver-light', 兜底绳色.银亮),
    银中: 读('--rope-silver-mid', 兜底绳色.银中),
    银暗: 读('--rope-silver-dark', 兜底绳色.银暗),
    棕亮: 读('--rope-brown-light', 兜底绳色.棕亮),
    棕暗: 读('--rope-brown-dark', 兜底绳色.棕暗),
  }
}

function 描画曲线(ctx: CanvasRenderingContext2D, 点列: Array<{ x: number; y: number }>) {
  if (点列.length < 2) return
  ctx.beginPath()
  ctx.moveTo(点列[0].x, 点列[0].y)
  for (let i = 1; i < 点列.length - 1; i++) {
    const 当前 = 点列[i]
    const 下一点 = 点列[i + 1]
    ctx.quadraticCurveTo(当前.x, 当前.y, (当前.x + 下一点.x) / 2, (当前.y + 下一点.y) / 2)
  }
  const 末点 = 点列[点列.length - 1]
  ctx.lineTo(末点.x, 末点.y)
  ctx.stroke()
}

function 绘制晾衣绳(
  canvas: HTMLCanvasElement,
  快照: 晾衣架快照,
  色: ReturnType<typeof 读取绳色>,
  宽: number,
  高: number
) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const 目标宽 = Math.round(宽 * dpr)
  const 目标高 = Math.round(高 * dpr)
  if (canvas.width !== 目标宽 || canvas.height !== 目标高) {
    canvas.width = 目标宽
    canvas.height = 目标高
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, 宽, 高)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // 画布现已与容器（.clothesline-region）同宽同左缘，物理点直接按容器坐标系绘制，
  // 无需再平移偏移。银绳渲染为**一条连续 stroke**——快照.主绳 已是统一单链（左角→左延伸→主跨→右延伸→右角），
  // 物理与渲染同源单链，无缝贯通（FP-02：根除"中间断点 + 两套物理"）。
  const 整银链 = 快照.主绳.length > 0 ? 快照.主绳 : []
  if (整银链.length >= 2) {
    const 首 = 整银链[0]
    const 末 = 整银链[整银链.length - 1]
    const 渐变 = ctx.createLinearGradient(首.x, 0, 末.x, 0)
    // 5 段渐变扩展到整根银绳（锚到锚）：暗角 + 中央亮带，物理上银绳两端的暗角更写实
    渐变.addColorStop(0, 色.银暗)
    渐变.addColorStop(0.25, 色.银亮)
    渐变.addColorStop(0.5, 色.银中)
    渐变.addColorStop(0.75, 色.银亮)
    渐变.addColorStop(1, 色.银暗)
    ctx.strokeStyle = 渐变
    ctx.lineWidth = 3.6
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetY = 1
    描画曲线(ctx, 整银链)
  }

  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0
  ctx.lineWidth = 2.4
  for (let i = 0; i < 快照.吊绳.length; i++) {
    const 吊绳 = 快照.吊绳[i]
    const 便签顶Y = 快照.便签[i].y - 快照.便签[i].高 / 2
    const 吊绳渐变 = ctx.createLinearGradient(0, 吊绳[0].y, 0, 便签顶Y)
    吊绳渐变.addColorStop(0, 色.棕亮)
    吊绳渐变.addColorStop(1, 色.棕暗)
    ctx.strokeStyle = 吊绳渐变
    描画曲线(ctx, [...吊绳, { x: 快照.便签[i].x, y: 便签顶Y }])
  }
}

interface ClotheslineNotesProps {
  /** 测试页用：区域撑满父容器高度（flex:1），默认按简历主页固定高度 */
  填充?: boolean
}

/**
 * FP-04：单张羊皮卷的「标题/正文/链接」内容盒。
 * 自持 content ref 并调用 useNoteAutoFit，使每张便签按自身内容量独立二分适配字号。
 * DOM 结构、图片、物理引擎、银绳均不变。
 */
function NoteContent({
  项目,
  最小字号 = 0.6,
  最大字号 = 1.05,
}: {
  项目: Project
  最小字号?: number
  最大字号?: number
}) {
  const 内容Ref = useRef<HTMLDivElement>(null)
  useNoteAutoFit(内容Ref as RefObject<HTMLElement | null>, 最小字号, 最大字号)
  const link = 项目.links?.[0]
  return (
    <div className="clothesline-note-content" ref={内容Ref}>
      <h3 className="font-display clothesline-note-title">{t(项目.nameKey)}</h3>
      <p className="clothesline-note-desc">{t(项目.descKey)}</p>
      {link && (
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="clothesline-note-link inline-flex items-center gap-1 self-start transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`${t(项目.nameKey)}：${t(link.labelKey)}`}
        >
          <span>{t(link.labelKey)}</span>
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

/** 窄屏静态卡片网格：不挂物理引擎，羊皮纸便签纵向排列，字号下限更高、链接恒可见 */
function MobileNotesGrid() {
  return (
    <div className="clothesline-mobile-grid">
      {projects.map((project, index) => (
        <div key={project.id} className="clothesline-note clothesline-static-note" data-tint={index % 4}>
          <img src="/images/标准.png" alt="" className="clothesline-note-img" aria-hidden="true" />
          <div className="clothesline-note-tint" aria-hidden="true" />
          <NoteContent 项目={project} 最小字号={0.9} 最大字号={1.1} />
        </div>
      ))}
    </div>
  )
}

export function ClotheslineNotes({ 填充 = false }: ClotheslineNotesProps) {
  const reducedMotion = useReducedMotion()
  const isDesktop = useIsDesktop()
  const 风力强度 = useProjectsWindStore((s) => s.风力强度)
  const 容器Ref = useRef<HTMLDivElement>(null)
  const 画布Ref = useRef<HTMLCanvasElement>(null)
  const 便签Refs = useRef<Array<HTMLDivElement | null>>([])
  const 风力Ref = useRef(风力强度)
  const 引擎Ref = useRef<晾衣架物理引擎 | null>(null)

  useEffect(() => {
    风力Ref.current = 风力强度
  }, [风力强度])

  useEffect(() => {
    const 容器 = 容器Ref.current
    const 画布 = 画布Ref.current
    if (!容器 || !画布) return

    let 引擎: 晾衣架物理引擎 | null = null
    let rafId: number | null = null
    let 运行中 = false
    let 上次帧 = 0
    let 累积Ms = 0
    let 鼠标样本: { x: number; y: number; 时间: number } | null = null

    const 同步快照 = (快照: 晾衣架快照) => {
      for (let i = 0; i < 快照.便签.length; i++) {
        const el = 便签Refs.current[i]
        if (!el) continue
        const 便签 = 快照.便签[i]
        el.style.width = `${便签.宽.toFixed(2)}px`
        el.style.height = `${便签.高.toFixed(2)}px`
        el.style.transform = `translate(${(便签.x - 便签.宽 / 2).toFixed(2)}px, ${(便签.y - 便签.高 / 2).toFixed(2)}px) rotate(${便签.角度.toFixed(4)}rad)`
        el.style.opacity = '1'
      }
      绘制晾衣绳(画布, 快照, 读取绳色(容器), 画布.offsetWidth, 画布.offsetHeight)
    }

    const 构建 = () => {
      引擎?.销毁()
      const 基准宽 = 容器.offsetWidth
      if (基准宽 < 1) return
      // 晾衣绳区改为满幅（region = 100vw）：绳子两端角点钉在 region 边缘（画布左X=0 / 画布宽=region），
      // 跨满整个视口连到浏览器两边；便签集群宽度取 min(1152, 基准宽) 居中到满幅内（布局偏移X），
      // 使 100%/缩小缩放的观感与改动前（便签居中、绳子满幅）完全一致。放大缩放时 region 由 min-width
      // 冻结在基准宽、外层横向滚动揭示被挡便签——绳子与便签同源同宽、一起滚动对齐。
      const 带宽 = Math.min(1152, 基准宽)
      const 布局偏移X = Math.max(0, (基准宽 - 带宽) / 2)
      引擎 = new 晾衣架物理引擎({ 宽: 带宽, 高: 容器.offsetHeight, 画布左X: 0, 画布宽: 画布.offsetWidth, 布局偏移X })
      引擎Ref.current = 引擎
      同步快照(引擎.获取快照())
    }

    const 停止循环 = () => {
      运行中 = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
    }

    const 启动循环 = () => {
      if (运行中 || !引擎 || reducedMotion) return
      运行中 = true
      上次帧 = performance.now()
      累积Ms = 0
      const tick = (现在: number) => {
        if (!运行中 || !引擎) return
        rafId = requestAnimationFrame(tick)
        累积Ms += 现在 - 上次帧
        上次帧 = 现在
        const 步长 = 晾衣架配置.求解.固定步长Ms
        let 步数 = 0
        while (累积Ms >= 步长 && 步数 < 晾衣架配置.求解.最大跳帧) {
          引擎.步进()
          累积Ms -= 步长
          步数 += 1
        }
        if (步数 === 晾衣架配置.求解.最大跳帧) 累积Ms = 0
        if (步数 > 0) 同步快照(引擎.获取快照())
      }
      rafId = requestAnimationFrame(tick)
    }

    构建()
    // 根因修复：自校准基准宽度。区域 width:100% 但同时设 min-width=挂载时宽度，
    // 放大缩放（外层容器 CSS 像素变窄）时区域固定在 100% 基准宽、由外层横向滚动容器揭示被挡便签；
    // 缩小缩放时区域=100%（≥基准）无滚动、行为不变。offsetWidth 与浏览器缩放无关，故 Ctrl 缩放不触发物理重建。
    容器.style.minWidth = `${容器.offsetWidth}px`

    // 风监听挂在 section 级容器上：纯被动监听，不捕获指针、不 preventDefault，文字选择与链接点击不受影响
    const 风宿主 = 容器.closest('section') ?? 容器
    const 处理指针移动 = (e: PointerEvent) => {
      if (!引擎 || e.buttons !== 0) {
        鼠标样本 = null
        return
      }
      const 矩形 = 容器.getBoundingClientRect()
      const x = e.clientX - 矩形.left
      const y = e.clientY - 矩形.top
      const 现在 = performance.now()
      if (鼠标样本) {
        const dt = Math.max(现在 - 鼠标样本.时间, 1)
        引擎.登记风源(x, y, (x - 鼠标样本.x) / dt, (y - 鼠标样本.y) / dt, 风力Ref.current)
      }
      鼠标样本 = { x, y, 时间: 现在 }
    }

    const 处理可见性 = () => {
      if (document.hidden) {
        停止循环()
      } else {
        启动循环()
      }
    }

    // 页面滚动速度 → 便签受力：直接监听原生 scroll（Lenis 滚动真实 window，与 lenisRef 初始化时机解耦），
    // 自算速度（px/帧）登记进物理引擎，由引擎施加带偏角的斜向力并惯性衰减。
    let 上次滚动Y = typeof window !== 'undefined' ? window.scrollY : 0
    let 上次滚动T = typeof performance !== 'undefined' ? performance.now() : 0
    const 处理页面滚动 = () => {
      const 现在 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const y = typeof window !== 'undefined' ? window.scrollY : 0
      const dt = Math.max(现在 - 上次滚动T, 1)
      const 帧速度 = ((y - 上次滚动Y) / dt) * 16.67 // px/ms → 约每帧 px
      上次滚动Y = y
      上次滚动T = 现在
      引擎Ref.current?.登记滚动力(帧速度)
    }

    // 不再用 IntersectionObserver 暂停物理循环：便签摆动时可能超出容器 bounds，
    // 导致“容器已离屏、便签仍可见”的误判；暂停后重力/约束停止求解，便签会冻在半空（穿帮）。
    // 本场景仅 4 便签 + 28 绳节点，连续模拟成本极低，物理正确性优先于这份过早优化。

    let 尺寸观察器: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      尺寸观察器 = new ResizeObserver(() => {
        const 曾运行 = 运行中
        停止循环()
        构建()
        if (曾运行) 启动循环()
      })
      尺寸观察器.observe(容器)
    }

    if (!reducedMotion) {
      风宿主.addEventListener('pointermove', 处理指针移动, { passive: true })
      document.addEventListener('visibilitychange', 处理可见性)
      window.addEventListener('scroll', 处理页面滚动, { passive: true })
      启动循环()
    }

    return () => {
      停止循环()
      风宿主.removeEventListener('pointermove', 处理指针移动)
      document.removeEventListener('visibilitychange', 处理可见性)
      window.removeEventListener('scroll', 处理页面滚动)
      尺寸观察器?.disconnect()
      引擎?.销毁()
      引擎Ref.current = null
      引擎 = null
    }
  }, [reducedMotion])

  if (!isDesktop) {
    return <MobileNotesGrid />
  }

  return (
    <div className="clothesline-scroll">
      <div ref={容器Ref} className={`clothesline-region${填充 ? ' clothesline-region--fill' : ''}`}>
        <canvas ref={画布Ref} className="clothesline-canvas" aria-hidden="true" />
        {projects.map((project, index) => {
          return (
            <div
              key={project.id}
              ref={(el) => {
                便签Refs.current[index] = el
              }}
              className="clothesline-note select-text"
              data-tint={index % 4}
            >
              <img src="/images/标准.png" alt="" className="clothesline-note-img" aria-hidden="true" />
              <div className="clothesline-note-tint" aria-hidden="true" />
              <NoteContent 项目={project} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
