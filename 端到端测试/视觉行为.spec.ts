import { test, expect, type Page } from '@playwright/test'

test('联系图标 hover→unhover 后无像素位移', async ({ page: 页面 }) => {
  await 页面.goto('/')
  const 图标 = 页面.locator('.contact-item-icon').first()
  await 图标.scrollIntoViewIfNeeded()

  await 页面.waitForTimeout(1000)

  const 盒子 = (await 图标.boundingBox()) as { x: number; y: number; width: number; height: number }
  expect(盒子).toBeTruthy()

  const 裁剪 = {
    x: Math.round(盒子.x + 8),
    y: Math.round(盒子.y + 8),
    width: Math.round(盒子.width - 16),
    height: Math.round(盒子.height - 16),
  }

  const 之前 = await 页面.screenshot({ clip: 裁剪 })

  await 图标.hover()

  await 页面.waitForTimeout(500)
  await 页面.screenshot({ clip: 裁剪, path: 'test-results/icon-hovered.png' })

  await 页面.mouse.move(10, 10)
  await 页面.waitForTimeout(800)
  const 之后 = await 页面.screenshot({ clip: 裁剪 })

  if (!之前.equals(之后)) {
    await 页面.screenshot({ path: 'test-results/icon-shift-repro.png', fullPage: false })
  }
  expect(之前.equals(之后), '图标在动画结束后发生像素位移（瞬移复现）').toBe(true)
})

async function 轨道位移(页面: Page, 行索引: number): Promise<number> {
  const 轨道 = 页面.locator('.showcase-marquee').nth(行索引)
  return 轨道.evaluate((元素) => {
    const m = new DOMMatrixReadOnly(getComputedStyle(元素).transform)
    return m.m41
  })
}

async function 等待滚动停稳(页面: Page): Promise<void> {
  await 页面.evaluate(async () => {
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

test('跑马灯：缝隙悬停不停，卡片悬停缓停', async ({ page: 页面 }) => {
  await 页面.goto('/')
  const 区块 = 页面.locator('section[aria-label]:has(.showcase-marquee)').first()
  await 区块.scrollIntoViewIfNeeded()
  await 等待滚动停稳(页面)
  await 页面.waitForTimeout(1200)

  type 盒型 = { x: number; y: number; width: number; height: number; 轨道索引: number }
  const 全部盒 = (): Promise<盒型[]> =>
    区块.evaluate((根) =>
      [...根.querySelectorAll('.showcase-marquee')].flatMap((轨道, 轨道索引) =>
        [...轨道.querySelectorAll('.group\\/card')].map((c) => {
          const b = c.getBoundingClientRect()
          return { x: b.x, y: b.y, width: b.width, height: b.height, 轨道索引 }
        })
      )
    )

  let 可见索引 = -1
  let 盒: 盒型 | null = null
  for (let 轮 = 0; 轮 < 10 && 可见索引 < 0; 轮++) {
    const 盒表 = await 全部盒()
    可见索引 = 盒表.findIndex((b) => b.x > 220 && b.x + b.width < 1220 && b.y > 130 && b.y + b.height < 860)
    盒 = 可见索引 >= 0 ? (盒表[可见索引] ?? null) : null
    if (可见索引 < 0) {
      await 页面.mouse.wheel(0, 160)
      await 页面.waitForTimeout(450)
    }
  }
  expect(可见索引, '应存在完整落在视口内的卡片').toBeGreaterThanOrEqual(0)

  const 缝隙X = 盒!.x + 盒!.width + 40
  const 卡片中线Y = 盒!.y + 盒!.height / 2
  await 页面.mouse.move(缝隙X, 卡片中线Y)

  const 缝隙前 = await 轨道位移(页面, 盒!.轨道索引)
  await 页面.waitForTimeout(2000)
  const 缝隙后 = await 轨道位移(页面, 盒!.轨道索引)
  expect(Math.abs(缝隙后 - 缝隙前), '缝隙悬停不应停止轨道').toBeGreaterThan(10)

  const 新盒 = (await 全部盒())[可见索引]
  await 页面.mouse.move(新盒.x + 新盒.width / 2, 新盒.y + 新盒.height / 2)
  await 页面.waitForTimeout(2500)
  const 卡前 = await 轨道位移(页面, 盒!.轨道索引)
  await 页面.waitForTimeout(600)
  const 卡后 = await 轨道位移(页面, 盒!.轨道索引)
  expect(Math.abs(卡后 - 卡前), '命中卡片方框应使轨道静止').toBeLessThan(1)

  await 页面.mouse.move(10, 10)
  await 页面.waitForTimeout(2000)
  const 恢复前 = await 轨道位移(页面, 盒!.轨道索引)
  await 页面.waitForTimeout(600)
  const 恢复后 = await 轨道位移(页面, 盒!.轨道索引)
  expect(Math.abs(恢复后 - 恢复前), '移出后轨道应恢复移动').toBeGreaterThan(15)
})

test('经历卡片按压后无 wrapper 描边残留线', async ({ page: 页面 }) => {
  await 页面.goto('/')
  const 卡片 = 页面.locator('[data-experience-card="mcserver"]').first()
  await 卡片.scrollIntoViewIfNeeded()
  await 页面.waitForTimeout(1500)

  const 包装器 = 页面.locator('.timeline-card-wrapper').first()

  await 卡片.hover()
  await 页面.waitForTimeout(400)
  const 之前 = await 包装器.evaluate((元素) => {
    const cs = getComputedStyle(元素, '::before')
    return {
      content: cs.content,
      opacity: cs.opacity,
      backgroundImage: cs.backgroundImage,
    }
  })
  expect(之前.content === 'none' || 之前.content === '""' || 之前.content === "''").toBe(true)

  const 盒子 = await 卡片.boundingBox()
  expect(盒子).toBeTruthy()
  await 页面.mouse.move(盒子!.x + 盒子!.width * 0.1, 盒子!.y + 盒子!.height * 0.12, { steps: 8 })
  await 页面.waitForTimeout(300)
  await 页面.mouse.down()
  await 页面.waitForTimeout(800)

  const 按下 = await 卡片.evaluate((元素) => 元素.classList.contains('is-pressed'))
  expect(按下).toBe(true)

  const 之前按下 = await 包装器.evaluate((元素) => {
    const cs = getComputedStyle(元素, '::before')
    return { content: cs.content, opacity: cs.opacity, backgroundImage: cs.backgroundImage }
  })
  expect(之前按下.content === 'none' || 之前按下.content === '""' || 之前按下.content === "''").toBe(true)

  await 页面.screenshot({
    clip: {
      x: Math.max(0, 盒子!.x - 24),
      y: Math.max(0, 盒子!.y - 24),
      width: 盒子!.width + 48,
      height: 180,
    },
    path: 'test-results/experience-card-pressed-no-ghost.png',
  })

  await 页面.mouse.up()
})

test('项目作品在放大后由局部横向滚动容器承载溢出', async ({ page: 页面 }) => {
  const 控制台错误: string[] = []
  页面.on('pageerror', (错误) => 控制台错误.push(String(错误).slice(0, 200)))
  页面.on('console', (消息) => {
    if (消息.type() === 'error') 控制台错误.push(消息.text().slice(0, 200))
  })
  await 页面.setViewportSize({ width: 1920, height: 900 })
  await 页面.goto('/')
  const 滚动容器 = 页面.locator('.clothesline-scroll')
  await 滚动容器.scrollIntoViewIfNeeded()
  const 样式 = await 滚动容器.evaluate((元素) => getComputedStyle(元素).overflowX)
  expect(样式).toBe('auto')
  const 初始尺寸 = await 滚动容器.evaluate((元素) => ({ 宽度: 元素.scrollWidth, 可视宽: 元素.clientWidth }))
  expect(初始尺寸.宽度).toBe(初始尺寸.可视宽)
  const 视口 = 页面.viewportSize()
  expect(视口).not.toBeNull()
  await 页面.setViewportSize({ width: Math.round(视口!.width * 1.1), height: 视口!.height })
  await 页面.waitForTimeout(300)
  const 缩小后 = await 滚动容器.evaluate((元素) => ({ 宽度: 元素.scrollWidth, 可视宽: 元素.clientWidth }))
  expect(缩小后.宽度).toBe(缩小后.可视宽)

  await 页面.setViewportSize({ width: 960, height: 视口!.height })
  await 页面.waitForTimeout(300)
  const 高于最小带宽 = await 滚动容器.evaluate((元素) => ({
    宽度: 元素.scrollWidth,
    可视宽: 元素.clientWidth,
    区域最小宽: (元素.querySelector('.clothesline-region') as HTMLElement).offsetWidth,
  }))
  expect(高于最小带宽.宽度).toBe(高于最小带宽.可视宽)
  expect(高于最小带宽.区域最小宽).toBeLessThanOrEqual(960)

  await 页面.setViewportSize({ width: 640, height: 视口!.height })
  await 页面.waitForTimeout(300)
  const 放大后 = await 滚动容器.evaluate((元素) => ({ 宽度: 元素.scrollWidth, 可视宽: 元素.clientWidth }))
  expect(放大后.宽度).toBeGreaterThan(放大后.可视宽)
  const 滚动后 = await 滚动容器.evaluate((元素) => {
    元素.scrollLeft = 元素.clientWidth / 2
    return 元素.scrollLeft
  })
  expect(滚动后).toBeGreaterThan(0)
  const 便签裁切 = await 页面.locator('.clothesline-note').evaluateAll((便签们) =>
    便签们.map((便签) => {
      const 内容 = 便签.querySelector('.clothesline-note-content') as HTMLElement | null
      const 链接 = 便签.querySelector('.clothesline-note-link') as HTMLElement | null
      if (!内容) return { 内容溢出: true, 链接溢出: true }
      const 内容盒 = 内容.getBoundingClientRect()
      const 内容溢出 = 内容.scrollHeight > 内容.clientHeight + 1
      const 链接底 = 链接 ? 链接.offsetTop + 链接.offsetHeight : 内容.scrollHeight
      const 链接溢出 = 链接底 > 内容.clientHeight + 1
      const 链接在卷内 = !链接 || 链接.getBoundingClientRect().bottom <= 内容盒.bottom + 2
      return { 内容溢出, 链接溢出, 链接在卷内 }
    })
  )
  expect(便签裁切.length).toBeGreaterThan(0)
  for (const 项 of 便签裁切) {
    expect(项.内容溢出).toBe(false)
    expect(项.链接溢出).toBe(false)
    expect(项.链接在卷内).toBe(true)
  }
  expect(控制台错误).toEqual([])
})

test('晾衣架缩放往返后无残留滚动条、scrollLeft 归零、便签集群居中', async ({ page: 页面 }) => {
  const 控制台错误: string[] = []
  页面.on('pageerror', (错误) => 控制台错误.push(String(错误).slice(0, 200)))
  页面.on('console', (消息) => {
    if (消息.type() === 'error') 控制台错误.push(消息.text().slice(0, 200))
  })

  await 页面.emulateMedia({ reducedMotion: 'reduce' })
  await 页面.setViewportSize({ width: 1920, height: 900 })
  await 页面.goto('/')
  const 滚动容器 = 页面.locator('.clothesline-scroll')
  await 滚动容器.scrollIntoViewIfNeeded()
  await 页面.waitForTimeout(1200)

  const 采样 = () =>
    滚动容器.evaluate((元素) => {
      const 区域 = 元素.querySelector('.clothesline-region') as HTMLElement
      const 滚动盒 = 元素.getBoundingClientRect()
      const 便签们 = [...元素.querySelectorAll('.clothesline-note')] as HTMLElement[]
      const 盒表 = 便签们.map((便签) => 便签.getBoundingClientRect())
      const 集群左 = Math.min(...盒表.map((盒) => 盒.left))
      const 集群右 = Math.max(...盒表.map((盒) => 盒.right))
      return {
        scrollWidth: 元素.scrollWidth,
        clientWidth: 元素.clientWidth,
        scrollLeft: 元素.scrollLeft,
        区域最小宽: 区域.offsetWidth,
        集群中心偏移: (集群左 + 集群右) / 2 - (滚动盒.left + 滚动盒.width / 2),
        便签数: 便签们.length,
      }
    })

  const 初始 = await 采样()
  expect(初始.便签数).toBeGreaterThan(0)
  expect(Math.abs(初始.scrollWidth - 初始.clientWidth)).toBeLessThanOrEqual(1)
  expect(初始.scrollLeft).toBe(0)

  expect(Math.abs(初始.集群中心偏移)).toBeLessThanOrEqual(2)

  await 页面.setViewportSize({ width: 640, height: 900 })
  await 页面.waitForTimeout(600)
  const 窄态 = await 采样()
  expect(窄态.scrollWidth).toBeGreaterThan(窄态.clientWidth)

  const 窄态滚动 = await 滚动容器.evaluate((元素) => {
    元素.scrollLeft = 99999
    return 元素.scrollLeft
  })
  expect(窄态滚动).toBeGreaterThan(0)
  const 右移后 = await 采样()
  expect(右移后.scrollLeft).toBeGreaterThan(0)
  expect(右移后.scrollWidth - 右移后.clientWidth).toBeCloseTo(窄态.scrollWidth - 窄态.clientWidth, 0)

  await 页面.setViewportSize({ width: 1920, height: 900 })
  await 页面.waitForTimeout(600)
  const 恢复 = await 采样()
  expect(Math.abs(恢复.scrollWidth - 恢复.clientWidth)).toBeLessThanOrEqual(1)
  expect(恢复.scrollLeft).toBe(0)
  expect(Math.abs(恢复.区域最小宽 - 初始.区域最小宽)).toBeLessThanOrEqual(1)
  expect(Math.abs(恢复.集群中心偏移 - 初始.集群中心偏移)).toBeLessThanOrEqual(1)
  expect(Math.abs(恢复.集群中心偏移)).toBeLessThanOrEqual(2)

  await 页面.setViewportSize({ width: 640, height: 900 })
  await 页面.waitForTimeout(600)
  await 页面.setViewportSize({ width: 1920, height: 900 })
  await 页面.waitForTimeout(600)
  const 二次恢复 = await 采样()
  expect(二次恢复.区域最小宽).toBe(恢复.区域最小宽)
  expect(Math.abs(二次恢复.scrollWidth - 二次恢复.clientWidth)).toBeLessThanOrEqual(1)
  expect(二次恢复.scrollLeft).toBe(0)

  expect(控制台错误).toEqual([])
})

test('多维创作每排副本保持同一二维周期，接缝不产生断代', async ({ page: 页面 }) => {
  await 页面.goto('/')
  const 区域 = 页面.locator('section[data-showcase="true"]')
  await 区域.scrollIntoViewIfNeeded()
  await 页面.waitForTimeout(900)

  const 结果 = await 区域.evaluate((元素) => {
    return [...元素.querySelectorAll('.showcase-marquee')].map((轨道) => {
      const 组表 = [...轨道.children].map((组) => ({
        宽: (组 as HTMLElement).offsetWidth,
        左: (组 as HTMLElement).offsetLeft,
        顶: (组 as HTMLElement).offsetTop,
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
      expect(组表[索引].左 - 组表[索引 - 1].左).toBe(周期)
      expect(Math.abs(组表[索引].顶 - 组表[0].顶)).toBeLessThan(2)
    }
  }
})
