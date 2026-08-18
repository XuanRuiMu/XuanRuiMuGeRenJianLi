import type { Plugin, HttpServer as ViteHttpServer } from 'vite'
import type { Server as NodeHttpServer } from 'node:http'
import type { Duplex } from 'node:stream'
import { createHash } from 'node:crypto'
import { decode } from '@msgpack/msgpack'

interface WsLogMessage {
  type: 'log' | 'ping'
  data?: Uint8Array
}

interface ServerLogEntry {
  timestamp: number
  level: string
  category: number
  spanId: number
  message: string
  context?: Record<string, unknown>
  source?: string
}

const CATEGORY_NAMES: Record<number, string> = {
  0: 'Render',
  1: 'Runtime',
  2: 'Network',
  3: 'WebGL',
  4: 'Audio',
  5: 'Unknown',
  99: 'Other',
}

const LEVEL_COLORS: Record<string, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[1;31m',
}

const RESET = '\x1b[0m'
const GRAY = '\x1b[90m'

const WS_MAGIC = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'

const OP_TEXT = 0x1
const OP_BINARY = 0x2
const OP_CLOSE = 0x8
const OP_PING = 0x9
const OP_PONG = 0xa

interface WsClient {
  socket: Duplex
  buffer: Buffer
}

/**
 * 零依赖最小化 RFC6455 WebSocket 服务端。
 * 仅实现本系统需要的子集：二进制帧收发 / ping-pong / close，不处理分片（客户端单帧发送）。
 * 挂载在 Vite httpServer 的 upgrade 事件上，仅接管 /__observability 路径，不影响 HMR。
 */
class MinimalWsServer {
  private clients = new Set<WsClient>()
  onMessage: ((client: WsClient, payload: Buffer) => void) | null = null

  attach(httpServer: ViteHttpServer): void {
    const server = httpServer as NodeHttpServer
    server.on('upgrade', (req, socket, head) => {
      let url: URL
      try {
        url = new URL(req.url ?? '', 'http://example.com')
      } catch {
        return
      }
      if (url.pathname !== '/__observability') return

      const key = req.headers['sec-websocket-key']
      if (typeof key !== 'string' || key === '') {
        socket.destroy()
        return
      }

      const accept = createHash('sha1')
        .update(key + WS_MAGIC)
        .digest('base64')
      socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\n' +
          'Connection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
      )

      const client: WsClient = { socket, buffer: head.length > 0 ? Buffer.from(head) : Buffer.alloc(0) }
      this.clients.add(client)

      socket.on('data', (chunk: Buffer) => {
        client.buffer = Buffer.concat([client.buffer, chunk])
        this.consume(client)
      })

      socket.on('close', () => {
        this.clients.delete(client)
      })

      socket.on('error', () => {
        this.clients.delete(client)
      })
    })
  }

  private consume(client: WsClient): void {
    for (;;) {
      const buf = client.buffer
      if (buf.length < 2) return

      const fin = (buf[0] & 0x80) !== 0
      const opcode = buf[0] & 0x0f
      const masked = (buf[1] & 0x80) !== 0
      let len = buf[1] & 0x7f
      let offset = 2

      if (len === 126) {
        if (buf.length < 4) return
        len = buf.readUInt16BE(2)
        offset = 4
      } else if (len === 127) {
        if (buf.length < 10) return
        const len64 = buf.readBigUInt64BE(2)
        if (len64 > BigInt(Number.MAX_SAFE_INTEGER)) return this.close(client, 1009)
        len = Number(len64)
        offset = 10
      }

      let maskKey: Buffer | null = null
      if (masked) {
        if (buf.length < offset + 4) return
        maskKey = buf.subarray(offset, offset + 4)
        offset += 4
      }

      if (buf.length < offset + len) return

      const payload =
        masked && maskKey
          ? this.unmask(buf.subarray(offset, offset + len), maskKey)
          : buf.subarray(offset, offset + len)
      client.buffer = buf.subarray(offset + len)

      if (!fin) {
        this.close(client, 1003)
        return
      }

      switch (opcode) {
        case OP_BINARY:
          this.onMessage?.(client, payload)
          break
        case OP_TEXT:
          this.onMessage?.(client, payload)
          break
        case OP_PING:
          this.sendFrame(client, OP_PONG, payload)
          break
        case OP_PONG:
          break
        case OP_CLOSE: {
          const code = payload.length >= 2 ? payload.readUInt16BE(0) : 1000
          this.sendFrame(client, OP_CLOSE, payload)
          socketClose(client, code)
          break
        }
        default:
          this.close(client, 1003)
          return
      }
    }
  }

  private unmask(payload: Buffer, maskKey: Buffer): Buffer {
    const out = Buffer.allocUnsafe(payload.length)
    for (let i = 0; i < payload.length; i++) {
      out[i] = payload[i] ^ maskKey[i & 3]
    }
    return out
  }

  private sendFrame(client: WsClient, opcode: number, payload: Buffer): void {
    const len = payload.length
    let header: Buffer
    if (len < 126) {
      header = Buffer.from([0x80 | opcode, len])
    } else if (len < 65536) {
      header = Buffer.allocUnsafe(4)
      header[0] = 0x80 | opcode
      header[1] = 126
      header.writeUInt16BE(len, 2)
    } else {
      header = Buffer.allocUnsafe(10)
      header[0] = 0x80 | opcode
      header[1] = 127
      header.writeBigUInt64BE(BigInt(len), 2)
    }
    client.socket.write(Buffer.concat([header, payload]))
  }

  close(client: WsClient, code: number): void {
    const payload = Buffer.allocUnsafe(2)
    payload.writeUInt16BE(code, 0)
    this.sendFrame(client, OP_CLOSE, payload)
    socketClose(client, code)
  }
}

function socketClose(client: WsClient, code: number): void {
  if (client.socket.destroyed) return
  client.socket.end()
  if (code === 1002 || code === 1003) client.socket.destroy()
}

function formatTimestamp(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  const mmm = String(d.getMilliseconds()).padStart(3, '0')
  return `${hh}:${mm}:${ss}.${mmm}`
}

function getFilteredLevels(): Set<string> | null {
  const filter = process.env.VITE_LOG_FILTER
  if (!filter) return null
  return new Set(filter.split(',').map((s) => s.trim().toLowerCase()))
}

export function observabilityPlugin(): Plugin {
  const filteredLevels = getFilteredLevels()
  const wsServer = new MinimalWsServer()

  wsServer.onMessage = (_, payload) => {
    try {
      const msg = decode(new Uint8Array(payload)) as WsLogMessage

      if (msg.type === 'ping') {
        return
      }

      if (msg.type !== 'log' || !msg.data) return

      const entry = decode(msg.data as Uint8Array) as ServerLogEntry

      if (filteredLevels && !filteredLevels.has(entry.level)) return

      const color = LEVEL_COLORS[entry.level] ?? RESET
      const levelTag = `[${entry.level.toUpperCase()}]`
      const catName = CATEGORY_NAMES[entry.category] ?? `Cat${entry.category}`
      const ts = formatTimestamp(entry.timestamp)

      console.log(`${GRAY}${ts}${RESET}`)
      console.log(`  ${color}${levelTag.padEnd(7)}${RESET} ${color}[${catName.padEnd(8)}]${RESET} ${entry.message}`)

      if (entry.source) {
        console.log(`  ${GRAY}│ ${entry.source}${RESET}`)
      }

      if (entry.context && Object.keys(entry.context).length > 0) {
        console.log(`${GRAY}  ${JSON.stringify(entry.context, null, 2)}${RESET}`)
      }
    } catch {
      // 忽略畸形消息
    }
  }

  return {
    name: 'vite-plugin-observability',
    configureServer(server) {
      if (server.httpServer) {
        wsServer.attach(server.httpServer)
      }
    },
  }
}
