const 站点基础路径 = import.meta.env.BASE_URL

export function 资源路径(路径: string): string {
  return `${站点基础路径}${路径.replace(/^\/+/, '')}`
}
