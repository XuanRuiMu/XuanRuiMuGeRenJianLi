import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { 端部余量组数, 最小份数 } from '../src/功能/展示/PaoMaDengYinQing'

const 证据目录 = path.resolve('.agents/evidence/traces')
const 行名列表 = ['education', 'design', 'media', 'opensource'] as const
const 相位采样数 = 16
const 中线步长px = 4

const 最大空档容差 = 100

const 轨道左边界上限 = 0

const 底部节奏上限 = 80 + 8
const 联系标题间距上限 = 80 + 96 + 8

const 固定高度残留正则 = /(^|\s)([^\s:]+:)*(min-|max-)?h-\[/

const 尾部留白正则 = /(^|\s)([^\s:]+:)*pb-(\d|\[)/

type 滚动采样 =
  | { 标签: string; 类型: '锚点偏移'; 偏移: number }
  | { 标签: string; 类型: '展示区顶对齐'; 偏移: number; 仅限行: (typeof 行名列表)[number] }
const 滚动偏移表: 滚动采样[] = [
  { 标签: 's260', 类型: '锚点偏移', 偏移: -260 },
  { 标签: 's80', 类型: '锚点偏移', 偏移: -80 },

  { 标签: 'tiltmax', 类型: '展示区顶对齐', 偏移: 0, 仅限行: 'education' },
]

type 引擎变换记录 = { 轨道索引: number; 组宽: number; m41: number; 首写入: number }

type 相位记录 = {
  位移: number
  写入m41: number
  中线空洞: number
  中线采样数: number
  最大空档AABB: number
  轨道左x: number
  组数: number
  组宽: number
}

type 扫描结果 = {
  组宽: number
  组数: number
  视口宽: number
  首写入: number
  首写入字符串: string
  相位表: 相位记录[]
  最差中线空洞: number
  最差空档AABB: number
  最差轨道左x: number
  scrollY: number
}

async function 安装轨道首写入捕获(页面: Page): Promise<void> {
  await 页面.addInitScript(() => {
    const 窗口 = window as unknown as { __轨道首写入?: Map<Element, { m41: number; 字符串: string }> }
    const 表: Map<Element, { m41: number; 字符串: string }> = new Map()
    窗口.__轨道首写入 = 表
    const 解析 = (变换: string): number => {
      const 平移 = /translate3d\(\s*(-?[0-9.]+)(?:px)?\s*,/.exec(变换)
      if (平移) return Number(平移[1])
      const 开 = 变换.indexOf('(')
      if (变换.startsWith('matrix') && 开 >= 0) {
        const 数 = 变换
          .slice(开 + 1, 变换.lastIndexOf(')'))
          .split(',')
          .map(Number)
        if (变换.startsWith('matrix3d')) return 数.length >= 16 ? 数[12] : Number.NaN
        return 数.length >= 6 ? 数[4] : Number.NaN
      }
      return Number.NaN
    }
    const 观察器 = new MutationObserver((记录列表) => {
      for (const 记录 of 记录列表) {
        const 元素 = 记录.target
        if (!(元素 instanceof HTMLElement) || !元素.classList.contains('showcase-marquee') || 表.has(元素)) continue
        const 字符串 = 元素.style.transform
        if (!字符串) continue
        表.set(元素, { m41: 解析(字符串), 字符串 })
        if (表.size >= 4) 观察器.disconnect()
      }
    })
    const 开始 = () =>
      观察器.observe(document.documentElement, { subtree: true, attributes: true, attributeFilter: ['style'] })
    if (document.documentElement) 开始()
    else document.addEventListener('DOMContentLoaded', 开始, { once: true })
  })
}

async function 冻结动画(页面: Page): Promise<void> {
  await 页面.evaluate(() => {
    const 窗口 = window as unknown as { __原rAF?: typeof window.requestAnimationFrame }
    if (!窗口.__原rAF) {
      窗口.__原rAF = window.requestAnimationFrame
      window.requestAnimationFrame = () => 0
    }
  })
}

async function 恢复动画(页面: Page): Promise<void> {
  await 页面.evaluate(() => {
    const 窗口 = window as unknown as { __原rAF?: typeof window.requestAnimationFrame }
    if (窗口.__原rAF) {
      window.requestAnimationFrame = 窗口.__原rAF
      窗口.__原rAF = undefined
    }
  })
}

async function 滚动到锚点(页面: Page, 锚点: string, 偏移: number): Promise<void> {
  await 页面.evaluate(
    (参数) => {
      const 元素 = document.getElementById(参数.锚点)
      if (!元素) return
      let y = 0
      let n: Element | null = 元素
      while (n) {
        y += (n as HTMLElement).offsetTop
        n = (n as HTMLElement).offsetParent
      }
      window.scrollTo(0, Math.max(0, y + 参数.偏移))
    },
    { 锚点, 偏移 }
  )
  await 页面.waitForTimeout(1200)
}

async function 滚动到展示区顶(页面: Page, 顶偏移: number): Promise<void> {
  await 页面.evaluate((偏移参数) => {
    const 外层 = document.querySelector('[data-showcase] > div')
    if (!外层) return
    window.scrollTo(0, Math.max(0, 外层.getBoundingClientRect().top + window.scrollY + 偏移参数))
  }, 顶偏移)
  await 页面.waitForTimeout(1200)
}

async function 读取引擎变换(页面: Page): Promise<引擎变换记录[]> {
  return 页面.evaluate(() => {
    const 解析 = (变换: string): number => {
      const 开 = 变换.indexOf('(')
      const 数 =
        变换.startsWith('matrix') && 开 >= 0
          ? 变换
              .slice(开 + 1, 变换.lastIndexOf(')'))
              .split(',')
              .map(Number)
          : []
      if (变换.startsWith('matrix3d')) return 数.length >= 16 ? 数[12] : Number.NaN
      return 数.length >= 6 ? 数[4] : Number.NaN
    }
    const 首写入表 = (window as unknown as { __轨道首写入?: Map<Element, { m41: number; 字符串: string }> })
      .__轨道首写入
    return [...document.querySelectorAll('.showcase-marquee')].map((元素, 索引) => {
      const 组 = 元素.children[0] as HTMLElement | undefined
      return {
        轨道索引: 索引,
        组宽: 组 ? (组 as HTMLElement).offsetWidth : 0,
        m41: 解析(getComputedStyle(元素 as HTMLElement).transform),
        首写入: 首写入表?.get(元素)?.m41 ?? Number.NaN,
      }
    })
  })
}

async function 读取引擎变换双采样(页面: Page): Promise<{ 前: 引擎变换记录[]; 后: 引擎变换记录[] }> {
  const 前 = await 读取引擎变换(页面)
  await 页面.waitForTimeout(300)
  const 后 = await 读取引擎变换(页面)
  return { 前, 后 }
}

async function 读取入场倾斜(页面: Page): Promise<{ 变换: string; m11: number; m12: number }> {
  return 页面.evaluate(() => {
    const 包裹层 = document.querySelector('[data-showcase] > div > div[class*="preserve-3d"]') as HTMLElement | null
    const 变换 = 包裹层 ? getComputedStyle(包裹层).transform : 'none'
    const 开 = 变换.indexOf('(')
    const 数 =
      变换.startsWith('matrix') && 开 >= 0
        ? 变换
            .slice(开 + 1, 变换.lastIndexOf(')'))
            .split(',')
            .map(Number)
        : []
    return {
      变换,
      m11: 数.length >= 6 ? 数[0] : Number.NaN,
      m12: 数.length >= 6 ? 数[1] : Number.NaN,
    }
  })
}

async function 读取产品满倾角内联(页面: Page): Promise<string> {
  return 页面.evaluate(() => {
    const 包裹层 = document.querySelector('[data-showcase] > div > div[class*="preserve-3d"]') as HTMLElement | null
    return 包裹层 ? 包裹层.style.transform : ''
  })
}

async function 强制包裹层倾斜(页面: Page, 倾角字符串: string): Promise<void> {
  await 页面.evaluate((文本) => {
    const 包裹层 = document.querySelector('[data-showcase] > div > div[class*="preserve-3d"]') as HTMLElement | null
    if (包裹层) 包裹层.style.transform = 文本
  }, 倾角字符串)
}

async function 扫描轨道相位(页面: Page, 轨道索引: number): Promise<扫描结果 | null> {
  return 页面.evaluate(
    (参数) => {
      const { 轨道索引, 采样数, 步长 } = 参数 as { 轨道索引: number; 采样数: number; 步长: number }
      const 轨道 = document.querySelectorAll('.showcase-marquee')[轨道索引] as HTMLElement | undefined
      if (!轨道) return null
      const 组 = 轨道.children[0] as HTMLElement | undefined
      const 组宽 = 组 ? 组.offsetWidth : 0
      if (!(组宽 > 0)) return null
      const 视口宽 = window.innerWidth
      const 首写入表 = (window as unknown as { __轨道首写入?: Map<Element, { m41: number; 字符串: string }> })
        .__轨道首写入
      const 首写入记录 = 首写入表?.get(轨道)
      const 首写入 = 首写入记录 ? 首写入记录.m41 : Number.NaN
      const 相位表: 相位记录[] = []
      const 汇总 = (表: 相位记录[]) => ({
        组宽,
        组数: 轨道.children.length,
        视口宽,
        首写入,
        首写入字符串: 首写入记录?.字符串 ?? '',
        相位表: 表,
        最差中线空洞: 表.length ? Math.max(...表.map((p) => p.中线空洞)) : Number.NaN,
        最差空档AABB: 表.length ? Math.max(...表.map((p) => p.最大空档AABB)) : Number.NaN,
        最差轨道左x: 表.length ? Math.max(...表.map((p) => p.轨道左x)) : Number.NaN,
        scrollY: window.scrollY,
      })

      if (!Number.isFinite(首写入)) return 汇总(相位表)

      const 中线空洞 = (): { 空洞: number; 采样数: number } => {
        let n = 0
        let sx = 0
        let sy = 0
        let sxx = 0
        let sxy = 0
        for (const 卡 of 轨道.querySelectorAll('.group\\/card')) {
          const r = 卡.getBoundingClientRect()
          if (!(r.width > 0)) continue
          const cx = r.x + r.width / 2
          const cy = r.y + r.height / 2
          if (!Number.isFinite(cx) || !Number.isFinite(cy)) continue
          if (Math.abs(cx) > 50000 || Math.abs(cy) > 50000) continue
          n += 1
          sx += cx
          sy += cy
          sxx += cx * cx
          sxy += cx * cy
        }
        const 分母 = n * sxx - sx * sx
        if (n < 2 || 分母 === 0) return { 空洞: Number.NaN, 采样数: 0 }
        const b = (n * sxy - sx * sy) / 分母
        const a = (sy - b * sx) / n
        const 采样点: [number, boolean][] = []
        const 总点数 = Math.ceil((视口宽 - 1) / 步长)
        for (let i = 0; i <= 总点数; i++) {
          const x = Math.min(i * 步长, 视口宽 - 1)
          const y = a + b * x
          if (y < 0 || y >= window.innerHeight) continue
          let 命中 = false
          for (const 卡 of 轨道.querySelectorAll('.group\\/card')) {
            const r = 卡.getBoundingClientRect()
            if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
              命中 = true
              break
            }
          }
          采样点.push([x, 命中])
        }
        if (采样点.length === 0) return { 空洞: Number.NaN, 采样数: 0 }
        let 最差 = 0
        let 起点: number | null = null
        let 左触及 = false
        const 收尾 = (末端x: number, 后界x: number | null) => {
          const 原始 = 后界x === null ? 末端x - 起点! : 后界x - 起点!
          最差 = Math.max(最差, 左触及 || 后界x === null ? Math.max(0, 原始) : Math.max(0, 原始 - 步长))
        }
        for (const [x, 命中] of 采样点) {
          if (!命中 && 起点 === null) {
            起点 = x
            左触及 = x === 0
          }
          if (命中 && 起点 !== null) {
            收尾(x, x)
            起点 = null
          }
        }
        if (起点 !== null) 收尾(采样点[采样点.length - 1][0], null)
        return { 空洞: 最差, 采样数: 采样点.length }
      }

      for (let i = 0; i < 采样数; i++) {
        const 位移 = (i / 采样数) * 组宽
        const 写入 = 首写入 - 位移
        轨道.style.transform = `translate3d(${写入}px, 0, 0)`
        const 中线 = 中线空洞()
        const 矩形 = 轨道.getBoundingClientRect()
        const 区间 = [...轨道.querySelectorAll('.group\\/card')]
          .map((c) => c.getBoundingClientRect())
          .filter((b) => b.y < window.innerHeight && b.y + b.height > 0)
          .map((b) => [Math.max(b.x, 0), Math.min(b.x + b.width, 视口宽)] as const)
          .filter(([s, e]) => e > s)
          .sort((p, q) => p[0] - q[0])
        let 光标 = 0
        let 最大空档AABB = 0
        for (const [s, e] of 区间) {
          if (s > 光标) 最大空档AABB = Math.max(最大空档AABB, s - 光标)
          if (e > 光标) 光标 = e
        }
        最大空档AABB = Math.max(最大空档AABB, 视口宽 - 光标)
        相位表.push({
          位移,
          写入m41: 写入,
          中线空洞: 中线.空洞,
          中线采样数: 中线.采样数,
          最大空档AABB,
          轨道左x: 矩形.x,
          组数: 轨道.children.length,
          组宽,
        })
      }
      return 汇总(相位表)
    },
    { 轨道索引, 采样数: 相位采样数, 步长: 中线步长px }
  )
}

function 写证据(名称: string, 数据: unknown): void {
  fs.writeFileSync(
    path.join(证据目录, `${名称}.md`),
    `# ${名称}\n\n\`\`\`json\n${JSON.stringify(数据, null, 2)}\n\`\`\`\n`,
    'utf8'
  )
}

test('展示区四排跑马灯全相位真循环不变量 + 展示区高度内容驱动', async ({ page: 页面 }) => {
  test.setTimeout(300_000)
  fs.mkdirSync(证据目录, { recursive: true })
  const 控制台错误表: string[] = []
  页面.on('console', (消息) => {
    if (消息.type() === 'error') 控制台错误表.push(消息.text().slice(0, 200))
  })
  页面.on('pageerror', (错误) => 控制台错误表.push(`pageerror:${错误.message}`))

  await 安装轨道首写入捕获(页面)
  await 页面.goto('/', { waitUntil: 'domcontentloaded' })
  await 页面.waitForSelector('.showcase-marquee', { timeout: 60_000 })
  await 页面.waitForSelector('#contact', { timeout: 60_000 })
  await 页面.waitForFunction(
    (最少组数) => {
      const 轨道表 = [...document.querySelectorAll('.showcase-marquee')]
      return 轨道表.length >= 4 && 轨道表.every((t) => t.children.length >= 最少组数)
    },
    最小份数,
    { timeout: 30_000, polling: 300 }
  )

  const 汇总: { 行名: string; 滚动标签: string; 结果: 扫描结果 | null }[] = []
  const 引擎变换记录表: { 行名: string; 滚动标签: string; 引擎变换: 引擎变换记录[] }[] = []

  const 满倾角 = await 读取产品满倾角内联(页面)
  const 初始倾斜 = await 读取入场倾斜(页面)
  写证据('FP-01-产品满倾角字符串', { 内联: 满倾角, ...初始倾斜 })
  expect.soft(满倾角, 'progress≈0 时产品应已在包裹层写入 rotate 内联变换').not.toBe('')
  expect.soft(Math.abs(初始倾斜.m12), `满倾角读取点应带 rotateZ 倾斜，transform=${初始倾斜.变换}`).toBeGreaterThan(0.1)

  const 初始引擎 = await 读取引擎变换双采样(页面)
  写证据('FP-01-引擎transform初始实测', 初始引擎)
  expect.soft(初始引擎.前, '初始应能读到四排轨道').toHaveLength(4)
  for (let i = 0; i < 初始引擎.前.length; i++) {
    const 记录 = 初始引擎.前[i]
    expect.soft(记录.组宽, `轨道${i} 组宽`).toBeGreaterThan(0)
    expect
      .soft(记录.首写入, `轨道${i} 产品首写入(位移=0 的律值)必须保留端部余量基准`)
      .toBeLessThanOrEqual(-记录.组宽 * 端部余量组数 + 0.01)
    expect
      .soft(记录.m41, `轨道${i} 引擎实际写入 m41=${记录.m41} 必须保留端部余量基准（≤-${记录.组宽 * 端部余量组数}）`)
      .toBeLessThanOrEqual(-记录.组宽 * 端部余量组数 + 0.01)
    expect
      .soft(初始引擎.后[i].m41, `轨道${i} 两次采样 m41 均应有效`)
      .toBeLessThanOrEqual(-记录.组宽 * 端部余量组数 + 0.01)
    expect
      .soft(Math.abs(初始引擎.后[i].m41 - 记录.m41), `轨道${i} 引擎应在持续推进（300ms 内 m41 无变化=写入链已死）`)
      .toBeGreaterThan(0.5)
  }

  for (const 行名 of 行名列表) {
    const 轨道索引 = 行名列表.indexOf(行名)
    for (const 滚动 of 滚动偏移表) {
      if (滚动.类型 === '展示区顶对齐' && 滚动.仅限行 !== 行名) continue
      if (滚动.类型 === '展示区顶对齐') {
        await 滚动到展示区顶(页面, 滚动.偏移)
      } else {
        await 滚动到锚点(页面, 行名, 滚动.偏移)
      }

      await 强制包裹层倾斜(页面, 满倾角)
      const 倾斜 = await 读取入场倾斜(页面)
      写证据(`FP-01-${行名}-${滚动.标签}-倾斜`, 倾斜)
      expect
        .soft(
          Math.abs(倾斜.m12),
          `${行名}@${滚动.标签} 中线扫描应在满倾角姿态（强制自产品满倾角字符串），transform=${倾斜.变换}`
        )
        .toBeGreaterThan(0.1)

      const 引擎变换 = await 读取引擎变换(页面)
      引擎变换记录表.push({ 行名, 滚动标签: 滚动.标签, 引擎变换 })
      expect.soft(引擎变换, `${行名}@${滚动.标签} 应能读到四排轨道`).toHaveLength(4)
      for (const 记录 of 引擎变换) {
        expect.soft(记录.组宽, `${行名}@${滚动.标签} 轨道${记录.轨道索引} 组宽`).toBeGreaterThan(0)
        expect
          .soft(
            记录.m41,
            `${行名}@${滚动.标签} 轨道${记录.轨道索引} 引擎写入 m41=${记录.m41} 必须保留端部余量基准（≤-${
              记录.组宽 * 端部余量组数
            }）`
          )
          .toBeLessThanOrEqual(-记录.组宽 * 端部余量组数 + 0.01)
      }

      await 冻结动画(页面)
      const 结果 = await 扫描轨道相位(页面, 轨道索引)
      if (结果) {
        await 页面.evaluate(
          ({ 索引 }) => {
            const 轨道 = document.querySelectorAll('.showcase-marquee')[索引] as HTMLElement
            const 首写入表 = (window as unknown as { __轨道首写入?: Map<Element, { m41: number; 字符串: string }> })
              .__轨道首写入
            const 记录 = 首写入表?.get(轨道)
            if (记录) 轨道.style.transform = `translate3d(${记录.m41}px, 0, 0)`
          },
          { 索引: 轨道索引 }
        )
        await 页面.waitForTimeout(120)
        await 页面.screenshot({ path: path.join(证据目录, `FP-01-${行名}-${滚动.标签}.png`), fullPage: false })
        写证据(`FP-01-${行名}-${滚动.标签}`, 结果)
      }
      await 恢复动画(页面)
      汇总.push({ 行名, 滚动标签: 滚动.标签, 结果 })

      expect.soft(结果, `${行名}@${滚动.标签} 应完成相位扫描`).not.toBeNull()
      expect.soft(结果!.组数, `${行名}@${滚动.标签} 组数`).toBeGreaterThanOrEqual(最小份数)
      expect.soft(结果!.相位表.length, `${行名}@${滚动.标签} 相位覆盖数`).toBe(相位采样数)

      expect
        .soft(结果!.最差中线空洞, `${行名}@${滚动.标签} 全相位最大空洞(行中线命中法；新律预期≤96，旧律≈342)`)
        .toBeLessThanOrEqual(最大空档容差)

      expect
        .soft(结果!.最差空档AABB, `${行名}@${滚动.标签} 全相位最大空档(AABB 辅助)`)
        .toBeLessThanOrEqual(最大空档容差)
      expect.soft(结果!.最差轨道左x, `${行名}@${滚动.标签} 轨道左边界(AABB 辅助)`).toBeLessThanOrEqual(轨道左边界上限)
    }
  }

  await 页面.evaluate(() => window.scrollTo(0, 0))
  await 页面.waitForTimeout(600)
  const 几何 = await 页面.evaluate(() => {
    const 外层 = document.querySelector('[data-showcase] > div') as HTMLElement
    const 轨道表 = document.querySelectorAll('.showcase-marquee')
    const 末排 = 轨道表[轨道表.length - 1].parentElement as HTMLElement
    const 联系方式 = document.getElementById('contact') as HTMLElement

    let 内容底 = 末排.offsetTop + 末排.offsetHeight
    let 节点: HTMLElement | null = 末排.offsetParent as HTMLElement | null
    while (节点 && 节点 !== 外层) {
      内容底 += 节点.offsetTop
      节点 = 节点.offsetParent as HTMLElement | null
    }
    return {
      外层类名: 外层.className,
      外层高: 外层.offsetHeight,
      外层scrollHeight: 外层.scrollHeight,
      内容底,
      底部富余: 外层.offsetHeight - 内容底,
      区块间距:
        联系方式.getBoundingClientRect().top + window.scrollY - (外层.getBoundingClientRect().bottom + window.scrollY),
    }
  })
  写证据('FP-01-死白度量', 几何)
  expect(几何.外层类名).not.toMatch(固定高度残留正则)
  expect
    .soft(几何.外层类名, 'FP-06：展示区外层不得再有尾部 padding（pb-40 已删，留白归区块节奏）')
    .not.toMatch(尾部留白正则)
  expect
    .soft(几何.底部富余, `外层高${几何.外层高} - 内容底${几何.内容底}（契约：末排 mb-20=80 + 取整，pb-40 已删）`)
    .toBeLessThanOrEqual(底部节奏上限)
  expect.soft(几何.区块间距).toBeLessThanOrEqual(1)

  await 页面.evaluate(() => {
    const 轨道表 = document.querySelectorAll('.showcase-marquee')
    const 末排 = 轨道表[轨道表.length - 1].parentElement as HTMLElement
    window.scrollTo(0, window.scrollY + 末排.getBoundingClientRect().bottom - 400)
  })
  await 页面.waitForTimeout(600)
  const 尾部间距 = await 页面.evaluate(() => {
    const 轨道表 = document.querySelectorAll('.showcase-marquee')
    const 末排 = 轨道表[轨道表.length - 1].parentElement as HTMLElement
    const 标题 = document.querySelector('#contact h2') as HTMLElement
    const 视觉底 = 末排.getBoundingClientRect().bottom
    const 标题顶 = 标题.getBoundingClientRect().top
    return { 视觉底, 标题顶, 间距: 标题顶 - 视觉底, 标题文本: 标题.textContent ?? '' }
  })
  写证据('FP-01-尾部间距-末排到联系我标题', 尾部间距)
  expect.soft(尾部间距.间距, '末排卡片底与「联系我」标题顶不得重叠').toBeGreaterThan(0)
  expect(
    尾部间距.间距,
    `末排→联系我标题间距${尾部间距.间距.toFixed(1)}px（FP-06 契约 mb-20(80)+contact py-24(96)≈176，回归 pb-40 必红）`
  ).toBeLessThanOrEqual(联系标题间距上限)

  const 内容驱动探针 = await 页面.evaluate(() => {
    const 外层 = document.querySelector('[data-showcase] > div') as HTMLElement
    const 轨道表 = document.querySelectorAll('.showcase-marquee')
    const 末排 = 轨道表[轨道表.length - 1].parentElement as HTMLElement
    const 前 = 外层.offsetHeight
    const 末排高 = 末排.offsetHeight
    末排.style.display = 'none'
    const 后 = 外层.offsetHeight
    末排.style.display = ''
    return { 前, 后, 末排高, 收缩量: 前 - 后 }
  })
  写证据('FP-01-内容驱动高度探针', 内容驱动探针)
  expect(
    内容驱动探针.收缩量,
    `隐藏末排(${内容驱动探针.末排高}px+mb-20)后外层仅收缩${内容驱动探针.收缩量}px ⇒ 高度不是内容驱动`
  ).toBeGreaterThanOrEqual(内容驱动探针.末排高 - 8)
  expect(
    内容驱动探针.收缩量,
    `隐藏末排(${内容驱动探针.末排高}px)却收缩${内容驱动探针.收缩量}px 超出该行占位 ⇒ 度量异常`
  ).toBeLessThanOrEqual(内容驱动探针.末排高 + 80 + 8)

  写证据('FP-01-引擎transform实测', 引擎变换记录表)
  写证据('FP-01-showcase-loop-evidence', 汇总)
  expect(控制台错误表, 'console error 应为 0').toHaveLength(0)
})
