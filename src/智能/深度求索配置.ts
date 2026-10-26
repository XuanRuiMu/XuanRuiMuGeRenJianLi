export const 深度求索模型 = 'deepseek-v4.1-flash-expires-on-0910'

export const 深度求索上下文上限 = 1_000_000

export const 深度求索最大令牌 = 8192

export const 深度求索检索条数 = 8

function 读取浮点环境变量(原始值: string | undefined, 默认值: number): number {
  if (原始值 === undefined || 原始值 === '') return 默认值
  const 解析值 = Number(原始值)
  if (!Number.isFinite(解析值) || 解析值 < 0) return 默认值
  return 解析值
}

export const RAG检索最低分 = 读取浮点环境变量(import.meta.env.VITE_RAG_MIN_SCORE, 0.3)

export const 深度求索端点 = '/api/ai/deepseek'
