import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import zhCN from '../i18n/zh-CN.json'
import { t } from '../i18n/translations'
import { personalInfo } from './personalInfo'
import { careerFocus, 岗位名表, 求职方向 } from './careerFocus'
import { 量化指标, 技能组表 } from './skillGroups'
import { getLocalAnswer } from '../ai/localEngine'
import { buildResumeKnowledgeBase } from '../ai/resumeKnowledgeBase'

const 项目根 = path.resolve(__dirname, '../..')

function 读源码(相对路径: string): string {
  return fs.readFileSync(path.resolve(项目根, 相对路径), 'utf-8')
}

/** 轮换岗位的唯一可编辑源（独立于 careerFocus 的解析实现，充当预言） */
const 岗位清单文件 = '职业定位.txt'

function 岗位清单解析(原文: string): string[] {
  return 原文
    .split(/\r?\n/)
    .map((行) => 行.trim())
    .filter((行) => 行.length > 0 && !/^#/.test(行))
}

const 清单岗位 = 岗位清单解析(读源码(岗位清单文件))

function 收集文本(值: unknown): string[] {
  if (typeof 值 === 'string') return [值]
  if (Array.isArray(值)) return 值.flatMap(收集文本)
  if (值 !== null && typeof 值 === 'object') return Object.values(值 as Record<string, unknown>).flatMap(收集文本)
  return []
}

/** 旧定位字面量 + 当前单一源岗位名：任何消费者源码再出现即视为重新硬编码 */
const 禁止硬编码字面量 = [
  ...岗位名表(),
  '全栈开发工程师',
  'Java后端开发',
  '主写Java后端',
  'AI工具开发',
  '游戏服务端架构',
  'DevOps工程师',
  '5000+',
]

const 消费者源码表 = [
  'src/data/careerFocus.ts',
  'src/features/hero/RoleTicker.tsx',
  'src/lib/resume.ts',
  'src/ai/resumeKnowledgeBase.ts',
  'src/ai/localEngine.ts',
  'src/data/personalInfo.ts',
  'src/data/types.ts',
  'src/features/about/AboutSection.tsx',
]

describe('FP-01 求职定位单一数据源守卫', () => {
  it('career 节点齐备：方向/aria前缀/薪资，岗位键已移交 职业定位.txt', () => {
    expect(求职方向()).toBe(t(careerFocus.directionKey))
    expect(求职方向()).toContain('AI应用工程师')
    expect('roles' in zhCN.career).toBe(false)
    expect(t(careerFocus.roleTickerAriaKey)).toBe('多重身份：')
    expect(t(careerFocus.salaryKey)).toBe('面议')
  })

  it('岗位名表逐行等于 职业定位.txt 的解析结果（注释与空行不外泄）', () => {
    const 岗位 = 岗位名表()
    expect(岗位).toEqual(清单岗位)
    expect(岗位.length).toBeGreaterThan(0)
    expect(岗位.every((名) => 名 !== '' && 名 === 名.trim())).toBe(true)
    expect(岗位.some((名) => 名.startsWith('#'))).toBe(false)
  })

  it('消费者源码零岗位名/旧定位硬编码（下次有人硬编码即红）', () => {
    for (const 路径 of 消费者源码表) {
      const 源码 = 读源码(路径)
      for (const 字面量 of 禁止硬编码字面量) {
        expect(源码, `${路径} 不得硬编码「${字面量}」`).not.toContain(字面量)
      }
    }
  })

  it('careerFocus.ts 自身读单一源而非字面量（假覆盖守卫：改回硬编码或读回 JSON 即红）', () => {
    const 源码 = 读源码('src/data/careerFocus.ts')
    expect(源码).toContain("directionKey: 'career.direction'")
    expect(源码).toContain('t(careerFocus.directionKey)')
    expect(源码).toContain("from '../../职业定位.txt?raw'")
    expect(源码).not.toContain('career.roles')
    // 返回值必须来自 t()/txt 解析，不允许出现任何带定位文案的字符串字面量
    const 字符串字面量表 = 源码.match(/(['"`])((?:\\.|(?!\1)[^\\])*)\1/g) ?? []
    for (const 字面量 of 字符串字面量表) {
      for (const 禁止 of 禁止硬编码字面量) {
        expect(字面量, `careerFocus.ts 的字面量不得含定位文案「${禁止}」`).not.toContain(禁止)
      }
    }
    expect(求职方向()).toBe(t('career.direction'))
    expect(岗位名表()).toEqual(清单岗位)
  })

  it('personalInfo 薪资已改 salaryKey 且指向 career.salary', () => {
    expect(personalInfo.salaryKey).toBe(careerFocus.salaryKey)
    expect('salary' in personalInfo).toBe(false)
  })

  it('about 板块无定位副标题第二源', () => {
    expect('subtitle' in zhCN.about).toBe(false)
    const about文本 = 收集文本(zhCN.about).join('\n')
    expect(about文本, 'about 板块不得复制整串 career.direction').not.toContain(求职方向())
  })

  it('知识库个人简介读单一源的求职方向与薪资', () => {
    const 简介 = buildResumeKnowledgeBase().find((块) => 块.id === 'personal-info-bio')
    expect(简介?.content).toContain(`求职方向：${求职方向()}。`)
    expect(简介?.content).toContain('薪资期望：面议。')
  })

  it('翻译文本无旧定位残留', () => {
    const 翻译文本 = 收集文本(zhCN).join('\n')
    for (const 残留 of [
      '全栈开发工程师',
      'Java后端开发',
      'AI工具开发',
      '游戏服务端架构',
      'DevOps工程师',
      '5000+',
      '主写',
      'Java后端',
      'Java 后端',
    ]) {
      expect(翻译文本, `翻译文本不得残留「${残留}」`).not.toContain(残留)
    }
  })

  it('AI助手的目标岗位/自我介绍不复制定位文案，运行时由 careerFocus 注入', () => {
    expect(t('chat.answers.name')).toContain('{direction}')
    expect(t('chat.answers.target')).toContain('{direction}')
    expect(getLocalAnswer('你叫什么名字').content).toContain(求职方向())
    expect(getLocalAnswer('你的目标岗位是什么').content).toBe(`我的求职方向：${求职方向()}。`)
    expect(getLocalAnswer('你叫什么名字').content).not.toContain('{direction}')
  })

  it('AI 知识库有技能板块语料（技能组 + 量化指标）', () => {
    const 库 = buildResumeKnowledgeBase()
    const 技能块 = 库.filter((块) => 块.metadata.source === 'skillGroups.ts')
    expect(技能块.length).toBe(技能组表().length + 1)
    const 全文 = 技能块.map((块) => 块.content).join('\n')
    for (const 组 of 技能组表()) {
      expect(全文, `知识库缺能力组「${组.label}」`).toContain(组.label)
      for (const 条 of 组.items) expect(全文).toContain(条)
    }
    for (const 指标 of 量化指标()) {
      expect(全文, `知识库缺量化指标「${指标.label}」`).toContain(指标.value)
      expect(全文).toContain(指标.label)
    }
    expect(库.some((块) => 块.metadata.category === 'skills')).toBe(true)
  })

  it('index.html 与 manifest.json 内嵌 career.direction 且无 Java 后端定位残留', () => {
    for (const 路径 of ['index.html', 'public/manifest.json']) {
      const 内容 = 读源码(路径)
      expect(内容, `${路径} 应内嵌 career.direction`).toContain(求职方向())
      expect(内容, `${路径} 不得残留 Java 后端定位`).not.toContain('Java 后端')
      expect(内容, `${路径} 不得残留 5000+`).not.toContain('5000+')
    }
  })

  it('FP-02b：index.html 除 career.direction 外不再出现任何岗位名（keywords 不得成为第二数据源）', () => {
    const 内容 = 读源码('index.html')
    const 关键词 = 内容.match(/<meta\s+name="keywords"\s+content="([^"]*)"/)
    expect(关键词, 'index.html 应保留品牌/技术关键词').not.toBeNull()
    for (const 词 of ['玄锐暮', '简历', 'AI-Native', 'React', '个人网站']) {
      expect(关键词![1], `meta keywords 应保留品牌/技术词「${词}」`).toContain(词)
    }
    for (const 岗位 of 岗位名表()) {
      expect(关键词![1], `meta keywords 不得硬编码岗位「${岗位}」`).not.toContain(岗位)
    }
    // 岗位名只允许作为 career.direction 的组成部分出现，其余位置都是第二数据源
    const 去掉方向的页面 = 内容.split(求职方向()).join('')
    for (const 岗位 of 岗位名表()) {
      expect(去掉方向的页面, `index.html 出现方向之外的岗位「${岗位}」= 第二数据源`).not.toContain(岗位)
    }
  })
})
