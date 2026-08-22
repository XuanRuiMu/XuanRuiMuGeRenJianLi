/**
 * 开发环境数据接口（Vite 插件）。
 *
 * 根因背景：/api/contact、/api/analytics 的生产实现是 Cloudflare Pages Functions
 * （functions/api/*.ts，依赖 KV 绑定），本地 `npm run dev` 下这些路径无人应答，
 * 留言表单必然报错、访问计数无从谈起——表单沦为摆设。本插件在 dev server 内提供
 * 同名路由的文件落盘实现：数据存在项目 data/ 目录（用户要求"数据存项目文件夹内"），
 * 生产构建不受影响（插件仅在 configureServer 生效，functions/ 契约保持不变）。
 */
import fs from 'node:fs'
import path from 'node:path'

const 邮箱正则 = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** 读取 JSON 文件；不存在或损坏时返回 fallback（dev 数据损坏不应打崩 dev server） */
export function 读Json(dataDir, file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf-8'))
  } catch {
    return fallback
  }
}

/** 原子性不苛求（dev 场景），但保证目录存在后再写 */
export function 写Json(dataDir, file, data) {
  fs.mkdirSync(dataDir, { recursive: true })
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2))
}

/** 访问事件上限：防止 events 数组无限膨胀（超出即淘汰最旧记录） */
const 访问记录上限 = 5000

/** 留言记录上限：同上 */
const 留言上限 = 1000

/**
 * 校验留言载荷（与 functions/api/contact.ts 的 zod schema 对齐的最小实现）：
 * name 1-64、合法 email ≤128、message 1-2000、website 必须为空（蜜罐字段）。
 * 返回 null=合法，否则为错误字符串。
 */
export function 校验留言(body) {
  if (typeof body !== 'object' || body === null) return 'invalid_json'
  const { name, email, message, website } = body
  if (typeof name !== 'string' || name.length < 1 || name.length > 64) return 'validation_error:name'
  if (typeof email !== 'string' || email.length > 128 || !邮箱正则.test(email)) return 'validation_error:email'
  if (typeof message !== 'string' || message.length < 1 || message.length > 2000)
    return 'validation_error:message'
  if (website !== undefined && website !== '' && website !== null) return 'ignored:honeypot'
  return null
}

/** 校验访问上报载荷：path 1-512、timestamp 正整数（referrer/userAgent 宽松截断即可） */
export function 校验访问(body) {
  if (typeof body !== 'object' || body === null) return 'invalid_json'
  const { path: 路径, timestamp } = body
  if (typeof 路径 !== 'string' || 路径.length < 1 || 路径.length > 512) return 'validation_error:path'
  if (!Number.isInteger(timestamp) || timestamp <= 0) return 'validation_error:timestamp'
  return null
}

/** 纯逻辑：登记一次访问并返回统计快照（独立导出以便直接单测） */
export function 登记访问(状态, timestamp) {
  状态.events.push(timestamp)
  while (状态.events.length > 访问记录上限) {
    状态.events.shift()
  }
  const 一天前 = timestamp - 24 * 60 * 60 * 1000
  return {
    total: 状态.events.length,
    last24h: 状态.events.filter((t) => t > 一天前).length,
    stored: true,
  }
}

/**
 * 请求处理核心（与 Vite 解耦，便于单测）：
 * - GET  /analytics → 统计快照
 * - POST /analytics → 登记 + 返回新快照
 * - POST /contact   → 校验 + 落盘留言
 * 其余一律 next()（含 /deepseek 代理）。
 */
export function createDevDataHandler({ dataDir, log = () => {} }) {
  const 消息文件 = 'dev-messages.json'
  const 访问文件 = 'dev-analytics.json'

  function 读Body(req) {
    return new Promise((resolve, reject) => {
      let raw = ''
      req.on('data', (chunk) => {
        raw += chunk
        // 防御：请求体超 1MB 直接拒绝，避免恶意大包拖垮 dev server
        if (raw.length > 1024 * 1024) {
          reject(new Error('payload_too_large'))
          req.destroy()
        }
      })
      req.on('end', () => {
        try {
          resolve(raw.length > 0 ? JSON.parse(raw) : {})
        } catch {
          reject(new Error('invalid_json'))
        }
      })
      req.on('error', reject)
    })
  }

  function 回复(res, status, payload) {
    res.statusCode = status
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(payload))
  }

  return async function 处理(req, res, next) {
    const 方法 = req.method ?? ''
    const 路由 = req.url ?? ''

    try {
      if (方法 === 'GET' && 路由.startsWith('/analytics')) {
        const 状态 = 读Json(dataDir, 访问文件, { events: [] })
        const 一天前 = Date.now() - 24 * 60 * 60 * 1000
        const 快照 = {
          total: 状态.events.length,
          last24h: 状态.events.filter((t) => Number(t) > 一天前).length,
          stored: true,
        }
        log(`[dev-api] GET /analytics → total=${快照.total} last24h=${快照.last24h}`)
        回复(res, 200, 快照)
        return
      }

      if (方法 === 'POST' && 路由.startsWith('/analytics')) {
        const body = await 读Body(req)
        const 错误 = 校验访问(body)
        if (错误) {
          回复(res, 错误 === 'invalid_json' ? 400 : 400, { success: false, error: 错误 })
          return
        }
        const 状态 = 读Json(dataDir, 访问文件, { events: [] })
        const 快照 = 登记访问(状态, body.timestamp)
        写Json(dataDir, 访问文件, 状态)
        log(`[dev-api] POST /analytics → total=${快照.total} last24h=${快照.last24h}`)
        回复(res, 200, { success: true, ...快照 })
        return
      }

      if (方法 === 'POST' && 路由.startsWith('/contact')) {
        const body = await 读Body(req)

        // 蜜罐命中：机器人流量静默吞掉（对齐 functions 版行为）
        if (校验留言(body) === 'ignored:honeypot') {
          回复(res, 200, { success: true, mode: 'ignored' })
          return
        }
        const 错误 = 校验留言(body)
        if (错误) {
          回复(res, 400, { success: false, error: 错误 })
          return
        }

        const 列表 = 读Json(dataDir, 消息文件, [])
        列表.push({
          name: body.name,
          email: body.email,
          message: body.message,
          receivedAt: new Date().toISOString(),
        })
        while (列表.length > 留言上限) {
          列表.shift()
        }
        写Json(dataDir, 消息文件, 列表)
        log(
          `[dev-api] 新留言 #${列表.length} 来自 ${body.name} <${body.email}>：${body.message.slice(0, 40)}`
        )
        回复(res, 200, { success: true, mode: 'queued' })
        return
      }
    } catch (err) {
      log(`[dev-api] 处理失败：${err instanceof Error ? err.message : String(err)}`)
      if (!res.writableEnded) {
        回复(res, err.message === 'payload_too_large' ? 413 : 400, {
          success: false,
          error: err.message,
        })
      }
      return
    }

    next()
  }
}

/** Vite 插件壳：仅开发服务器挂载上述处理器（生产构建零副作用） */
export default function 开发数据接口插件({ dataDir } = {}) {
  return {
    name: 'dev-data-api',
    configureServer(server) {
      const 处理 = createDevDataHandler({
        dataDir: dataDir ?? path.resolve(process.cwd(), 'data'),
        log: (...args) => console.info(...args),
      })
      server.middlewares.use('/api', (req, res, next) => {
        void 处理(req, res, next)
      })
    },
  }
}
