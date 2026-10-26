import type { Plugin, HttpServer as ViteHttpServer } from 'vite'
import type { Server as NodeHttpServer } from 'node:http'
import type { Duplex } from 'node:stream'
import { createHash } from 'node:crypto'
import { decode } from '@msgpack/msgpack'

interface WebSocket日志消息 {
  type: 'log' | 'ping'
  data?: Uint8Array
}

interface 服务端日志条目 {
  timestamp: number
  level: string
  category: number
  spanId: number
  message: string
  context?: Record<string, unknown>
  source?: string
}

const 分类名表: Record<number, string> = {
  0: 'Render',
  1: 'Runtime',
  2: 'Network',
  3: 'WebGL',
  4: 'Audio',
  5: 'Unknown',
  99: 'Other',
}

const 级别颜色表: Record<string, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[1;31m',
}

const 重置转义 = '\x1b[0m'
const 灰色转义 = '\x1b[90m'

const WebSocket魔数 = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

const 操作码文本 = 0x1
const 操作码二进制 = 0x2
const 操作码关闭 = 0x8
const 操作码心跳 = 0x9
const 操作码心跳响应 = 0xa

interface 套接字客户端 {
  socket: Duplex
  buffer: Buffer
}

class 最小套接字服务 {
  private 客户端表 = new Set<套接字客户端>()
  消息处理: ((客户端: 套接字客户端, 载荷: Buffer) => void) | null = null

  挂载(HTTP服务: ViteHttpServer): void {
    const 服务器 = HTTP服务 as NodeHttpServer
    服务器.on('upgrade', (请求, 套接字, 头部) => {
      let 地址: URL
      try {
        地址 = new URL(请求.url ?? '', 'http://example.com')
      } catch {
        return
      }
      if (地址.pathname !== '/__observability') return

      const key = 请求.headers['sec-websocket-key']
      if (typeof key !== 'string' || key === '') {
        套接字.destroy()
        return
      }

      const accept = createHash('sha1')
        .update(key + WebSocket魔数)
        .digest('base64')
      套接字.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
      )

      const 客户端: 套接字客户端 = { socket: 套接字, buffer: 头部.length > 0 ? Buffer.from(头部) : Buffer.alloc(0) }
      this.客户端表.add(客户端)

      套接字.on('data', (分块: Buffer) => {
        客户端.buffer = Buffer.concat([客户端.buffer, 分块])
        this.消费(客户端)
      })

      套接字.on('close', () => {
        this.客户端表.delete(客户端)
      })

      套接字.on('error', () => {
        this.客户端表.delete(客户端)
      })
    })
  }

  private 消费(客户端: 套接字客户端): void {
    for (;;) {
      const 缓冲区 = 客户端.buffer
      if (缓冲区.length < 2) return

      const fin = (缓冲区[0] & 0x80) !== 0
      const 操作码 = 缓冲区[0] & 0x0f
      const 已遮罩 = (缓冲区[1] & 0x80) !== 0
      let 长度 = 缓冲区[1] & 0x7f
      let 偏移 = 2

      if (长度 === 126) {
        if (缓冲区.length < 4) return
        长度 = 缓冲区.readUInt16BE(2)
        偏移 = 4
      } else if (长度 === 127) {
        if (缓冲区.length < 10) return
        const 载荷长度 = 缓冲区.readBigUInt64BE(2)
        if (载荷长度 > BigInt(Number.MAX_SAFE_INTEGER)) return this.关闭(客户端, 1009)
        长度 = Number(载荷长度)
        偏移 = 10
      }

      let 遮罩键: Buffer | null = null
      if (已遮罩) {
        if (缓冲区.length < 偏移 + 4) return
        遮罩键 = 缓冲区.subarray(偏移, 偏移 + 4)
        偏移 += 4
      }

      if (缓冲区.length < 偏移 + 长度) return

      const 载荷 =
        已遮罩 && 遮罩键
          ? this.解除遮罩(缓冲区.subarray(偏移, 偏移 + 长度), 遮罩键)
          : 缓冲区.subarray(偏移, 偏移 + 长度)
      客户端.buffer = 缓冲区.subarray(偏移 + 长度)

      if (!fin) {
        this.关闭(客户端, 1003)
        return
      }

      switch (操作码) {
        case 操作码二进制:
          this.消息处理?.(客户端, 载荷)
          break
        case 操作码文本:
          this.消息处理?.(客户端, 载荷)
          break
        case 操作码心跳:
          this.发送帧(客户端, 操作码心跳响应, 载荷)
          break
        case 操作码心跳响应:
          break
        case 操作码关闭: {
          const 代码 = 载荷.length >= 2 ? 载荷.readUInt16BE(0) : 1000
          this.发送帧(客户端, 操作码关闭, 载荷)
          套接字关闭(客户端, 代码)
          break
        }
        default:
          this.关闭(客户端, 1003)
          return
      }
    }
  }

  private 解除遮罩(载荷: Buffer, 遮罩键: Buffer): Buffer {
    const 输出 = Buffer.allocUnsafe(载荷.length)
    for (let i = 0; i < 载荷.length; i++) {
      输出[i] = 载荷[i] ^ 遮罩键[i & 3]
    }
    return 输出
  }

  private 发送帧(客户端: 套接字客户端, 操作码: number, 载荷: Buffer): void {
    const 长度 = 载荷.length
    let 响应头: Buffer
    if (长度 < 126) {
      响应头 = Buffer.from([0x80 | 操作码, 长度])
    } else if (长度 < 65536) {
      响应头 = Buffer.allocUnsafe(4)
      响应头[0] = 0x80 | 操作码
      响应头[1] = 126
      响应头.writeUInt16BE(长度, 2)
    } else {
      响应头 = Buffer.allocUnsafe(10)
      响应头[0] = 0x80 | 操作码
      响应头[1] = 127
      响应头.writeBigUInt64BE(BigInt(长度), 2)
    }
    客户端.socket.write(Buffer.concat([响应头, 载荷]))
  }

  关闭(客户端: 套接字客户端, 代码: number): void {
    const 载荷 = Buffer.allocUnsafe(2)
    载荷.writeUInt16BE(代码, 0)
    this.发送帧(客户端, 操作码关闭, 载荷)
    套接字关闭(客户端, 代码)
  }
}

function 套接字关闭(客户端: 套接字客户端, 代码: number): void {
  if (客户端.socket.destroyed) return
  客户端.socket.end()
  if (代码 === 1002 || 代码 === 1003) 客户端.socket.destroy()
}

function 格式化时间戳(时间戳: number): string {
  const d = new Date(时间戳)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const mmm = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${mmm}`
}

function 获取过滤后级别(): Set<string> | null {
  const 过滤 = process.env.VITE_LOG_FILTER
  if (!过滤) return null
  return new Set(过滤.split(',').map((s) => s.trim().toLowerCase()))
}

export function 可观测性插件(): Plugin {
  const 过滤后级别表 = 获取过滤后级别()
  const 套接字服务 = new 最小套接字服务()

  套接字服务.消息处理 = (_, 载荷) => {
    try {
      const 消息 = decode(new Uint8Array(载荷)) as WebSocket日志消息

      if (消息.type === 'ping') {
        return
      }

      if (消息.type !== 'log' || !消息.data) return

      const 条目 = decode(消息.data as Uint8Array) as 服务端日志条目

      if (过滤后级别表 && !过滤后级别表.has(条目.level)) return

      const 颜色 = 级别颜色表[条目.level] ?? 重置转义
      const 级别标签 = `[${条目.level.toUpperCase()}]`
      const 分类名 = 分类名表[条目.category] ?? `Cat${条目.category}`
      const 时间戳 = 格式化时间戳(条目.timestamp)

      console.info(`${灰色转义}${时间戳}${重置转义}`)
      console.info(`  ${颜色}${级别标签.padEnd(7)}${重置转义} ${颜色}[${分类名.padEnd(8)}]${重置转义} ${条目.message}`)

      if (条目.source) {
        console.info(`  ${灰色转义}│ ${条目.source}${重置转义}`)
      }

      if (条目.context && Object.keys(条目.context).length > 0) {
        console.info(`${灰色转义}  ${JSON.stringify(条目.context, null, 2)}${重置转义}`)
      }
    } catch {}
  }

  return {
    name: 'vite-plugin-observability',
    configureServer(服务器) {
      if (服务器.httpServer) {
        套接字服务.挂载(服务器.httpServer)
      }
    },
  }
}
