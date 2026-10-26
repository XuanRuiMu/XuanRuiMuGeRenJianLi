import { test, expect, type Page, type Locator } from '@playwright/test'

async function 进入经历区(页面: Page) {
  await 页面.goto('/')
  const 进入 = 页面.getByRole('button', { name: '进入简历' })
  if (await 进入.isVisible().catch(() => false)) {
    await 进入.click()
    await 页面.waitForTimeout(500)
  }
  await 页面.locator('#experience').scrollIntoViewIfNeeded()
  await 页面.waitForTimeout(1200)
}

async function 等位置稳定(定位器: Locator) {
  let 上一个 = await 定位器.boundingBox()
  for (let i = 0; i < 20; i++) {
    await 定位器.page().waitForTimeout(120)
    const 当前 = await 定位器.boundingBox()
    if (上一个 && 当前 && Math.abs(上一个.y - 当前.y) < 0.5 && Math.abs(上一个.x - 当前.x) < 0.5) return 当前
    上一个 = 当前
  }
  return 上一个
}

async function 断言链接可命中(页面: Page, 卡片编号: string) {
  const 卡片 = 页面.locator(`[data-experience-card="${卡片编号}"]`)

  await 卡片.evaluate((元素) => 元素.scrollIntoView({ block: 'center' }))
  await 页面.waitForTimeout(600)
  await 卡片.locator('h3').hover()
  await 页面.waitForTimeout(700)
  const 链接 = 卡片.locator('a[href]')
  await expect(链接).toHaveCount(1)
  const 盒子 = await 等位置稳定(链接)
  expect(盒子).toBeTruthy()

  await 链接.evaluate((元素) => 元素.scrollIntoView({ block: 'center' }))
  const 稳定盒子 = await 等位置稳定(链接)
  expect(稳定盒子).toBeTruthy()
  await 页面.mouse.move(稳定盒子!.x + 稳定盒子!.width / 2, 稳定盒子!.y + 稳定盒子!.height / 2, { steps: 8 })
  await 页面.waitForTimeout(700)
  const 命中 = await 页面.evaluate((id) => {
    const c = document.querySelector(`[data-experience-card="${id}"] a[href]`) as HTMLElement
    const r = c.getBoundingClientRect()
    const 元素 = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
    return 元素 === c || c.contains(元素)
  }, 卡片编号)
  expect(命中, `${卡片编号} 链接坐标点必须命中链接自身（preserve-3d 命中错位回归）`).toBe(true)
  return 链接
}

test.describe('经历区外链真实可点击', () => {
  test('悬停倾斜后三张卡片的链接坐标点均命中链接', async ({ page: 页面 }) => {
    await 进入经历区(页面)
    for (const id of ['educator', 'wowguild', 'indie']) {
      await 断言链接可命中(页面, id)
      await 页面.mouse.move(720, 160, { steps: 4 })
      await 页面.waitForTimeout(400)
    }
  })

  test('B站外链真实点击打开新标签页（educator）', async ({ page: 页面 }) => {
    await 进入经历区(页面)
    const 链接 = await 断言链接可命中(页面, 'educator')
    const [弹窗] = await Promise.all([页面.waitForEvent('popup', { timeout: 15000 }), 链接.click()])
    await 弹窗.waitForLoadState('domcontentloaded', { timeout: 20000 })
    expect(弹窗.url()).toContain('bilibili.com')
    await 弹窗.close().catch(() => {})
  })

  test('不再渲染“悬停或聚焦查看成就与亮点”提示行', async ({ page: 页面 }) => {
    await 进入经历区(页面)
    await expect(页面.getByText('悬停或聚焦查看成就与亮点')).toHaveCount(0)
  })
})
