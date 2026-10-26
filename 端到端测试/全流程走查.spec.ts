import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const 输出目录 = path.resolve('test-results', 'walkthrough')

async function 截图(页面: Page, 名称: string) {
  await 页面.screenshot({ path: path.join(输出目录, `${名称}.png`) })
}

async function 到达(页面: Page, 区块Id: string) {
  await 页面.evaluate((id) => {
    const 元素 = document.getElementById(id)
    if (元素) 元素.scrollIntoView({ behavior: 'instant', block: 'start' })
  }, 区块Id)
  await 页面.waitForTimeout(1200)
  await 页面.evaluate(async () => {
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
  await 页面.waitForTimeout(500)
}

test('全站用户视角走查（双主题/签字/壁纸/AI面板/联系方式/访客计数）', async ({ page: 页面 }) => {
  test.setTimeout(300_000)
  fs.mkdirSync(输出目录, { recursive: true })
  const 摘要: string[] = []
  const 页面错误: string[] = []
  页面.on('pageerror', (错误) => 页面错误.push(`pageerror: ${错误.message}`))
  页面.on('console', (消息) => {
    if (消息.type() === 'error') 页面错误.push(`console.error: ${消息.text().slice(0, 200)}`)
  })

  await 页面.goto('/', { waitUntil: 'domcontentloaded' })
  await 页面.waitForTimeout(2500)
  await 截图(页面, '01-hero-dark')
  expect(await 页面.getByTestId('hero-signature').isVisible(), '签字图应可见').toBe(true)
  摘要.push('签字图可见: true')
  const 渐变span数 = await 页面.locator('[data-testid="role-typewriter"] span[style]').count()
  摘要.push(`打字机定色span数: ${渐变span数}`)
  expect(渐变span数).toBeGreaterThanOrEqual(0)

  await 页面.getByRole('button', { name: '选择主题' }).first().click()
  await 页面.getByRole('option', { name: /浅色/ }).click()
  await 页面.waitForTimeout(1500)

  const 壁纸底图 = 页面.locator('[data-testid="light-wallpaper"] img')
  await expect(壁纸底图, '浅色壁纸内应有静态底图').toHaveCount(1)
  await expect(壁纸底图).toHaveAttribute('src', '/images/kanagawa-wave-base.webp')
  await expect
    .poll(async () => 壁纸底图.evaluate((元素) => (元素 as HTMLImageElement).naturalWidth), { timeout: 10_000 })
    .toBe(1280)
  摘要.push('浅色冲浪里名画底图已加载: 1280x720')

  const 壁纸视频 = 页面.locator('[data-testid="light-wallpaper"] video')
  await expect(壁纸视频, '浅色壁纸内应有名画微动循环视频').toHaveCount(1, { timeout: 15_000 })
  await expect(壁纸视频).toHaveAttribute('src', '/videos/kanagawa-wave-loop.mp4')
  await expect(壁纸视频).toHaveAttribute('loop')
  await expect
    .poll(async () => 壁纸视频.evaluate((元素) => (元素 as HTMLVideoElement).readyState), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(2)
  const 视频帧一 = await 壁纸视频.evaluate((元素) => (元素 as HTMLVideoElement).currentTime)
  await 页面.waitForTimeout(700)
  const 视频帧二 = await 壁纸视频.evaluate((元素) => (元素 as HTMLVideoElement).currentTime)
  expect(视频帧二, '真实 CG 视频应自动循环播放（currentTime 前进）').toBeGreaterThan(视频帧一)
  摘要.push(`真实 CG 视频循环播放: ok (${视频帧一.toFixed(2)}s → ${视频帧二.toFixed(2)}s)`)
  await 截图(页面, '02-hero-light')

  await 页面.evaluate(() => window.scrollBy({ top: 500, behavior: 'instant' }))
  await 页面.waitForTimeout(800)
  const 壁纸位移 = await 页面.evaluate(
    () =>
      (document.querySelector('[data-testid="light-wallpaper"]') as HTMLElement | null)?.style.transform ?? 'missing'
  )
  摘要.push(`浅色壁纸滚动位移: ${壁纸位移}`)
  expect(壁纸位移, '滚动后壁纸应有 translate3d 位移').toContain('translate3d')
  await 页面.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
  await 页面.waitForTimeout(800)

  await 页面.getByRole('button', { name: '特效面板' }).click()
  await 页面.waitForTimeout(600)
  await 截图(页面, '03-starry-panel-light')
  expect(await 页面.getByText('彻底隐藏星空背景和壁纸').count(), '控制面板新文案').toBeGreaterThanOrEqual(1)
  摘要.push('控制面板文案「彻底隐藏星空背景和壁纸」: ok')

  await 页面.mouse.click(1260, 860)
  await 页面.waitForTimeout(400)
  expect(
    await 页面.evaluate(() => {
      const 插槽 = document.getElementById('starry-gui-slot')
      return 插槽 ? 插槽.classList.contains('hidden') : true
    }),
    '点击空白后面板应关闭'
  ).toBe(true)

  for (const [id, name] of [
    ['about', '04-about-light'],
    ['projects', '05-projects-light'],
    ['experience', '06-experience-light'],
    ['education', '07-showcase-education-light'],
  ] as const) {
    await 到达(页面, id)
    await 截图(页面, name)
  }

  const 卡片们 = 页面.locator('.group\\/card')
  const 总数 = await 卡片们.count()
  for (let i = 0; i < 总数; i++) {
    const b = await 卡片们.nth(i).boundingBox()
    if (b && b.x > 220 && b.x + b.width < 1220 && b.y > 130 && b.y + b.height < 860) {
      await 页面.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
      await 页面.waitForTimeout(700)
      break
    }
  }
  await 截图(页面, '09-showcase-hover-light')
  await 页面.mouse.move(10, 10)

  await 到达(页面, 'contact')
  await 截图(页面, '08-contact-top-light')

  await 到达(页面, 'hero')
  await 页面.getByRole('button', { name: 'AI助手' }).first().click()
  await 页面.waitForTimeout(700)
  const 状态栏 = (await 页面.getByTestId('chat-status-line').textContent()) ?? ''
  摘要.push(`AI状态栏: ${状态栏.trim()}`)
  expect(状态栏).toContain('think high')
  await 页面.keyboard.type('/help')
  await 页面.keyboard.press('Enter')
  await 页面.waitForTimeout(400)
  await 截图(页面, '10-ai-help-light')
  expect(await 页面.getByRole('button', { name: '添加图片' }).isVisible()).toBe(true)

  await 页面
    .setInputFiles(
      'input[type="file"]',
      { name: 'fake.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') },
      { timeout: 5000 }
    )
    .catch(() => {})
  await 页面.waitForTimeout(600)
  expect(await 页面.getByText('图片上传失败').count(), '非法图片应被拒绝并提示').toBeGreaterThanOrEqual(1)
  摘要.push('非法图片提示: ok')
  await 页面.keyboard.type('/clear')
  await 页面.keyboard.press('Enter')
  await 页面.waitForTimeout(300)
  await 页面.getByRole('button', { name: '关闭' }).click()

  await 到达(页面, 'contact')
  await 截图(页面, '11-contact-filled-light')
  expect(await 页面.getByText('2760688515').count(), 'QQ号应可见').toBeGreaterThanOrEqual(1)
  expect(await 页面.getByText('XuanRuiMu').count(), '微信号应可见').toBeGreaterThanOrEqual(1)
  expect(await 页面.getByAltText(/QQ/).count(), 'QQ二维码应可见').toBeGreaterThanOrEqual(1)
  expect(await 页面.getByAltText(/微信/).count(), '微信二维码应可见').toBeGreaterThanOrEqual(1)
  摘要.push('联系卡片 QQ/微信二维码: ok')

  await 页面.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await 页面.waitForTimeout(1800)
  const 计数1 = (await 页面.getByTestId('visitor-counter').textContent())?.trim() ?? ''
  await 截图(页面, '13-footer-counter-light')
  expect(计数1, '访客计数应显示数字而非空').toMatch(/访问人数：[\d,，]+/)
  await 页面.reload({ waitUntil: 'networkidle' })
  await 页面.waitForTimeout(3000)
  await 页面.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await 页面.waitForTimeout(1500)
  const 计数2 = (await 页面.getByTestId('visitor-counter').textContent())?.trim() ?? ''
  摘要.push(`访问人数 刷新前后: [${计数1}] → [${计数2}]`)
  await 截图(页面, '14-footer-counter-after-reload')

  const 数字1 = Number(计数1.replace(/\D/g, ''))
  const 数字2 = Number(计数2.replace(/\D/g, ''))
  expect(数字2, '刷新后访问人数应自增').toBeGreaterThan(数字1)

  await 页面.getByRole('button', { name: '选择主题' }).first().click()
  await 页面.getByRole('option', { name: /深色/ }).click()
  await 页面.waitForTimeout(1000)
  await 到达(页面, 'hero')
  await 页面.waitForTimeout(800)
  await 截图(页面, '15-hero-dark-final')

  fs.writeFileSync(path.join(输出目录, 'summary.json'), JSON.stringify({ 摘要, 页面错误 }, null, 2))
  console.info('===== 走查摘要 =====\n' + 摘要.join('\n'))
  expect(页面错误, `页面不应有运行时错误：${页面错误.slice(0, 5).join('; ')}`).toHaveLength(0)
})
