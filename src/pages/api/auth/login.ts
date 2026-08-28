import type { APIRoute } from "astro";
import {
  生成访问令牌,
  生成安全令牌,
  校验口令,
} from "../../../lib/chat/auth";
import { 按昵称查用户 } from "../../../lib/chat/db";
import { 错误响应, json响应, 兜底错误 } from "../../../lib/chat/http";
import { 聊天文案 } from "../../../lib/chat/i18n";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { username, password } = await request.json().catch(() => ({}));

    if (typeof username !== "string" || typeof password !== "string") {
      return 错误响应(聊天文案.错误.昵称或密码错误, 401);
    }

    const 用户 = 按昵称查用户(username);
    if (用户 === undefined || !校验口令(password, 用户.password_hash)) {
      return 错误响应(聊天文案.错误.昵称或密码错误, 401);
    }

    return json响应({
      token: 生成访问令牌({ 用户id: 用户.id, 昵称: 用户.username }),
      csrfToken: 生成安全令牌(用户.id),
      username: 用户.username,
    });
  } catch (错误) {
    return 兜底错误("login", 错误);
  }
};
