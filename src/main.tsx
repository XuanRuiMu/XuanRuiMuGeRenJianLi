import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Providers } from './app/providers'
import { registerServiceWorker } from './utils/swRegister'
import { initObservability, ringBuffer, initConsoleDashboard } from './observability'

// 根因修复（FP-03）：尽早禁用浏览器滚动恢复，避免硬刷新后停留在非顶部位置。
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

initObservability().catch((err) => {
  ringBuffer.write('error', 1, 'Observability init failed', { error: String(err) })
})

registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </StrictMode>
)

// 调试能力已迁移至 F12 控制台（零 DOM 浮层），消费 ringBuffer 与 useAppStore
initConsoleDashboard()
