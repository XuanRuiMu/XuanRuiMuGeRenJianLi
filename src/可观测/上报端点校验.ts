export function 解析可信上报端点(原始值?: string): string | null {
  if (typeof 原始值 !== 'string') return null
  const 端点 = 原始值.trim()
  if (端点 === '') return null

  if (端点.startsWith('/')) {
    return 端点.startsWith('//') ? null : 端点
  }

  let 地址: URL
  try {
    地址 = new URL(端点)
  } catch {
    return null
  }

  if (地址.protocol === 'https:') return 端点

  const 是否本机 = 地址.hostname === 'localhost' || 地址.hostname === '127.0.0.1' || 地址.hostname === '[::1]'
  return 地址.protocol === 'http:' && 是否本机 ? 端点 : null
}
