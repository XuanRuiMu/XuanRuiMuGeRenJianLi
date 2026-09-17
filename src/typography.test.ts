import { describe, it, expect } from 'vitest'
import 中文包 from './i18n/zh-CN.json'
import { t } from './i18n/translations'
import { buildResumeKnowledgeBase } from './ai/resumeKnowledgeBase'

const 中文字符 = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff'
const 字母数字 = 'A-Za-z0-9⌘⏎✻○✕'

const 禁止模式 = [
  new RegExp(`[${中文字符}] +[${字母数字}]`),
  new RegExp(`[${字母数字}] +[${中文字符}]`),
  new RegExp(`[${字母数字}${中文字符}] +[+/] +[${字母数字}${中文字符}]`),
  new RegExp(`[+/] +[${字母数字}${中文字符}]`),
  new RegExp(`[${字母数字}${中文字符}] +[+/]`),
]

function 收集文本(值: unknown): string[] {
  if (typeof 值 === 'string') return [值]
  if (Array.isArray(值)) return 值.flatMap(收集文本)
  if (值 !== null && typeof 值 === 'object') return Object.values(值 as Record<string, unknown>).flatMap(收集文本)
  return []
}

function 断言零违规(文本表: string[], 来源: string): void {
  const 违规 = 文本表.filter((文本) => 禁止模式.some((模式) => 模式.test(文本)))
  expect(违规.map((文本) => `${来源}：${文本.slice(0, 80)}`)).toEqual([])
}

describe('FP-03排版回归：中英/中数相邻零空格', () => {
  it('翻译文本零违规（英文内部与·分隔符保留）', () => {
    断言零违规(收集文本(中文包), 'zh-CN')
  })

  it('知识库文本零违规', () => {
    const 知识库文本 = buildResumeKnowledgeBase().map((chunk) => chunk.content)
    断言零违规(知识库文本, 'knowledgeBase')
  })

  it('典型写法已收敛', () => {
    expect(t('command.copyGithub')).toBe('复制GitHub')
    expect(t('showcase.cards.teaching.desc')).toBe('编写、格式规范到提交全链路拆解')
    expect(t('data.projects.xrm.metrics.systems')).toBe('8世界/32职业')
    expect(t('data.projects.fengLai.metrics.stack')).toBe('纯前端无后端')
  })
})
