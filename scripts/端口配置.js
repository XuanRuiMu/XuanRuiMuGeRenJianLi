export const 开发端口 = 5180
export const 预览端口 = 4173

export function 开发地址(路径 = '/') {
  return `http://localhost:${开发端口}${路径}`
}
