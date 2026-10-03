/**
 * 助手输出形态的唯一权威：交互组件类型 + 「这段文字对访客是否可见」的判定 + JSON 信封取文本。
 *
 * 根因背景（实测，见 .agents/evidence/traces/AI空正文根因-20261002.md）：
 * DeepSeek 官方限制表明确「不推荐同时启用 thinking.type=enabled 与 response_format.type=json_object」，
 * 同开时上游时而把整段 JSON 正文写进 reasoning_content、content 只剩纯空格 padding（3 次实测 1 次），
 * 官方 JSON Output 指南也自述「may occasionally return empty content」。前端若把这种 content
 * 当合法答案落库，界面就成了「工具轨迹齐全 + 正文空白 + 有思考过程」——看起来回答完了，其实一个字没说。
 * 因此聊天链路不再请求 JSON 输出（请求形态见 chatService），本模块随之收敛成下面三件事。
 *
 * 为什么不用 zod：组件不再来自模型（没有外部输入需要运行时校验），取值约束由 TypeScript
 * 字面量联合表达；保留 schema 只会多一套与类型重复的真相来源。
 */

// 取值集合直接写进类型联合：组件不再来自模型，没有第二个消费方需要独立的常量
export type ProjectCardComponent = {
  type: 'ProjectCard'
  projectId: 'xrm' | 'lovewithme' | 'aiConsole' | 'yangLai'
}
export type TimelineComponent = { type: 'Timeline'; scope?: 'experience' | 'media' | 'education' }
export type ContactLinksComponent = { type: 'ContactLinks' }
export type UiComponent = ProjectCardComponent | TimelineComponent | ContactLinksComponent

/**
 * 渲染宽度为 0 的字符：控制符、格式符（含零宽字符族）、组合记号、非换行空白。
 * 真实 padding 是纯 U+0020（已被 trim 覆盖），但零宽字符不被 trim 移除，
 * 只靠 trim 判定等于「用同一把尺子验这把尺子」，因此显式剥离。
 */
const 不可见字符 = /[\p{Cc}\p{Cf}\p{Mn}\p{Me}\p{Zs}]/gu

/** 有效正文判定（全站唯一）：空串、纯空白、纯零宽都算「没有回答」 */
export function 有可见正文(文本: string): boolean {
  return 文本.replace(不可见字符, '').length > 0
}

/**
 * JSON 信封取文本。只服务显式要求 JSON 的场景（/compact 走官方推荐的
 * thinking.disabled + json_object 组合）；聊天链路不调用它——聊天正文是纯自然语言，
 * 若访客主动索要一段 JSON，任何改写都会把他的内容吞掉或篡改。
 *
 * 解析失败或没有 text 字段一律返回空串，由调用方的唯一闸门决定兜底，绝不回显 JSON 残骸。
 */
export function 提取信封正文(原始: string): string {
  try {
    const 载荷 = JSON.parse(原始) as { text?: unknown }
    return typeof 载荷.text === 'string' ? 载荷.text : ''
  } catch {
    return ''
  }
}
