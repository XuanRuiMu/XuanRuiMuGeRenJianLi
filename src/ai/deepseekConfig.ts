/**
 * DeepSeek 配置（零密钥前端契约）。
 * 浏览器只请求同源相对路径，真实凭据由反代层注入（dev：vite.config.js 代理；prod：deploy/nginx.conf）。
 * 严禁在源码出现密钥环境变量名、第三方 AI 域名、鉴权请求头或凭据字段（credentialGuard 全量扫描）。
 */

/** 唯一模型：vision 实验版，支持文本+图片输入（官方文档：JPEG/PNG/GIF/WebP，仅 user 消息可带图）。 */
export const DEEPSEEK_MODEL = 'deepseek-v4.1-flash-expires-on-0910'

/** v4 上下文上限（token），状态栏「上下文默认最大」指示用。 */
export const DEEPSEEK_CONTEXT_MAX = 1_000_000

/** v4 系列默认启用 thinking，max_tokens 需 ≥500，此处开满以承载长思考。 */
export const DEEPSEEK_MAX_TOKENS = 8192

/** RAG 检索召回数：开满上下文，让模型基于工作区知识作答。 */
export const DEEPSEEK_RETRIEVE_TOP_K = 8

function 读取浮点环境变量(原始值: string | undefined, 默认值: number): number {
  if (原始值 === undefined || 原始值 === '') return 默认值
  const 解析值 = Number(原始值)
  if (!Number.isFinite(解析值) || 解析值 < 0) return 默认值
  return 解析值
}

/** RAG 检索最低分：低于此分数的片段视为无效（问候/寒暄天然低分），直接过滤不硬塞上下文。可经 VITE_RAG_MIN_SCORE 配置。 */
export const RAG检索最低分 = 读取浮点环境变量(import.meta.env.VITE_RAG_MIN_SCORE, 0.3)

/** 同源 AI 端点：dev 由 Vite 代理转发，prod 由 nginx 反代并注入凭据。 */
export const DEEPSEEK_ENDPOINT = '/api/ai/deepseek'
