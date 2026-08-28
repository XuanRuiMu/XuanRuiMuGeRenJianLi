import { 聊天配置 } from "./config";

/**
 * 免登录模式下的 IP 固定窗口限流。
 * 单机内存实现：站点是单进程部署（@astrojs/node standalone），内存计数即全局计数。
 */

interface 记录 {
  次数: number;
  窗口起点: number;
}

const 计数表 = new Map<string, 记录>();

export function 是否超限(标识: string): boolean {
  const 现在 = Date.now();
  const 记录 = 计数表.get(标识);

  if (记录 === undefined || 现在 - 记录.窗口起点 > 聊天配置.限流窗口毫秒) {
    计数表.set(标识, { 次数: 1, 窗口起点: 现在 });
    return false;
  }

  记录.次数 += 1;
  return 记录.次数 > 聊天配置.限流次数;
}

/** 客户端 IP：优先取反向代理透传的头，回退到 socket 地址 */
export function 取客户端标识(请求: Request): string {
  const 转发 = 请求.headers.get("x-forwarded-for");
  if (转发) return 转发.split(",")[0].trim();
  return 请求.headers.get("x-real-ip") ?? "unknown";
}
