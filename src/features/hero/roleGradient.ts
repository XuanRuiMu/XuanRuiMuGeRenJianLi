/**
 * 打字机渐变定色（纯函数，独立于组件以满足 fast-refresh 单组件导出约束）。
 * 渐变三锚点与旧 bg-gradient-to-r 视觉一致：teal → indigo → fuchsia。
 */
const 渐变起 = [0x5e, 0xea, 0xd4]
const 渐变中 = [0x81, 0x8c, 0xf8]
const 渐变止 = [0xf0, 0xab, 0xfc]

function 插值通道(from: number, to: number, k: number): number {
  return Math.round(from + (to - from) * k)
}

/**
 * 按「完整词长度」为每个字符索引预分配最终颜色。
 * 根因修复：旧实现把 bg-gradient 挂在随打字增长的整段 span 上，渐变随宽度拉伸，
 * 已打出的字符颜色会随进度漂移；改为逐字定色后，任意进度下已显字符颜色恒定。
 */
export function 字符渐变色(index: number, totalLength: number): string {
  if (totalLength <= 1) {
    return `rgb(${渐变起[0]}, ${渐变起[1]}, ${渐变起[2]})`
  }
  const t = Math.min(Math.max(index / (totalLength - 1), 0), 1)
  const channels =
    t <= 0.5
      ? [0, 1, 2].map((i) => 插值通道(渐变起[i], 渐变中[i], t / 0.5))
      : [0, 1, 2].map((i) => 插值通道(渐变中[i], 渐变止[i], (t - 0.5) / 0.5))
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`
}
