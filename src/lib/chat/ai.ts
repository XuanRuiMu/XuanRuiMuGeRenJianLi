import { 聊天配置 } from "./config";
import { 聊天文案 } from "./i18n";

/**
 * 上游大模型调用：OpenAI 兼容协议的 SSE 流式对话 + 情绪识别。
 */

export interface 对话轮次 {
  role: "user" | "assistant";
  content: string;
}

export class 上游异常 extends Error {}

/** 把 OpenAI 兼容的 SSE 响应解析成文本流 */
export async function* 流式对话(历史: 对话轮次[]): AsyncGenerator<string> {
  const 响应 = await fetch(`${聊天配置.模型接口地址}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${聊天配置.模型密钥}`,
    },
    body: JSON.stringify({
      model: 聊天配置.模型名称,
      messages: [
        { role: "system", content: 聊天文案.系统提示词 },
        ...历史.map((轮) => ({ role: 轮.role, content: 轮.content })),
      ],
      stream: true,
    }),
    signal: AbortSignal.timeout(聊天配置.上游超时毫秒),
  });

  if (!响应.ok || 响应.body === null) {
    throw new 上游异常(`上游返回 ${响应.status}`);
  }

  const 读取器 = 响应.body.getReader();
  const 解码器 = new TextDecoder();
  let 缓冲 = "";

  while (true) {
    const { done, value } = await 读取器.read();
    if (done) break;

    缓冲 += 解码器.decode(value, { stream: true });
    const 行集 = 缓冲.split("\n");
    缓冲 = 行集.pop() ?? "";

    for (const 行 of 行集) {
      const 修剪 = 行.trim();
      if (!修剪.startsWith("data:")) continue;
      const 数据 = 修剪.slice(5).trim();
      if (数据 === "[DONE]") return;
      try {
        const 解析 = JSON.parse(数据) as {
          choices?: { delta?: { content?: string } }[];
        };
        const 增量 = 解析.choices?.[0]?.delta?.content;
        if (增量) yield 增量;
      } catch {
        // 上游偶发的半行/心跳数据，忽略即可
      }
    }
  }
}

/** 情绪识别失败不应影响对话，统一降级为默认值 */
export async function 识别情绪(用户消息: string): Promise<string> {
  try {
    const 响应 = await fetch(`${聊天配置.模型接口地址}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${聊天配置.模型密钥}`,
      },
      body: JSON.stringify({
        model: 聊天配置.模型名称,
        messages: [
          { role: "system", content: 聊天文案.情绪提示词 },
          { role: "user", content: 用户消息 },
        ],
        stream: false,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!响应.ok) return 聊天文案.默认情绪;

    const 解析 = (await 响应.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return 解析.choices?.[0]?.message?.content?.trim() || 聊天文案.默认情绪;
  } catch {
    return 聊天文案.默认情绪;
  }
}
