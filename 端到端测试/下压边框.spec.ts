import { test, expect } from '@playwright/test'

test('按压态卡片下沉回正无多余线条边框', async ({ page: 页面 }) => {
  const 错误表: string[] = []
  页面.on('console', (m) => {
    if (m.type() === 'error') 错误表.push(m.text().slice(0, 200))
  })
  页面.on('pageerror', (e) => 错误表.push(String(e).slice(0, 200)))
  await 页面.goto('/')
  await 页面.locator('#experience').scrollIntoViewIfNeeded()
  await 页面.waitForTimeout(1500)
  const 卡片 = 页面.locator('[data-experience-card="educator"]').first()
  await 卡片.scrollIntoViewIfNeeded()
  await 页面.waitForTimeout(800)
  const 盒子 = await 卡片.boundingBox()
  expect(盒子).toBeTruthy()

  await 页面.mouse.move(盒子!.x + 盒子!.width * 0.06, 盒子!.y + 盒子!.height * 0.06, { steps: 10 })
  await 页面.waitForTimeout(400)
  await 页面.mouse.down()
  await 页面.waitForTimeout(1200)

  const 按下 = await 卡片.evaluate((元素) => {
    for (const type of ['pointerdown', 'mousedown']) {
      元素.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: 0, clientY: 0 }) as Event)
    }
    return {
      transform: (元素 as HTMLElement).style.transform,
      pressed: 元素.classList.contains('is-pressed'),
      cls: String((元素 as HTMLElement).className).slice(0, 200),
    }
  })
  expect(按下.pressed).toBe(true)
  expect(按下.transform).toContain('scale(0.985)')
  const 旋转值 = ((按下.transform.match(/rotate[XY]\(-?[\d.]+deg\)/g) ?? []) as string[]).map((m: string) =>
    Math.abs(Number(m.replace(/[^-\d.]/g, '')))
  )
  expect(旋转值.length).toBe(2)
  for (const v of 旋转值) expect(v).toBeLessThanOrEqual(0.01)

  await 卡片.screenshot({ path: 'test-results/press-down-card.png' })
  await 页面.screenshot({
    clip: { x: Math.max(0, 盒子!.x - 20), y: 盒子!.y + 盒子!.height - 120, width: 盒子!.width + 40, height: 140 },
    path: 'test-results/press-down-bottom.png',
  })
  expect(错误表).toEqual([])
  await 页面.mouse.up()

  await 页面.waitForTimeout(600)
  const 之后 = await 卡片.evaluate((元素) => ({
    transform: (元素 as HTMLElement).style.transform,
    pressed: 元素.classList.contains('is-pressed'),
  }))
  expect(之后.pressed).toBe(false)
  expect(之后.transform).toContain('perspective(1000px)')
})
