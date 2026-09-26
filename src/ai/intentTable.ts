import type { ProjectCardComponent } from './structuredOutput'

export type 项目卡片标识 = ProjectCardComponent['projectId']

/**
 * 意图表两套触发词的职责边界（不可混用）：
 *
 * 1. `关键词` = RAG 检索加权（宽）。唯一消费者是 ragEngine.applyPatternBoost，语义是
 *    "这句话可能和该语料分类有关，给它加分"。宽到含「工作/技术/经验/联系/设计/视频/创作」
 *    这类通用词是合理的，因为加权最多影响召回排序，不会凭空产出一段权威口吻的答案。
 * 2. `兜底触发词` = 离线兜底作答（严）。消费者只有 localEngine 与 followUpSuggestions，
 *    语义是 "我确信用户在问这件事，可以直接把这段预制答案交出去"。这里宁缺勿滥：
 *    命中不了就走 chat.answers.fallback 的诚实文案，绝不返回与问题无关的权威答案。
 *
 * 因此兜底触发词必须满足以下数据约束（由 intentTable.test.ts 强制）：
 * - 每条兜底触发词必须包含本意图 `关键词` 之一（严格集是宽集的精化，不得引入新主题）；
 * - 只收"话题独占的问法短语"：通用单/双字单词（工作、项目、经历、技术、邮箱、电话、手机、微信、
 *   学历、岗位、时间线…）不得独立成项，只能作为独占短语的成分；判定本身是朴素的子串匹配，
 *   靠词表数据而不是形态学猜测保证精度。
 * - 有 `兜底触发词` 就必须有 localEngine 的预制答案规则，反之亦然（一致性不变量）。
 */
export interface 共享意图定义 {
  id: string
  关键词: string[]
  /** 空数组 = 该意图没有预制答案文案，永不参与兜底作答，只按 `关键词` 参与 RAG 加权 */
  兜底触发词: string[]
  /** 项目类意图：兜底触发词按项目卡片标识拆分，其值集必须与 `兜底触发词` 完全一致 */
  项目卡片映射?: Partial<Record<项目卡片标识, string[]>>
  boostCategories: string[]
  boostSources: string[]
}

export const 共享意图表: 共享意图定义[] = [
  {
    id: 'name',
    关键词: ['你是谁', '叫什么', '名字', '姓名', '自我介绍'],
    兜底触发词: ['你是谁', '你叫什么', '自我介绍', '你的名字'],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
  {
    id: 'tech',
    关键词: ['最擅长', '擅长', '优势', '核心竞争力', '技术栈', '用什么技术', '技术', '技能', '会什么', '雷达'],
    兜底触发词: [
      '技术栈',
      '用什么技术',
      '最擅长',
      '擅长',
      '核心竞争力',
      '什么优势',
      '你的优势',
      '技能',
      '会什么',
      '雷达图',
    ],
    boostCategories: ['techStack'],
    boostSources: ['workspace'],
  },
  {
    id: 'target',
    关键词: ['岗位', '职位', '目标', '求职', '期望'],
    兜底触发词: ['目标岗位', '求职方向', '求职意向', '期望岗位', '意向岗位', '期望职位', '岗位是什么', '你的岗位'],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
  {
    id: 'contact',
    关键词: ['联系方式', '联系', '怎么联系', '邮箱', '电话', '手机', 'qq', '微信'],
    兜底触发词: [
      '联系方式',
      '怎么联系',
      '如何联系',
      '联系你',
      '微信多少',
      '微信是多少',
      '加个微信',
      '邮箱是什么',
      '留个邮箱',
      '电话多少',
      '手机号多少',
      '手机多少',
      'qq多少',
    ],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
  {
    id: 'projects-xrm',
    关键词: ['暮澜纪元', 'xrm', 'mmorpg', '服务端'],
    兜底触发词: ['暮澜纪元', 'xrm'],
    项目卡片映射: { xrm: ['暮澜纪元', 'xrm'] },
    boostCategories: ['projects', 'experience'],
    boostSources: ['projects.ts', 'experience.ts'],
  },
  {
    id: 'projects-爱与循环',
    关键词: ['恋爱', 'lovewithme', '聊天应用', '全栈应用', '循环工程', 'loop'],
    兜底触发词: ['和我恋爱吧', 'lovewithme', '循环工程'],
    项目卡片映射: {
      lovewithme: ['和我恋爱吧', 'lovewithme'],
      aiConsole: ['循环工程'],
    },
    boostCategories: ['projects', 'experience'],
    boostSources: ['projects.ts', 'experience.ts'],
  },
  {
    id: 'projects-蜂来',
    关键词: ['蜂来', 'fenglai', '整蛊', '直播间', '点赞连击', '拖拽道具', '弹幕刷屏', '战报海报'],
    兜底触发词: ['蜂来', 'fenglai'],
    项目卡片映射: { fengLai: ['蜂来', 'fenglai'] },
    boostCategories: ['projects', 'experience'],
    boostSources: ['projects.ts', 'experience.ts'],
  },
  {
    id: 'projects-通用',
    关键词: ['项目', '作品', '做过什么'],
    兜底触发词: [
      '哪些项目',
      '什么项目',
      '做过什么',
      '介绍项目',
      '分享项目',
      '讲解项目',
      '说说项目',
      '谈谈项目',
      '你的项目',
      '项目经历',
      '项目经验',
      '作品有哪些',
      '你的作品',
      '有什么作品',
    ],
    boostCategories: ['projects'],
    boostSources: ['projects.ts'],
  },
  {
    id: 'experience',
    关键词: ['经历', '经验', '工作', '实习', '时间线', 'timeline'],
    兜底触发词: ['工作经历', '工作经验', '实习经历', '实践经历', '职业经历', '我的经历', '有什么经历'],
    boostCategories: ['experience'],
    boostSources: ['experience.ts'],
  },
  {
    id: 'education',
    关键词: ['教育', '学校', '大学', '专业', '学历'],
    兜底触发词: [
      '教育背景',
      '教育经历',
      '什么学历',
      '学历是',
      '你的学历',
      '所学专业',
      '什么专业',
      '专业是什么',
      '你的专业',
      '你的学校',
      '哪所大学',
      '哪个学校',
      '哪所学校',
      '什么学校',
      '学校是',
      '哪个大学',
      '什么大学',
    ],
    boostCategories: ['education'],
    boostSources: ['personalInfo.ts', 'education.ts'],
  },
  {
    id: 'design',
    关键词: ['设计', 'ui', 'ux', 'figma', '品牌'],
    兜底触发词: [],
    boostCategories: ['design'],
    boostSources: ['design.ts'],
  },
  {
    id: 'music',
    关键词: ['音乐', '架子鼓', '证书', '乐器'],
    兜底触发词: [],
    boostCategories: ['music'],
    boostSources: ['music.ts'],
  },
  {
    id: 'media',
    关键词: ['媒体', '视频', 'b站', '小说', '相声', '创作'],
    兜底触发词: [],
    boostCategories: ['media'],
    boostSources: ['media.ts'],
  },
]

/** 触发词命中 = 触发词是问句的子串（归一首尾空白与大小写后）；精度全部由词表数据保证，不做词边界猜测 */
export function 触发词命中(触发词表: string[], 输入: string): boolean {
  const 文本 = (输入 ?? '').trim().toLowerCase()
  if (文本.length === 0) return false
  return 触发词表.some((词) => 词.length > 0 && 文本.includes(词.toLowerCase()))
}

/** 兜底作答命中判定（严）：只消费 `兜底触发词`，不影响 RAG 检索加权 */
export function 命中兜底意图(意图ID: string, 输入: string): boolean {
  const 定义 = 共享意图表.find((项) => 项.id === 意图ID)
  if (!定义) return false
  return 触发词命中(定义.兜底触发词, 输入)
}

/** 与改造前 检测项目卡片 的判定顺序保持一致，避免兜底路径出现新的优先级漂移 */
const 项目卡片检测顺序: 项目卡片标识[] = ['xrm', 'lovewithme', 'fengLai', 'aiConsole']

export function 检测项目卡片(输入: string): 项目卡片标识 | undefined {
  const 触发词池 = new Map<项目卡片标识, string[]>()
  for (const 定义 of 共享意图表) {
    for (const [标识, 词表] of Object.entries(定义.项目卡片映射 ?? {})) {
      const 卡片标识 = 标识 as 项目卡片标识
      触发词池.set(卡片标识, [...(触发词池.get(卡片标识) ?? []), ...词表])
    }
  }
  for (const 标识 of 项目卡片检测顺序) {
    const 词表 = 触发词池.get(标识)
    if (词表 && 触发词命中(词表, 输入)) return 标识
  }
  return undefined
}

const 纯问候集合 = new Set([
  '你好',
  '您好',
  '嗨',
  '哈喽',
  'hello',
  'hi',
  'hey',
  '早上好',
  '下午好',
  '晚上好',
  '在吗',
  '你好啊',
  '您好啊',
  '你好吗',
  '您好吗',
  'hi你好',
  'hello你好',
])

export function 是否纯问候(输入: string): boolean {
  const 归一 = 输入
    .trim()
    .toLowerCase()
    .replace(/[\s,，.。!！?？~～、]+/g, '')
  if (归一.length === 0 || 归一.length > 8) return false
  return 纯问候集合.has(归一)
}

export function 是否感谢(输入: string): boolean {
  const 文本 = 输入.toLowerCase()
  return 文本.includes('谢谢') || 文本.includes('感谢') || 文本.includes('thank')
}

export function 是否告别(输入: string): boolean {
  const 文本 = 输入.toLowerCase()
  return 文本.includes('再见') || 文本.includes('拜拜') || 文本.includes('bye') || 文本.includes('晚安')
}

/** RAG 检索加权判定（宽）：仅供 ragEngine 召回加权使用；兜底作答必须用 命中兜底意图 */
export function 命中共享意图(意图ID: string, 输入: string): boolean {
  const 定义 = 共享意图表.find((项) => 项.id === 意图ID)
  if (!定义) return false
  const 文本 = 输入.toLowerCase()
  return 定义.关键词.some((词) => 文本.includes(词.toLowerCase()))
}
