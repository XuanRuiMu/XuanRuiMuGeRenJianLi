import { test, expect, type Page, type Route } from '@playwright/test'

/**
 * AI 问答「有思考没回答」根因回归（真实浏览器行为级）。
 *
 * 根因：请求同时下发 thinking.type=enabled 与 response_format.type=json_object
 * （官方限制表明确不推荐同开），长回答时上游把整段 JSON 正文写进 reasoning_content，
 * content 只剩纯空格 padding（3 次实测命中 1 次）；前端空答案闸门又只查原始串长度，
 * 于是空白被当合法答案落库，界面渲染成「工具轨迹 + 空白正文 + 思考过程」——
 * 看起来回答完了，其实一个字没说。
 *
 * 本用例用确定性 SSE 夹具复现该上游形态（不依赖真实密钥与网络），断言「访客必须拿到可见正文」。
 * 局限：Playwright 的 route.fulfill 是一次性投喂，无法真正分帧，因此逐帧流式行为由
 * src/ai/chatService.test.ts 的逐帧单测覆盖，两者互补。
 */

function sse帧(delta: Record<string, string>): string {
  return `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`
}

function sse结束帧(finishReason: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: finishReason }] })}\n\n`
}

async function 装SSE(page: Page, 回合: (轮次: number) => string[]) {
  let 轮次 = 0
  await page.route('**/api/ai/deepseek', async (route: Route) => {
    const 块列表 = 回合(++轮次)
    await route.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache' },
      body: [...块列表, sse结束帧('stop'), 'data: [DONE]\n\n'].join(''),
    })
  })
}

async function 打开面板(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('button:has-text("❯_")').first().click()
  await page.waitForSelector('[data-testid="chat-messages"]')
}

async function 发送(page: Page, 问题: string) {
  const 输入框 = page.locator('[role="dialog"] textarea')
  // 回合号记法：只等「全局 pending 消失」会在第 2 回合发起前就立即成立（旧回合已落定），
  // 根本等不到新回合；route.fulfill 一次性投喂又快到观察不到 pending 行。
  // 因此判据取「助手块数比发送前多，且末条有非空正文」——与回合一一对应且单调。
  const 发送前助手块数 = await page.locator('[data-testid="assistant-placeholder"]').count()
  await 输入框.fill(问题)
  await 输入框.press('Enter')
  await page
    .waitForFunction(
      (发送前) => {
        const 助手块 = document.querySelectorAll('[data-testid="assistant-placeholder"]')
        if (助手块.length <= 发送前) return false
        const 末条 = 助手块[助手块.length - 1]
        const 正文 = 末条.querySelector('[data-testid="assistant-answer"]')
        return !!正文 && (正文.textContent ?? '').trim().length > 0
      },
      发送前助手块数,
      { timeout: 60_000 }
    )
    .catch(() => {
      throw new Error('回合未在超时内落定（助手块数未增加或末条没有可见正文）')
    })
}

function 末条助手块(page: Page) {
  return page.locator('[data-testid="assistant-placeholder"]').last()
}

test.describe('AI 问答根因回归：思考模式长回答必须有可见正文', () => {
  test('长回答的空白 padding content 必须落成本地兜底正文，不得出现「有工具轨迹但正文空白」', async ({ page }) => {
    await 装SSE(page, (轮次) => [
      sse帧({ reasoning_content: 轮次 === 1 ? '用户只是打招呼' : '用户问技术栈，先在心里列一遍' }),
      // 修复前的上游形态：正文被挤进 reasoning，content 只剩纯空格 padding
      sse帧({ content: 轮次 === 1 ? '你好！我是玄锐暮的 AI 分身。' : ' '.repeat(232) }),
    ])
    await 打开面板(page)

    await 发送(page, '你好')
    await 发送(page, '你的技术栈是什么？')

    const 末条 = 末条助手块(page)
    // 关键断言：正文必须可见且非空白
    await expect(末条.locator('[data-testid="assistant-answer"]')).toHaveText(/Java|Node|Python/, {
      timeout: 15_000,
    })
    // 工具轨迹必须诚实标注兜底，不得出现「看起来完成」的假成功轨迹
    await expect(末条.locator('[data-testid="tool-detail"]')).toContainText('本地兜底')
    // 思考流仍保留可展开（机制信息不丢）
    await expect(末条.locator('[data-testid="message-reasoning"]')).toBeVisible()
  })

  test('纯零宽字符的 content 同样必须兜底（trim 判据的已知穿透形态）', async ({ page }) => {
    await 装SSE(page, () => [sse帧({ reasoning_content: '思考' }), sse帧({ content: '\u200b'.repeat(232) })])
    await 打开面板(page)

    await 发送(page, '教育背景')

    const 末条 = 末条助手块(page)
    await expect(末条.locator('[data-testid="assistant-answer"]')).toContainText('天津仁爱学院')
    await expect(末条.locator('[data-testid="pending-thinking"]')).toHaveCount(0)
  })

  test('组件由意图表挂载：问项目/联系/教育分别给出卡片，与本地兜底同源', async ({ page }) => {
    await 装SSE(page, () => [sse帧({ content: '正文' })])
    await 打开面板(page)

    await 发送(page, '介绍一下暮澜纪元')
    await expect(末条助手块(page).locator('[data-testid="ui-component-ProjectCard"]')).toBeVisible()

    await 发送(page, '怎么联系你')
    await expect(末条助手块(page).locator('[data-testid="ui-component-ContactLinks"]')).toBeVisible()

    await 发送(page, '教育背景')
    await expect(末条助手块(page).locator('[data-testid="ui-component-Timeline"]')).toBeVisible()
  })

  test('否定句不挂卡片（避免正文说「简历未体现」而卡片与之矛盾）', async ({ page }) => {
    await 装SSE(page, () => [sse帧({ content: '从你的经历看，倾向于可以胜任，但简历未体现分布式经验。' })])
    await 打开面板(page)

    await 发送(page, '我没做过什么项目，能胜任大厂前端吗')

    await expect(末条助手块(page).locator('[data-testid^="ui-component-"]')).toHaveCount(0)
    await expect(末条助手块(page).locator('[data-testid="assistant-answer"]')).toContainText('简历未体现')
  })

  test('请求体不再下发 response_format（与 thinking 同开是官方不推荐的组合）', async ({ page }) => {
    const 请求体列表: Array<Record<string, unknown>> = []
    await page.route('**/api/ai/deepseek', async (route: Route) => {
      请求体列表.push(JSON.parse(route.request().postData() ?? '{}'))
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [sse帧({ content: '正文' }), sse结束帧('stop'), 'data: [DONE]\n\n'].join(''),
      })
    })
    await 打开面板(page)
    await 发送(page, '你的技术栈是什么？')

    expect(请求体列表).toHaveLength(1)
    expect(请求体列表[0].response_format).toBeUndefined()
    expect(请求体列表[0].thinking).toEqual({ type: 'enabled' })
  })

  test('访客索要 JSON 时正文原样送达（聊天链路不改写答案）', async ({ page }) => {
    const 访客要的JSON = '{"text":["a","b"],"count":2}'
    await 装SSE(page, () => [sse帧({ content: 访客要的JSON })])
    await 打开面板(page)
    await 发送(page, '给我一段 JSON 示例')

    await expect(末条助手块(page).locator('[data-testid="assistant-answer"]')).toHaveText(访客要的JSON)
  })

  test('关闭思考档（thinking off）同样给出可见正文', async ({ page }) => {
    const 请求体列表: Array<Record<string, unknown>> = []
    await page.route('**/api/ai/deepseek', async (route: Route) => {
      请求体列表.push(JSON.parse(route.request().postData() ?? '{}'))
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [sse帧({ content: '我的技术栈：Java、Node.js、Python。' }), sse结束帧('stop'), 'data: [DONE]\n\n'].join(
          ''
        ),
      })
    })
    await 打开面板(page)

    await page.keyboard.press('Alt+t') // high → max
    await page.keyboard.press('Alt+t') // max → off
    await 发送(page, '你的技术栈是什么？')

    expect(请求体列表[0].thinking).toEqual({ type: 'disabled' })
    await expect(末条助手块(page).locator('[data-testid="assistant-answer"]')).toHaveText(/Java、Node\.js、Python/)
  })

  test('被 max_tokens 截断的回答如实标注「回答已截断」', async ({ page }) => {
    await page.route('**/api/ai/deepseek', async (route: Route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [sse帧({ content: '我做过暮澜纪元、和我恋爱吧，还有' }), sse结束帧('length'), 'data: [DONE]\n\n'].join(
          ''
        ),
      })
    })
    await 打开面板(page)
    await 发送(page, '你做过哪些项目')

    await expect(末条助手块(page).locator('[data-testid="tool-detail"]')).toContainText('回答已截断')
  })

  test('整轮无一条 console error', async ({ page }) => {
    const 错误列表: string[] = []
    page.on('console', (消息) => {
      if (消息.type() === 'error') 错误列表.push(消息.text())
    })
    page.on('pageerror', (错) => 错误列表.push(`pageerror: ${错.message}`))

    await 装SSE(page, () => [sse帧({ reasoning_content: '思考' }), sse帧({ content: '可见正文' })])
    await 打开面板(page)
    await 发送(page, '你的技术栈是什么？')

    await expect(末条助手块(page).locator('[data-testid="assistant-answer"]')).toHaveText('可见正文')
    expect(错误列表).toEqual([])
  })
})
