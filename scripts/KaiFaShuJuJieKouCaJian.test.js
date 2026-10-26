import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { 创建开发数据处理器, 校验访问, 登记访问, 读Json, 写Json } from './KaiFaShuJuJieKouCaJian.js'

let 数据目录
let log
let 处理

function 构造Req(method, url, body) {
  const 请求 = { method, url }
  if (body !== undefined) {
    const 载荷 = JSON.stringify(body)
    请求.on = (事件, 回调) => {
      if (事件 === 'data') setTimeout(() => 回调(载荷), 0)
      if (事件 === 'end') setTimeout(回调, 5)
    }
  } else {
    请求.on = (事件, 回调) => {
      if (事件 === 'end') setTimeout(回调, 0)
    }
  }
  return 请求
}

function 构造Res() {
  return {
    statusCode: 0,
    headers: {},
    writableEnded: false,
    body: null,
    setHeader(k, v) {
      this.headers[k] = v
    },
    end(载荷) {
      this.writableEnded = true
      this.body = 载荷 ? JSON.parse(载荷) : null
    },
  }
}

function 调用(请求) {
  const 响应 = 构造Res()
  return new Promise((resolve) => {
    响应.end = function (载荷) {
      this.writableEnded = true
      this.body = 载荷 ? JSON.parse(载荷) : null
      resolve(响应)
    }
    处理(请求, 响应, () => resolve({ nexted: true, res: 响应 }))
  })
}

beforeEach(() => {
  数据目录 = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-api-'))
  log = vi.fn()
  处理 = 创建开发数据处理器({ dataDir: 数据目录, log })
})

afterEach(() => {
  fs.rmSync(数据目录, { recursive: true, force: true })
})

describe('校验函数', () => {
  it('访问载荷：path 与 timestamp 必须合法', () => {
    expect(校验访问({ path: '/', timestamp: Date.now() })).toBeNull()
    expect(校验访问({ path: '', timestamp: Date.now() })).toBe('validation_error:path')
    expect(校验访问({ path: '/', timestamp: -1 })).toBe('validation_error:timestamp')
  })
})

describe('登记访问（纯逻辑）', () => {
  it('计数递增且 last24h 过滤旧记录', () => {
    const now = Date.now()
    const 状态 = { events: [now - 48 * 3600 * 1000] }
    const 快照1 = 登记访问(状态, now)
    expect(快照1.total).toBe(2)
    expect(快照1.last24h).toBe(1)
    const 快照2 = 登记访问(状态, now + 10)
    expect(快照2.total).toBe(3)
    expect(快照2.last24h).toBe(2)
  })
})

describe('createDevDataHandler（HTTP 层）', () => {
  it('GET /analytics 初始为全零', async () => {
    const 响应 = await 调用(构造Req('GET', '/analytics'))
    expect(响应.body).toEqual({ total: 0, last24h: 0, stored: true })
  })

  it('POST /analytics 登记并持久化；GET 可读回', async () => {
    await 调用(构造Req('POST', '/analytics', { path: '/', timestamp: Date.now() }))
    const 响应 = await 调用(构造Req('GET', '/analytics'))
    expect(响应.body.total).toBe(1)

    const 持久化 = 读Json(数据目录, 'dev-analytics.json', null)
    expect(持久化.events).toHaveLength(1)
  })

  it('损坏的 JSON 请求体返回 400 而非崩溃', async () => {
    const 请求 = 构造Req('POST', '/analytics')
    请求.on = (事件, 回调) => {
      if (事件 === 'data') setTimeout(() => 回调('{broken'), 0)
      if (事件 === 'end') setTimeout(回调, 5)
    }
    const 响应 = await 调用(请求)
    expect(响应.statusCode).toBe(400)
  })

  it('未匹配路由放行 next()', async () => {
    const 响应 = await 调用(构造Req('GET', '/deepseek'))
    expect(响应.nexted).toBe(true)
  })

  it('写Json→读Json 往返一致', () => {
    写Json(数据目录, 'probe.json', { a: 1 })
    expect(读Json(数据目录, 'probe.json', null)).toEqual({ a: 1 })
    expect(读Json(数据目录, 'missing.json', 'fallback')).toBe('fallback')
  })
})
