import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { 聊天配置 } from "./config";

/**
 * 鉴权：JWT（HS256）+ CSRF 令牌 + scrypt 口令哈希。
 * 全部基于 Node 内置 crypto，不引入第三方实现，签名比对使用 timingSafeEqual 防时序侧信道。
 */

export interface 令牌载荷 {
  用户id: number;
  昵称: string;
}

const 编码 = (对象: unknown): string =>
  Buffer.from(JSON.stringify(对象)).toString("base64url");

const 解码 = (文本: string): unknown =>
  JSON.parse(Buffer.from(文本, "base64url").toString("utf8"));

const 签名 = (数据: string, 密钥: string): string =>
  createHmac("sha256", 密钥).update(数据).digest("base64url");

const 安全比较 = (甲: string, 乙: string): boolean => {
  const 甲缓冲 = Buffer.from(甲);
  const 乙缓冲 = Buffer.from(乙);
  if (甲缓冲.length !== 乙缓冲.length) return false;
  return timingSafeEqual(甲缓冲, 乙缓冲);
};

export function 生成访问令牌(载荷: 令牌载荷): string {
  const 头 = 编码({ alg: "HS256", typ: "JWT" });
  const 体 = 编码({
    ...载荷,
    exp: Math.floor(Date.now() / 1000) + 聊天配置.令牌有效期秒,
  });
  const 签 = 签名(`${头}.${体}`, 聊天配置.令牌密钥);
  return `${头}.${体}.${签}`;
}

export function 校验访问令牌(令牌: string): 令牌载荷 | null {
  const 段 = 令牌.split(".");
  if (段.length !== 3) return null;
  const [头, 体, 签] = 段;
  if (!安全比较(签, 签名(`${头}.${体}`, 聊天配置.令牌密钥))) return null;

  try {
    const 载荷 = 解码(体) as 令牌载荷 & { exp?: number };
    if (typeof 载荷.exp !== "number" || 载荷.exp * 1000 <= Date.now()) return null;
    if (typeof 载荷.用户id !== "number" || typeof 载荷.昵称 !== "string") return null;
    return { 用户id: 载荷.用户id, 昵称: 载荷.昵称 };
  } catch {
    return null;
  }
}

export function 口令哈希(明文: string): string {
  const 盐 = randomBytes(16).toString("hex");
  const 摘要 = scryptSync(明文, 盐, 64).toString("hex");
  return `${盐}:${摘要}`;
}

export function 校验口令(明文: string, 存储值: string): boolean {
  const [盐, 摘要] = 存储值.split(":");
  if (!盐 || !摘要) return false;
  return 安全比较(scryptSync(明文, 盐, 64).toString("hex"), 摘要);
}

export function 生成安全令牌(用户id: number): string {
  const 时间戳 = Date.now();
  const 载荷 = `${用户id}:${时间戳}`;
  return Buffer.from(
    `${载荷}:${签名(载荷, 聊天配置.安全令牌密钥)}`,
  ).toString("base64url");
}

export function 校验安全令牌(令牌: string | null, 期望用户id: number): boolean {
  if (!令牌) return false;
  try {
    const 原文 = Buffer.from(令牌, "base64url").toString("utf8");
    const 末位 = 原文.lastIndexOf(":");
    if (末位 < 0) return false;
    const 载荷 = 原文.slice(0, 末位);
    const 签 = 原文.slice(末位 + 1);
    if (!安全比较(签, 签名(载荷, 聊天配置.安全令牌密钥))) return false;

    const [用户id, 时间戳] = 载荷.split(":");
    if (Number(用户id) !== 期望用户id) return false;
    return Date.now() - Number(时间戳) <= 聊天配置.安全令牌有效期毫秒;
  } catch {
    return false;
  }
}

/** 从 Authorization 头里取出 Bearer 令牌 */
export function 提取令牌(请求头: Headers): string | null {
  const 头 = 请求头.get("authorization");
  if (!头) return null;
  const [方案, 令牌] = 头.split(" ");
  return 方案?.toLowerCase() === "bearer" && 令牌 ? 令牌 : null;
}
