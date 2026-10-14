/**
 * 副标题按最后一个「，」切成两段：前缀走三色渐变、后缀走独立纯色块。
 * 逗号只作切分分隔符，不参与渲染——后缀是独立居中块，前面挂逗号会显得突兀。
 *
 * 独立成模块（不在组件文件里导出非组件），避免 react-refresh 快速刷新失效。
 */
export function 解析副标题段(副标题: string): { 前缀段: string[]; 后缀段: string } {
  const 末句号 = 副标题.endsWith('。') ? 副标题.slice(0, -1) : 副标题
  const 逗号位 = 末句号.lastIndexOf('，')
  if (逗号位 < 0) return { 前缀段: [末句号], 后缀段: '' }
  const 前缀文本 = 末句号.slice(0, 逗号位)
  const 后缀核 = 末句号.slice(逗号位 + 1)
  return { 前缀段: 前缀文本.split('、'), 后缀段: 后缀核 }
}
