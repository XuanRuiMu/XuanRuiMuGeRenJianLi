import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const 证据目录 = path.resolve('.agents/evidence/traces')

type 轨道指标 = {
  transformM41: number | null
  组数: number
  组offset宽: number[]
  视口内任意卡片数: number
  视口内左侧200px卡片数: number
  负X部分入画: number
  scrollY: number
}

async function 安全评估<T>(page: Page, fn: (参数: unknown) => T, 参数?: unknown): Promise<T | null> {
  for (let i = 0; i < 5; i++) {
    try {
      return await page.evaluate(fn as never, 参数)
    } catch {
      await page.waitForTimeout(900)
      await page.waitForSelector('.showcase-marquee', { timeout: 15_000 }).catch(() => {})
    }
  }
  return null
}

test('持续探索四排跑马灯真循环连续：起始位之前项目可见铺底', async ({ page }) => {
  test.setTimeout(180_000)
  fs.mkdirSync(证据目录, { recursive: true })
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200))
  })
  page.on('pageerror', (err) => consoleErrors.push(`pageerror:${err.message}`))

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('.showcase-marquee', { timeout: 60_000 })
  await page.waitForFunction(
    () => {
      const tracks = [...document.querySelectorAll('.showcase-marquee')]
      return tracks.length >= 4 && tracks.every((t) => t.children.length >= 3)
    },
    { timeout: 30_000, polling: 300 },
  )

  const 行名列表 = ['education', 'design', 'media', 'opensource'] as const
  const 汇总: { 行名: string; 指标: 轨道指标 | null }[] = []

  for (let 行索引 = 0; 行索引 < 行名列表.length; 行索引++) {
    const 行名 = 行名列表[行索引]
    let 指标: 轨道指标 | null = null
    for (let 试 = 0; 试 < 16 && !指标; 试++) {
      await 安全评估(
        page,
        (参数) => {
          const { 锚点, 偏移 } = 参数 as { 锚点: string; 偏移: number }
          const el = document.getElementById(锚点)
          if (!el) return null
          let y = 0
          let n: Element | null = el
          while (n) {
            y += (n as HTMLElement).offsetTop
            n = (n as HTMLElement).offsetParent
          }
          window.scrollTo(0, Math.max(0, y + 偏移))
          return true
        },
        { 锚点: 行名, 偏移: 试 * 140 - 240 },
      )
      await page.waitForTimeout(450)
      const 当前 = await 安全评估<轨道指标 | null>(page, (参数) => {
        const 索引 = 参数 as number
        const track = document.querySelectorAll('.showcase-marquee')[索引]
        if (!track) return null
        const transform = getComputedStyle(track).transform
        let m41: number | null = 0
        try {
          m41 = transform !== 'none' ? new DOMMatrixReadOnly(transform).m41 : 0
        } catch {
          m41 = null
        }
        const 盒 = [...track.querySelectorAll('.group\\/card')].map((c) => {
          const b = c.getBoundingClientRect()
          return { x: b.x, y: b.y, w: b.width, h: b.height }
        })
        const 可见 = (b: { x: number; y: number; w: number; h: number }) =>
          b.x < window.innerWidth && b.x + b.w > 0 && b.y < window.innerHeight && b.y + b.h > 0
        return {
          transformM41: m41,
          组数: track.children.length,
          组offset宽: [...track.children].map((g) => (g as HTMLElement).offsetWidth),
          视口内任意卡片数: 盒.filter(可见).length,
          视口内左侧200px卡片数: 盒.filter((b) => 可见(b) && b.x < 200 && b.x + b.w > 0).length,
          负X部分入画: 盒.filter((b) => 可见(b) && b.x < 0 && b.x + b.w > 0).length,
          scrollY: window.scrollY,
        }
      }, 行索引)
      if (当前 && 当前.视口内任意卡片数 > 0 && 当前.视口内左侧200px卡片数 + 当前.负X部分入画 > 0) {
        指标 = 当前
      }
    }

    const 截图 = path.join(证据目录, `FP-02-${行名}-20260917.png`)
    await page.screenshot({ path: 截图, fullPage: false })
    fs.writeFileSync(
      path.join(证据目录, `FP-02-${行名}-20260917.md`),
      `# FP-02 · ${行名}\n\`\`\`json\n${JSON.stringify(指标, null, 2)}\n\`\`\`\n截图：${截图}\n`,
      'utf8',
    )
    汇总.push({ 行名, 指标 })

    expect(指标, `${行名} 应测到循环铺底`).not.toBeNull()
    expect(指标!.组数).toBeGreaterThanOrEqual(3)
    expect(指标!.视口内任意卡片数).toBeGreaterThan(0)
    expect(指标!.视口内左侧200px卡片数 + 指标!.负X部分入画).toBeGreaterThan(0)
  }

  fs.writeFileSync(
    path.join(证据目录, 'FP-02-showcase-loop-evidence-20260917.md'),
    `# FP-02 四排浏览器证据汇总\n\nconsoleErrors=${consoleErrors.length}\n\n\`\`\`json\n${JSON.stringify(汇总, null, 2)}\n\`\`\`\n`,
    'utf8',
  )
  expect(consoleErrors, 'console error 应为 0').toHaveLength(0)
})
