import { test, expect, type Locator } from '@playwright/test'

/**
 * 技术栈 ASCII 点阵变形动画回归：
 * 1. 标题、切换提示可见，图标点阵渲染完成
 * 2. 点击切换：变形按时长落定，落定后画面持久保持新图标（不得弹回旧图标）
 * 3. 自动切换节奏恒定（约 5 秒）：动画循环不得倍增导致切换加速
 */

test.describe('技术栈点阵变形动画', () => {
  const 墨迹指纹 = (画布: Locator) =>
    画布.evaluate((el) => {
      const c = el as HTMLCanvasElement
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data
      let 点数 = 0
      let 墨量和 = 0
      for (let i = 3; i < d.length; i += 4) {
        if (d[i] > 0) {
          点数++
          墨量和 += d[i]
        }
      }
      return { 点数, 墨量和 }
    })

  test('点击切换后新形态持久显示，不弹回旧图标', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: '本页及相关项目所使用技术栈' })).toBeVisible()
    const 画布 = page.getByTestId('tech-ascii-canvas')
    await expect(画布).toBeVisible()
    await expect(画布, '技术图标应全部加载完成').toHaveAttribute('data-ready', 'true', {
      timeout: 20000,
    })
    await expect
      .poll(async () => (await 墨迹指纹(画布)).点数, '首图标应渲染出点阵')
      .toBeGreaterThan(200)

    // 等到 idle 窗口再取切换前指纹
    await expect(画布).toHaveAttribute('data-transition', 'idle', { timeout: 10000 })
    const 前 = await 墨迹指纹(画布)
    const 前标签 = await page.getByTestId('tech-morph-label').innerText()

    await page.getByTestId('tech-morph-button').click()
    await expect(画布, '点击后应进入变形').toHaveAttribute('data-transition', 'morphing', {
      timeout: 3000,
    })
    await expect(画布, '变形应按时长落定').toHaveAttribute('data-transition', 'idle', {
      timeout: 5000,
    })

    const 后标签 = await page.getByTestId('tech-morph-label').innerText()
    expect(后标签, '切换后标签应推进').not.toBe(前标签)

    const 后 = await 墨迹指纹(画布)
    expect(
      后.点数,
      '落定后墨迹指纹必须不同于切换前（弹回旧图标则两者相同）',
    ).not.toBe(前.点数)

    // 落定后画面应静止：指针涟漪属持续动效，须先把鼠标移开并等强度衰减完，再验证画面不再变化
    // 时序须落在切换周期内（点击后 ~1.25s 落定、~5s 自动切换），等待取 800ms+200ms 避开边界
    await page.mouse.move(10, 10)
    const 静止1 = await 墨迹指纹(画布)
    const 态1 = await 画布.getAttribute('data-transition')
    await page.waitForTimeout(300)
    const 态2 = await 画布.getAttribute('data-transition')
    const 静止2 = await 墨迹指纹(画布)
    // 采样窗口撞上 5 秒自动切换属合法行为，稳定性由「节奏恒定」用例覆盖，此处条件跳过
    test.skip(态1 !== 'idle' || 态2 !== 'idle', '采样窗口撞上自动切换周期')
    // 容差：涟漪衰减尾迹的亚像素抗锯齿抖动应 <0.5%；弹回/闪动级缺陷会造成点数大幅变化
    expect(
      Math.abs(静止2.点数 - 静止1.点数) / 静止1.点数,
      '移开指针后字形数量应稳定',
    ).toBeLessThan(0.005)
    const 墨量漂移 = Math.abs(静止2.墨量和 - 静止1.墨量和) / 静止1.墨量和
    expect(墨量漂移, '移开指针后不应再有可见的画面变化').toBeLessThan(0.01)
  })

  test('自动切换节奏恒定，动画循环不倍增', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    const 画布 = page.getByTestId('tech-ascii-canvas')
    await expect(画布).toHaveAttribute('data-ready', 'true', { timeout: 20000 })
    await expect(画布).toHaveAttribute('data-transition', 'idle', { timeout: 10000 })

    // 每 200ms 采样一次标签，持续 12 秒：应观察到约两次自动切换，且相邻切换间隔 ≥ 4.5 秒
    const 采样: Array<{ t: number; 标签: string }> = []
    const 起始 = Date.now()
    while (Date.now() - 起始 < 12000) {
      const 标签 = await page.getByTestId('tech-morph-label').innerText()
      const t = Date.now() - 起始
      if (!采样.length || 采样[采样.length - 1].标签 !== 标签) {
        采样.push({ t, 标签 })
      }
      await page.waitForTimeout(200)
    }
    expect(采样.length, '观察期内应发生自动切换').toBeGreaterThanOrEqual(2)
    for (let i = 2; i < 采样.length; i++) {
      const 间隔 = 采样[i].t - 采样[i - 1].t
      expect(间隔, `第 ${i} 次切换间隔 ${间隔}ms 不得明显短于周期（循环倍增会加速）`).toBeGreaterThanOrEqual(4300)
    }
  })
})
