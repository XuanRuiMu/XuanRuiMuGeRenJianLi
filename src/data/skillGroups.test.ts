import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import zhCN from '../i18n/zh-CN.json'
import { ta } from '../i18n/translations'
import { 量化指标, 技能组表 } from './skillGroups'

const 项目根 = path.resolve(__dirname, '../..')
const 指标表 = zhCN.skills.metrics as Record<string, { value: string; label: string }>
const 分组表 = zhCN.skills.groups as Record<
  string,
  { label: string; description: string; items: string[]; tags: string[] }
>

/**
 * 红线守卫：以下工具/组件他没有真实做过，只能出现在「求职方向」里，
 * 绝不允许写成已掌握技能或技能标签（报告 4.2 引上海人社局口径「严禁虚构经历」）。
 */
const 影子技能词表 = [
  '影刀',
  'UiPath',
  'UiBot',
  '来也',
  'Power Automate',
  '宜搭',
  '微搭',
  '简道云',
  '明道云',
  'Milvus',
  'Qdrant',
  'pgvector',
  'LangChain',
  'Dify',
  'Coze',
  'RAG',
  '向量数据库',
  'Embedding',
]

function 技能板块全文(): string {
  const 分组文本 = 技能组表()
    .map((组) => [组.label, 组.description, ...组.items, ...组.tags].join('\n'))
    .join('\n')
  const 指标文本 = 量化指标()
    .map((指标) => `${指标.value} ${指标.label}`)
    .join('\n')
  const 雷达文本 = Object.values(zhCN.data.radar.dimensions)
    .map((维度) => `${维度.label}\n${维度.description}\n${维度.basis}`)
    .join('\n')
  return `${分组文本}\n${指标文本}\n${雷达文本}`
}

describe('FP-04 技能板块量化指标', () => {
  it('4 项语义化指标齐备，数据层顺序与 JSON 键序一致', () => {
    expect(Object.keys(指标表)).toEqual(['javaClasses', 'aiSkills', 'agentSkills', 'serverOps'])
    expect(量化指标().map((指标) => 指标.id)).toEqual(Object.keys(指标表))
  })

  it('4 个数字一个都没丢，且标签逐字来自翻译文件', () => {
    const 值表 = Object.fromEntries(量化指标().map((指标) => [指标.id, 指标.value]))
    expect(值表).toEqual({ javaClasses: '400+', aiSkills: '85+', agentSkills: '9', serverOps: '7年' })
    expect(量化指标().find((指标) => 指标.id === 'javaClasses')?.label).toBe('自研Java类')
    expect(量化指标().find((指标) => 指标.id === 'aiSkills')?.label).toBe('可复用AI工作流模板')
    expect(量化指标().find((指标) => 指标.id === 'agentSkills')?.label).toBe('开源Agent技能')
    expect(量化指标().find((指标) => 指标.id === 'serverOps')?.label).toBe('独立服务器运维')
  })

  it('量化指标全部为 AI/IT 项：教学类旧指标（课程数/论文数）不得回流', () => {
    const 指标文本 = 量化指标()
      .map((指标) => `${指标.value} ${指标.label}`)
      .join('\n')
    for (const 旧值 of ['10+', '50+']) {
      expect(指标文本, `量化指标不得含教学类旧值「${旧值}」`).not.toContain(旧值)
    }
    expect(量化指标()).toHaveLength(4)
  })

  it('value 含可解析数字，useCountUp 能滚动到终态', () => {
    for (const 指标 of 量化指标()) {
      expect(指标.value).toMatch(/\d+/)
      expect(指标.label.trim()).not.toBe('')
    }
    // 「9」是纯数字（无前后缀），「7年」是数字+中文后缀：两类都要能被 useCountUp 解析出滚动目标
    const 纯数字 = 量化指标().find((指标) => 指标.id === 'agentSkills')!.value
    const 带中文后缀 = 量化指标().find((指标) => 指标.id === 'serverOps')!.value
    expect(纯数字).toMatch(/^\d+$/)
    expect(带中文后缀).toMatch(/^\d+年$/)
  })
})

describe('FP-03 技能分组数据源', () => {
  it('恰好 4 组且第一组是 AI Agent能力', () => {
    const 分组 = 技能组表()
    expect(分组.map((组) => 组.id)).toEqual(Object.keys(分组表))
    expect(分组.map((组) => 组.id)).toEqual(['aiAgent', 'backend', 'frontend', 'delivery'])
    expect(分组[0].label).toBe('AI Agent能力')
  })

  it('每组 label/description/items/tags 均非空，条目与标签逐字来自翻译文件', () => {
    const 分组 = 技能组表()
    expect(分组.length).toBeGreaterThan(0)
    for (const 组 of 分组) {
      expect(组.label.trim()).not.toBe('')
      expect(组.description.trim()).not.toBe('')
      expect(组.items.length).toBeGreaterThanOrEqual(4)
      expect(组.tags.length).toBeGreaterThanOrEqual(6)
      expect(组.items).toEqual(ta(`skills.groups.${组.id}.items` as never))
      expect(组.tags).toEqual(ta(`skills.groups.${组.id}.tags` as never))
      for (const 条 of [...组.items, ...组.tags]) expect(条.trim()).not.toBe('')
    }
  })

  it('AI Agent 组 5 条陈述按报告 4.2 的面试官语言，逐条对齐规格', () => {
    const 陈述 = 技能组表()[0].items
    expect(陈述).toHaveLength(5)
    expect(陈述[0]).toBe('用Claude Code/Codex/Trae/WorkBuddy等编码与办公智能体完成真实项目')
    expect(陈述[1]).toContain('85+个可复用AI工作流模板')
    expect(陈述[2]).toContain('MCP+Hooks+Rules的AI编码规范约束体系')
    expect(陈述[3]).toContain('多智能体协作流程')
    expect(陈述[3]).toContain('循环工程')
    expect(陈述[4]).toContain('用AI Agent独立交付多个已上线产品')
  })

  it('实施交付组含规格要求的关键词，覆盖软件实施岗笔试口径', () => {
    const 标签 = 技能组表().find((组) => 组.id === 'delivery')?.tags ?? []
    for (const 词 of ['SQL', 'Linux', 'Postman', 'REST API', '需求调研', '用户培训', '文档编写']) {
      expect(标签, `实施交付组标签缺「${词}」`).toContain(词)
    }
  })

  it('技能板块全文不出现影子技能词（守卫：防止以后又加回去）', () => {
    const 全文 = 技能板块全文()
    for (const 词 of 影子技能词表) {
      expect(全文, `技能数据不得把「${词}」写成已掌握技能`).not.toContain(词)
    }
    expect(技能板块全文()).not.toContain('音乐')
    expect(技能板块全文()).not.toContain('架子鼓')
    expect(技能板块全文()).not.toContain('内容创作')
  })

  it('雷达文案为面试官语言：不复用原术语、不自证可核实', () => {
    const 维度表 = zhCN.data.radar.dimensions as Record<string, { label: string; description: string; basis: string }>
    const 雷达文本 = Object.values(维度表)
      .map((维度) => `${维度.label}\n${维度.description}\n${维度.basis}`)
      .join('\n')
    for (const 术语 of ['Skill', 'skill', 'Hooks', 'Rules']) {
      expect(雷达文本, `雷达文案不得把原术语「${术语}」当解释`).not.toContain(术语)
    }
    expect(雷达文本).not.toContain('可核实')
  })

  it('旧技能标签树已清除，组件不再硬编码板块文案', () => {
    expect('categories' in zhCN.skills).toBe(false)
    expect('skills' in zhCN.data).toBe(false)
    // 注释里的说明性中文不算硬编码文案，先看出去注释后的源码
    const 源码 = fs
      .readFileSync(path.resolve(项目根, 'src/features/skills/SkillsSection.tsx'), 'utf-8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    for (const 文本 of [
      ...Object.values(分组表).map((组) => 组.label),
      ...Object.values(指标表).map((项) => 项.label),
    ]) {
      expect(源码, `SkillsSection 不得硬编码「${文本}」`).not.toContain(文本)
    }
  })
})
