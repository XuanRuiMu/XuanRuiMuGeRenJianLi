import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SkillTestApp from './features/skill-test/SkillTestPage'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Providers } from './app/providers'
import { initObservability, ringBuffer } from './observability'

// 根因修复：尽早禁用浏览器滚动恢复
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

initObservability().catch((err) => {
  ringBuffer.write('error', 1, 'Observability init failed', { error: String(err) })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <Providers>
        <SkillTestApp />
      </Providers>
    </ErrorBoundary>
  </StrictMode>
)
