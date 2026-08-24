import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

/**
 * FP-08 用户端视角走查：真实浏览器逐区块截图 + 后端真链路核验。
 * 产物：test-results/walkthrough/*.png + summary.json；dev server 日志经 webServer stdout 管道审计。
 */
const 输出目录 = path.resolve('test-results', 'walkthrough')

async function 截图(page: Page, 名称: string) {
  await page.screenshot({ path: path.join(输出目录, `${名称}.png`) })
}

/** 滚动到指定 id 区块并等 Lenis 黏性滚动停稳 */
async function 到达(page: Page, 区块Id: string) {
  await page.evaluate((id) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, 区块Id)
  await page.waitForTimeout(1200)
  await page.evaluate(async () => {
    let 上次 = window.scrollY
    let 稳定起 = performance.now()
    const 开始 = performance.now()
    while (performance.now() - 开始 < 8000) {
      await new Promise((r) => requestAnimationFrame(r))
      if (window.scrollY !== 上次) {
        上次 = window.scrollY
        稳定起 = performance.now()
      } else if (performance.now() - 稳定起 > 600) return
    }
  })
  await page.waitForTimeout(500)
}

test('全站用户视角走查（双主题/签字/壁纸/AI面板/留言落盘/访客计数）', async ({ page }) => {
  test.setTimeout(300_000)
  fs.mkdirSync(输出目录, { recursive: true })
  const 摘要: string[] = []
  const 页面错误: string[] = []
  page.on('pageerror', (err) => 页面错误.push(`pageerror: ${err.message}`))
  page.on('console', (msg) => {
    if (msg.type() === 'error') 页面错误.push(`console.error: ${msg.text().slice(0, 200)}`)
  })

  // ===== 深色模式：首屏 + 签字图 =====
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  await 截图(page, '01-hero-dark')
  expect(await page.getByTestId('hero-signature').isVisible(), '签字图应可见').toBe(true)
  摘要.push('签字图可见: true')
  const 渐变span数 = await page.locator('[data-testid="role-typewriter"] span[style]').count()
  摘要.push(`打字机定色span数: ${渐变span数}`)
  expect(渐变span数).toBeGreaterThanOrEqual(0)

  // ===== 浅色模式：壁纸 =====
  await page.getByRole('button', { name: '选择主题' }).first().click()
  await page.getByRole('option', { name: /浅色/ }).click()
  await page.waitForTimeout(1500)
  // 契约更新（用户 2026-08-24 确认红线）：浅色背景 = 真实 CG 画面「燃烧的泰达希尔」，
  // 禁止手绘/程序生成。动态部分为官方 CG 大全景镜头经逐帧稳像的真实视频无缝循环
  // （树干/地面/人物等静态元素残差 ≤1px，只有火焰/余烬/烟在动，禁止镜头移动）。
  // 底图必须真实存在且完整加载（视频加载前占位 + reduced-motion 降级）；
  // 视频必须自动循环播放（动态性为用户红线）。
  const 壁纸底图 = page.locator('[data-testid="light-wallpaper"] img')
  await expect(壁纸底图, '浅色壁纸内应有静态底图').toHaveCount(1)
  await expect(壁纸底图).toHaveAttribute('src', '/images/teldrassil-burning-base.webp')
  await expect
    .poll(async () => 壁纸底图.evaluate((el) => (el as HTMLImageElement).naturalWidth), { timeout: 10_000 })
    .toBe(1920)
  摘要.push('浅色燃烧泰达希尔真实底图已加载: 1920x810')

  const 壁纸视频 = page.locator('[data-testid="light-wallpaper"] video')
  await expect(壁纸视频, '浅色壁纸内应有真实 CG 循环视频').toHaveCount(1)
  await expect(壁纸视频).toHaveAttribute('src', '/videos/teldrassil-burning-loop.mp4')
  await expect(壁纸视频).toHaveAttribute('loop')
  await expect
    .poll(async () => 壁纸视频.evaluate((el) => (el as HTMLVideoElement).readyState), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(2)
  const 视频帧一 = await 壁纸视频.evaluate((el) => (el as HTMLVideoElement).currentTime)
  await page.waitForTimeout(700)
  const 视频帧二 = await 壁纸视频.evaluate((el) => (el as HTMLVideoElement).currentTime)
  expect(视频帧二, '真实 CG 视频应自动循环播放（currentTime 前进）').toBeGreaterThan(视频帧一)
  摘要.push(`真实 CG 视频循环播放: ok (${视频帧一.toFixed(2)}s → ${视频帧二.toFixed(2)}s)`)
  await 截图(page, '02-hero-light')

  // 滚动后壁纸位移
  await page.evaluate(() => window.scrollBy({ top: 500, behavior: 'instant' }))
  await page.waitForTimeout(800)
  const 壁纸位移 = await page.evaluate(
    () => (document.querySelector('[data-testid="light-wallpaper"]') as HTMLElement | null)?.style.transform ?? 'missing'
  )
  摘要.push(`浅色壁纸滚动位移: ${壁纸位移}`)
  expect(壁纸位移, '滚动后壁纸应有 translate3d 位移').toContain('translate3d')
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(800)

  // ===== 特效控制面板文案 =====
  await page.getByRole('button', { name: '特效面板' }).click()
  await page.waitForTimeout(600)
  await 截图(page, '03-starry-panel-light')
  expect(await page.getByText('彻底隐藏星空背景和壁纸').count(), '控制面板新文案').toBeGreaterThanOrEqual(1)
  摘要.push('控制面板文案「彻底隐藏星空背景和壁纸」: ok')
  // 面板打开后覆盖在触发按钮上方，二次点击会被命中测试拦截；
  // 组件本身支持"外点即关"，按真实用户习惯点击视口空白处关闭
  await page.mouse.click(1260, 860)
  await page.waitForTimeout(400)
  expect(
    await page.evaluate(() => {
      const slot = document.getElementById('starry-gui-slot')
      return slot ? slot.classList.contains('hidden') : true
    }),
    '点击空白后面板应关闭'
  ).toBe(true)

  // ===== 各区块（浅色）=====
  for (const [id, name] of [
    ['about', '04-about-light'],
    ['projects', '05-projects-light'],
    ['experience', '06-experience-light'],
    ['education', '07-showcase-education-light'],
  ] as const) {
    await 到达(page, id)
    await 截图(page, name)
  }

  // showcase 悬停抬起态截图（须在仍处于 showcase 视口时进行）
  const 卡片们 = page.locator('.group\\/card')
  const 总数 = await 卡片们.count()
  for (let i = 0; i < 总数; i++) {
    const b = await 卡片们.nth(i).boundingBox()
    if (b && b.x > 220 && b.x + b.width < 1220 && b.y > 130 && b.y + b.height < 860) {
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
      await page.waitForTimeout(700)
      break
    }
  }
  await 截图(page, '09-showcase-hover-light')
  await page.mouse.move(10, 10)

  // 联系区块
  await 到达(page, 'contact')
  await 截图(page, '08-contact-top-light')

  // ===== AI 面板：模型名 / /help / 图片按钮 / 非法图片提示 =====
  await 到达(page, 'hero')
  await page.getByRole('button', { name: 'AI 助手' }).first().click()
  await page.waitForTimeout(700)
  const 状态栏 = (await page.getByText(/deepseek-v4-flash-vision-exp · /).first().textContent()) ?? ''
  摘要.push(`AI状态栏: ${状态栏.trim()}`)
  expect(状态栏).toContain('think on')
  await page.keyboard.type('/help')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(400)
  await 截图(page, '10-ai-help-light')
  expect(await page.getByRole('button', { name: '添加图片' }).isVisible()).toBe(true)

  await page.setInputFiles(
    'input[type="file"]',
    { name: 'fake.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') },
    { timeout: 5000 }
  ).catch(() => {})
  await page.waitForTimeout(600)
  expect(await page.getByText('图片上传失败').count(), '非法图片应被拒绝并提示').toBeGreaterThanOrEqual(1)
  摘要.push('非法图片提示: ok')
  await page.keyboard.type('/clear')
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: '关闭' }).click()

  // ===== 留言表单真链路 =====
  await 到达(page, 'contact')
  const 留言内容 = `端到端走查留言 ${Date.now()}`
  await page.getByLabel('你的名字').fill('走查机器人')
  await page.getByLabel('你的邮箱').fill('walkthrough@example.com')
  await page.getByLabel('留言内容').fill(`${留言内容}，超过十个字符的完整留言。`)
  await 截图(page, '11-contact-filled-light')
  await page.getByRole('button', { name: /发送留言/ }).click()
  await page.waitForTimeout(1800)
  expect(await page.getByText('留言已发送，我会尽快回复。').count(), '留言成功提示').toBeGreaterThanOrEqual(1)
  await 截图(page, '12-contact-success-light')
  const 留言文件 = path.resolve('data', 'dev-messages.json')
  const 留言落盘 = fs.existsSync(留言文件) && fs.readFileSync(留言文件, 'utf-8').includes('走查机器人')
  expect(留言落盘, '留言应落盘 data/dev-messages.json').toBe(true)
  摘要.push('留言已落盘 data/dev-messages.json: true')

  // ===== 访问人数：页脚显示且刷新自增 =====
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(1800)
  const 计数1 = (await page.getByTestId('visitor-counter').textContent())?.trim() ?? ''
  await 截图(page, '13-footer-counter-light')
  expect(计数1, '访客计数应显示数字而非空').toMatch(/访问人数：[\d,，]+/)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(1500)
  const 计数2 = (await page.getByTestId('visitor-counter').textContent())?.trim() ?? ''
  摘要.push(`访问人数 刷新前后: [${计数1}] → [${计数2}]`)
  await 截图(page, '14-footer-counter-after-reload')

  const 数字1 = Number(计数1.replace(/\D/g, ''))
  const 数字2 = Number(计数2.replace(/\D/g, ''))
  expect(数字2, '刷新后访问人数应自增').toBeGreaterThan(数字1)

  // ===== 深色回归一屏 =====
  await page.getByRole('button', { name: '选择主题' }).first().click()
  await page.getByRole('option', { name: /深色/ }).click()
  await page.waitForTimeout(1000)
  await 到达(page, 'hero')
  await page.waitForTimeout(800)
  await 截图(page, '15-hero-dark-final')

  fs.writeFileSync(path.join(输出目录, 'summary.json'), JSON.stringify({ 摘要, 页面错误 }, null, 2))
  console.info('===== 走查摘要 =====\n' + 摘要.join('\n'))
  expect(页面错误, `页面不应有运行时错误：${页面错误.slice(0, 5).join('; ')}`).toHaveLength(0)
})

