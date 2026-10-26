const 渐变起 = [0x5e, 0xea, 0xd4]
const 渐变中 = [0x81, 0x8c, 0xf8]
const 渐变止 = [0xf0, 0xab, 0xfc]

function 插值通道(起点: number, 终点: number, k: number): number {
  return Math.round(起点 + (终点 - 起点) * k)
}

export function 字符渐变色(下标: number, 总长度: number): string {
  if (总长度 <= 1) {
    return `rgb(${渐变起[0]}, ${渐变起[1]}, ${渐变起[2]})`
  }
  const t = Math.min(Math.max(下标 / (总长度 - 1), 0), 1)
  const 通道 =
    t <= 0.5
      ? [0, 1, 2].map((i) => 插值通道(渐变起[i], 渐变中[i], t / 0.5))
      : [0, 1, 2].map((i) => 插值通道(渐变中[i], 渐变止[i], (t - 0.5) / 0.5))
  return `rgb(${通道[0]}, ${通道[1]}, ${通道[2]})`
}
