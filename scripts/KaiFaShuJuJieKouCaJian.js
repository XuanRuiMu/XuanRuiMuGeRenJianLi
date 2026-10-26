import fs from 'node:fs'
import path from 'node:path'

export function 读Json(数据目录, 文件, 兜底) {
  try {
    return JSON.parse(fs.readFileSync(path.join(数据目录, 文件), 'utf-8'))
  } catch {
    return 兜底
  }
}

export function 写Json(数据目录, 文件, data) {
  fs.mkdirSync(数据目录, { recursive: true })
  fs.writeFileSync(path.join(数据目录, 文件), JSON.stringify(data, null, 2))
}

const 访问记录上限 = 5000

export function 校验访问(body) {
  if (typeof body !== 'object' || body === null) return 'invalid_json'
  const { path: 路径, timestamp: 时间戳 } = body
  if (typeof 路径 !== 'string' || 路径.length < 1 || 路径.length > 512) return 'validation_error:path'
  if (!Number.isInteger(时间戳) || 时间戳 <= 0) return 'validation_error:timestamp'
  return null
}

export function 登记访问(状态, 时间戳) {
  状态.events.push(时间戳)
  while (状态.events.length > 访问记录上限) {
    状态.events.shift()
  }
  const 一天前 = 时间戳 - 24 * 60 * 60 * 1000
  return {
    total: 状态.events.length,
    last24h: 状态.events.filter((t) => t > 一天前).length,
    stored: true,
  }
}

export function 创建开发数据处理器({ dataDir: 数据目录, log = () => {} }) {
  const 访问文件 = 'dev-analytics.json'

  function 读Body(请求) {
    return new Promise((resolve, reject) => {
      let 原始 = ''
      请求.on('data', (分块) => {
        原始 += 分块

        if (原始.length > 1024 * 1024) {
          reject(new Error('payload_too_large'))
          请求.destroy()
        }
      })
      请求.on('end', () => {
        try {
          resolve(原始.length > 0 ? JSON.parse(原始) : {})
        } catch {
          reject(new Error('invalid_json'))
        }
      })
      请求.on('error', reject)
    })
  }

  function 回复(响应, status, 载荷) {
    响应.statusCode = status
    响应.setHeader('Content-Type', 'application/json; charset=utf-8')
    响应.end(JSON.stringify(载荷))
  }

  return async function 处理(请求, 响应, 下一个) {
    const 方法 = 请求.method ?? ''
    const 路由 = 请求.url ?? ''

    try {
      if (方法 === 'GET' && 路由.startsWith('/analytics')) {
        const 状态 = 读Json(数据目录, 访问文件, { events: [] })
        const 一天前 = Date.now() - 24 * 60 * 60 * 1000
        const 快照 = {
          total: 状态.events.length,
          last24h: 状态.events.filter((t) => Number(t) > 一天前).length,
          stored: true,
        }
        log(`[dev-api] GET /analytics → total=${快照.total} last24h=${快照.last24h}`)
        回复(响应, 200, 快照)
        return
      }

      if (方法 === 'POST' && 路由.startsWith('/analytics')) {
        const body = await 读Body(请求)
        const 错误 = 校验访问(body)
        if (错误) {
          回复(响应, 错误 === 'invalid_json' ? 400 : 400, { success: false, error: 错误 })
          return
        }
        const 状态 = 读Json(数据目录, 访问文件, { events: [] })
        const 快照 = 登记访问(状态, body.timestamp)
        写Json(数据目录, 访问文件, 状态)
        log(`[dev-api] POST /analytics → total=${快照.total} last24h=${快照.last24h}`)
        回复(响应, 200, { success: true, ...快照 })
        return
      }
    } catch (错误) {
      log(`[dev-api] 处理失败：${错误 instanceof Error ? 错误.message : String(错误)}`)
      if (!响应.writableEnded) {
        回复(响应, 错误.message === 'payload_too_large' ? 413 : 400, {
          success: false,
          error: 错误.message,
        })
      }
      return
    }

    下一个()
  }
}

export default function 开发数据接口插件({ dataDir: 数据目录 } = {}) {
  return {
    name: 'dev-data-api',
    configureServer(服务器) {
      const 处理 = 创建开发数据处理器({
        dataDir: 数据目录 ?? path.resolve(process.cwd(), 'data'),
        log: (...参数) => console.info(...参数),
      })
      服务器.middlewares.use('/api', (请求, 响应, 下一个) => {
        void 处理(请求, 响应, 下一个)
      })
    },
  }
}
