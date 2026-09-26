import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import zhCN from '../i18n/zh-CN.json'
import { t, type TranslationKey } from '../i18n/translations'
import { 推荐语id表, 推荐语列表 } from './testimonials'

const 项目根 = path.resolve(__dirname, '../..')
const 板块节点 = zhCN.testimonials as Record<string, unknown>
const 条目表 = zhCN.testimonials.items as Record<string, { role: string; quote: string; context: string }>
const 组件路径 = 'src/features/testimonials/TestimonialsSection.tsx'

/** 用户明令只留这两类推荐人，旧条目名再出现即为回潮 */
const 已删除id表 = ['graduate', 'player', 'collaborator']

/** 已删除的说明性文案键：元说明类句子不得再有载体 */
const 已删除键表 = ['subtitle', 'note']

/**
 * 文案红线：翻译文件全仓守卫（careerFocus/contentConsistency 已钉）+
 * 技能与推荐语类文本的影子工具词（他没有真实用过，不得写进推荐语）。
 */
const 禁止词表 = [
  '原创歌曲',
  '架子鼓',
  '爵士乐',
  '乐理',
  '频谱',
  '音乐经历',
  '逃脱',
  '283',
  '突击课',
  '突击辅导',
  'Java后端',
  '5000+',
  '主写',
  '全栈开发工程师',
  'AI工具开发',
  '游戏服务端架构',
  'DevOps工程师',
  'RAG',
  'LangChain',
  'Dify',
  'Coze',
  '影刀',
  'UiPath',
  '宜搭',
  '微搭',
  '简道云',
  '向量数据库',
  'Milvus',
  'Qdrant',
  'pgvector',
  'Embedding',
  '代表性汇总',
  '非特定个人署名',
]

function 收集文本(值: unknown): string[] {
  if (typeof 值 === 'string') return [值]
  if (Array.isArray(值)) return 值.flatMap(收集文本)
  if (值 !== null && typeof 值 === 'object') return Object.values(值 as Record<string, unknown>).flatMap(收集文本)
  return []
}

/** 覆盖整个 testimonials 节点：文案从哪个键渲染出来都跑不出红线守卫 */
function 板块全文(): string {
  return [...收集文本(板块节点), ...推荐语列表().map((卡片) => `${卡片.role}\n${卡片.quote}\n${卡片.context}`)].join(
    '\n'
  )
}

describe('FP-05 推荐语数据源：两条、单一文案源', () => {
  it('id 表与 JSON 键集一致（新增条目不会被漏渲染）', () => {
    expect([...推荐语id表]).toEqual(['student', 'aiDeveloper'])
    expect(Object.keys(条目表).sort()).toEqual([...推荐语id表].sort())
    expect(推荐语列表().map((卡片) => 卡片.id)).toEqual([...推荐语id表])
  })

  it('role/quote/context 逐字来自翻译文件且全部非空', () => {
    const 卡片表 = 推荐语列表()
    expect(卡片表).toHaveLength(2)
    for (const 卡片 of 卡片表) {
      for (const 字段 of ['role', 'quote', 'context'] as const) {
        expect(卡片[字段], `${卡片.id}.${字段} 不得为空`).toBe(条目表[卡片.id][字段])
        expect(卡片[字段].trim()).not.toBe('')
        expect(卡片[字段]).toBe(t(`testimonials.items.${卡片.id}.${字段}` as unknown as TranslationKey))
      }
    }
  })

  it('板块标题键保留但值为空，仅移除独立标题', () => {
    expect(板块节点.title).toBe('')
  })

  it('副标题与免责说明键已删除，旧条目键不残留（反向守卫：加回即红）', () => {
    for (const 键 of [...已删除键表, ...已删除id表]) {
      expect(键 in 板块节点, `testimonials.${键} 已按用户要求删除`).toBe(false)
    }
  })

  it('推荐语全文不含文案红线词与元说明', () => {
    const 全文 = 板块全文()
    for (const 词 of 禁止词表) {
      expect(全文, `推荐语文案不得出现「${词}」`).not.toContain(词)
    }
  })

  it('正文为平实叙述：不用引号装饰外的营销句式，且不编造可核实细节', () => {
    const 全文 = 板块全文()
    for (const 营销词 of ['少走弯路', '少走很多弯路', '稳稳地开', '拿来就能改', '上手很快', '一手打造', '全流程护航']) {
      expect(全文, `推荐语不得残留宣传腔「${营销词}」`).not.toContain(营销词)
    }
    expect(全文).not.toMatch(/20\d{2}年/)
    expect(全文).not.toMatch(/\d+\+位|\d+\+名/)
  })

  it('quote 为空的条目被跳过，其余条目不受影响', () => {
    const 原文 = 条目表.student.quote
    try {
      条目表.student.quote = '   '
      expect(推荐语列表().map((卡片) => 卡片.id)).toEqual(['aiDeveloper'])
    } finally {
      条目表.student.quote = 原文
    }
    expect(推荐语列表().map((卡片) => 卡片.id)).toEqual(['student', 'aiDeveloper'])
  })

  it('脏数据（字段类型错误、条目缺失）不抛异常', () => {
    const 原学员 = 条目表.student
    const 原开发者 = 条目表.aiDeveloper
    try {
      条目表.student = null as unknown as { role: string; quote: string; context: string }
      条目表.aiDeveloper = { role: 1, quote: ['数组'], context: undefined } as unknown as {
        role: string
        quote: string
        context: string
      }
      const 卡片表 = 推荐语列表()
      expect(Array.isArray(卡片表)).toBe(true)
      for (const 卡片 of 卡片表) {
        for (const 字段 of ['role', 'quote', 'context'] as const) expect(typeof 卡片[字段]).toBe('string')
      }
    } finally {
      条目表.student = 原学员
      条目表.aiDeveloper = 原开发者
    }
    expect(推荐语列表()).toHaveLength(2)
  })
})

describe('FP-05 推荐语组件：不再硬编码卡片清单与文案', () => {
  const 源码 = fs.readFileSync(path.resolve(项目根, 组件路径), 'utf-8')

  it('卡片清单来自数据层，组件里没有魔法 id 数组', () => {
    expect(源码).toContain('推荐语列表')
    expect(源码).not.toContain('ITEMS')
    for (const id of [...已删除id表, ...推荐语id表]) {
      expect(源码, `组件不得再内联卡片 id「${id}」`).not.toContain(`'${id}'`)
    }
  })

  it('组件不再引用已删除的副标题与免责说明键', () => {
    for (const 键 of 已删除键表) {
      expect(源码, `组件不得再引用 testimonials.${键}`).not.toContain(`testimonials.${键}`)
    }
    expect(源码).not.toContain('subtitle=')
  })

  it('组件不内联任何推荐语文案', () => {
    for (const 条目 of Object.values(条目表)) {
      for (const 文本 of [条目.role, 条目.quote, 条目.context]) {
        expect(源码, `组件不得硬编码「${文本.slice(0, 20)}」`).not.toContain(文本)
      }
    }
  })

  it('两条并排：网格为 2 列', () => {
    expect(源码).toContain('md:grid-cols-2')
    expect(源码).not.toContain('md:grid-cols-3')
  })

  it('板块契约 id 未变', () => {
    expect(源码).toContain('<Section id="testimonials"')
  })
})
