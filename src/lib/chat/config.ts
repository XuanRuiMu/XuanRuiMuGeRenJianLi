import "dotenv/config";

/**
 * 聊天功能的可配置常量。
 * 任何数值/名称/路径都不在业务代码里写死，统一从这里取。
 */

const 读 = (键: string, 默认值 = ""): string => {
  const 值 = process.env[键];
  return 值 === undefined || 值 === "" ? 默认值 : 值;
};

const 读整数 = (键: string, 默认值: number): number => {
  const 解析 = Number.parseInt(读(键), 10);
  return Number.isFinite(解析) ? 解析 : 默认值;
};

export const 聊天配置 = {
  模型接口地址: 读("CHAT_OPENAI_BASE_URL").replace(/\/+$/, ""),
  模型密钥: 读("CHAT_OPENAI_API_KEY"),
  模型名称: 读("CHAT_OPENAI_MODEL", "qwen-turbo"),

  令牌密钥: 读("CHAT_JWT_SECRET"),
  安全令牌密钥: 读("CHAT_CSRF_SECRET"),

  数据库路径: 读("CHAT_DB_PATH", "./data/chat.sqlite"),

  /** 单条用户消息的最大字符数 */
  单条消息上限: 读整数("CHAT_MAX_MESSAGE_LENGTH", 2000),
  /** 携带给模型的历史轮数 */
  上下文轮数: 读整数("CHAT_CONTEXT_TURNS", 20),
  /** 免登录模式：同一 IP 在窗口期内的请求上限 */
  限流次数: 读整数("CHAT_RATE_LIMIT", 15),
  限流窗口毫秒: 读整数("CHAT_RATE_WINDOW_MS", 60_000),
  /** CSRF 令牌有效期 */
  安全令牌有效期毫秒: 读整数("CHAT_CSRF_TTL_MS", 24 * 60 * 60 * 1000),
  /** 令牌有效期 */
  令牌有效期秒: 读整数("CHAT_TOKEN_TTL_SECONDS", 7 * 24 * 60 * 60),
  /** 调用上游模型的超时时间 */
  上游超时毫秒: 读整数("CHAT_UPSTREAM_TIMEOUT_MS", 60_000),
} as const;

/** 缺了必备配置就不要假装能用，启动时由调用方显式检查 */
export function 缺失的必需配置(): string[] {
  const 缺失: string[] = [];
  for (const [键, 值] of Object.entries({
    CHAT_OPENAI_BASE_URL: 聊天配置.模型接口地址,
    CHAT_OPENAI_API_KEY: 聊天配置.模型密钥,
    CHAT_JWT_SECRET: 聊天配置.令牌密钥,
    CHAT_CSRF_SECRET: 聊天配置.安全令牌密钥,
  })) {
    if (!值) 缺失.push(键);
  }
  return 缺失;
}
