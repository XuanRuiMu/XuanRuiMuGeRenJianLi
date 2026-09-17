import { chromium } from '@playwright/test'

const browser = await chromium.launch({ headless: false })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' })

await page.goto('http://localhost:5180/', { waitUntil: 'networkidle' })
await page.locator('#experience').scrollIntoViewIfNeeded()
await page.waitForTimeout(2000)

const card = page.locator('[data-experience-card="mcserver"]').first()
await card.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'instant' }))
await page.waitForTimeout(1500)

const box = await card.boundingBox()
await page.mouse.move(box.x + box.width * 0.12, box.y + box.height * 0.12, { steps: 12 })
await page.waitForTimeout(700)

const hoverBefore = await page.evaluate(() => {
  const card = document.querySelector('[data-experience-card="mcserver"]')
  const wrapper = card.closest('.timeline-card-wrapper')
  const cs = getComputedStyle(wrapper, '::before')
  return { content: cs.content, opacity: cs.opacity, bg: cs.backgroundImage.slice(0, 80) }
})
console.log('HOVER ::before', JSON.stringify(hoverBefore))

await page.mouse.down()
await page.waitForTimeout(1000)

const pressState = await card.evaluate((el) => ({
  pressed: el.classList.contains('is-pressed'),
  transform: el.style.transform,
}))
console.log('PRESS', JSON.stringify(pressState))

const pressBefore = await page.evaluate(() => {
  const card = document.querySelector('[data-experience-card="mcserver"]')
  const wrapper = card.closest('.timeline-card-wrapper')
  const cs = getComputedStyle(wrapper, '::before')
  return { content: cs.content, opacity: cs.opacity, bg: cs.backgroundImage.slice(0, 80) }
})
console.log('PRESS ::before', JSON.stringify(pressBefore))

const b = await card.boundingBox()
await page.screenshot({
  path: 'test-results/verify-pressed-topleft.png',
  clip: { x: Math.max(0, b.x - 20), y: Math.max(0, b.y - 20), width: 300, height: 160 },
})
await page.screenshot({
  path: 'test-results/verify-pressed-context.png',
  clip: { x: Math.max(0, b.x - 40), y: Math.max(0, b.y - 40), width: 600, height: 450 },
})
await card.screenshot({ path: 'test-results/verify-pressed-card.png' })

await page.mouse.up()
await page.waitForTimeout(400)
await page.screenshot({
  path: 'test-results/verify-released-topleft.png',
  clip: { x: Math.max(0, b.x - 20), y: Math.max(0, b.y - 20), width: 300, height: 160 },
})

await browser.close()
console.log('DONE')
