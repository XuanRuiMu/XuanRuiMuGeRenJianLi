import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Shapes } from 'lucide-react'
import { motion, useScroll, useSpring, useTransform } from 'framer-motion'
import { 展示行表, type 展示卡 } from '../../数据/展示'
import { t } from '../../国际化/翻译'
import { useJianShaoDongHua } from '../../钩子/useJianShaoDongHua'
import { 卡片图标表 } from './KaPianTuBiao'
import { 解析副标题段 } from './副标题解析'
import {
  创建跑马灯控制,
  计算份数,
  是否滚动按键,
  归一化位移,
  钳制滚动增量,
  推进一帧,
  标记意图滚动,
  同步滚动位置,
  最大帧步长,
  最小份数,
  轨道屏幕偏移,
  type 跑马灯控制,
  type 轨道槽位,
} from './PaoMaDengYinQing'

const 渐变表 = [
  'from-purple-500 to-blue-500',
  'from-orange-400 to-yellow-500',
  'from-pink-500 to-red-500',
  'from-cyan-400 to-blue-500',
  'from-green-400 to-lime-500',
  'from-fuchsia-500 to-pink-500',
  'from-yellow-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-green-400 to-emerald-500',
]

const 霓虹阴影表 = [
  'shadow-[0_0_30px_5px_rgba(147,51,234,0.4)]',
  'shadow-[0_0_30px_5px_rgba(251,191,36,0.4)]',
  'shadow-[0_0_30px_5px_rgba(236,72,153,0.4)]',
  'shadow-[0_0_30px_5px_rgba(34,211,238,0.4)]',
  'shadow-[0_0_30px_5px_rgba(132,204,22,0.4)]',
  'shadow-[0_0_30px_5px_rgba(232,121,249,0.4)]',
  'shadow-[0_0_30px_5px_rgba(251,191,36,0.4)]',
  'shadow-[0_0_30px_5px_rgba(59,130,246,0.4)]',
  'shadow-[0_0_30px_5px_rgba(16,185,129,0.4)]',
]

const 图标颜色表 = ['#a78bfa', '#fbbf24', '#f472b6', '#22d3ee', '#a3e635', '#e879f9', '#facc15', '#60a5fa', '#34d399']

const 弹簧配置 = { stiffness: 300, damping: 30 }

interface 展示产品卡片属性 {
  卡片: 展示卡
  下标: number
  减少动画: boolean
  控制?: 跑马灯控制
}

function ZhanShiChanPinKaPian({ 卡片, 下标, 减少动画, 控制 }: 展示产品卡片属性) {
  const 渐变 = 渐变表[下标 % 渐变表.length]
  const 霓虹阴影 = 霓虹阴影表[下标 % 霓虹阴影表.length]
  const 图标颜色 = 图标颜色表[下标 % 图标颜色表.length]
  const TuBiaoZuJian = 卡片图标表[卡片.id] ?? Shapes
  const 卡片引用 = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const 元素 = 卡片引用.current
    if (!元素 || !控制 || 减少动画) return
    const 指针进入 = () => 控制.悬停集合.add(元素)
    const 指针离开 = () => 控制.悬停集合.delete(元素)
    元素.addEventListener('pointerenter', 指针进入)
    元素.addEventListener('pointerleave', 指针离开)
    return () => {
      元素.removeEventListener('pointerenter', 指针进入)
      元素.removeEventListener('pointerleave', 指针离开)
      控制.悬停集合.delete(元素)
    }
  }, [控制, 减少动画])

  const 有配图 = Boolean(卡片.图片)
  const [显示配图, 设置显示配图] = useState(false)

  useEffect(() => {
    const 元素 = 卡片引用.current
    if (!元素 || !有配图) return
    if (typeof IntersectionObserver === 'undefined') {
      queueMicrotask(() => 设置显示配图(true))
      return
    }
    const 观察器 = new IntersectionObserver(
      (条目表) => {
        if (条目表.some((条目) => 条目.isIntersecting)) {
          设置显示配图(true)
          观察器.disconnect()
        }
      },
      { rootMargin: '300px' }
    )
    观察器.observe(元素)
    return () => 观察器.disconnect()
  }, [有配图])

  const 内部 = (
    <div
      className="relative flex h-full w-full flex-col justify-between overflow-hidden rounded-xl bg-black p-5 md:p-6"
      style={
        显示配图
          ? {
              backgroundImage: `url(${卡片.图片})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {有配图 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-t from-black/90 via-black/50 to-black/70"
        />
      )}
      <div className="relative z-10 flex h-full w-full flex-col justify-between">
        <TuBiaoZuJian size={44} style={{ color: 图标颜色 }} aria-hidden="true" />
        <div>
          <h3 className="mb-1.5 text-base font-bold text-white md:text-lg">{t(卡片.标题键)}</h3>
          <p className="text-xs leading-relaxed text-[#aaa6c3] md:text-sm">{t(卡片.描述键)}</p>
        </div>
      </div>
    </div>
  )

  return (
    <div
      ref={卡片引用}
      className="group/card relative h-32 w-[11rem] shrink-0 md:h-[26.75rem] md:w-[22rem] lg:h-96 lg:w-[30rem]"
    >
      <span aria-hidden="true" className="absolute inset-x-0 -bottom-6 h-6" />
      <motion.div whileHover={减少动画 ? undefined : { y: -20 }} className="h-full w-full">
        <div className={`h-full w-full rounded-xl bg-gradient-to-r p-[2px] ${渐变} ${霓虹阴影} md:p-[6px]`}>
          {卡片.href ? (
            <a
              href={卡片.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-full w-full overflow-hidden rounded-xl bg-black transition-shadow group-hover/card:shadow-2xl"
            >
              {内部}
            </a>
          ) : (
            <div className="block h-full w-full overflow-hidden rounded-xl bg-black transition-shadow group-hover/card:shadow-2xl">
              {内部}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

function useZidongPaomadeng(选项: { 控制: 跑马灯控制; 方向: 1 | -1; 基准速度: number; 减少动画: boolean }) {
  const { 控制, 方向, 基准速度, 减少动画 } = 选项
  const 轨道Ref = useRef<HTMLDivElement>(null)
  const 组Ref = useRef<HTMLDivElement>(null)
  const 周期Ref = useRef(0)
  const 位移Ref = useRef(0)
  const 速度Ref = useRef(0)
  const [份数, 设置份数] = useState(最小份数)

  useLayoutEffect(() => {
    if (减少动画) {
      if (轨道Ref.current) 轨道Ref.current.style.transform = ''
      return
    }
    let 已调度 = false
    const 执行测量 = () => {
      已调度 = false
      const 组 = 组Ref.current
      if (!组) return
      const 组宽 = 组.offsetWidth
      if (!(组宽 > 0)) return
      const 轨道元素 = 轨道Ref.current
      const 视口元素 = 轨道元素?.parentElement
      const 视口宽 = 视口元素?.clientWidth || window.innerWidth || document.documentElement.clientWidth || 0
      设置份数((旧份数) => {
        const 目标份数 = 计算份数(视口宽, 组宽)
        return 旧份数 === 目标份数 ? 旧份数 : 目标份数
      })
      if (组宽 !== 周期Ref.current) {
        周期Ref.current = 组宽
        位移Ref.current = 归一化位移(位移Ref.current, 组宽)
        if (轨道元素) 轨道元素.style.transform = `translate3d(${轨道屏幕偏移(位移Ref.current, 组宽)}px, 0, 0)`
      }
    }
    const 调度测量 = () => {
      if (已调度) return
      已调度 = true
      requestAnimationFrame(执行测量)
    }
    执行测量()
    let 观察器: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined' && 组Ref.current) {
      观察器 = new ResizeObserver(调度测量)
      观察器.observe(组Ref.current)
    }
    window.addEventListener('resize', 调度测量)
    window.addEventListener('load', 调度测量)
    const 字体集 = document.fonts
    if (字体集 && typeof 字体集.ready?.then === 'function') {
      void 字体集.ready.then(调度测量)
    }
    return () => {
      观察器?.disconnect()
      window.removeEventListener('resize', 调度测量)
      window.removeEventListener('load', 调度测量)
    }
  }, [减少动画])

  useEffect(() => {
    if (减少动画) return
    const 槽位: 轨道槽位 = {
      轨道: 轨道Ref,
      周期: 周期Ref,
      位移: 位移Ref,
      速度: 速度Ref,
      方向,
      基准速度,
    }
    控制.轨道表.push(槽位)
    return () => {
      const 下标 = 控制.轨道表.indexOf(槽位)
      if (下标 >= 0) 控制.轨道表.splice(下标, 1)
    }
  }, [控制, 方向, 基准速度, 减少动画])

  return { 轨道Ref, 组Ref, 份数 }
}

interface 展示跑马灯行属性 {
  行: (typeof 展示行表)[number]
  行号: number
  方向: 1 | -1
  基准速度: number
  减少动画: boolean
  控制: 跑马灯控制
}

function ZhanShiPaoMaDengHang({ 行, 行号, 方向, 基准速度, 减少动画, 控制 }: 展示跑马灯行属性) {
  const { 轨道Ref, 组Ref, 份数 } = useZidongPaomadeng({
    控制,
    方向,
    基准速度,
    减少动画,
  })

  return (
    <div className="mb-20">
      <span id={行.锚点编号} className="block scroll-mt-24" aria-hidden="true">
        &nbsp;
      </span>
      <div ref={轨道Ref} className="showcase-marquee flex">
        {Array.from({ length: 份数 }).map((_, 组) => (
          <div
            key={组}
            ref={组 === 0 ? 组Ref : undefined}
            className="flex shrink-0 gap-20 pr-20"
            inert={组 > 0}
            aria-hidden={组 > 0}
          >
            {行.卡片表.map((卡片, 卡片下标) => (
              <ZhanShiChanPinKaPian
                key={`${卡片.id}-${组}`}
                卡片={卡片}
                下标={行号 * 5 + 卡片下标}
                减少动画={减少动画}
                控制={控制}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

const 副标题渐变类 = [
  'bg-gradient-to-r from-[#6EFFB1] to-[#38bdf8] bg-clip-text text-transparent',
  'bg-gradient-to-r from-[#fde047] via-[#fb923c] to-[#f472b6] bg-clip-text text-transparent',
  'bg-gradient-to-r from-[#c4b5fd] via-[#f0abfc] to-[#818cf8] bg-clip-text text-transparent',
] as const

const 副标题前缀分隔符 = '、' as const

const 副标题后缀类 =
  'block text-center text-[38px] font-normal leading-[155%] tracking-[0.2em] text-[#152443] opacity-[0.92] md:text-[42px] lg:text-[46px] lg:tracking-[0.4em] dark:text-[#e4eaf6] [font-family:system-ui,-apple-system,"Segoe_UI",Roboto,"Helvetica_Neue",Arial,sans-serif]'

function 渲染副标题(副标题: string) {
  const { 前缀段, 后缀段 } = 解析副标题段(副标题)
  return (
    <>
      {前缀段.map((段, 序号) => (
        <span key={序号}>
          <span className={副标题渐变类[序号 % 副标题渐变类.length]}>{段}</span>
          {序号 < 前缀段.length - 1 ? 副标题前缀分隔符 : ''}
        </span>
      ))}
      {后缀段 ? (
        <span data-showcase-subtitle-suffix="true" className={副标题后缀类}>
          {后缀段}
        </span>
      ) : null}
    </>
  )
}

export function ZhanShiBanKuai() {
  const 减少动画 = useJianShaoDongHua()
  const ref = useRef<HTMLDivElement>(null)

  const [控制] = useState(创建跑马灯控制)
  useEffect(() => {
    if (减少动画) return
    const 指针移动 = (事件: PointerEvent) => {
      const 命中轨道 = new Set<HTMLDivElement>()
      const 元素表 = document.elementsFromPoint(事件.clientX, 事件.clientY)
      for (const 槽位 of 控制.轨道表) {
        const 轨道 = 槽位.轨道.current
        if (!轨道) continue
        const 轨道位置 = 元素表.findIndex((元素) => 元素 === 轨道 || 轨道.contains(元素))
        if (轨道位置 < 0) continue
        if (元素表.slice(0, 轨道位置).some((元素) => !轨道.contains(元素))) continue
        for (const 卡片 of 轨道.querySelectorAll('.group\\/card')) {
          const 矩形 = 卡片.getBoundingClientRect()
          if (
            事件.clientX >= 矩形.left &&
            事件.clientX <= 矩形.right &&
            事件.clientY >= 矩形.top &&
            事件.clientY <= 矩形.bottom
          ) {
            命中轨道.add(轨道)
            控制.悬停集合.add(轨道)
            break
          }
        }
      }
      for (const 元素 of [...控制.悬停集合]) {
        const 所属 = 元素.classList.contains('showcase-marquee')
          ? (元素 as HTMLDivElement)
          : (元素.closest('.showcase-marquee') as HTMLDivElement | null)
        if (!所属 || !命中轨道.has(所属)) 控制.悬停集合.delete(元素)
      }
    }
    const 清空 = () => 控制.悬停集合.clear()
    window.addEventListener('pointermove', 指针移动, { passive: true })
    window.addEventListener('blur', 清空)
    document.addEventListener('pointerleave', 清空)
    return () => {
      window.removeEventListener('pointermove', 指针移动)
      window.removeEventListener('blur', 清空)
      document.removeEventListener('pointerleave', 清空)
      清空()
    }
  }, [控制, 减少动画])

  useEffect(() => {
    const 意图输入 = () => 标记意图滚动(控制)
    const 缓冲同步 = () => 同步滚动位置(控制)
    const 按键暂停 = (事件: KeyboardEvent) => {
      if (是否滚动按键(事件.key)) 标记意图滚动(控制)
    }
    window.addEventListener('wheel', 意图输入, { passive: true })
    window.addEventListener('touchmove', 意图输入, { passive: true })
    window.addEventListener('scroll', 缓冲同步, { passive: true })
    window.addEventListener('keydown', 按键暂停)
    return () => {
      window.removeEventListener('wheel', 意图输入)
      window.removeEventListener('touchmove', 意图输入)
      window.removeEventListener('scroll', 缓冲同步)
      window.removeEventListener('keydown', 按键暂停)
      控制.悬停集合.clear()
    }
  }, [控制])

  useEffect(() => {
    if (减少动画) return
    let 帧号 = 0
    let 上次时刻: number | null = null
    const 帧 = (时刻: number) => {
      const 上次 = 上次时刻
      上次时刻 = 时刻
      const 步长秒 = 上次 == null ? 0 : Math.min(Math.max((时刻 - 上次) / 1000, 0), 最大帧步长)
      for (const 元素 of [...控制.悬停集合]) if (!元素.isConnected) 控制.悬停集合.delete(元素)
      const 悬停暂停 = 控制.悬停集合.size > 0
      const 滚动暂停中 = performance.now() < 控制.暂停至.current
      const 已暂停 = 悬停暂停 || 滚动暂停中
      const 滚动增量 = 钳制滚动增量(控制.滚动位置.current - 控制.上次滚动位置.current)
      控制.上次滚动位置.current = 控制.滚动位置.current
      for (const 槽位 of 控制.轨道表) {
        const 结果 = 推进一帧({
          位移: 槽位.位移.current,
          速度: 槽位.速度.current,
          周期: 槽位.周期.current,
          方向: 槽位.方向,
          基准速度: 槽位.基准速度,
          已暂停,
          滚动暂停中,
          步长秒,
          滚动增量,
        })
        槽位.速度.current = 结果.速度
        if (结果.位移 !== 槽位.位移.current) {
          槽位.位移.current = 结果.位移
          const 轨道 = 槽位.轨道.current
          if (轨道) 轨道.style.transform = `translate3d(${轨道屏幕偏移(结果.位移, 槽位.周期.current)}px, 0, 0)`
        }
      }
      帧号 = requestAnimationFrame(帧)
    }
    帧号 = requestAnimationFrame(帧)
    return () => cancelAnimationFrame(帧号)
  }, [减少动画, 控制])

  const { scrollYProgress: 滚动进度 } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const 绕X轴旋转 = useSpring(useTransform(滚动进度, [0, 0.2], [15, 0]), 弹簧配置)
  const 绕Z轴旋转 = useSpring(useTransform(滚动进度, [0, 0.2], [20, 0]), 弹簧配置)

  const 入场 = 减少动画
    ? undefined
    : {
        rotateX: 绕X轴旋转,
        rotateZ: 绕Z轴旋转,
      }

  return (
    <section data-showcase="true" aria-label={t('showcase.titleLine2')}>
      <div
        ref={ref}
        className="relative flex flex-col antialiased [perspective:1000px] [transform-style:preserve-3d] z-[100] isolate"
      >
        <div className="relative mx-auto w-full max-w-7xl px-4 py-20 md:py-40">
          <h2 className="font-display text-4xl font-bold tracking-widest md:text-6xl">
            <span className="bg-gradient-to-r from-[#6EFFB1] to-[#A594F9] bg-clip-text text-transparent">
              {t('showcase.titleLine1')}
            </span>
            <br />
            <span className="bg-gradient-to-r from-[#fde047] via-[#f472b6] to-[#a855f7] bg-clip-text text-5xl font-bold text-transparent md:text-6xl">
              {t('showcase.titleLine2')}
            </span>
          </h2>
          <p data-showcase-subtitle="true" className="mt-8 max-w-2xl text-xl font-bold md:text-2xl">
            {渲染副标题(t('showcase.subtitle'))}
          </p>
        </div>

        {}
        <motion.div style={入场} className="[transform-style:preserve-3d]">
          {展示行表.map((行, 行号) => (
            <ZhanShiPaoMaDengHang
              key={行.锚点编号}
              行={行}
              行号={行号}
              方向={行号 % 2 === 0 ? -1 : 1}
              基准速度={50}
              减少动画={减少动画}
              控制={控制}
            />
          ))}
        </motion.div>
      </div>
    </section>
  )
}
