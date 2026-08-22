import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  createDevDataHandler,
  校验留言,
  校验访问,
  登记访问,
  读Json,
  写Json,
} from './dev-api-plugin.js'

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
  it('合法留言返回 null', () => {
    expect(校验留言({ name: '张三', email: 'a@b.com', message: '你好', website: '' })).toBeNull()
  })

  it('非法邮箱/空名/超长留言被拦截', () => {
    expect(校验留言({ name: '', email: 'a@b.com', message: '你好' })).toBe('validation_error:name')
    expect(校验留言({ name: '张三', email: 'not-email', message: '你好' })).toBe('validation_error:email')
    expect(校验留言({ name: '张三', email: 'a@b.com', message: '' })).toBe('validation_error:message')
    expect(校验留言({ name: '张三', email: 'a@b.com', message: 'x'.repeat(2001) })).toBe(
      'validation_error:message'
    )
  })

  it('蜜罐字段命中返回 ignored（机器人静默吞掉）', () => {
    expect(校验留言({ name: '张三', email: 'a@b.com', message: '你好', website: 'spam' })).toBe(
      'ignored:honeypot'
    )
  })

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

  it('POST /contact 合法留言落盘并返回 queued', async () => {
    const res = await 调用(
      构造Req('POST', '/contact', { name: '测试', email: 't@t.com', message: '留言内容' })
    )
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ success: true, mode: 'queued' })
    const 留言 = 读Json(dataDir, 'dev-messages.json', [])
    expect(留言).toHaveLength(1)
    expect(log).toHaveBeenCalledWith(expect.stringContaining('新留言 #1'))
  })

  it('POST /contact 蜜罐命中返回 ignored 且不落盘', async () => {
    const res = await 调用(
      构造Req('POST', '/contact', { name: 'bot', email: 'b@b.com', message: 'x', website: 'http://spam' })
    )
    expect(res.body.mode).toBe('ignored')
    expect(读Json(dataDir, 'dev-messages.json', [])).toHaveLength(0)
  })

  it('POST /contact 非法载荷返回 400', async () => {
    const res = await 调用(构造Req('POST', '/contact', { name: '', email: 'bad', message: '' }))
    expect(res.statusCode).toBe(400)
    expect(res.body.success).toBe(false)
  })

  it('损坏的 JSON 请求体返回 400 而非崩溃', async () => {
    const req = 构造Req('POST', '/contact')
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
