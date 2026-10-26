import { 环形缓冲实例, 日志存储实例 } from './全局'
import { useYingYongZhuangTai } from '../状态/应用状态仓库'
import { encode } from '@msgpack/msgpack'
import type { 日志条目, 日志级别 } from './环形缓冲'
import type { 帧指标, 性能指标, 画质档位值 } from '../领域/类型'

const 等级配色: Record<日志级别, string> = {
  debug: '#9aa0a6',
  info: '#4a9eff',
  warn: '#ffa726',
  error: '#ef5350',
  fatal: '#ff1744',
}

const 最大日志条数 = 500
const 最近日志: 日志条目[] = []

const 当前状态: {
  frameMetrics: 帧指标
  performanceMetrics: 性能指标
  qualityLevel: 画质档位值
} = {
  frameMetrics: { fps: 0, p95: 0, avg: 0, 降档次数: 0, 升档次数: 0 },
  performanceMetrics: {},
  qualityLevel: 'high',
}

function 创建帧率采样器() {
  let 上一帧 = performance.now()
  let 帧计数 = 0
  let 帧率 = 0
  let 帧编号: number | null = null
  let 运行中 = false

  function 循环(当前时刻: number): void {
    if (!运行中) return
    帧计数++
    const 间隔 = 当前时刻 - 上一帧
    if (间隔 >= 1000) {
      帧率 = Math.round((帧计数 * 1000) / 间隔)
      帧计数 = 0
      上一帧 = 当前时刻
    }
    帧编号 = requestAnimationFrame(循环)
  }

  return {
    获取: () => 帧率,
    开始: () => {
      if (运行中) return
      运行中 = true
      上一帧 = performance.now()
      帧计数 = 0
      帧编号 = requestAnimationFrame(循环)
    },
    停止: () => {
      运行中 = false
      if (帧编号 !== null) {
        cancelAnimationFrame(帧编号)
        帧编号 = null
      }
      帧率 = 0
    },
  }
}

const 帧率采样器 = 创建帧率采样器()

interface 堆内存信息 {
  usedJSHeapSize?: number
}
function 读取内存(): string {
  const 内存 = (performance as unknown as { memory?: 堆内存信息 }).memory
  if (!内存?.usedJSHeapSize) return 'N/A'
  return `${(内存.usedJSHeapSize / (1024 * 1024)).toFixed(1)}MB`
}

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

function 帮助(): void {
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

function 帧率(): void {
  const { frameMetrics: 帧指标, qualityLevel: 画质档位 } = 当前状态
  console.group(
    '%c实时帧率 %c' + 画质档位.toUpperCase(),
    'color:#7df9ff;font-weight:700;',
    'color:#ffa726;font-weight:700;'
  )
  console.log('FPS        :', 帧指标.fps)
  console.log('帧时间(avg):', `${帧指标.avg}ms`)
  console.log('p95        :', `${帧指标.p95}ms`)
  console.log('降级/升级  :', `${帧指标.降档次数} / ${帧指标.升档次数}`)
  console.log('内存       :', 读取内存())
  console.groupEnd()
}

function 性能(): void {
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

function 时间文本(时间戳: bigint): string {
  return new Date(Number(时间戳)).toTimeString().slice(0, 8)
}

function 日志(n = 50): void {
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
  const 条目表 = await 日志存储实例.读取条目(5000)
  const 已编码 = encode(
    条目表.map((e) => ({
      ...e,
      timestamp: Number(e.timestamp),
    }))
  )
  const 数据块 = new Blob([已编码], { type: 'application/octet-stream' })
  const 地址 = URL.createObjectURL(数据块)
  const a = document.createElement('a')
  a.href = 地址
  a.download = `resume-logs-${Date.now()}.msgpack`
  a.click()
  URL.revokeObjectURL(地址)
  console.info('已导出 %d 条日志为 .msgpack', 条目表.length)
}

function 清空(): void {
  最近日志.length = 0
  console.info('已清空控制台日志快照（持久化日志不受影响）')
}

let 监视手柄: { 停止: () => void } | null = null

function 监视(开启 = true): void {
  if (开启) {
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
  watch: (开启?: boolean) => void
}

declare global {
  interface Window {
    __RESUME_DEBUG__?: 调试接口
  }
}

export function 初始化控制台仪表盘(): void {
  if (typeof window === 'undefined') return

  环形缓冲实例.订阅((条目: 日志条目) => {
    最近日志.push(条目)
    if (最近日志.length > 最大日志条数) {
      最近日志.splice(0, 最近日志.length - 最大日志条数)
    }
  })

  const 初始 = useYingYongZhuangTai.getState()
  当前状态.frameMetrics = 初始.帧指标
  当前状态.performanceMetrics = 初始.性能指标
  当前状态.qualityLevel = 初始.画质档位
  useYingYongZhuangTai.subscribe((状态) => {
    当前状态.frameMetrics = 状态.帧指标
    当前状态.performanceMetrics = 状态.性能指标
    当前状态.qualityLevel = 状态.画质档位
  })

  打印横幅()

  window.__RESUME_DEBUG__ = {
    help: 帮助,
    fps: 帧率,
    perf: 性能,
    logs: 日志,
    export: 导出,
    clear: 清空,
    watch: 监视,
  }
}
