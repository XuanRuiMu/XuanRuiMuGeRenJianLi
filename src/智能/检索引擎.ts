import { 简历知识库, type 知识块 } from './简历知识库'
import { 共享意图表, 命中共享意图, 是否纯问候 } from './意图表'
import { RAG检索最低分 } from './深度求索配置'

export interface 检索结果块 extends 知识块 {
  得分: number
}

function 分词(文本: string): string[] {
  const 已归一 = 文本
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, ' ')
    .trim()

  const 词表: string[] = []
  const 中文 = 已归一.match(/[\u4e00-\u9fa5]/g) ?? []
  词表.push(...中文)

  const 字母数字 = 已归一.match(/[a-z0-9]+/g) ?? []
  词表.push(...字母数字)

  return 词表
}

function 词条频率(词元表: string[]): Map<string, number> {
  const 频率 = new Map<string, number>()
  for (const 词元 of 词元表) {
    频率.set(词元, (频率.get(词元) ?? 0) + 1)
  }
  return 频率
}

function 计算逆文档频率(文档表: string[][]): Map<string, number> {
  const 文档数 = 文档表.length
  const 词条文档数 = new Map<string, number>()

  for (const 文档 of 文档表) {
    const 已见 = new Set(文档)
    for (const 词条 of 已见) {
      词条文档数.set(词条, (词条文档数.get(词条) ?? 0) + 1)
    }
  }

  const 逆文档频率 = new Map<string, number>()
  for (const [词条, count] of 词条文档数.entries()) {
    逆文档频率.set(词条, Math.log((文档数 + 1) / (count + 1)) + 1)
  }
  return 逆文档频率
}

function 向量化(词元表: string[], 逆文档频率: Map<string, number>): Map<string, number> {
  const 翻译 = 词条频率(词元表)
  const 向量 = new Map<string, number>()
  for (const [词条, count] of 翻译.entries()) {
    const 权重 = (逆文档频率.get(词条) ?? 0) * (1 + Math.log(count))
    向量.set(词条, 权重)
  }
  return 向量
}

function 余弦相似度(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0
  let normA = 0
  let normB = 0

  for (const [词条, 权重] of a.entries()) {
    normA += 权重 * 权重
    const bw = b.get(词条) ?? 0
    dot += 权重 * bw
  }

  for (const 权重 of b.values()) {
    normB += 权重 * 权重
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function 应用模式加权(问题: string, 得分: number, 分块: 知识块): number {
  let 加成 = 0
  for (const 定义 of 共享意图表) {
    if (命中共享意图(定义.id, 问题)) {
      if (定义.加权分类.includes(分块.元数据.分类)) 加成 += 0.35
      if (定义.加权来源.includes(分块.元数据.来源)) 加成 += 0.25
    }
  }
  return 得分 + 加成
}

export function 检索知识块(问题: string, 候选数 = 5, 最低分: number = RAG检索最低分): 检索结果块[] {
  if (是否纯问候(问题)) return []
  const 查询词元表 = 分词(问题)
  if (查询词元表.length === 0) return []

  const 文档词元表 = 简历知识库.map((分块) => 分词(分块.content))
  const 逆文档频率 = 计算逆文档频率([查询词元表, ...文档词元表])
  const 查询向量 = 向量化(查询词元表, 逆文档频率)

  const 已评分 = 简历知识库.map((分块, 下标) => {
    const 文档向量 = 向量化(文档词元表[下标], 逆文档频率)
    const 基础得分 = 余弦相似度(查询向量, 文档向量)
    const 加权得分 = 应用模式加权(问题, 基础得分, 分块)
    return { ...分块, 得分: 加权得分 }
  })

  return 已评分
    .filter((项) => 项.得分 >= 最低分)
    .sort((a, b) => b.得分 - a.得分)
    .slice(0, 候选数)
}
