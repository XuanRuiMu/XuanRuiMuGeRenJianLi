import "dotenv/config";

/**
 * 站内前端与 Python AI Agent 后端（server/）之间的同-origin 代理。
 * 走代理而不是让浏览器直连后端，好处是：
 *   1. 后端地址集中在一处配置，前端不写死 host
 *   2. 浏览器与后端始终同源，不存在 CORS / 混合内容问题
 *   3. 后端未启动时可以给出明确的离线状态，而不是一个跨域报错
 */

const 读 = (键: string, 默认值: string): string => {
  const 值 = process.env[键];
  return 值 === undefined || 值 === "" ? 默认值 : 值;
};

export const 智能体后端 = {
  地址: 读("AGENT_API_BASE", "http://127.0.0.1:8000").replace(/\/+$/, ""),
  超时毫秒: Number.parseInt(读("AGENT_API_TIMEOUT_MS", "180000"), 10),
} as const;

export class 后端离线 extends Error {}

/** 把站内 /api/agent/* 请求转发到 Python 后端 */
export async function 转发(
  路径: string,
  方法: string,
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
    throw new 后端离线("AI Agent 后端未启动");
  }

  const 文本 = await 上游.text();
  return new Response(文本, {
    status: 上游.status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
