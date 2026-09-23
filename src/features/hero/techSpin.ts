export const 惯性减速时长 = 500

/** 线性逼近目标转速因子：保证恰好在指定时长内到达目标，帧步长波动下依然稳定 */
export function 逼近目标转速(当前: number, 目标: number, 步长毫秒: number, 时长毫秒: number = 惯性减速时长): number {
  if (当前 === 目标) return 当前
  const 步幅 = Math.max(0, 步长毫秒) / Math.max(1, 时长毫秒)
  const 差值 = 目标 - 当前
  if (Math.abs(差值) <= 步幅) return 目标
  return 当前 + Math.sign(差值) * 步幅
}
