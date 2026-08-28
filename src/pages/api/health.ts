import type { APIRoute } from "astro";
import { 缺失的必需配置 } from "../../lib/chat/config";
import { json响应 } from "../../lib/chat/http";
import { 聊天文案 } from "../../lib/chat/i18n";

export const prerender = false;

/** 健康检查：前端据此判断聊天后端是否就绪 */
export const GET: APIRoute = () => {
  const 缺失 = 缺失的必需配置();
  return json响应({
    ok: 缺失.length === 0,
    缺失配置: 缺失,
    提示: 缺失.length === 0 ? "" : 聊天文案.错误.缺少配置,
  });
};
