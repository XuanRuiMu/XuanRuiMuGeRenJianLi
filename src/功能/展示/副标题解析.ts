export function 解析副标题段(副标题: string): { 前缀段: string[]; 后缀段: string } {
  const 末句号 = 副标题.endsWith('。') ? 副标题.slice(0, -1) : 副标题
  const 逗号位 = 末句号.lastIndexOf('，')
  if (逗号位 < 0) return { 前缀段: [末句号], 后缀段: '' }
  const 前缀文本 = 末句号.slice(0, 逗号位)
  const 后缀核 = 末句号.slice(逗号位 + 1)
  return { 前缀段: 前缀文本.split('、'), 后缀段: 后缀核 }
}
