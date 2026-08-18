import type { StarryGalaxySceneApi } from '../components/starry-background/StarryGalaxyScene'

// 模块级单例：让平滑滚动组件能把页面滚动值喂给星空场景（驱动内部视差），
// 而无需通过 React props 层层透传。与 lenisInstance.ts 同模式。
export const starrySceneRef: { current: StarryGalaxySceneApi | null } = {
  current: null,
}
