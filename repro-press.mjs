import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  headless: false,
  args: ['--force-device-scale-factor=1', '--disable-gpu-vsync'],
})
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })

await page.goto('http://localhost:5180/', { waitUntil: 'networkidle' })
await page.locator('#experience').scrollIntoViewIfNeeded()
await page.waitForTimeout(2000)

const card = page.locator('[data-experience-card="mcserver"]').first()
await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
await page.waitForTimeout(1500)

const box0 = await card.boundingBox()
console.log('BOX', JSON.stringify(box0))

await page.mouse.move(box0.x + box0.width * 0.12, box0.y + box0.height * 0.12, { steps: 15 })
await page.waitForTimeout(900)

await page.mouse.down()

for (const t of [0, 30, 60, 100, 200, 400, 800, 1500]) {
  await page.waitForTimeout(t === 0 ? 0 : t - (t === 30 ? 0 : 0))
}

// more careful timeline
await page.mouse.down().catch(() => {})
// already down

const delays = [0, 16, 32, 50, 80, 120, 200, 350, 600, 1000, 1500]
let prev = 0
for (const t of delays) {
  await page.waitForTimeout(t - prev)
  prev = t
  const b = await card.boundingBox()
  const clip = {
    x: Math.max(0, b.x - 20),
    y: Math.max(0, b.y - 20),
    width: 260,
    height: 140,
  }
  await page.screenshot({ path: `test-results/frames/t${t}.png`, clip })
  const st = await card.evaluate((el) => ({
    transform: el.style.transform,
    pressed: el.classList.contains('is-pressed'),
  }))
  console.log(`t=${t}`, st.transform, 'pressed=', st.pressed)
}

// full pressed view
const b = await card.boundingBox()
await page.screenshot({
  path: 'test-results/frames/pressed-context.png',
  clip: { x: Math.max(0, b.x - 80), y: Math.max(0, b.y - 80), width: 700, height: 500 },
})

// Sample pixels in a ring around the card to detect leftover teal
const scan = await page.evaluate(() => {
  // We'll use a canvas approach via html2canvas? Not available.
  // Instead inspect DOM geometry vs expected.
  return null
})

// Check all elements that could paint a teal line near the card
const nearby = await page.evaluate(() => {
  const card = document.querySelector('[data-experience-card="mcserver"]')
  const cr = card.getBoundingClientRect()
  const results = []
  for (const el of document.querySelectorAll('#experience *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    // elements whose box overlaps the card's expanded neighborhood
    const pad = 30
    if (
      r.right < cr.left - pad ||
      r.left > cr.right + pad ||
      r.bottom < cr.top - pad ||
      r.top > cr.bottom + pad
    )
      continue
    const cs = getComputedStyle(el)
    const interesting =
      (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px') ||
      (cs.boxShadow && cs.boxShadow !== 'none') ||
      cs.borderColor !== 'rgb(0, 0, 0)' ||
      el.classList.contains('experience-gradient-border') ||
      el.classList.contains('experience-card') ||
      el.className.toString().includes('outline') ||
      el.tagName === 'CANVAS'
    if (interesting) {
      results.push({
        tag: el.tagName,
        cls: String(el.className).slice(0, 120),
        outline: cs.outline,
        shadow: cs.boxShadow.slice(0, 80),
        border: `${cs.borderWidth} ${cs.borderColor}`,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      })
    }
  }
  return results
})
console.log('NEARBY', JSON.stringify(nearby, null, 2))

await page.mouse.up()
await browser.close()
console.log('DONE')
