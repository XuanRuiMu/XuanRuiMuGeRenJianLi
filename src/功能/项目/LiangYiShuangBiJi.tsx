import { useEffect, useRef, type RefObject } from 'react'
import { ExternalLink } from 'lucide-react'
import { 项目表 } from '../../数据/项目'
import type { 项目 } from '../../数据/类型'
import { t } from '../../国际化/翻译'
import { 资源路径 } from '../../库/资源路径'
import { useJianShaoDongHua } from '../../钩子/useJianShaoDongHua'
import { useBianQianFengLi } from '../../状态/便签风力仓库'
import { 晾衣架物理引擎, 晾衣架配置, type 晾衣架快照 } from './LiangYiShuangWuLi'
import { 应用晾衣架布局 } from './LiangYiShuangBuJu'
import { useBiQianZiShiYing } from './useBiQianZiShiYing'

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

function 描画曲线(上下文: CanvasRenderingContext2D, 点列: Array<{ x: number; y: number }>) {
  if (点列.length < 2) return
  上下文.beginPath()
  上下文.moveTo(点列[0].x, 点列[0].y)
  for (let i = 1; i < 点列.length - 1; i++) {
    const 当前 = 点列[i]
    const 下一点 = 点列[i + 1]
    上下文.quadraticCurveTo(当前.x, 当前.y, (当前.x + 下一点.x) / 2, (当前.y + 下一点.y) / 2)
  }
  const 末点 = 点列[点列.length - 1]
  上下文.lineTo(末点.x, 末点.y)
  上下文.stroke()
}

function 绘制晾衣绳(
  画布: HTMLCanvasElement,
  快照: 晾衣架快照,
  色: ReturnType<typeof 读取绳色>,
  宽: number,
  高: number
) {
  const 上下文 = 画布.getContext('2d')
  if (!上下文) return
  const 像素比 = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const 目标宽 = Math.round(宽 * 像素比)
  const 目标高 = Math.round(高 * 像素比)
  if (画布.width !== 目标宽 || 画布.height !== 目标高) {
    画布.width = 目标宽
    画布.height = 目标高
  }
  上下文.setTransform(像素比, 0, 0, 像素比, 0, 0)
  上下文.clearRect(0, 0, 宽, 高)
  上下文.lineCap = 'round'
  上下文.lineJoin = 'round'

  const 整银链 = 快照.主绳.length > 0 ? 快照.主绳 : []
  if (整银链.length >= 2) {
    const 首 = 整银链[0]
    const 末 = 整银链[整银链.length - 1]
    const 渐变 = 上下文.createLinearGradient(首.x, 0, 末.x, 0)

    渐变.addColorStop(0, 色.银暗)
    渐变.addColorStop(0.25, 色.银亮)
    渐变.addColorStop(0.5, 色.银中)
    渐变.addColorStop(0.75, 色.银亮)
    渐变.addColorStop(1, 色.银暗)
    上下文.strokeStyle = 渐变
    上下文.lineWidth = 3.6
    上下文.shadowColor = 'rgba(0, 0, 0, 0.3)'
    上下文.shadowBlur = 2
    上下文.shadowOffsetY = 1
    描画曲线(上下文, 整银链)
  }

  上下文.shadowColor = 'transparent'
  上下文.shadowBlur = 0
  上下文.shadowOffsetY = 0
  上下文.lineWidth = 2.4
  for (let i = 0; i < 快照.吊绳.length; i++) {
    const 吊绳 = 快照.吊绳[i]
    const 便签顶Y = 快照.便签[i].y - 快照.便签[i].高 / 2
    const 吊绳渐变 = 上下文.createLinearGradient(0, 吊绳[0].y, 0, 便签顶Y)
    吊绳渐变.addColorStop(0, 色.棕亮)
    吊绳渐变.addColorStop(1, 色.棕暗)
    上下文.strokeStyle = 吊绳渐变
    描画曲线(上下文, [...吊绳, { x: 快照.便签[i].x, y: 便签顶Y }])
  }
}

interface 晾衣绳便签属性 {
  填充?: boolean
}

function BianQianNeiRong({ 项目 }: { 项目: 项目 }) {
  const 内容Ref = useRef<HTMLDivElement>(null)
  useBiQianZiShiYing(内容Ref as RefObject<HTMLElement | null>, 0.6, 1.05)
  const 链接 = 项目.链接表?.[0]
  return (
    <div className="clothesline-note-content" ref={内容Ref}>
      <h3 className="font-display clothesline-note-title">{t(项目.名称键)}</h3>
      <p className="clothesline-note-desc">{t(项目.描述键)}</p>
      {链接 && (
        <a
          href={链接.url}
          target="_blank"
          rel="noopener noreferrer"
          className="clothesline-note-link inline-flex items-center gap-1 self-start transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          aria-label={`${t(项目.名称键)}：${t(链接.标签键)}`}
        >
          <span>{t(链接.标签键)}</span>
          <ExternalLink size={12} aria-hidden="true" />
        </a>
      )}
    </div>
  )
}

export function LiangYiShuangBiJi({ 填充 = false }: 晾衣绳便签属性) {
  const 减少动画 = useJianShaoDongHua()
  const 风力强度 = useBianQianFengLi((s) => s.风力强度)
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

    const 滚动视口 = 容器.parentElement
    let 引擎: 晾衣架物理引擎 | null = null
    let 帧编号: number | null = null
    let 运行中 = false
    let 上次帧 = 0
    let 累积Ms = 0
    let 鼠标样本: { x: number; y: number; 时间: number } | null = null

    const 同步快照 = (快照: 晾衣架快照) => {
      for (let i = 0; i < 快照.便签.length; i++) {
        const 元素 = 便签Refs.current[i]
        if (!元素) continue
        const 便签 = 快照.便签[i]
        元素.style.width = `${便签.宽.toFixed(2)}px`
        元素.style.height = `${便签.高.toFixed(2)}px`
        元素.style.transform = `translate(${(便签.x - 便签.宽 / 2).toFixed(2)}px, ${(便签.y - 便签.高 / 2).toFixed(2)}px) rotate(${便签.角度.toFixed(4)}rad)`
        元素.style.opacity = '1'
      }
      绘制晾衣绳(画布, 快照, 读取绳色(容器), 画布.offsetWidth, 画布.offsetHeight)
    }

    const 构建 = () => {
      引擎?.销毁()
      引擎 = null
      引擎Ref.current = null

      const { 带宽, 布局偏移X, 区域宽, 区域高 } = 应用晾衣架布局({ 区域: 容器, 滚动视口 })
      引擎 = new 晾衣架物理引擎({
        宽: 带宽,
        高: 区域高,
        画布左X: 0,
        画布宽: 区域宽,
        布局偏移X,
      })
      引擎Ref.current = 引擎
      同步快照(引擎.获取快照())
    }

    const 停止循环 = () => {
      运行中 = false
      if (帧编号 !== null) {
        cancelAnimationFrame(帧编号)
        帧编号 = null
      }
    }

    const 启动循环 = () => {
      if (运行中 || !引擎 || 减少动画) return
      运行中 = true
      上次帧 = performance.now()
      累积Ms = 0
      const 帧步进 = (现在: number) => {
        if (!运行中 || !引擎) return
        帧编号 = requestAnimationFrame(帧步进)
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
      帧编号 = requestAnimationFrame(帧步进)
    }

    构建()

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
        const 帧间隔 = Math.max(现在 - 鼠标样本.时间, 1)
        引擎.登记风源(x, y, (x - 鼠标样本.x) / 帧间隔, (y - 鼠标样本.y) / 帧间隔, 风力Ref.current)
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

    let 上次滚动Y = typeof window !== 'undefined' ? window.scrollY : 0
    let 上次滚动T = typeof performance !== 'undefined' ? performance.now() : 0
    const 处理页面滚动 = () => {
      const 现在 = typeof performance !== 'undefined' ? performance.now() : Date.now()
      const y = typeof window !== 'undefined' ? window.scrollY : 0
      const 帧间隔 = Math.max(现在 - 上次滚动T, 1)
      const 帧速度 = ((y - 上次滚动Y) / 帧间隔) * 16.67
      上次滚动Y = y
      上次滚动T = 现在
      引擎Ref.current?.登记滚动力(帧速度)
    }

    let 尺寸观察器: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      尺寸观察器 = new ResizeObserver(() => {
        const 曾运行 = 运行中
        停止循环()
        构建()
        if (曾运行) 启动循环()
      })

      尺寸观察器.observe(滚动视口 ?? 容器)
    }

    if (!减少动画) {
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
  }, [减少动画])

  return (
    <div className="clothesline-scroll">
      <div ref={容器Ref} className={`clothesline-region${填充 ? ' clothesline-region--fill' : ''}`}>
        <canvas ref={画布Ref} className="clothesline-canvas" aria-hidden="true" />
        {项目表.map((项目, 下标) => {
          return (
            <div
              key={项目.id}
              ref={(元素) => {
                便签Refs.current[下标] = 元素
              }}
              className="clothesline-note select-text"
              data-tint={下标 % 4}
            >
              <img src={资源路径('/images/标准.webp')} alt="" className="clothesline-note-img" aria-hidden="true" />
              <div className="clothesline-note-tint" aria-hidden="true" />
              <BianQianNeiRong 项目={项目} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
