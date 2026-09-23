export const 滚动联动系数 = 0.5
export const 滚动增量上限 = 80
export const 滚动暂停时长 = 1000
export interface 跑马灯配置 {
  滚动暂停时长: number
}

export const 默认跑马灯配置: 跑马灯配置 = { 滚动暂停时长 }
export const 缓动时距 = { 滚动: 0.18, 悬停: 0.4, 恢复: 0.7 } as const
export const 静止速度阈值 = 0.5
export const 最大帧步长 = 0.05
export const 最小位移精度 = 0.001

export function 归一化位移(位移: number, 周期: number): number {
  if (!(周期 > 0) || !Number.isFinite(位移)) return 0
  let 结果 = 位移 % 周期
  if (结果 < 0) 结果 += 周期
  return 结果
}

export function 钳制滚动增量(增量: number): number {
  if (!Number.isFinite(增量)) return 0
  if (增量 > 滚动增量上限) return 滚动增量上限
  if (增量 < -滚动增量上限) return -滚动增量上限
  return 增量
}

export function 计算份数(视口宽: number, 组宽: number): number {
  if (!(组宽 > 0)) return 2
  const 有效视口 = Number.isFinite(视口宽) && 视口宽 > 0 ? 视口宽 : 0
  return Math.max(2, Math.ceil((有效视口 + 组宽) / 组宽) + 1)
}

export function 取缓动时距(已暂停: boolean, 滚动暂停中: boolean): number {
  if (!已暂停) return 缓动时距.恢复
  return 滚动暂停中 ? 缓动时距.滚动 : 缓动时距.悬停
}

export function 指数缓动系数(步长秒: number, 时距: number): number {
  if (!(步长秒 > 0) || !(时距 > 0)) return 0
  return 1 - Math.exp(-步长秒 / 时距)
}

const 滚动按键集合 = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  ' ',
  'Spacebar',
  'PageUp',
  'PageDown',
  'Home',
  'End',
])

export function 是否滚动按键(按键: string): boolean {
  return 滚动按键集合.has(按键)
}

export interface 步进输入 {
  位移: number
  速度: number
  周期: number
  方向: 1 | -1
  基准速度: number
  已暂停: boolean
  滚动暂停中: boolean
  步长秒: number
  滚动增量: number
}

export function 推进一帧(输入: 步进输入): { 位移: number; 速度: number } {
  const 系数 = 指数缓动系数(输入.步长秒, 取缓动时距(输入.已暂停, 输入.滚动暂停中))
  const 目标 = 输入.已暂停 ? 0 : 输入.基准速度
  let 速度 = 输入.速度 + (目标 - 输入.速度) * 系数
  if (输入.已暂停 && Math.abs(速度) < 静止速度阈值) 速度 = 0
  const 增量 = 钳制滚动增量(输入.滚动增量)
  const 步进 = 输入.方向 * 速度 * 输入.步长秒 + 输入.方向 * 增量 * 滚动联动系数
  if (!(输入.周期 > 0) || !Number.isFinite(步进) || Math.abs(步进) <= 最小位移精度) {
    return { 位移: 输入.位移, 速度 }
  }
  return { 位移: 归一化位移(输入.位移 + 步进, 输入.周期), 速度 }
}

export interface 轨道槽位 {
  轨道: { current: HTMLDivElement | null }
  周期: { current: number }
  位移: { current: number }
  速度: { current: number }
  方向: 1 | -1
  基准速度: number
}

export interface 跑马灯控制 {
  悬停集合: Set<HTMLElement>
  暂停至: { current: number }
  滚动位置: { current: number }
  上次滚动位置: { current: number }
  轨道表: 轨道槽位[]
  配置: 跑马灯配置
}

export function 创建跑马灯控制(覆盖?: Partial<跑马灯配置>): 跑马灯控制 {
  const 起始滚动 = typeof window !== 'undefined' ? window.scrollY : 0
  return {
    悬停集合: new Set<HTMLElement>(),
    暂停至: { current: 0 },
    滚动位置: { current: 起始滚动 },
    上次滚动位置: { current: 起始滚动 },
    轨道表: [],
    配置: { ...默认跑马灯配置, ...覆盖 },
  }
}

export function 标记意图滚动(控制: 跑马灯控制, 时刻?: number): void {
  const 锚点 = 时刻 ?? performance.now()
  const 时长 = 控制.配置?.滚动暂停时长 ?? 默认跑马灯配置.滚动暂停时长
  控制.暂停至.current = 锚点 + 时长
}

export function 同步滚动位置(控制: 跑马灯控制, 位置?: number): void {
  const 目标 = 位置 ?? (typeof window !== 'undefined' ? window.scrollY : 0)
  if (!Number.isFinite(目标)) return
  控制.滚动位置.current = 目标
}
