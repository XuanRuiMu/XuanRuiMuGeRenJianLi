import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createDevDataHandler, 校验访问, 登记访问, 读Json, 写Json } from './dev-api-plugin.js'

let dataDir
let log
let 处理

function 构造Req(method, url, body) {
  const req = { method, url }
  if (body !== undefined) {
    const payload = JSON.stringify(body)
    req.on = (event, cb) => {
      if (event === 'data') setTimeout(() => cb(payload), 0)
      if (event === 'end') setTimeout(cb, 5)
    }
  } else {
    req.on = (event, cb) => {
      if (event === 'end') setTimeout(cb, 0)
    }
  }
  return req
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
    end(payload) {
      this.writableEnded = true
      this.body = payload ? JSON.parse(payload) : null
    },
  }
}

function 调用(req) {
  const res = 构造Res()
  return new Promise((resolve) => {
    res.end = function (payload) {
      this.writableEnded = true
      this.body = payload ? JSON.parse(payload) : null
      resolve(res)
    }
    处理(req, res, () => resolve({ nexted: true, res }))
  })
}

beforeEach(() => {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dev-api-'))
  log = vi.fn()
  处理 = createDevDataHandler({ dataDir, log })
})

afterEach(() => {
  fs.rmSync(dataDir, { recursive: true, force: true })
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
    const res = await 调用(构造Req('GET', '/analytics'))
    expect(res.body).toEqual({ total: 0, last24h: 0, stored: true })
  })

  it('POST /analytics 登记并持久化；GET 可读回', async () => {
    await 调用(构造Req('POST', '/analytics', { path: '/', timestamp: Date.now() }))
    const res = await 调用(构造Req('GET', '/analytics'))
    expect(res.body.total).toBe(1)

    const 持久化 = 读Json(dataDir, 'dev-analytics.json', null)
    expect(持久化.events).toHaveLength(1)
  })

  it('损坏的 JSON 请求体返回 400 而非崩溃', async () => {
    const req = 构造Req('POST', '/analytics')
    req.on = (event, cb) => {
      if (event === 'data') setTimeout(() => cb('{broken'), 0)
      if (event === 'end') setTimeout(cb, 5)
    }
    const res = await 调用(req)
    expect(res.statusCode).toBe(400)
  })

  it('未匹配路由放行 next()', async () => {
    const res = await 调用(构造Req('GET', '/deepseek'))
    expect(res.nexted).toBe(true)
  })

  it('写Json→读Json 往返一致', () => {
    写Json(dataDir, 'probe.json', { a: 1 })
    expect(读Json(dataDir, 'probe.json', null)).toEqual({ a: 1 })
    expect(读Json(dataDir, 'missing.json', 'fallback')).toBe('fallback')
  })
})
