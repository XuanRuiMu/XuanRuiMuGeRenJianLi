import type { APIRoute } from "astro";
import { 生成访问令牌, 生成安全令牌, 口令哈希 } from "../../../lib/chat/auth";
import {
  创建用户,
  按昵称查用户,
  是否唯一约束冲突,
} from "../../../lib/chat/db";
import { 错误响应, json响应, 兜底错误 } from "../../../lib/chat/http";
import { 聊天文案 } from "../../../lib/chat/i18n";

export const prerender = false;

const 昵称合法 = (昵称: unknown): 昵称 is string =>
  typeof 昵称 === "string" && 昵称.length >= 2 && 昵称.length <= 20;

const 口令合法 = (口令: unknown): 口令 is string =>
  typeof 口令 === "string" && 口令.length >= 6;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { username, password } = await request.json().catch(() => ({}));

    if (!昵称合法(username) || !口令合法(password)) {
      return 错误响应(聊天文案.错误.昵称格式错误);
    }

    try {
      const 用户id = 创建用户(username, 口令哈希(password));
      return json响应({
        token: 生成访问令牌({ 用户id, 昵称: username }),
        csrfToken: 生成安全令牌(用户id),
        username,
      });
    } catch (错误) {
      if (是否唯一约束冲突(错误)) {
        return 错误响应(聊天文案.错误.昵称已被占用, 409);
      }
      throw 错误;
    }
  } catch (错误) {
    return 兜底错误("register", 错误);
  }
};

/** 供前端做“昵称是否可用”的即时提示 */
export const GET: APIRoute = async ({ url }) => {
  const 昵称 = url.searchParams.get("username");
  if (!昵称合法(昵称)) return 错误响应(聊天文案.错误.昵称格式错误);
  return json响应({ 可用: 按昵称查用户(昵称) === undefined });
};
