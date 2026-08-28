import type { APIRoute } from "astro";
import { 聊天配置 } from "./config";
import { 聊天文案 } from "./i18n";

/** 统一的 JSON 响应 */
export function json响应(数据: unknown, 状态 = 200): Response {
  return new Response(JSON.stringify(数据), {
    status: 状态,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function 错误响应(消息: string, 状态 = 400): Response {
  return json响应({ error: 消息 }, 状态);
}

/** SSE 响应头：关闭缓冲，否则中间过程会被攒到结束才吐出 */
export function 流式响应头(): Record<string, string> {
  return {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  };
}

/**
 * 解析并校验用户消息。
 * 返回 null 表示非法输入，调用方直接回 400。
 */
export function 解析消息(原始: unknown): string | null {
  if (typeof 原始 !== "string") return null;
  const 文本 = 原始.trim();
  if (文本.length === 0 || 文本.length > 聊天配置.单条消息上限) return null;
  return 文本;
}

/** 未捕获异常的统一出口：详细栈留在服务端日志，客户端只看到一句通用文案 */
export function 兜底错误(阶段: string, 错误: unknown): Response {
  console.error(`[chat:${阶段}]`, 错误);
  return 错误响应(聊天文案.错误.服务异常, 500);
}

export type { APIRoute };
