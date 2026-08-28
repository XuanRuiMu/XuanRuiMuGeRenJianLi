import type { APIRoute } from "astro";
import { 校验访问令牌, 提取令牌 } from "../../lib/chat/auth";
import { 读取历史, 清空历史 } from "../../lib/chat/db";
import { 错误响应, json响应, 兜底错误 } from "../../lib/chat/http";
import { 聊天文案 } from "../../lib/chat/i18n";

export const prerender = false;

/** 只有登录用户才有跨设备的历史：免登录会话不落库，因此这里必须要求登录 */
const 取身份 = (请求: Request) => {
  const 令牌 = 提取令牌(请求.headers);
  if (令牌 === null) return null;
  return 校验访问令牌(令牌);
};

export const GET: APIRoute = async ({ request }) => {
  try {
    const 身份 = 取身份(request);
    if (身份 === null) return 错误响应(聊天文案.错误.未登录, 401);

    return json响应({ messages: 读取历史(身份.用户id, 200) });
  } catch (错误) {
    return 兜底错误("history.get", 错误);
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const 身份 = 取身份(request);
    if (身份 === null) return 错误响应(聊天文案.错误.未登录, 401);

    清空历史(身份.用户id);
    return json响应({ ok: true });
  } catch (错误) {
    return 兜底错误("history.delete", 错误);
  }
};
