export type { LogLevel, LogEntry, LogCategory } from './ringBuffer'
export type { Span } from './tracer'
export { RingBuffer } from './ringBuffer'
export { Tracer, withSpan } from './tracer'
export { LogStore } from './persistence'
export { WsTransport } from './wsTransport'
export { BeaconTransport } from './beaconTransport'
export { RenderProbe } from './r3fProbe'
export { initConsoleDashboard } from './consoleDashboard'
export { installGlobalErrorHandlers } from './globalErrorHandlers'
import { ringBuffer, tracer, logStore } from './globals'
import { WsTransport } from './wsTransport'
import { BeaconTransport } from './beaconTransport'
import { installGlobalErrorHandlers } from './globalErrorHandlers'
export { ringBuffer, tracer, logStore }

export async function initObservability(): Promise<void> {
  installGlobalErrorHandlers()
  await logStore.open()

  if (import.meta.env.DEV) {
    const ws = new WsTransport(ringBuffer)
    ws.connect()
  }

  if (import.meta.env.PROD) {
    const beacon = new BeaconTransport(ringBuffer, logStore)
    beacon.start()
  }

  ringBuffer.write('info', 1, 'Observability initialized', {
    mode: import.meta.env.DEV ? 'dev' : 'prod',
  })
}
