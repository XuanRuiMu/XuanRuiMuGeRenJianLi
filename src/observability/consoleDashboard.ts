/* eslint-disable no-console -- 本模块职责即向 F12 控制台输出调试仪表盘，console 调用为预期行为 */

import { ringBuffer, logStore } from './globals'
import { useAppStore } from '../store/useAppStore'
import { encode } from '@msgpack/msgpack'
import type { LogEntry, LogLevel } from './ringBuffer'
import type { FrameMetrics, PerformanceMetrics, QualityLevel } from '../domain/types'

// 等级配色（命令式复用旧浮窗语义，仅用于控制台着色）
const 等级配色: Record<LogLevel, string> = {
  debug: '#9aa0a6',
  info: '#4a9eff',
  warn: '#ffa726',
  error: '#ef5350',
  fatal: '#ff1744',
}

const 最大日志条数 = 500
const 最近日志: LogEntry[] = []

// 最近一次来自 store 的快照，fps()/perf() 即时读取
const 当前状态: {
  frameMetrics: FrameMetrics
  performanceMetrics: PerformanceMetrics
  qualityLevel: QualityLevel
} = {
  frameMetrics: { fps: 0, p95: 0, avg: 0, downgradeCount: 0, upgradeCount: 0 },
  performanceMetrics: {},
  qualityLevel: 'high',
}

// 自研 FPS 采样器：仅 rAF 计数，零依赖，仅在 watch 开启时运行（不阻塞主线程）
function 创建帧率采样器() {
  let 上一帧 = performance.now()
  let 帧计数 = 0
  let fps = 0
  let rafId: number | null = null
  let 运行中 = false

  function 循环(now: number): void {
    if (!运行中) return
    帧计数++
    const 间隔 = now - 上一帧
    if (间隔 >= 1000) {
      fps = Math.round((帧计数 * 1000) / 间隔)
      帧计数 = 0
      上一帧 = now
    }
    rafId = requestAnimationFrame(循环)
  }

  return {
    获取: () => fps,
    开始: () => {
      if (运行中) return
      运行中 = true
      上一帧 = performance.now()
      帧计数 = 0
      rafId = requestAnimationFrame(循环)
    },
    停止: () => {
      运行中 = false
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
      }
      fps = 0
    },
  }
}

const 帧率采样器 = 创建帧率采样器()

// 读取 JS 堆内存（非标准 API，弱类型适配，缺失时回退 N/A）
interface 堆内存信息 {
  usedJSHeapSize?: number
}
function 读取内存(): string {
  const mem = (performance as unknown as { memory?: 堆内存信息 }).memory
  if (!mem?.usedJSHeapSize) return 'N/A'
  return `${(mem.usedJSHeapSize / (1024 * 1024)).toFixed(1)}MB`
}

// ---- 命令式 API 实现 ----

function 打印横幅(): void {
  const 主色 = '#7df9ff'
  const 底色 = '#0b0b14'
  console.info(
    '%c 玄锐暮 · 个人简历 %c 调试仪表盘已挂载 ',
    `background:${底色};color:${主色};font-weight:700;padding:2px 8px;border-radius:4px 0 0 4px;font-size:13px;`,
    `background:${主色};color:${底色};font-weight:700;padding:2px 8px;border-radius:0 4px 4px 0;font-size:13px;`
  )
  console.info(
    '%c所有调试能力已迁移至 F12 控制台，零 DOM 侵入。输入 %c__RESUME_DEBUG__.help()%c 查看完整命令。',
    'color:#bbb;font-size:12px;',
    `color:${主色};font-weight:600;`,
    'color:#bbb;font-size:12px;'
  )
}

function help(): void {
  console.group('%c__RESUME_DEBUG__ 调试命令', 'color:#7df9ff;font-weight:700;')
  console.log('%chelp()%c    · 显示本帮助', 'color:#9ae6ff', 'color:#aaa')
  console.log('%cfps()%c     · 即时打印当前 FPS / 帧时间 / 内存 / 质量等级', 'color:#9ae6ff', 'color:#aaa')
  console.log('%cperf()%c    · 即时打印 Web Vitals（LCP/FCP/INP/CLS/TTFB）', 'color:#9ae6ff', 'color:#aaa')
  console.log('%clogs(n)%c   · 打印最近 n 条日志（默认 50，颜色分级 + 表格）', 'color:#9ae6ff', 'color:#aaa')
  console.log('%cexport()%c  · 导出持久化日志为 .msgpack 下载', 'color:#9ae6ff', 'color:#aaa')
  console.log('%cclear()%c   · 清空控制台已收集的日志快照', 'color:#9ae6ff', 'color:#aaa')
  console.log('%cwatch(on)%c · 切换 2s 紧凑状态行（默认开启，rAF 采样 FPS）', 'color:#9ae6ff', 'color:#aaa')
  console.groupEnd()
}

function fps(): void {
  const { frameMetrics, qualityLevel } = 当前状态
  console.group(
    '%c实时帧率 %c' + qualityLevel.toUpperCase(),
    'color:#7df9ff;font-weight:700;',
    'color:#ffa726;font-weight:700;'
  )
  console.log('FPS        :', frameMetrics.fps)
  console.log('帧时间(avg):', `${frameMetrics.avg}ms`)
  console.log('p95        :', `${frameMetrics.p95}ms`)
  console.log('降级/升级  :', `${frameMetrics.downgradeCount} / ${frameMetrics.upgradeCount}`)
  console.log('内存       :', 读取内存())
  console.groupEnd()
}

function perf(): void {
  const m = 当前状态.performanceMetrics
  console.group('%cWeb Vitals', 'color:#7df9ff;font-weight:700;')
  console.table({
    LCP: m.lcp ?? '·',
    FCP: m.fcp ?? '·',
    INP: m.inp ?? '·',
    CLS: m.cls ?? '·',
    TTFB: m.ttfb ?? '·',
  })
  console.groupEnd()
}

function 时间文本(ts: bigint): string {
  return new Date(Number(ts)).toTimeString().slice(0, 8)
}

function logs(n = 50): void {
  const 片段 = 最近日志.slice(-n)
  console.group(
    `%c最近 ${片段.length} 条日志 %c(共收集 ${最近日志.length})`,
    'color:#7df9ff;font-weight:700;',
    'color:#888;'
  )
  for (const e of 片段) {
    const 色 = 等级配色[e.level] ?? '#ccc'
    console.log(
      '%c%s %c%-5s%c %s',
      'color:#666',
      时间文本(e.timestamp),
      `color:${色};font-weight:600`,
      e.level.toUpperCase(),
      'color:#ddd',
      e.message
    )
  }
  if (片段.length > 0) {
    console.log('\n%c表格视图：', 'color:#888')
    console.table(
      片段.map((e) => ({
        时间: 时间文本(e.timestamp),
        等级: e.level,
        分类: e.category,
        消息: e.message,
      }))
    )
  }
  console.groupEnd()
}

async function 导出(): Promise<void> {
  if (typeof document === 'undefined') return
  const entries = await logStore.readEntries(5000)
  const encoded = encode(
    entries.map((e) => ({
      ...e,
      timestamp: Number(e.timestamp),
    }))
  )
  const blob = new Blob([encoded], { type: 'application/octet-stream' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `resume-logs-${Date.now()}.msgpack`
  a.click()
  URL.revokeObjectURL(url)
  console.info('已导出 %d 条日志为 .msgpack', entries.length)
}

function clear(): void {
  最近日志.length = 0
  console.info('已清空控制台日志快照（持久化日志不受影响）')
}

let 监视手柄: { 停止: () => void } | null = null

function watch(on = true): void {
  if (on) {
    if (监视手柄) {
      console.info('watch 已在运行')
      return
    }
    帧率采样器.开始()
    const id = window.setInterval(() => {
      console.log(
        '%c[watch]%c FPS %s · 质量 %s · 内存 %s',
        'color:#7df9ff',
        'color:#aaa',
        帧率采样器.获取(),
        当前状态.qualityLevel,
        读取内存()
      )
    }, 2000)
    监视手柄 = {
      停止: () => {
        window.clearInterval(id)
        帧率采样器.停止()
      },
    }
    console.info('watch 已开启（每 2s 输出紧凑状态行，watch(false) 关闭）')
  } else {
    监视手柄?.停止()
    监视手柄 = null
    console.info('watch 已关闭')
  }
}

interface 调试接口 {
  help: () => void
  fps: () => void
  perf: () => void
  logs: (n?: number) => void
  export: () => void
  clear: () => void
  watch: (on?: boolean) => void
}

declare global {
  interface Window {
    __RESUME_DEBUG__?: 调试接口
  }
}

export function initConsoleDashboard(): void {
  if (typeof window === 'undefined') return

  // 订阅 ringBuffer，收集最近日志（不向 DOM 注入任何元素）
  ringBuffer.subscribe((entry: LogEntry) => {
    最近日志.push(entry)
    if (最近日志.length > 最大日志条数) {
      最近日志.splice(0, 最近日志.length - 最大日志条数)
    }
  })

  // 订阅 useAppStore，保持 FPS/帧时间/质量/Web Vitals 最新快照
  const 初始 = useAppStore.getState()
  当前状态.frameMetrics = 初始.frameMetrics
  当前状态.performanceMetrics = 初始.performanceMetrics
  当前状态.qualityLevel = 初始.qualityLevel
  useAppStore.subscribe((state) => {
    当前状态.frameMetrics = state.frameMetrics
    当前状态.performanceMetrics = state.performanceMetrics
    当前状态.qualityLevel = state.qualityLevel
  })

  打印横幅()

  window.__RESUME_DEBUG__ = {
    help,
    fps,
    perf,
    logs,
    export: 导出,
    clear,
    watch,
  }
}
