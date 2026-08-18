import { chromium } from 'playwright'

const BASE = process.env.BASE || 'http://localhost:5181/'
const OUT = process.env.OUT || (process.platform === 'win32' ? 'D:/tmp/shots' : '/tmp/shots')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function measureAmbientDrift(page) {
  const sel = '.card-auto-drift'
  const count = await page.locator(sel).count()
  if (!count) return { count: 0 }
  const t0 = await page.locator(sel).first().boundingBox()
  const dx = []
  const dy = []
  for (let i = 0; i < 5; i++) {
    await sleep(450)
    const b = await page.locator(sel).first().boundingBox()
    dx.push(+(b.x - t0.x).toFixed(1))
    dy.push(+(b.y - t0.y).toFixed(1))
  }
  const maxAbs = Math.max(...dx.map(Math.abs), ...dy.map(Math.abs))
  return { count, dx, dy, maxAbs }
}

async function main() {
  const errors = []
  const warnings = []
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text())
    if (m.type() === 'warning') warnings.push(m.text())
  })
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await sleep(1500)

  // FP-01: Hero 仅保留「下载简历」
  const heroButtons = await page.locator('#hero button').allInnerTexts()
  const heroButtonCount = await page.locator('#hero button').count()

  // FP-02: 技术球 标题 + 可点击 + github 外链
  const techHeading = await page.locator('#hero h2').first().innerText().catch(() => '')
  const orbCount = await page.locator('a[aria-label$="官网"]').count()
  const githubHref = await page.locator('a[aria-label="GitHub 官网"]').getAttribute('href').catch(() => null)

  // FP-03: 展示卡片自主漂移（不滚动）
  const drift = await measureAmbientDrift(page)

  // 截图：hero / showcase / contact / aichat
  await page.evaluate(() => window.scrollTo(0, 0))
  await sleep(500)
  await page.screenshot({ path: `${OUT}/01-hero.png` })

  await page.evaluate(() => document.getElementById('showcase')?.scrollIntoView())
  await sleep(800)
  await page.screenshot({ path: `${OUT}/03-showcase.png` })

  await page.evaluate(() => document.getElementById('contact')?.scrollIntoView())
  await sleep(800)
  await page.screenshot({ path: `${OUT}/04-contact.png` })

  // FP-06: 打开 AI 面板，检查 Xuan Harness + 模型/思考控制
  await page.locator('button[aria-label="AI 助手"]').click().catch(() => {})
  await sleep(800)
  const dialogText = await page.locator('div[role="dialog"]').innerText().catch(() => '')
  const hasXuanHarness = dialogText.includes('Xuan Harness')
  const hasModelToggle = dialogText.includes('model') && dialogText.includes('flash') && dialogText.includes('pro')
  const hasThinkToggle = dialogText.includes('think')
  await page.screenshot({ path: `${OUT}/05-aichat.png` })

  console.log(
    JSON.stringify(
      {
        errors,
        warnings: warnings.slice(0, 5),
        fp01: { heroButtonCount, heroButtons },
        fp02: { techHeading: techHeading.trim(), orbCount, githubHref },
        fp03: drift,
        fp06: { hasXuanHarness, hasModelToggle, hasThinkToggle, dialogSnippet: dialogText.slice(0, 160) },
      },
      null,
      2
    )
  )

  await browser.close()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
