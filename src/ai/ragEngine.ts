import { resumeKnowledgeBase, type KnowledgeChunk } from './resumeKnowledgeBase'
import { 共享意图表, 是否纯问候 } from './intentTable'
import { RAG检索最低分 } from './deepseekConfig'

export interface RetrievedChunk extends KnowledgeChunk {
  score: number
}

function tokenize(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, ' ')
    .trim()

  const words: string[] = []
  const chinese = normalized.match(/[\u4e00-\u9fa5]/g) ?? []
  words.push(...chinese)

  const alphanumeric = normalized.match(/[a-z0-9]+/g) ?? []
  words.push(...alphanumeric)

  return words
}

function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>()
  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1)
  }
  return freq
}

function computeIdf(docs: string[][]): Map<string, number> {
  const docCount = docs.length
  const termDocCount = new Map<string, number>()

  for (const doc of docs) {
    const seen = new Set(doc)
    for (const term of seen) {
      termDocCount.set(term, (termDocCount.get(term) ?? 0) + 1)
    }
  }

  const idf = new Map<string, number>()
  for (const [term, count] of termDocCount.entries()) {
    idf.set(term, Math.log((docCount + 1) / (count + 1)) + 1)
  }
  return idf
}

function vectorize(tokens: string[], idf: Map<string, number>): Map<string, number> {
  const tf = termFrequency(tokens)
  const vec = new Map<string, number>()
  for (const [term, count] of tf.entries()) {
    const weight = (idf.get(term) ?? 0) * (1 + Math.log(count))
    vec.set(term, weight)
  }
  return vec
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0
  let normA = 0
  let normB = 0

  for (const [term, weight] of a.entries()) {
    normA += weight * weight
    const bw = b.get(term) ?? 0
    dot += weight * bw
  }

  for (const weight of b.values()) {
    normB += weight * weight
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function applyPatternBoost(question: string, score: number, chunk: KnowledgeChunk): number {
  const 文本 = question.toLowerCase()
  let bonus = 0
  for (const 定义 of 共享意图表) {
    if (定义.关键词.some((词) => 文本.includes(词.toLowerCase()))) {
      if (定义.boostCategories.includes(chunk.metadata.category)) bonus += 0.35
      if (定义.boostSources.includes(chunk.metadata.source)) bonus += 0.25
    }
  }
  return score + bonus
}

export function retrieveChunks(question: string, topK = 5, 最低分: number = RAG检索最低分): RetrievedChunk[] {
  if (是否纯问候(question)) return []
  const queryTokens = tokenize(question)
  if (queryTokens.length === 0) return []

  const docTokens = resumeKnowledgeBase.map((chunk) => tokenize(chunk.content))
  const idf = computeIdf([queryTokens, ...docTokens])
  const queryVector = vectorize(queryTokens, idf)

  const scored = resumeKnowledgeBase.map((chunk, index) => {
    const docVector = vectorize(docTokens[index], idf)
    const baseScore = cosineSimilarity(queryVector, docVector)
    const boostedScore = applyPatternBoost(question, baseScore, chunk)
    return { ...chunk, score: boostedScore }
  })

  return scored
    .filter((项) => 项.score >= 最低分)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
}
