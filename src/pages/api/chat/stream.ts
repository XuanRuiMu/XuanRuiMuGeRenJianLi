import type { APIRoute } from "astro";
import { 流式对话, 识别情绪, 上游异常 } from "../../../lib/chat/ai";
import { 校验访问令牌, 校验安全令牌, 提取令牌 } from "../../../lib/chat/auth";
import { 聊天配置, 缺失的必需配置 } from "../../../lib/chat/config";
import { 读取历史, 追加消息 } from "../../../lib/chat/db";
import {
  流式响应头,
  错误响应,
  兜底错误,
  解析消息,
} from "../../../lib/chat/http";
import { 聊天文案 } from "../../../lib/chat/i18n";
import { 取客户端标识, 是否超限 } from "../../../lib/chat/rate-limit";

export const prerender = false;

const 取客串上下文 = (原始: unknown): { role: "user" | "assistant"; content: string }[] => {
  if (!Array.isArray(原始)) return [];
  return 原始
    .filter(
      (轮): 轮 is { role: string; content: string } =>
        轮 !== null &&
        typeof 轮 === "object" &&
        typeof (轮 as { content?: unknown }).content === "string",
    )
    .map((轮) => ({
      role: 轮.role === "assistant" ? "assistant" : "user",
      content: 轮.content.slice(0, 聊天配置.单条消息上限),
    }))
    .filter((轮) => 轮.content.trim().length > 0)
    .slice(-聊天配置.上下文轮数);
};

export const POST: APIRoute = async ({ request }) => {
  try {
    if (缺失的必需配置().length > 0) {
      return 错误响应(聊天文案.错误.缺少配置, 503);
    }

    // 1) 身份：带令牌就必须有效，否则直接判为失效登录态
    const 令牌 = 提取令牌(request.headers);
    const 身份 = 令牌 === null ? null : 校验访问令牌(令牌);
    if (令牌 !== null && 身份 === null) {
      return 错误响应(聊天文案.错误.未登录, 401);
    }

    // 2) 免登录走 IP 限流；登录态走 CSRF 校验（写操作必须带）
    if (身份 === null) {
      if (是否超限(取客户端标识(request))) {
        return 错误响应(聊天文案.错误.请求过频, 429);
      }
    } else if (!校验安全令牌(request.headers.get("x-csrf-token"), 身份.用户id)) {
      return 错误响应(聊天文案.错误.安全校验失败, 403);
    }

    // 3) 输入校验
    const { content, history } = await request.json().catch(() => ({}));
    const 文本 = 解析消息(content);
    if (文本 === null) return 错误响应(聊天文案.错误.输入非法);

    // 4) 组装上下文：登录态以服务端历史为准，免登录用客户端带过来的最近若干轮
    let 上下文: { role: "user" | "assistant"; content: string }[];
    if (身份 === null) {
      上下文 = 取客串上下文(history);
      if (上下文.length === 0) 上下文 = [{ role: "user", content: 文本 }];
    } else {
      追加消息(身份.用户id, "user", 文本);
      上下文 = 读取历史(身份.用户id, 聊天配置.上下文轮数).map((行) => ({
        role: 行.role,
        content: 行.content,
      }));
    }

    // 5) 流式回吐
    const 编码器 = new TextEncoder();
    const 流 = new ReadableStream({
      async start(控制器) {
        const 发送 = (载荷: unknown) =>
          控制器.enqueue(编码器.encode(`data: ${JSON.stringify(载荷)}\n\n`));

        let 回复 = "";
        try {
          for await (const 增量 of 流式对话(上下文)) {
            回复 += 增量;
            发送({ chunk: 增量 });
          }

          const 情绪 = await 识别情绪(文本);
          let 消息id: number | null = null;
          if (身份 !== null && 回复.length > 0) {
            消息id = 追加消息(身份.用户id, "assistant", 回复, 情绪);
          }
          发送({ done: true, messageId: 消息id, emotion: 情绪 });
        } catch (错误) {
          if (错误 instanceof 上游异常) {
            console.error("[chat:stream] 上游调用失败", 错误);
            发送({ error: 聊天文案.错误.模型不可用 });
          } else {
            console.error("[chat:stream] 未预期错误", 错误);
            发送({ error: 聊天文案.错误.服务异常 });
          }
        } finally {
          控制器.close();
        }
      },
    });

    return new Response(流, { headers: 流式响应头() });
  } catch (错误) {
    return 兜底错误("stream", 错误);
  }
};
