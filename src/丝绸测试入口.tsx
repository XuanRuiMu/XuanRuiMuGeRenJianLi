import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './入口样式.css'
import SkillTestApp from './功能/丝绸测试/SiChouCeShiYe'
import { CuoWuBianJie } from './组件/错误边界'
import { TiGongQi } from './应用/TiGongQi'
import { 初始化可观测性, 环形缓冲实例 } from './可观测'

if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

初始化可观测性().catch((错误) => {
  环形缓冲实例.写入('error', 1, 'Observability init failed', { error: String(错误) })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CuoWuBianJie>
      <TiGongQi>
        <SkillTestApp />
      </TiGongQi>
    </CuoWuBianJie>
  </StrictMode>
)
