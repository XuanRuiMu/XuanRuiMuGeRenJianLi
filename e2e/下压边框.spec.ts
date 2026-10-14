import { test, expect } from '@playwright/test'

test('按压态卡片下沉回正无多余线条边框', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200))
  })
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))
  await page.goto('/')
  await page.locator('#experience').scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)
  const card = page.locator('[data-experience-card="educator"]').first()
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(800)
  const box = await card.boundingBox()
  expect(box).toBeTruthy()
  // 真按压：边角 mouse.down 保持（与用户复现路径一致：先hover再按住）
  await page.mouse.move(box!.x + box!.width * 0.06, box!.y + box!.height * 0.06, { steps: 10 })
  await page.waitForTimeout(400)
  await page.mouse.down()
  await page.waitForTimeout(1200)
  // 按压态断言：回正（旋转归零无透视）+下沉 scale(0.97)+is-pressed+阴影关闭
  const pressed = await card.evaluate((el) => {
    for (const type of ['pointerdown', 'mousedown']) {
      el.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: 0, clientY: 0 }) as Event)
    }
    return {
      transform: (el as HTMLElement).style.transform,
      pressed: el.classList.contains('is-pressed'),
      cls: String((el as HTMLElement).className).slice(0, 200),
    }
  })
  console.log(`PRESSED-DEBUG transform=${pressed.transform} pressed=${pressed.pressed} cls=${pressed.cls}`) // eslint-disable-line no-console
  expect(pressed.pressed).toBe(true)
  expect(pressed.transform).toContain('scale(0.985)')
  const 旋转值 = ((pressed.transform.match(/rotate[XY]\(-?[\d.]+deg\)/g) ?? []) as string[]).map((m: string) => Math.abs(Number(m.replace(/[^-\d.]/g, ''))))
  expect(旋转值.length).toBe(2)
  for (const v of 旋转值) expect(v).toBeLessThanOrEqual(0.01)
  // 按压态底部边角截图（与用户复现路径一致）
  await card.screenshot({ path: 'test-results/press-down-card.png' })
  await page.screenshot({
    clip: { x: Math.max(0, box!.x - 20), y: box!.y + box!.height - 120, width: box!.width + 40, height: 140 },
    path: 'test-results/press-down-bottom.png',
  })
  expect(errors).toEqual([])
  await page.mouse.up()
  // 抬起恢复悬停倾斜
  await page.waitForTimeout(600)
  const after = await card.evaluate((el) => ({
    transform: (el as HTMLElement).style.transform,
    pressed: el.classList.contains('is-pressed'),
  }))
  expect(after.pressed).toBe(false)
  expect(after.transform).toContain('perspective(1000px)')
})
