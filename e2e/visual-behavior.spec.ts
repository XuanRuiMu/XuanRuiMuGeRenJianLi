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
  // 区块高于视口，最近对齐可能让 3D 跑马灯行恰好跨在断言带边缘；
  // 用真实滚轮小幅微调直到有卡片完整落在带内（对页面高度变化鲁棒，不写死滚动量）
  let 可见索引 = -1
  let 盒: { x: number; y: number; width: number; height: number } | null = null
  for (let 轮 = 0; 轮 < 10 && 可见索引 < 0; 轮++) {
    for (let i = 0; i < 总数; i++) {
      const b = await 取盒(i)
      if (b && b.x > 220 && b.x + b.width < 1220 && b.y > 130 && b.y + b.height < 860) {
        可见索引 = i
        盒 = b
        break
      }
    }
    if (可见索引 < 0) {
      await page.mouse.move(720, 450)
      await page.mouse.wheel(0, 160)
      await page.waitForTimeout(450)
    }
  }
  expect(可见索引, '应存在完整落在视口内的卡片').toBeGreaterThanOrEqual(0)

  // —— 缝隙位置：该卡右缘 + 缝隙中点（gap-20 = 80px → 中点 +40px）——
  const 缝隙X = 盒!.x + 盒!.width + 40
  const 卡片中线Y = 盒!.y + 盒!.height / 2
  await page.mouse.move(缝隙X, 卡片中线Y)

  // 等惯性缓停窗口过去（悬停 τ≈0.4s）；若被误判为悬停，位移会趋近 0
  const 缝隙前 = await 轨道位移(page, 0)
  await page.waitForTimeout(2000)
  const 缝隙后 = await 轨道位移(page, 0)
  expect(Math.abs(缝隙后 - 缝隙前), '缝隙悬停不应停止轨道').toBeGreaterThan(10)

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

/**
 * 按压残留线根因验证：wrapper 不得自带悬停描边。
 * 旧缺陷：.timeline-card-wrapper::before 在 hover/focus-within 时画青色描边，
 * 该层不随 is-pressed 的 scale(0.985) 缩小，按压后于卡外露出「未按压位置」的残留线。
 * 修复：删除该 ::before；描边只由卡片自身的 .experience-gradient-border 承担。
 */
test('经历卡片按压后无 wrapper 描边残留线', async ({ page }) => {
  await page.goto('/')
  const card = page.locator('[data-experience-card="mcserver"]').first()
  await card.scrollIntoViewIfNeeded()
  await page.waitForTimeout(1500)

  const wrapper = page.locator('.timeline-card-wrapper').first()

  // wrapper ::before 不得绘制可见描边
  await card.hover()
  await page.waitForTimeout(400)
  const before = await wrapper.evaluate((el) => {
    const cs = getComputedStyle(el, '::before')
    return {
      content: cs.content,
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
    }
  })
  expect(before.content === 'none' || before.content === '""' || before.content === "''").toBe(true)

  const box = await card.boundingBox()
  expect(box).toBeTruthy()
  await page.mouse.move(box!.x + box!.width * 0.1, box!.y + box!.height * 0.12, { steps: 8 })
  await page.waitForTimeout(300)
  await page.mouse.down()
  await page.waitForTimeout(800)

  const pressed = await card.evaluate((el) => el.classList.contains('is-pressed'))
  expect(pressed).toBe(true)

  // 按压态：wrapper 仍不得有可绘制的 ::before
  const pressedBefore = await wrapper.evaluate((el) => {
    const cs = getComputedStyle(el, '::before')
    return { content: cs.content, opacity: cs.opacity, backgroundImage: cs.backgroundImage }
  })
  expect(pressedBefore.content === 'none' || pressedBefore.content === '""' || pressedBefore.content === "''").toBe(true)

  await page.screenshot({
    clip: {
      x: Math.max(0, box!.x - 24),
      y: Math.max(0, box!.y - 24),
      width: box!.width + 48,
      height: 180,
    },
    path: 'test-results/experience-card-pressed-no-ghost.png',
  })

  await page.mouse.up()
})

test('项目作品在放大后由局部横向滚动容器承载溢出', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 900 })
  await page.goto('/')
  const 滚动容器 = page.locator('.clothesline-scroll')
  await 滚动容器.scrollIntoViewIfNeeded()
  const 样式 = await 滚动容器.evaluate((元素) => getComputedStyle(元素).overflowX)
  expect(样式).toBe('auto')
  const 初始尺寸 = await 滚动容器.evaluate((元素) => ({ 宽度: 元素.scrollWidth, 可视宽: 元素.clientWidth }))
  expect(初始尺寸.宽度).toBe(初始尺寸.可视宽)
  const 视口 = page.viewportSize()
  expect(视口).not.toBeNull()
  await page.setViewportSize({ width: Math.round(视口!.width * 1.1), height: 视口!.height })
  await page.waitForTimeout(300)
  const 缩小后 = await 滚动容器.evaluate((元素) => ({ 宽度: 元素.scrollWidth, 可视宽: 元素.clientWidth }))
  expect(缩小后.宽度).toBe(缩小后.可视宽)
  await page.setViewportSize({ width: Math.round(视口!.width / 2), height: 视口!.height })
  await page.waitForTimeout(300)
  const 放大后 = await 滚动容器.evaluate((元素) => ({ 宽度: 元素.scrollWidth, 可视宽: 元素.clientWidth }))
  expect(放大后.宽度).toBeGreaterThan(放大后.可视宽)
  const 滚动后 = await 滚动容器.evaluate((元素) => {
    元素.scrollLeft = 元素.clientWidth / 2
    return 元素.scrollLeft
  })
  expect(滚动后).toBeGreaterThan(0)
})

test('多维创作每排副本保持同一二维周期，接缝不产生垂直断代', async ({ page }) => {
  await page.goto('/')
  const 区域 = page.locator('section[data-showcase="true"]')
  await 区域.scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  const 结果 = await 区域.evaluate((元素) => {
    return [...元素.querySelectorAll('.showcase-marquee')].map((轨道) => {
      const 组表 = [...轨道.children].map((组) => ({
        宽: (组 as HTMLElement).offsetWidth,
        左: (组 as HTMLElement).getBoundingClientRect().left,
        顶: (组 as HTMLElement).getBoundingClientRect().top,
      }))
      return 组表
    })
  })
  for (const 组表 of 结果) {
    expect(组表.length).toBeGreaterThanOrEqual(2)
    const 周期 = 组表[0].宽
    expect(周期).toBeGreaterThan(0)
    for (let 索引 = 1; 索引 < 组表.length; 索引 += 1) {
      expect(组表[索引].宽).toBe(周期)
      expect(Math.abs(组表[索引].左 - 组表[索引 - 1].左 - 周期)).toBeLessThan(2)
      expect(Math.abs(组表[索引].顶 - 组表[0].顶)).toBeLessThan(2)
    }
  }
})

test('多维创作与联系我之间的空白不再由固定高度撑开', async ({ page }) => {
  await page.goto('/')
  const 区域 = page.locator('section[data-showcase="true"]')
  await 区域.scrollIntoViewIfNeeded()
  await page.waitForTimeout(900)
  const 尺寸 = await 区域.evaluate((元素) => ({ 高度: (元素 as HTMLElement).offsetHeight }))
  const 间距 = await page.evaluate(() => {
    const 区域元素 = document.querySelector('section[data-showcase="true"]') as HTMLElement
    const 联系元素 = document.querySelector('#contact') as HTMLElement
    const 卡片底边 = Math.max(
      ...[...区域元素.querySelectorAll('.group\\/card')].map(
        (卡片) => (卡片 as HTMLElement).getBoundingClientRect().bottom
      )
    )
    return 联系元素.getBoundingClientRect().top - 卡片底边
  })
  expect(尺寸.高度).toBeLessThan(3000)
  expect(间距).toBeLessThan(700)
})
