import type { 星空星系场景接口 } from '../components/starry-background/星空星系场景'

// 模块级单例：让平滑滚动组件能把页面滚动值喂给星空场景（驱动内部视差），
// 而无需通过 React props 层层透传。与 平滑滚动实例.ts 同模式。
export const 星空场景引用: { current: 星空星系场景接口 | null } = {
  current: null,
}
