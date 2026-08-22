import { test, expect, type Page } from '@playwright/test'

/**
 * FP-07 根因验证：联系图标 hover→unhover 后必须与初始帧逐像素一致。
 * 旧缺陷：动画结束瞬间图标图案向左上「瞬移」约半像素——
 * 合成层栅格化与静态绘制对齐不一致（transform 插值终态 ≠ 静止态）。
 *
 * 取证方式：图标自带不透明渐变底，裁剪其内部区域（内缩避开圆角抗锯齿边）
 * 可隔离背后动态星空的干扰，使像素级对比只反映图标自身渲染。
 */
test('联系图标 hover→unhover 后无像素位移', async ({ page }) => {
  await page.goto('/')
  const icon = page.locator('.contact-item-icon').first()
  await icon.scrollIntoViewIfNeeded()
  // 等待懒加载区块、字体与合成层稳定
  await page.waitForTimeout(1000)

  const box = (await icon.boundingBox()) as { x: number; y: number; width: number; height: number }
  expect(box).toBeTruthy()

  // 内缩 8px：排除圆角 AA 与外发光边缘，仅比较不透明渐变底+SVG 图案本体
  const clip = {
    x: Math.round(box.x + 8),
    y: Math.round(box.y + 8),
    width: Math.round(box.width - 16),
    height: Math.round(box.height - 16),
  }

  const before = await page.screenshot({ clip })

  await icon.hover()
  // 悬停过渡 0.3s + 余量：截取悬停态留档（不参与一致性断言）
  await page.waitForTimeout(500)
  await page.screenshot({ clip, path: 'test-results/icon-hovered.png' })

  // 移出卡片触发 unhover（移到视口远角），等待回位过渡完成
  await page.mouse.move(10, 10)
  await page.waitForTimeout(800)
  const after = await page.screenshot({ clip })

  if (!before.equals(after)) {
    await page.screenshot({ path: 'test-results/icon-shift-repro.png', fullPage: false })
  }
  expect(before.equals(after), '图标在动画结束后发生像素位移（瞬移复现）').toBe(true)
})

/**
 * FP-06 行为级验证：三排跑马灯——
 * 1) 鼠标悬停在两张卡片之间的缝隙 → 轨道继续移动；
 * 2) 鼠标真正命中卡片方框 → 轨道缓停；
 * 3) 移开后恢复移动。
 */
async function 轨道位移(page: Page, 行索引: number): Promise<number> {
  const track = page.locator('.showcase-marquee').nth(行索引)
  return track.evaluate((el) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(el).transform)
    return m.m41
  })
}

/** 等 Lenis 黏性滚动完全停稳（连续窗口内 scrollY 不变），否则滚动联动位移会污染静止断言 */
async function 等待滚动停稳(page: Page): Promise<void> {
  await page.evaluate(async () => {
    let 上次 = window.scrollY
    let 稳定起 = performance.now()
    const 开始 = performance.now()
    while (performance.now() - 开始 < 10000) {
      await new Promise((r) => requestAnimationFrame(r))
      if (window.scrollY !== 上次) {
        上次 = window.scrollY
        稳定起 = performance.now()
      } else if (performance.now() - 稳定起 > 800) {
        return
      }
    }
  })
}

test('跑马灯：缝隙悬停不停，卡片悬停缓停', async ({ page }) => {
  await page.goto('/')
  const 区块 = page.locator('section[aria-label]:has(.showcase-marquee)').first()
  await 区块.scrollIntoViewIfNeeded()
  await 等待滚动停稳(page)
  await page.waitForTimeout(1200)

  // 轨道持续平移：固定索引的卡片会滑出视口（负坐标），必须动态选取「此刻完整可见」的卡片
  const 卡片们 = 区块.locator('.group\\/card')
  const 总数 = await 卡片们.count()
  const 取盒 = async (i: number) => (await 卡片们.nth(i).boundingBox()) as { x: number; y: number; width: number; height: number }
  let 可见索引 = -1
  let 盒: { x: number; y: number; width: number; height: number } | null = null
  for (let i = 0; i < 总数; i++) {
    const b = await 取盒(i)
    if (b && b.x > 220 && b.x + b.width < 1220 && b.y > 130 && b.y + b.height < 860) {
      可见索引 = i
      盒 = b
      break
    }
  }
  expect(可见索引, '应存在完整落在视口内的卡片').toBeGreaterThanOrEqual(0)

  // —— 缝隙位置：该卡右缘 + 缝隙中点（gap-20 = 80px → 中点 +40px）——
  const 缝隙X = 盒!.x + 盒!.width + 40
  const 卡片中线Y = 盒!.y + 盒!.height / 2
  await page.mouse.move(缝隙X, 卡片中线Y)

  // 等惯性缓停窗口过去（悬停 τ≈0.4s）；若被误判为悬停，位移会趋近 0
  const 缝隙前 = await 轨道位移(page, 0)
  await page.waitForTimeout(1500)
  const 缝隙后 = await 轨道位移(page, 0)
  expect(Math.abs(缝隙后 - 缝隙前), '缝隙悬停不应停止轨道').toBeGreaterThan(20)

  // —— 卡片中心：应触发整体缓停（重新取盒：缝隙阶段轨道又移动了一段）——
  const 新盒 = await 取盒(可见索引)
  await page.mouse.move(新盒.x + 新盒.width / 2, 新盒.y + 新盒.height / 2)
  await page.waitForTimeout(2500)
  const 卡前 = await 轨道位移(page, 0)
  await page.waitForTimeout(600)
  const 卡后 = await 轨道位移(page, 0)
  expect(Math.abs(卡后 - 卡前), '命中卡片方框应使轨道静止').toBeLessThan(1)

  // —— 移出后恢复 ——
  await page.mouse.move(10, 10)
  await page.waitForTimeout(2000)
  const 恢复前 = await 轨道位移(page, 0)
  await page.waitForTimeout(600)
  const 恢复后 = await 轨道位移(page, 0)
  expect(Math.abs(恢复后 - 恢复前), '移出后轨道应恢复移动').toBeGreaterThan(15)
})


