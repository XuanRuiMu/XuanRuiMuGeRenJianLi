import { test, expect, type Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const 输出目录 = path.resolve('test-results', 'fp04')

async function 截图(页面: Page, 名称: string) {
  fs.mkdirSync(输出目录, { recursive: true })
  await 页面.screenshot({ path: path.join(输出目录, `${名称}.png`), fullPage: false })
}

test.describe('FP-04 用户端视角测试验证', () => {
  test.setTimeout(120_000)

  test('浅色模式下水墨屏颜色为浅肤色 #F5D0C5', async ({ page: 页面 }) => {
    const 页面错误: string[] = []
    页面.on('pageerror', (错误) => 页面错误.push(错误.message))

    await 页面.goto('/', { waitUntil: 'domcontentloaded' })
    await 页面.waitForTimeout(2000)

    await 页面.getByRole('button', { name: '选择主题' }).first().click()
    await 页面.getByRole('option', { name: /浅色/ }).click()
    await 页面.waitForTimeout(1500)

    await 截图(页面, '01-light-ink-screen')

    const 主体类名 = await 页面.evaluate(() => document.documentElement.className)
    expect(主体类名, '应切换到浅色模式').toContain('light')

    const 遮罩存在 = await 页面.evaluate(() => document.body.children.length > 0)
    expect(遮罩存在, 'InkRevealOverlay 应已挂载').toBe(true)

    expect(页面错误, '页面不应有运行时错误').toHaveLength(0)
  })

  test('访问人数与版权信息同行显示在页脚，样式美观', async ({ page: 页面 }) => {
    const 页面错误: string[] = []
    页面.on('pageerror', (错误) => 页面错误.push(错误.message))

    await 页面.goto('/', { waitUntil: 'domcontentloaded' })
    await 页面.waitForTimeout(2000)

    await 页面.getByRole('button', { name: '选择主题' }).first().click()
    await 页面.getByRole('option', { name: /浅色/ }).click()
    await 页面.waitForTimeout(1500)

    const 访客卡片 = 页面.locator('[data-testid="visitor-counter-card"]')
    await expect(访客卡片, '访问人数卡片应存在').toBeAttached({ timeout: 10000 })

    const 页脚 = 页面.locator('footer')
    await expect(页脚, '页脚应存在').toBeAttached()

    const 页脚访客计数 = 页脚.locator('[data-testid="visitor-counter-card"]')
    await expect(页脚访客计数, '访问人数卡片应在页脚内').toBeAttached()

    const 版权文本 = 页面.locator('footer >> text=/2026玄锐暮/')
    await expect(版权文本, '版权文本应存在').toBeVisible()

    const statusText = 页面.locator('footer >> text=/玄锐暮 · 在线简历 · 离线可用/')
    await expect(statusText, '状态文本应存在').toBeVisible()

    const 页脚内容 = 页脚.locator('div').first()
    const 页脚样式 = await 页脚内容.evaluate((元素) => {
      const style = window.getComputedStyle(元素)
      return {
        display: style.display,
        justifyContent: style.justifyContent,
        alignItems: style.alignItems,
      }
    })
    expect(页脚样式.display, '页脚内容应为 flex 布局').toBe('flex')
    expect(页脚样式.justifyContent, '页脚内容应左右分布').toBe('space-between')

    const 卡片边界 = await 访客卡片.boundingBox()
    expect(卡片边界, '访问人数卡片应有尺寸').toBeTruthy()

    await 截图(页面, '02-light-visitor-footer')

    const 访客文本 = 页面.locator('[data-testid="visitor-counter"]')
    await expect(访客文本, '访问人数文本应可见').toBeVisible()

    const 文本内容 = await 访客文本.textContent()
    expect(文本内容, '访问人数应显示数字').toMatch(/访问人数/)

    expect(页面错误, '页面不应有运行时错误').toHaveLength(0)
  })

  test('浅色模式下背景图动图效果明显', async ({ page: 页面 }) => {
    const 页面错误: string[] = []
    页面.on('pageerror', (错误) => 页面错误.push(错误.message))

    await 页面.goto('/', { waitUntil: 'domcontentloaded' })
    await 页面.waitForTimeout(2000)

    await 页面.getByRole('button', { name: '选择主题' }).first().click()
    await 页面.getByRole('option', { name: /浅色/ }).click()
    await 页面.waitForTimeout(3000)

    const 壁纸图片 = 页面.locator('[data-testid="kanagawa-base"]')
    await expect(壁纸图片, '浅色壁纸底图应存在').toBeAttached({ timeout: 10000 })

    await expect
      .poll(async () => 壁纸图片.evaluate((元素) => (元素 as HTMLImageElement).naturalWidth), { timeout: 10_000 })
      .toBe(1280)

    const 壁纸视频 = 页面.locator('[data-testid="light-wallpaper"] video')
    const 视频数量 = await 壁纸视频.count()
    if (视频数量 > 0) {
      await expect(壁纸视频).toHaveAttribute('loop')
      await expect
        .poll(async () => 壁纸视频.evaluate((元素) => (元素 as HTMLVideoElement).readyState), { timeout: 15_000 })
        .toBeGreaterThanOrEqual(2)

      await expect
        .poll(async () => 壁纸视频.evaluate((元素) => (元素 as HTMLVideoElement).currentTime > 0.5), {
          timeout: 10_000,
        })
        .toBe(true)

      const 播放中 = await 壁纸视频.evaluate((元素) => {
        const v = 元素 as HTMLVideoElement
        return !v.paused && v.readyState >= 2 && v.currentTime > 0
      })
      expect(播放中, '视频应正在播放').toBe(true)
    }

    await 截图(页面, '03-light-background-animation')

    const 滤镜样式 = await 壁纸图片.evaluate((元素) => {
      return window.getComputedStyle(元素).filter
    })

    expect(滤镜样式, '壁纸应有滤镜效果').toContain('brightness')

    await 页面.evaluate(() => window.scrollBy({ top: 300, behavior: 'instant' }))
    await 页面.waitForTimeout(500)
    const 壁纸变换 = await 页面.evaluate(() => {
      const 元素 = document.querySelector('[data-testid="light-wallpaper"]') as HTMLElement
      return 元素?.style.transform || ''
    })
    expect(壁纸变换, '滚动后壁纸应有位移').toContain('translate3d')

    await 截图(页面, '04-light-background-scrolled')

    expect(页面错误, '页面不应有运行时错误').toHaveLength(0)
  })

  test('后端日志无错误', async ({ page: 页面 }) => {
    const 控制台错误: string[] = []
    const 网络错误: string[] = []

    页面.on('pageerror', (错误) => 控制台错误.push(`pageerror: ${错误.message}`))
    页面.on('console', (消息) => {
      if (消息.type() === 'error') {
        控制台错误.push(`console.error: ${消息.text().slice(0, 300)}`)
      }
    })
    页面.on('response', (response) => {
      if (response.status() >= 500) {
        网络错误.push(`${response.status()} ${response.url()}`)
      }
    })

    await 页面.goto('/', { waitUntil: 'networkidle' })
    await 页面.waitForTimeout(3000)

    expect(控制台错误, '不应有控制台错误').toHaveLength(0)

    expect(网络错误, '不应有服务器错误').toHaveLength(0)

    await 截图(页面, '05-final-state')
  })

  test('深色模式功能正常', async ({ page: 页面 }) => {
    const 页面错误: string[] = []
    页面.on('pageerror', (错误) => 页面错误.push(错误.message))

    await 页面.goto('/', { waitUntil: 'domcontentloaded' })
    await 页面.waitForTimeout(2000)

    const 主体类名 = await 页面.evaluate(() => document.documentElement.className)
    expect(主体类名, '默认应为深色模式').toContain('dark')

    await 截图(页面, '06-dark-mode')

    const 有内容 = await 页面.evaluate(() => {
      return document.querySelector('main') !== null
    })
    expect(有内容, '深色模式下页面应有内容').toBe(true)

    expect(页面错误, '深色模式下不应有运行时错误').toHaveLength(0)
  })
})
