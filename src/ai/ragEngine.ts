import { resumeKnowledgeBase, type KnowledgeChunk } from './resumeKnowledgeBase'

export interface RetrievedChunk extends KnowledgeChunk {
  score: number
}

interface PatternRule {
  patterns: RegExp[]
  boostCategories: string[]
  boostSources: string[]
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

const PATTERN_RULES: PatternRule[] = [
  {
    patterns: [/你是谁/, /叫什么/, /名字/, /姓名/, /自我介绍一下/, /介绍一下自己/],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
  {
    patterns: [/最擅长/, /擅长/, /优势/, /核心竞争力/],
    boostCategories: ['techStack'],
    boostSources: ['workspace'],
  },
  {
    patterns: [/技术栈/, /用什么技术/, /技术/, /技能/, /会什么/],
    boostCategories: ['techStack'],
    boostSources: ['workspace'],
  },
  {
    patterns: [/已删除的经历/, /xrm/, /mmorpg/, /服务端/],
    boostCategories: ['projects', 'experience'],
    boostSources: ['projects.ts', 'experience.ts'],
  },
  {
    patterns: [/已删除的经历/],
    boostCategories: ['projects'],
    boostSources: ['projects.ts'],
  },
  {
    patterns: [/项目/, /作品/, /做过什么/],
    boostCategories: ['projects'],
    boostSources: ['projects.ts'],
  },
  {
    patterns: [/经历/, /经验/, /工作/, /实习/],
    boostCategories: ['experience'],
    boostSources: ['experience.ts'],
  },
  {
    patterns: [/教育/, /学校/, /大学/, /专业/, /学历/],
    boostCategories: ['education'],
    boostSources: ['personalInfo.ts', 'education.ts'],
  },
  {
    patterns: [/设计/, /ui/, /ux/, /figma/, /品牌/],
    boostCategories: ['design'],
    boostSources: ['design.ts'],
  },
  {
    patterns: [/音乐/, /歌曲/, /编曲/, /midi/, /乐器/],
    boostCategories: ['music'],
    boostSources: ['music.ts'],
  },
  {
    patterns: [/媒体/, /视频/, /b站/, /小说/, /相声/, /创作/],
    boostCategories: ['media'],
    boostSources: ['media.ts'],
  },
  {
    patterns: [/联系方式/, /邮箱/, /电话/, /github/, /bilibili/, /怎么联系/],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
  {
    patterns: [/岗位/, /职位/, /目标/, /求职/, /期望/],
    boostCategories: ['personalInfo'],
    boostSources: ['personalInfo.ts'],
  },
]

function applyPatternBoost(question: string, score: number, chunk: KnowledgeChunk): number {
  let bonus = 0
  for (const rule of PATTERN_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(question))) {
      if (rule.boostCategories.includes(chunk.metadata.category)) bonus += 0.35
      if (rule.boostSources.includes(chunk.metadata.source)) bonus += 0.25
    }
  }
  return score + bonus
}

export function retrieveChunks(question: string, topK = 5): RetrievedChunk[] {
  const queryTokens = tokenize(question)
  if (queryTokens.length === 0) {
    return resumeKnowledgeBase.slice(0, topK).map((chunk) => ({ ...chunk, score: 0 }))
  }

  const docTokens = resumeKnowledgeBase.map((chunk) => tokenize(chunk.content))
  const idf = computeIdf([queryTokens, ...docTokens])
  const queryVector = vectorize(queryTokens, idf)

  const scored = resumeKnowledgeBase.map((chunk, index) => {
    const docVector = vectorize(docTokens[index], idf)
    const baseScore = cosineSimilarity(queryVector, docVector)
    const boostedScore = applyPatternBoost(question, baseScore, chunk)
    return { ...chunk, score: boostedScore }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, topK)
}
