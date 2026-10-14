import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './入口样式.css'
import App from './app/YingYong'
import { CuoWuBianJie } from './components/错误边界'
import { Providers } from './app/TiGongQi'
import { 注册服务工作线程 } from './utils/注册服务工作线程'
import { 初始化可观测性, 环形缓冲实例, 初始化控制台仪表盘 } from './observability'

// 根因修复（FP-03）：尽早禁用浏览器滚动恢复，避免硬刷新后停留在非顶部位置。
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

初始化可观测性().catch((err) => {
  环形缓冲实例.write('error', 1, 'Observability init failed', { error: String(err) })
})

注册服务工作线程()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CuoWuBianJie>
      <Providers>
        <App />
      </Providers>
    </CuoWuBianJie>
  </StrictMode>
)

// 调试能力已迁移至 F12 控制台（零 DOM 浮层），消费 环形缓冲实例 与 useYingYongZhuangTai
初始化控制台仪表盘()
