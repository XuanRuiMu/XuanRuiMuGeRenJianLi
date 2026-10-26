import { test, expect, type Page, type Route } from '@playwright/test'

function sse帧(增量: Record<string, string>): string {
  return `data: ${JSON.stringify({ choices: [{ delta: 增量 }] })}\n\n`
}

function sse结束帧(结束原因: string): string {
  return `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 结束原因 }] })}\n\n`
}

async function 装SSE(页面: Page, 回合: (轮次: number) => string[]) {
  let 轮次 = 0
  await 页面.route('**/api/ai/deepseek', async (路由: Route) => {
    const 块列表 = 回合(++轮次)
    await 路由.fulfill({
      status: 200,
      contentType: 'text/event-stream',
      headers: { 'Cache-Control': 'no-cache' },
      body: [...块列表, sse结束帧('stop'), 'data: [DONE]\n\n'].join(''),
    })
  })
}

async function 打开面板(页面: Page) {
  await 页面.goto('/', { waitUntil: 'domcontentloaded' })
  await 页面.locator('button:has-text("❯_")').first().click()
  await 页面.waitForSelector('[data-testid="chat-messages"]')
}

async function 发送(页面: Page, 问题: string) {
  const 输入框 = 页面.locator('[role="dialog"] textarea')

  const 发送前助手块数 = await 页面.locator('[data-testid="assistant-placeholder"]').count()
  await 输入框.fill(问题)
  await 输入框.press('Enter')
  await 页面
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

function 末条助手块(页面: Page) {
  return 页面.locator('[data-testid="assistant-placeholder"]').last()
}

test.describe('AI 问答根因回归：思考模式长回答必须有可见正文', () => {
  test('长回答的空白 padding content 必须落成本地兜底正文，不得出现「有工具轨迹但正文空白」', async ({
    page: 页面,
  }) => {
    await 装SSE(页面, (轮次) => [
      sse帧({ reasoning_content: 轮次 === 1 ? '用户只是打招呼' : '用户问技术栈，先在心里列一遍' }),

      sse帧({ content: 轮次 === 1 ? '你好！我是玄锐暮的 AI 分身。' : ' '.repeat(232) }),
    ])
    await 打开面板(页面)

    await 发送(页面, '你好')
    await 发送(页面, '你的技术栈是什么？')

    const 末条 = 末条助手块(页面)

    await expect(末条.locator('[data-testid="assistant-answer"]')).toHaveText(/Java|Node|Python/, {
      timeout: 15_000,
    })

    await expect(末条.locator('[data-testid="tool-detail"]')).toContainText('本地兜底')

    await expect(末条.locator('[data-testid="message-reasoning"]')).toBeVisible()
  })

  test('纯零宽字符的 content 同样必须兜底（trim 判据的已知穿透形态）', async ({ page: 页面 }) => {
    await 装SSE(页面, () => [sse帧({ reasoning_content: '思考' }), sse帧({ content: '\u200b'.repeat(232) })])
    await 打开面板(页面)

    await 发送(页面, '教育背景')

    const 末条 = 末条助手块(页面)
    await expect(末条.locator('[data-testid="assistant-answer"]')).toContainText('天津仁爱学院')
    await expect(末条.locator('[data-testid="pending-thinking"]')).toHaveCount(0)
  })

  test('组件由意图表挂载：问项目/联系/教育分别给出卡片，与本地兜底同源', async ({ page: 页面 }) => {
    await 装SSE(页面, () => [sse帧({ content: '正文' })])
    await 打开面板(页面)

    await 发送(页面, '介绍一下暮澜纪元')
    await expect(末条助手块(页面).locator('[data-testid="ui-component-ProjectCard"]')).toBeVisible()

    await 发送(页面, '怎么联系你')
    await expect(末条助手块(页面).locator('[data-testid="ui-component-ContactLinks"]')).toBeVisible()

    await 发送(页面, '教育背景')
    await expect(末条助手块(页面).locator('[data-testid="ui-component-Timeline"]')).toBeVisible()
  })

  test('否定句不挂卡片（避免正文说「简历未体现」而卡片与之矛盾）', async ({ page: 页面 }) => {
    await 装SSE(页面, () => [sse帧({ content: '从你的经历看，倾向于可以胜任，但简历未体现分布式经验。' })])
    await 打开面板(页面)

    await 发送(页面, '我没做过什么项目，能胜任大厂前端吗')

    await expect(末条助手块(页面).locator('[data-testid^="ui-component-"]')).toHaveCount(0)
    await expect(末条助手块(页面).locator('[data-testid="assistant-answer"]')).toContainText('简历未体现')
  })

  test('请求体不再下发 response_format（与 thinking 同开是官方不推荐的组合）', async ({ page: 页面 }) => {
    const 请求体列表: Array<Record<string, unknown>> = []
    await 页面.route('**/api/ai/deepseek', async (路由: Route) => {
      请求体列表.push(JSON.parse(路由.request().postData() ?? '{}'))
      await 路由.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [sse帧({ content: '正文' }), sse结束帧('stop'), 'data: [DONE]\n\n'].join(''),
      })
    })
    await 打开面板(页面)
    await 发送(页面, '你的技术栈是什么？')

    expect(请求体列表).toHaveLength(1)
    expect(请求体列表[0].response_format).toBeUndefined()
    expect(请求体列表[0].thinking).toEqual({ type: 'enabled' })
  })

  test('访客索要 JSON 时正文原样送达（聊天链路不改写答案）', async ({ page: 页面 }) => {
    const 访客要的JSON = '{"text":["a","b"],"count":2}'
    await 装SSE(页面, () => [sse帧({ content: 访客要的JSON })])
    await 打开面板(页面)
    await 发送(页面, '给我一段 JSON 示例')

    await expect(末条助手块(页面).locator('[data-testid="assistant-answer"]')).toHaveText(访客要的JSON)
  })

  test('关闭思考档（thinking off）同样给出可见正文', async ({ page: 页面 }) => {
    const 请求体列表: Array<Record<string, unknown>> = []
    await 页面.route('**/api/ai/deepseek', async (路由: Route) => {
      请求体列表.push(JSON.parse(路由.request().postData() ?? '{}'))
      await 路由.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [sse帧({ content: '我的技术栈：Java、Node.js、Python。' }), sse结束帧('stop'), 'data: [DONE]\n\n'].join(
          ''
        ),
      })
    })
    await 打开面板(页面)

    await 页面.keyboard.press('Alt+t')
    await 页面.keyboard.press('Alt+t')
    await 发送(页面, '你的技术栈是什么？')

    expect(请求体列表[0].thinking).toEqual({ type: 'disabled' })
    await expect(末条助手块(页面).locator('[data-testid="assistant-answer"]')).toHaveText(/Java、Node\.js、Python/)
  })

  test('被 max_tokens 截断的回答如实标注「回答已截断」', async ({ page: 页面 }) => {
    await 页面.route('**/api/ai/deepseek', async (路由: Route) => {
      await 路由.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [sse帧({ content: '我做过暮澜纪元、和我恋爱吧，还有' }), sse结束帧('length'), 'data: [DONE]\n\n'].join(
          ''
        ),
      })
    })
    await 打开面板(页面)
    await 发送(页面, '你做过哪些项目')

    await expect(末条助手块(页面).locator('[data-testid="tool-detail"]')).toContainText('回答已截断')
  })

  test('整轮无一条 console error', async ({ page: 页面 }) => {
    const 错误列表: string[] = []
    页面.on('console', (消息) => {
      if (消息.type() === 'error') 错误列表.push(消息.text())
    })
    页面.on('pageerror', (错) => 错误列表.push(`pageerror: ${错.message}`))

    await 装SSE(页面, () => [sse帧({ reasoning_content: '思考' }), sse帧({ content: '可见正文' })])
    await 打开面板(页面)
    await 发送(页面, '你的技术栈是什么？')

    await expect(末条助手块(页面).locator('[data-testid="assistant-answer"]')).toHaveText('可见正文')
    expect(错误列表).toEqual([])
  })
})
