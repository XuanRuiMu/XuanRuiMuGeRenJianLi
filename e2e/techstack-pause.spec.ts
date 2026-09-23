import { test, expect } from '@playwright/test'

/**
 * 技术球标题与精准悬停暂停回归：
 * 1. 球体上方显示标题「本页及相关项目所使用技术栈」
 * 2. 仅悬停技术球本体暂停自转，悬停容器空白区域不停
 */

test.describe('技术球标题与精准悬停暂停', () => {
  test('标题可见且仅球本体悬停暂停', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)

    await expect(page.getByRole('heading', { name: '本页及相关项目所使用技术栈' })).toBeVisible()

    const 球区 = page.locator('[aria-label^="技术栈技术球"]')
    await expect(球区, '技术球容器应存在').toBeAttached()
    const 盒 = await 球区.boundingBox()
    expect(盒, '技术球容器应有尺寸').toBeTruthy()

    const 读首球位移 = () =>
      球区
        .locator('.tech-orb')
        .first()
        .evaluate((el) => (el as HTMLElement).style.transform)

    // 悬停容器空白角落：自转应继续（两次读数不同）
    await page.mouse.move(盒!.x + 8, 盒!.y + 8)
    await page.waitForTimeout(150)
    const 空白前 = await 读首球位移()
    await page.waitForTimeout(500)
    const 空白后 = await 读首球位移()
    expect(空白后, '悬停空白区域不应暂停自转').not.toBe(空白前)

    // 悬停技术球本体：自转应冻结（两次读数相同）
    // 注：不用 locator.hover（旋转元素永不 stable 会超时），直接取坐标移鼠
    const 球心 = await 球区
      .locator('.tech-orb')
      .first()
      .evaluate((el) => {
        const 矩形 = (el as HTMLElement).getBoundingClientRect()
        return { x: 矩形.x + 矩形.width / 2, y: 矩形.y + 矩形.height / 2 }
      })
    await page.mouse.move(球心.x, 球心.y)
    await page.waitForTimeout(150)
    const 悬停前 = await 读首球位移()
    await page.waitForTimeout(500)
    const 悬停后 = await 读首球位移()
    expect(悬停后, '悬停技术球本体应暂停自转').toBe(悬停前)
  })
})
