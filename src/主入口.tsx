import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './入口样式.css'
import YingYongRuKou from './应用/YingYong'
import { CuoWuBianJie } from './组件/错误边界'
import { TiGongQi } from './应用/TiGongQi'
import { 注册服务工作线程 } from './工具/注册服务工作线程'
import { 初始化可观测性, 环形缓冲实例, 初始化控制台仪表盘 } from './可观测'

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

初始化可观测性().catch((错误) => {
  环形缓冲实例.写入('error', 1, 'Observability init failed', { error: String(错误) })
})

注册服务工作线程()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CuoWuBianJie>
      <TiGongQi>
        <YingYongRuKou />
      </TiGongQi>
    </CuoWuBianJie>
  </StrictMode>
)

初始化控制台仪表盘()
