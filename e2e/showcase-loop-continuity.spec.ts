import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { 端部余量组数, 最小份数 } from '../src/features/showcase/marqueeEngine'

const 证据目录 = path.resolve('.agents/evidence/traces')
const 行名列表 = ['education', 'design', 'media', 'opensource'] as const
const 相位采样数 = 16
const 中线步长px = 4
// 主门禁 = 行中线命中法的最大空洞（FP-06 替换旧 AABB 区间并集法）。
// 为什么弃用 AABB 做主门禁：perspective + rotateZ 下卡片 AABB 横向膨胀，新/旧律都测得 0px，
// 对「轨道边界被斜扫进视口」的回归不敏感——已被 .agents/evidence/traces/FP-05-marquee-negative-*.md 证伪。
// 数值来源：空洞以命中样点为界，合法空洞 = 卡片间设计间隙 gap-20/pr-20 = 80px 在满倾角透视下的投影，
// 缩放 = 1000/(1000−z)，z=行到包裹层中心的竖直位移×sin15°（rotateZ 沿行方向不产生 z）：
// 视口下方各行放大（opensource 排 80×1.20=96、media 88、design 80），上方各行压缩（education 56）
// ⇒ 合法上界 96 + 取整 = 100；FP-05 取证实测旧律满倾角+位移=0 为 342px ⇒ 门禁可证伪且不误杀
// 采样与计长约定：步长 4px（任务上限 8px 的一半，降低量化误差）；内部连续未命中段扣一个步长
// （报告值 ≤ 真实间隙，杜绝把合法间隙误判成空洞）；触及视口边缘的未命中段计到视口边缘不扣
// ——旧律缺陷正是「空洞从视口边缘开始」，边缘段保守计量会削弱证伪力
const 最大空档容差 = 100
// 辅助观测，不得作为唯一门禁：perspective 下轨道 AABB 可膨胀到百万 px 量级（rect.x 近恒真），
// AABB 空档在有倾角时≈0（上述证伪），保留仅用于与中线指标对比
const 轨道左边界上限 = 0
// FP-06 尾部节奏契约：展示区外层 pb-40(160) 是旧固定高度时代的尾部填充残留，已删除。
// 现契约：外层底部富余 = 末排 mb-20(80) + 布局取整容差；
// 末排卡片视觉底 → 「联系我」标题顶 = mb-20(80) + #contact Section py-16/md:py-24(96) ≈ 176px（1440 档），
// 与站点其它区块的 Section py 节奏一致
const 底部节奏上限 = 80 + 8
const 联系标题间距上限 = 80 + 96 + 8
// 与单测同一把尺子：覆盖任意变体前缀（md:/lg:/2xl:…）与 min-h-/max-h- 前缀；
// 旧正则 (^|\s)(sm:|md:|lg:)?h-\[ 抓不到 min-h-[…] 与 max-h-[…]，死白同类残留会漏判
const 固定高度残留正则 = /(^|\s)([^\s:]+:)*(min-|max-)?h-\[/
// 底部节奏的同类残留：外层不得再引入任意 pb-*（FP-06 删除 pb-40 后的新契约）
const 尾部留白正则 = /(^|\s)([^\s:]+:)*pb-(\d|\[)/

type 滚动采样 =
  | { 标签: string; 类型: '锚点偏移'; 偏移: number }
  | { 标签: string; 类型: '展示区顶对齐'; 偏移: number; 仅限行: (typeof 行名列表)[number] }
const 滚动偏移表: 滚动采样[] = [
  { 标签: 's260', 类型: '锚点偏移', 偏移: -260 },
  { 标签: 's80', 类型: '锚点偏移', 偏移: -80 },
  // 倾斜最大采样点：滚动位=展示区顶（useScroll offset ['start start',…] ⇒ progress≈0，
  // rotateZ=20°/rotateX=15° 满倾角，正是旧缺陷「断代」截图暴露的姿态）。progress≈0 时
  // 视口内只有首排 education 垂直可见；其余三排由「强制满倾角」补齐（见 读取产品满倾角内联），
  // 该行仍保留此专属采样点
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

// 捕获产品自己「第一次写到 DOM 上的轨道 transform」= 律在 位移=0 的取值（挂载 useLayoutEffect 同步写入）。
// 新律首写入 = -(0 + 组宽×端部余量组数) = -组宽；旧律（丢端部余量）首写入 = -0 = 0，
// 两个值域不重叠。相位扫描锚定该真实观察值而非测试自己重推公式，产品写点被改回旧律时扫描必红。
// addInitScript 在页面脚本之前安装 MutationObserver，保证不漏掉挂载期的第一次 style 写入
async function 安装轨道首写入捕获(page: Page): Promise<void> {
  await page.addInitScript(() => {
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

async function 冻结动画(page: Page): Promise<void> {
  await page.evaluate(() => {
    const 窗口 = window as unknown as { __原rAF?: typeof window.requestAnimationFrame }
    if (!窗口.__原rAF) {
      窗口.__原rAF = window.requestAnimationFrame
      window.requestAnimationFrame = () => 0
    }
  })
}

async function 恢复动画(page: Page): Promise<void> {
  await page.evaluate(() => {
    const 窗口 = window as unknown as { __原rAF?: typeof window.requestAnimationFrame }
    if (窗口.__原rAF) {
      window.requestAnimationFrame = 窗口.__原rAF
      窗口.__原rAF = undefined
    }
  })
}

async function 滚动到锚点(page: Page, 锚点: string, 偏移: number): Promise<void> {
  await page.evaluate(
    (参数) => {
      const el = document.getElementById(参数.锚点)
      if (!el) return
      let y = 0
      let n: Element | null = el
      while (n) {
        y += (n as HTMLElement).offsetTop
        n = (n as HTMLElement).offsetParent
      }
      window.scrollTo(0, Math.max(0, y + 参数.偏移))
    },
    { 锚点, 偏移 }
  )
  await page.waitForTimeout(1200)
}

async function 滚动到展示区顶(page: Page, 顶偏移: number): Promise<void> {
  await page.evaluate((偏移参数) => {
    const 外层 = document.querySelector('[data-showcase] > div')
    if (!外层) return
    window.scrollTo(0, Math.max(0, 外层.getBoundingClientRect().top + window.scrollY + 偏移参数))
  }, 顶偏移)
  await page.waitForTimeout(1200)
}

// 真引擎状态探针：读取组件两处写入点真实写到 DOM 上的 transform（getComputedStyle 解析矩阵），
// 而不是测试自己按"以为的公式"写入的值。translate3d 在 Chrome 下呈现为 matrix3d（m41=第 13 个数），
// 2D 呈现为 matrix（m41=第 5 个数），两种都兼容；无法解析返回 NaN 让断言自然变红。
// 解析函数必须内联在 evaluate 回调里（page.evaluate 无法引用 Node 侧闭包）
async function 读取引擎变换(page: Page): Promise<引擎变换记录[]> {
  return page.evaluate(() => {
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

// 双读位移推进：证明读到的 transform 是引擎在跑的真实状态（活体），而非一次性静态残留
async function 读取引擎变换双采样(page: Page): Promise<{ 前: 引擎变换记录[]; 后: 引擎变换记录[] }> {
  const 前 = await 读取引擎变换(page)
  await page.waitForTimeout(300)
  const 后 = await 读取引擎变换(page)
  return { 前, 后 }
}

// 入场倾斜探针：motion 包裹层（rotateZ/rotateX 挂载点）的 computed 矩阵，m12=sin(rotateZ)·cos(rotateX)
async function 读取入场倾斜(page: Page): Promise<{ 变换: string; m11: number; m12: number }> {
  return page.evaluate(() => {
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

// 满倾角字符串：从产品自身读取（progress≈0 时包裹层的 inline transform，由 useTransform 常量
// [0,0.2]→[15,0]/[20,0] 收敛而来），不在测试里另写一份魔法角度
async function 读取产品满倾角内联(page: Page): Promise<string> {
  return page.evaluate(() => {
    const 包裹层 = document.querySelector('[data-showcase] > div > div[class*="preserve-3d"]') as HTMLElement | null
    return 包裹层 ? 包裹层.style.transform : ''
  })
}

// 强制满倾角：progress≈0 时视口内只有 education 排自然可见，其余三排的自然倾斜随 progress 衰减为 0，
// 与 FP-05 取证同一做法——把产品自写的满倾角字符串逐字套用补齐，让每排每相位都在缺陷暴露姿态下扫描
async function 强制包裹层倾斜(page: Page, 倾角字符串: string): Promise<void> {
  await page.evaluate((文本) => {
    const 包裹层 = document.querySelector('[data-showcase] > div > div[class*="preserve-3d"]') as HTMLElement | null
    if (包裹层) 包裹层.style.transform = 文本
  }, 倾角字符串)
}

// 全相位扫描：冻结 rAF 后，从产品首写入值 C（=律在 位移=0 的真实取值）出发逐相位写
// translate3d(C - 位移)，覆盖该产品律可达的完整一个周期 [C-组宽, C]。
// 新律 C=-组宽×端部余量组数 ⇒ 可达带两侧恒余整组，空洞≈设计间隙内；
// 若 ShowcaseSection 写点被改回旧律（C=0），可达带含轨道边界斜扫进视口的相位 ⇒ 中线空洞必红（~342px 量级）。
// 主指标=行中线命中法：卡片 rect 中点最小二乘拟合视觉中线（3D 直线经投影仍为直线），
// 沿 x 以 中线步长px（4px，满足任务上限 ≤8px）采样 elementsFromPoint(x, 中线y) 判定是否命中本排轨道内卡片，连续未命中即空洞；
// 中线离开视口处不可观测不计空洞；命中判定只认本排轨道的 .group/card（导航栏等浮层不算命中）。
// AABB 空档与轨道 rect.x 保留为辅助指标（对倾斜下的旧缺陷已证伪不敏感）。
// "引擎确实持续在写" 由主流程冻结前的 m41 活体双采样断言负责
async function 扫描轨道相位(page: Page, 轨道索引: number): Promise<扫描结果 | null> {
  return page.evaluate(
    (参数) => {
      const { 轨道索引, 采样数, 步长 } = 参数 as { 轨道索引: number; 采样数: number; 步长: number }
      const track = document.querySelectorAll('.showcase-marquee')[轨道索引] as HTMLElement | undefined
      if (!track) return null
      const 组 = track.children[0] as HTMLElement | undefined
      const 组宽 = 组 ? 组.offsetWidth : 0
      if (!(组宽 > 0)) return null
      const 视口宽 = window.innerWidth
      const 首写入表 = (window as unknown as { __轨道首写入?: Map<Element, { m41: number; 字符串: string }> })
        .__轨道首写入
      const 首写入记录 = 首写入表?.get(track)
      const 首写入 = 首写入记录 ? 首写入记录.m41 : Number.NaN
      const 相位表: 相位记录[] = []
      const 汇总 = (表: 相位记录[]) => ({
        组宽,
        组数: track.children.length,
        视口宽,
        首写入,
        首写入字符串: 首写入记录?.字符串 ?? '',
        相位表: 表,
        最差中线空洞: 表.length ? Math.max(...表.map((p) => p.中线空洞)) : Number.NaN,
        最差空档AABB: 表.length ? Math.max(...表.map((p) => p.最大空档AABB)) : Number.NaN,
        最差轨道左x: 表.length ? Math.max(...表.map((p) => p.轨道左x)) : Number.NaN,
        scrollY: window.scrollY,
      })
      // 产品从未写过初值（捕获缺失/组件没挂载/写入链断裂）⇒ 无法锚定律，空表让断言变红
      if (!Number.isFinite(首写入)) return 汇总(相位表)

      // 中线空洞：行视觉中线 = 卡片 rect 中点最小二乘拟合 y=a+b·x（3D 直线经透视投影仍为直线）。
      // 用全部卡片而非仅视口内卡片拟合——旧律缺陷相位会把整排行沿倾斜方向推出视口，
      // 只取视口内卡片时拟合退化（n<2）丢失数值；|x|/|y|>50000px 的点是轨道边界被斜甩过
      // 相机平面后的翻转投影野值（实测 -7.4e5~-9.8e5px，正是 AABB 指标失明的来源），必须剔除
      const 中线空洞 = (): { 空洞: number; 采样数: number } => {
        let n = 0
        let sx = 0
        let sy = 0
        let sxx = 0
        let sxy = 0
        for (const 卡 of track.querySelectorAll('.group\\/card')) {
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
          for (const 元素 of document.elementsFromPoint(x, y)) {
            const 卡 = 元素.closest('.group\\/card')
            if (卡 && track.contains(卡)) {
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
          // 后界存在（下一个命中样点）⇒ 内部段，扣一个步长让报告值 ≤ 真实间隙；
          // 触及视口边缘 ⇒ 空洞延伸到边缘可观测处为止，不扣（左段正是旧律缺陷形态）
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
        track.style.transform = `translate3d(${写入}px, 0, 0)`
        const 中线 = 中线空洞()
        const rect = track.getBoundingClientRect()
        const 区间 = [...track.querySelectorAll('.group\\/card')]
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
          轨道左x: rect.x,
          组数: track.children.length,
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

test('展示区四排跑马灯全相位真循环不变量 + 展示区高度内容驱动', async ({ page }) => {
  test.setTimeout(300_000)
  fs.mkdirSync(证据目录, { recursive: true })
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
  })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror:${err.message}`))

  await 安装轨道首写入捕获(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.showcase-marquee', { timeout: 60_000 })
  await page.waitForSelector('#contact', { timeout: 60_000 })
  await page.waitForFunction(
    (最少组数) => {
      const tracks = [...document.querySelectorAll('.showcase-marquee')]
      return tracks.length >= 4 && tracks.every((t) => t.children.length >= 最少组数)
    },
    最小份数,
    { timeout: 30_000, polling: 300 }
  )

  const 汇总: { 行名: string; 滚动标签: string; 结果: 扫描结果 | null }[] = []
  const 引擎变换记录表: { 行名: string; 滚动标签: string; 引擎变换: 引擎变换记录[] }[] = []

  // 满倾角字符串 = 产品在 progress≈0 自写的包裹层 inline transform（页面顶部时展示区 progress 钳到 0，
  // useSpring 静止即满倾角）。后续所有相位扫描用它强制补齐每排（与 FP-05 取证同一做法），测试不另写角度
  const 满倾角 = await 读取产品满倾角内联(page)
  const 初始倾斜 = await 读取入场倾斜(page)
  写证据('FP-01-产品满倾角字符串', { 内联: 满倾角, ...初始倾斜 })
  expect.soft(满倾角, 'progress≈0 时产品应已在包裹层写入 rotate 内联变换').not.toBe('')
  expect.soft(Math.abs(初始倾斜.m12), `满倾角读取点应带 rotateZ 倾斜，transform=${初始倾斜.变换}`).toBeGreaterThan(0.1)

  // 核心补强（先于任何 rAF 冻结）：读取引擎真实写入的 transform 并验证其在推进。
  // 真循环不变量：首写入（=律在 位移=0 的取值）与任意时刻 m41 = -(归一化位移 + 组宽*端部余量组数)
  // 都 ≤ -组宽*端部余量组数。若有人把 ShowcaseSection 写入点改回 -位移（丢基准偏移），
  // 首写入=0、m41 ∈ (-组宽, 0] 必红；若引擎根本没在写（transform 缺失/为 none），m41=NaN 必红；
  // 双读不推进则活体假设崩
  const 初始引擎 = await 读取引擎变换双采样(page)
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
        await 滚动到展示区顶(page, 滚动.偏移)
      } else {
        await 滚动到锚点(page, 行名, 滚动.偏移)
      }
      // 统一强制满倾角（缺陷暴露姿态），并验证强制确实生效在 computed 矩阵上
      await 强制包裹层倾斜(page, 满倾角)
      const 倾斜 = await 读取入场倾斜(page)
      写证据(`FP-01-${行名}-${滚动.标签}-倾斜`, 倾斜)
      expect
        .soft(
          Math.abs(倾斜.m12),
          `${行名}@${滚动.标签} 中线扫描应在满倾角姿态（强制自产品满倾角字符串），transform=${倾斜.变换}`
        )
        .toBeGreaterThan(0.1)

      // 冻结 rAF 前逐排复核引擎真实写入态。注意：首个冻结会永久停掉组件 rAF 链（恢复不重启），
      // 故第二轮起的读数是"引擎最后一次真实写入/相位扫描按产品首写入锚定公式写入"的值——
      // 引擎活体推进的证明由上面冻结前的初始双采样专项负责，这里锁定各排写入值恒满足余量不变量
      const 引擎变换 = await 读取引擎变换(page)
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

      await 冻结动画(page)
      const 结果 = await 扫描轨道相位(page, 轨道索引)
      if (结果) {
        // 相位 位移=0（旧缺陷暴露点）截图取证：写产品自己的首写入值（新律=-组宽；变异还原旧律时=0，
        // 截图直接呈现缺陷扫进视口的姿态）
        await page.evaluate(
          ({ 索引 }) => {
            const track = document.querySelectorAll('.showcase-marquee')[索引] as HTMLElement
            const 首写入表 = (window as unknown as { __轨道首写入?: Map<Element, { m41: number; 字符串: string }> })
              .__轨道首写入
            const 记录 = 首写入表?.get(track)
            if (记录) track.style.transform = `translate3d(${记录.m41}px, 0, 0)`
          },
          { 索引: 轨道索引 }
        )
        await page.waitForTimeout(120)
        await page.screenshot({ path: path.join(证据目录, `FP-01-${行名}-${滚动.标签}.png`), fullPage: false })
        写证据(`FP-01-${行名}-${滚动.标签}`, 结果)
      }
      await 恢复动画(page)
      汇总.push({ 行名, 滚动标签: 滚动.标签, 结果 })

      expect.soft(结果, `${行名}@${滚动.标签} 应完成相位扫描`).not.toBeNull()
      expect.soft(结果!.组数, `${行名}@${滚动.标签} 组数`).toBeGreaterThanOrEqual(最小份数)
      expect.soft(结果!.相位表.length, `${行名}@${滚动.标签} 相位覆盖数`).toBe(相位采样数)
      // 主门禁：全相位最大中线空洞（可证伪——旧律变异下必红，见文件头注释）
      expect
        .soft(结果!.最差中线空洞, `${行名}@${滚动.标签} 全相位最大空洞(行中线命中法；新律预期≤96，旧律≈342)`)
        .toBeLessThanOrEqual(最大空档容差)
      // 辅助观测（不得作为唯一门禁）：AABB 空档与轨道左x 对倾斜下的旧缺陷不敏感，仅保留对比
      expect
        .soft(结果!.最差空档AABB, `${行名}@${滚动.标签} 全相位最大空档(AABB 辅助)`)
        .toBeLessThanOrEqual(最大空档容差)
      expect.soft(结果!.最差轨道左x, `${行名}@${滚动.标签} 轨道左边界(AABB 辅助)`).toBeLessThanOrEqual(轨道左边界上限)
    }
  }

  // 子目标 B：展示区高度必须由内容驱动（无固定高度残留死白），与 contact 相邻，
  // 且尾部不再有 pb-40 时代的填充留白（FP-06 新契约）
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(600)
  const 几何 = await page.evaluate(() => {
    const 外层 = document.querySelector('[data-showcase] > div') as HTMLElement
    const 轨道表 = document.querySelectorAll('.showcase-marquee')
    const 末排 = 轨道表[轨道表.length - 1].parentElement as HTMLElement
    const contact = document.getElementById('contact') as HTMLElement
    // offsetTop 逐层累加到 外层（transform/perspective 祖先会截断 offsetParent 链）
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
        contact.getBoundingClientRect().top + window.scrollY - (外层.getBoundingClientRect().bottom + window.scrollY),
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

  // 用户视角的尾部间距契约（FP-06）：末排卡片视觉底 → #contact「联系我」标题顶。
  // 旧契约 336.4px（mb-20 80 + pb-40 160 + contact py-24 96，另含取整）→ 新契约 80+96=176px
  await page.evaluate(() => {
    const 轨道表 = document.querySelectorAll('.showcase-marquee')
    const 末排 = 轨道表[轨道表.length - 1].parentElement as HTMLElement
    window.scrollTo(0, window.scrollY + 末排.getBoundingClientRect().bottom - 400)
  })
  await page.waitForTimeout(600)
  const 尾部间距 = await page.evaluate(() => {
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

  // 外层高度随内容变化（因果探针）：隐藏末排内容，外层盒子必须跟着收缩"末排高 ± 其 mb-20(80)"；
  // 若重新引入固定高度（h-[…]/min-h-[…]），外层高纹丝不动 ⇒ 本断言必红。
  // 不用审计建议的 scrollHeight 度量：perspective+rotateZ 下跑马灯横向内容的可滚动溢出投影
  // 会把 scrollHeight 撑到 2.8 万 px（见 死白度量.外层scrollHeight vs 外层高 2616），不是可靠的内容高度指标
  const 内容驱动探针 = await page.evaluate(() => {
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
  expect(consoleErrors, 'console error 应为 0').toHaveLength(0)
})
