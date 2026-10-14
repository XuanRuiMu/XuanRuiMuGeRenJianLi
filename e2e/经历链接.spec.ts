import { test, expect, type Page, type Locator } from '@playwright/test'

/**
 * 根因回归：经历卡片外链必须真实可点。
 * 旧缺陷：.timeline-card-wrapper 的 transform-style: preserve-3d 与内部
 * .tilt-card 自带 perspective() 的 3D 变换形成嵌套 3D 上下文，导致内部 <a>
 * 的绘制位置与浏览器命中位置分离——鼠标悬停触发倾斜后，elementFromPoint
 * 在链接自身坐标上命中外层卡片，点击永远无法跳转（jsdom 单测无法发现）。
 */
async function 进入经历区(page: Page) {
  await page.goto('/')
  const enter = page.getByRole('button', { name: '进入简历' })
  if (await enter.isVisible().catch(() => false)) {
    await enter.click()
    await page.waitForTimeout(500)
  }
  await page.locator('#experience').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1200)
}

/** 等元素布局位置稳定（成就展开的 max-height 过渡期间坐标会持续变化） */
async function 等位置稳定(locator: Locator) {
  let prev = await locator.boundingBox()
  for (let i = 0; i < 20; i++) {
    await locator.page().waitForTimeout(120)
    const cur = await locator.boundingBox()
    if (prev && cur && Math.abs(prev.y - cur.y) < 0.5 && Math.abs(prev.x - cur.x) < 0.5) return cur
    prev = cur
  }
  return prev
}

/** 真实鼠标路径：先悬停标题触发倾斜与成就展开，再移到链接，断言坐标点命中链接自身 */
async function 断言链接可命中(page: Page, cardId: string) {
  const card = page.locator(`[data-experience-card="${cardId}"]`)
  // 强制卡片滚动到视口中央：scrollIntoViewIfNeeded 的最小滚动可能让卡片底部链接仍在屏外
  await card.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  await page.waitForTimeout(600)
  await card.locator('h3').hover()
  await page.waitForTimeout(700)
  const link = card.locator('a[href]')
  await expect(link).toHaveCount(1)
  const box = await 等位置稳定(link)
  expect(box).toBeTruthy()
  // 先把链接自身滚到视口中央：Lenis 平滑滚动下 scrollIntoView 的惯性收敛前读取的
  // boundingBox 是旧视口坐标，mouse.move 落点与重取 rect 错位（indie 处 timeline 末尾最易命中）。
  await link.evaluate((el) => el.scrollIntoView({ block: 'center' }))
  const settledBox = await 等位置稳定(link)
  expect(settledBox).toBeTruthy()
  await page.mouse.move(settledBox!.x + settledBox!.width / 2, settledBox!.y + settledBox!.height / 2, { steps: 8 })
  await page.waitForTimeout(700)
  const hit = await page.evaluate((id) => {
    const c = document.querySelector(`[data-experience-card="${id}"] a[href]`) as HTMLElement
    const r = c.getBoundingClientRect()
    const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return el === c || c.contains(el)
  }, cardId)
  expect(hit, `${cardId} 链接坐标点必须命中链接自身（preserve-3d 命中错位回归）`).toBe(true)
  return link
}

test.describe('经历区外链真实可点击', () => {
  test('悬停倾斜后三张卡片的链接坐标点均命中链接', async ({ page }) => {
    await 进入经历区(page)
    for (const id of ['educator', 'wowguild', 'indie']) {
      await 断言链接可命中(page, id)
      await page.mouse.move(720, 160, { steps: 4 })
      await page.waitForTimeout(400)
    }
  })

  test('B站外链真实点击打开新标签页（educator）', async ({ page }) => {
    await 进入经历区(page)
    const link = await 断言链接可命中(page, 'educator')
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 15000 }),
      link.click(),
    ])
    await popup.waitForLoadState('domcontentloaded', { timeout: 20000 })
    expect(popup.url()).toContain('bilibili.com')
    await popup.close().catch(() => {})
  })

  test('不再渲染“悬停或聚焦查看成就与亮点”提示行', async ({ page }) => {
    await 进入经历区(page)
    await expect(page.getByText('悬停或聚焦查看成就与亮点')).toHaveCount(0)
  })
})
