/**
 * 遥测/错误上报端点可信性校验（规范：所有外部输入必须先校验再使用）。
 *
 * 合法端点仅两类：
 * 1. 同源相对路径：以 `/` 开头且非 `//` 开头（协议相对 URL 会指向外部主机）；
 * 2. 绝对 https URL；本地开发（http://localhost / http://127.0.0.1）放行。
 *
 * 其余一律判不信任：http 明文、javascript:/data: 等任意协议、跨域 http 域名。
 * 误配的环境变量不会把日志（可能含 url/UA/componentStack）外发到任意端点。
 */

export function 解析可信上报端点(原始值?: string): string | null {
  if (typeof 原始值 !== 'string') return null
  const 端点 = 原始值.trim()
  if (端点 === '') return null

  if (端点.startsWith('/')) {
    // 协议相对 URL（//host/...）指向外部主机，拒绝
    return 端点.startsWith('//') ? null : 端点
  }

  let 地址: URL
  try {
    地址 = new URL(端点)
  } catch {
    return null
  }

  if (地址.protocol === 'https:') return 端点
  // 仅本机 http 放行（本地联调端点），其余 http 明文一律拒绝
  const 是否本机 = 地址.hostname === 'localhost' || 地址.hostname === '127.0.0.1' || 地址.hostname === '[::1]'
  return 地址.protocol === 'http:' && 是否本机 ? 端点 : null
}
