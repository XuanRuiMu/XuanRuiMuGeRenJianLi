import type { AiMessage } from '../store/useAppStore'
import { t, type TranslationKey } from '../i18n/translations'
import { personalInfo } from '../data/personalInfo'
import { 求职方向 } from '../data/careerFocus'
import type { UiComponent } from './structuredOutput'
import { 是否纯问候, 是否感谢, 是否告别, 检测项目卡片, 命中兜底意图 } from './intentTable'

interface LocalRule {
  意图ID: string
  /** 与主意图共用同一段预制答案的意图（项目类意图统一答"做过哪些项目"） */
  聚合意图ID?: string[]
  key: 'name' | 'target' | 'contact' | 'projects' | 'skills' | 'education' | 'experience'
  component?: UiComponent
}

/** 项目类意图共用的规则 ID：具体卡片标识由提问决定，答案文案统一 */
const 项目通用规则ID = 'projects-通用'

/** 兜底作答规则表：与 共享意图表 中兜底触发词非空的意图一一对应（一致性由 localEngine.test.ts 锁死） */
export const RULES: LocalRule[] = [
  { 意图ID: 'name', key: 'name' },
  { 意图ID: 'target', key: 'target' },
  { 意图ID: 'contact', key: 'contact', component: { type: 'ContactLinks' } },
  {
    意图ID: 项目通用规则ID,
    聚合意图ID: ['projects-xrm', 'projects-爱与循环', 'projects-蜂来'],
    key: 'projects',
    component: { type: 'ProjectCard', projectId: 'xrm' },
  },
  { 意图ID: 'tech', key: 'skills' },
  { 意图ID: 'education', key: 'education', component: { type: 'Timeline', scope: 'education' } },
  {
    意图ID: 'experience',
    key: 'experience',
    component: { type: 'Timeline', scope: 'experience' },
  },
]

function formatAnswer(key: LocalRule['key']): string {
  const base = t(`chat.answers.${key}` as unknown as TranslationKey)
  return base
    .replace('{name}', personalInfo.name)
    .replace('{direction}', 求职方向())
    .replace('{school}', personalInfo.education.school)
    .replace('{major}', personalInfo.education.major)
    .replace('{degree}', personalInfo.education.degree)
    .replace('{period}', personalInfo.education.period)
}

function 命中意图(规则: LocalRule, 文本: string): boolean {
  if (命中兜底意图(规则.意图ID, 文本)) return true
  return (规则.聚合意图ID ?? []).some((意图ID) => 命中兜底意图(意图ID, 文本))
}

/**
 * 否定与比较修饰：命中就不挂组件。
 *
 * 组件由问句判定（见 路由回答），模型因此失去「这次不给卡片」的否决权，而这些问句里
 * 模型会按提示词的「讲缺口」规则说「简历未体现」，同屏正文与卡片就自相矛盾
 * （实测反例：「我没做过什么项目，能胜任大厂前端吗」「我不想公开联系方式」）。
 * 判定仍是朴素的子串匹配，精度靠这张表保证——与 兜底触发词 同一套纪律。
 *
 * 两条精度约束（都是复审实测反例）：
 * 1. `没有` 必须排除疑问式「有没有」——那是正常提问（"有没有实习经历"要弹经历时间线）。
 * 2. 不收 `还是`/`相比` 这类与意图主题无关的通用连接词——「微信还是邮箱都行，怎么联系你」
 *    「相比之下，你做过哪些项目」都是正常提问，收进来会误伤真卡片。比较语气只用
 *    专指比较的 `哪个更/哪个重要/更重要/哪个好`。
 */
const 否定比较修饰: Array<{ 词: string; 疑问式?: string }> = [
  { 词: '没有', 疑问式: '有没有' },
  { 词: '没做' },
  { 词: '我没' },
  { 词: '未做' },
  { 词: '不想' },
  { 词: '不愿' },
  { 词: '无相关' },
  { 词: '哪个更' },
  { 词: '哪个重要' },
  { 词: '更重要' },
  { 词: '哪个好' },
]

function 是否否定或比较(文本: string): boolean {
  return 否定比较修饰.some(({ 词, 疑问式 }) => 文本.includes(词) && !(疑问式 && 文本.includes(疑问式)))
}

interface 回答路由 {
  /** 命中的预制答案档位；问候/感谢/告别与无关问题为 undefined */
  key?: LocalRule['key']
  /** 访客可见的交互组件：项目卡片 / 时间线 / 联系方式 */
  component?: UiComponent
  /** 命中的规则带了组件，但被否定/比较闸门抑制（文案里不能承诺一个不会出现的按钮） */
  组件被抑制?: boolean
}

/**
 * 组件与兜底答案的唯一判定入口，线上回答与本地兜底共用。
 *
 * 组件不再由模型输出（思考模式与 json_object 同开会把 JSON 正文挤进 reasoning 通道，
 * 见 chatService 的请求形态注释），改由意图表严判定后挂载，因此在线与离线的组件行为
 * 完全一致，也不会出现「模型给了非法组件被静默丢弃」的静默分叉。
 * 命中不了就不给组件，绝不猜。
 */
function 路由回答(输入: string): 回答路由 {
  const 文本 = 输入.toLowerCase()
  const 否定或比较 = 是否否定或比较(文本)
  const 项目标识 = 检测项目卡片(输入)
  if (项目标识) {
    const 项目规则 = RULES.find((规则) => 规则.意图ID === 项目通用规则ID)
    return {
      key: 项目规则?.key,
      component: 否定或比较 ? undefined : { type: 'ProjectCard', projectId: 项目标识 },
      ...(否定或比较 ? { 组件被抑制: true } : {}),
    }
  }
  const 规则 = RULES.find((item) => 命中意图(item, 文本))
  const 带组件 = 规则?.component !== undefined
  return {
    key: 规则?.key,
    component: 否定或比较 ? undefined : 规则?.component,
    ...(否定或比较 && 带组件 ? { 组件被抑制: true } : {}),
  }
}

/** 挂给在线回答的组件（无命中即 undefined，绝不猜） */
export function 选择组件(输入: string): UiComponent | undefined {
  return 路由回答(输入).component
}

export function getLocalAnswer(input: string): AiMessage {
  if (是否纯问候(input) || 是否感谢(input) || 是否告别(input)) {
    if (是否感谢(input)) return { role: 'assistant', content: t('chat.answers.thanks') }
    if (是否告别(input)) return { role: 'assistant', content: t('chat.answers.farewell') }
    return { role: 'assistant', content: t('chat.answers.greeting') }
  }

  const { key, component, 组件被抑制 } = 路由回答(input)
  if (!key) {
    return {
      role: 'assistant',
      content: t('chat.answers.fallback' as unknown as TranslationKey),
    }
  }

  // 联系方式文案原文案写死了「点下方按钮」，卡片被闸门抑制时那个按钮并不存在，
  // 必须换掉不承诺按钮的版本，否则「我不想公开联系方式」这类问句会说谎。
  if (key === 'contact' && 组件被抑制) {
    return { role: 'assistant', content: t('chat.answers.contactNoButton' as unknown as TranslationKey) }
  }
  return { role: 'assistant', content: formatAnswer(key), component }
}
