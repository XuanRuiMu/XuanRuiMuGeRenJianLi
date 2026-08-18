import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RingBuffer, LogCategory } from './ringBuffer'
import { Tracer } from './tracer'
import { LogStore } from './persistence'
import { WsTransport } from './wsTransport'
import { BeaconTransport } from './beaconTransport'

if (typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = () =>
    `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
    }) as `${string}-${string}-${string}-${string}-${string}`
}

describe('LogStore', () => {
  let store: LogStore

  beforeEach(async () => {
    store = new LogStore('test-observability')
    await store.open()
  })

  afterEach(() => {
    store.close()
    const req = indexedDB.deleteDatabase('test-observability')
    req.onsuccess = () => {}
  })

  it('opens database', async () => {
    const s = new LogStore('test-open-db')
    await s.open()
    const stats = await s.getStats()
    expect(stats).toHaveProperty('entryCount')
    expect(stats).toHaveProperty('spanCount')
    expect(stats).toHaveProperty('dbSize')
    s.close()
    indexedDB.deleteDatabase('test-open-db')
  })

  it('writes and reads entries', async () => {
    const ring = new RingBuffer(4096)
    ring.write('info', LogCategory.Runtime, 'hello persistence')
    ring.write('error', LogCategory.Network, 'network error', { code: 500 })
    const entries = ring.read()
    expect(entries).toHaveLength(2)

    await store.writeEntries(entries)
    const read = await store.readEntries(10)
    expect(read).toHaveLength(2)
    expect(read.some((e) => e.message === 'hello persistence')).toBe(true)
    expect(read.some((e) => e.message === 'network error')).toBe(true)
  })

  it('writes and reads spans', async () => {
    const ring = new RingBuffer(4096)
    const tracer = new Tracer(ring)
    const sid1 = tracer.startSpan('span-a')
    const sid2 = tracer.startSpan('span-b', sid1)
    tracer.endSpan(sid2)
    tracer.endSpan(sid1)
    const spans = tracer.getSpans()
    expect(spans).toHaveLength(2)

    await store.writeSpans(spans)
    const read = await store.readSpans(10)
    expect(read).toHaveLength(2)
    expect(read.some((s) => s.name === 'span-a')).toBe(true)
    expect(read.some((s) => s.name === 'span-b')).toBe(true)
  })

  it('queries by level', async () => {
    const ring = new RingBuffer(4096)
    ring.write('info', LogCategory.Runtime, 'info msg')
    ring.write('error', LogCategory.Runtime, 'error msg')
    ring.write('warn', LogCategory.Runtime, 'warn msg')
    ring.write('error', LogCategory.Runtime, 'another error')
    const entries = ring.read()
    await store.writeEntries(entries)

    const errors = await store.queryByLevel('error')
    expect(errors).toHaveLength(2)

    const infos = await store.queryByLevel('info')
    expect(infos).toHaveLength(1)
    expect(infos[0].message).toBe('info msg')
  })

  it('queries by spanId', async () => {
    const ring = new RingBuffer(4096)
    const tracer = new Tracer(ring)
    const sid = tracer.startSpan('test-span')
    ring.write('info', LogCategory.Runtime, 'span log', { spanId: sid }, sid)
    const entries = ring.read()
    await store.writeEntries(entries)

    const found = await store.queryBySpanId(sid)
    expect(found.length).toBeGreaterThanOrEqual(1)
    found.forEach((e) => expect(e.spanId).toBe(sid))
  })

  it('marks and retrieves unreported entries', async () => {
    const ring = new RingBuffer(4096)
    ring.write('info', LogCategory.Runtime, 'reported-msg')
    ring.write('info', LogCategory.Runtime, 'unreported-msg')
    const entries = ring.read()
    expect(entries).toHaveLength(2)
    await store.writeEntries(entries)

    const before = await store.getUnreportedEntries()
    expect(before).toHaveLength(2)

    const ids = before.map((e) => (e as unknown as { id: string }).id)
    expect(ids).toHaveLength(2)

    await store.markReported([ids[0]])
    await new Promise((r) => setTimeout(r, 10))

    const after = await store.getUnreportedEntries()
    expect(after).toHaveLength(1)
  })

  it('getStats returns counts', async () => {
    const ring = new RingBuffer(4096)
    ring.write('info', LogCategory.Runtime, 'stat entry')
    const entries = ring.read()
    await store.writeEntries(entries)

    const stats = await store.getStats()
    expect(stats.entryCount).toBeGreaterThanOrEqual(1)
    expect(stats.spanCount).toBeGreaterThanOrEqual(0)
    expect(stats.dbSize).toBeGreaterThan(0)
  })
})

describe('WsTransport', () => {
  let ring: RingBuffer
  let transport: WsTransport
  let mockWebSocketInstance: {
    onopen: (() => void) | null
    onclose: ((e: Event) => void) | null
    onerror: (() => void) | null
    send: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    readyState: number
  }

  beforeEach(() => {
    ring = new RingBuffer(4096)

    mockWebSocketInstance = {
      onopen: null,
      onclose: null,
      onerror: null,
      send: vi.fn(),
      close: vi.fn(),
      readyState: 1,
    }

    const MockWebSocket = vi.fn() as ReturnType<typeof vi.fn>
    MockWebSocket.mockImplementation(() => mockWebSocketInstance)
    Object.assign(MockWebSocket, { CONNECTING: 0, OPEN: 1, CLOSING: 2, CLOSED: 3 })

    vi.stubGlobal('location', { protocol: 'http:', hostname: 'localhost', port: '5180' })
    vi.stubGlobal('WebSocket', MockWebSocket)

    transport = new WsTransport(ring)
  })

  afterEach(() => {
    transport.disconnect()
    vi.unstubAllGlobals()
  })

  it('connects and disconnects', async () => {
    const connectPromise = transport.connect()
    mockWebSocketInstance.onopen!()
    await connectPromise
    expect(transport.connected).toBe(true)

    transport.disconnect()
    expect(transport.connected).toBe(false)
  })

  it('sends log entries when subscribed', async () => {
    const connectPromise = transport.connect()
    mockWebSocketInstance.onopen!()
    await connectPromise

    ring.write('info', LogCategory.Runtime, 'ws test msg')
    expect(mockWebSocketInstance.send).toHaveBeenCalled()
  })
})

describe('BeaconTransport', () => {
  let ring: RingBuffer
  let store: LogStore
  let transport: BeaconTransport
  let sendBeaconFn: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    ring = new RingBuffer(4096)
    store = new LogStore('test-beacon-db')
    await store.open()
    sendBeaconFn = vi.fn(() => true)
    vi.stubGlobal('navigator', { sendBeacon: sendBeaconFn })
    transport = new BeaconTransport(ring, store, '/test/logs')
  })

  afterEach(async () => {
    transport.stop()
    store.close()
    vi.unstubAllGlobals()
    indexedDB.deleteDatabase('test-beacon-db')
  })

  it('flushes unreported entries', async () => {
    ring.write('info', LogCategory.Runtime, 'beacon test')
    const entries = ring.read()
    await store.writeEntries(entries)

    await transport.flush()
    expect(sendBeaconFn).toHaveBeenCalled()
    const [url, blob] = sendBeaconFn.mock.calls[0]
    expect(url).toBe('/test/logs')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/msgpack')
  })
})
