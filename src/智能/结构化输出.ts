export type 项目卡片组件 = {
  type: 'ProjectCard'
  项目编号: 'xrm' | 'lovewithme' | 'aiConsole' | 'yangLai'
}
export type 时间线组件 = { type: 'Timeline'; scope?: 'experience' | 'media' | 'education' }
export type 联系方式组件 = { type: 'ContactLinks' }
export type 界面组件 = 项目卡片组件 | 时间线组件 | 联系方式组件

const 不可见字符 = /[\p{Cc}\p{Cf}\p{Mn}\p{Me}\p{Zs}]/gu

export function 有可见正文(文本: string): boolean {
  return 文本.replace(不可见字符, '').length > 0
}

export function 提取信封正文(原始: string): string {
  try {
    const 载荷 = JSON.parse(原始) as { text?: unknown }
    return typeof 载荷.text === 'string' ? 载荷.text : ''
  } catch {
    return ''
  }
}
