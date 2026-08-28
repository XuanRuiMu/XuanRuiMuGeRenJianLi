import type { APIRoute } from "astro";
import { 智能体后端, 后端离线 } from "../../../lib/agent-backend";
import { json响应, 流式响应头, 兜底错误 } from "../../../lib/chat/http";
import { 观测台文案 } from "../../../lib/locales/trace";

export const prerender = false;

/** 轨迹回放、会话列表这类非流式接口 */
export const GET: APIRoute = async ({ params, url }) => {
  const 路径 = params.path ?? "";
  const 查询 = url.searchParams.toString();
  try {
    return await 转发(查询.length > 0 ? `${路径}?${查询}` : 路径, "GET", null);
  } catch {
    return json响应({ error: 观测台文案.状态.后端离线 }, 503);
  }
};

export const POST: APIRoute = async ({ params, request }) => {
  const 路径 = params.path ?? "";
  // SSE 端点必须直通，不能先把响应体读干再转发，否则逐字推送会退化成一次性返回
  const 是流式 = 路径.replace(/\/+$/, "").endsWith("/stream");

  try {
    return 是流式
      ? await 流式转发(路径, await request.text())
      : await 转发(路径, "POST", await request.text());
  } catch (错误) {
    if (错误 instanceof 后端离线) {
      return json响应({ error: 观测台文案.状态.后端离线 }, 503);
    }
    return 兜底错误("agent-proxy", 错误);
  }
};

async function 转发(
  路径: string,
  方法: "GET" | "POST",
  请求体: string | null,
): Promise<Response> {
  const 目标 = `${智能体后端.地址}/${路径.replace(/^\/+/, "")}`;

  let 上游: Response;
  try {
    上游 = await fetch(目标, {
      method: 方法,
      headers:
        请求体 === null
          ? { Accept: "application/json" }
          : { "Content-Type": "application/json", Accept: "application/json" },
      body: 请求体,
      signal: AbortSignal.timeout(智能体后端.超时毫秒),
    });
  } catch {
    throw new 后端离线(观测台文案.状态.后端离线);
  }

  const 文本 = await 上游.text();
  return new Response(文本, {
    status: 上游.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function 流式转发(路径: string, 请求体: string): Promise<Response> {
  const 目标 = `${智能体后端.地址}/${路径.replace(/^\/+/, "")}`;

  let 上游: Response;
  try {
    上游 = await fetch(目标, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: 请求体,
      signal: AbortSignal.timeout(智能体后端.超时毫秒),
    });
  } catch {
    throw new 后端离线(观测台文案.状态.后端离线);
  }

  if (上游.body === null) throw new 后端离线(观测台文案.状态.后端离线);

  return new Response(上游.body, {
    status: 上游.status,
    headers: 流式响应头(),
  });
}
