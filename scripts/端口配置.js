/**
 * 开发/预览端口与地址的单一数据源。
 * vite.config.js、playwright.config.ts、package.json scripts 共用，改端口只改这一处。
 */

export const 开发端口 = 5180
export const 预览端口 = 4173

/** 开发服务地址（Playwright baseURL / webServer.url 使用） */
export function 开发地址(路径 = '/') {
  return `http://localhost:${开发端口}${路径}`
}
