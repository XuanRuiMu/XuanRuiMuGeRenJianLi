import type Lenis from 'lenis'

// 模块级单例：供命令面板 / 锚点跳转等非 React 组件访问当前 Lenis 实例。
// 在 SmoothScroll 的 LenisBridge 中写入，卸载时置空。
export const lenisRef: { current: Lenis | null } = { current: null }
