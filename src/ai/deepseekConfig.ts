/**
 * DeepSeek 配置。
 * 密钥通过 Vite 环境变量 VITE_DEEPSEEK_API_KEY 注入（本地放 .env.local，已被 .gitignore 忽略），
 * 严禁在源码中硬编码——既符合凭据安全规范，也避免被 GitHub 推送保护拦截。
 *
 * 端点：开发环境走 Vite 代理 /api/deepseek（绕过浏览器 CORS）；
 * 生产构建直连官方端点（静态托管即可工作，部署时需在托管平台配置同名环境变量）。
 */
export const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY ?? ''

/** v4 模型可选：flash（快）/ pro（旗舰），均为 1M 上下文、384K 输出、MIT 许可。 */
export const DEEPSEEK_MODELS = { flash: 'deepseek-v4-flash', pro: 'deepseek-v4-pro' } as const

/** v4 上下文上限（token），状态栏「上下文默认最大」指示用。 */
export const DEEPSEEK_CONTEXT_MAX = 1_000_000

/** v4 系列默认启用 thinking，max_tokens 需 ≥500，此处开满以承载长思考。 */
export const DEEPSEEK_MAX_TOKENS = 8192

/** RAG 检索召回数：开满上下文，让模型基于工作区知识作答。 */
export const DEEPSEEK_RETRIEVE_TOP_K = 8

export const DEEPSEEK_ENDPOINT = import.meta.env.DEV
  ? '/api/deepseek'
  : 'https://api.deepseek.com/v1/chat/completions'
