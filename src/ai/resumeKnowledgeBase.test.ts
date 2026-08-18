import { describe, it, expect } from 'vitest'
import { buildResumeKnowledgeBase, resumeKnowledgeBase } from './resumeKnowledgeBase'

describe('resumeKnowledgeBase', () => {
  it('builds chunks with content and metadata', () => {
    const chunks = buildResumeKnowledgeBase()
    expect(chunks.length).toBeGreaterThan(10)

    for (const chunk of chunks) {
      expect(chunk.id).toBeTruthy()
      expect(chunk.content.length).toBeGreaterThan(0)
      expect(chunk.metadata.category).toBeTruthy()
      expect(chunk.metadata.source).toMatch(/\.ts$|^workspace$/)
    }
  })

  it('covers all resume categories', () => {
    const chunks = buildResumeKnowledgeBase()
    const categories = new Set(chunks.map((chunk) => chunk.metadata.category))

    expect(categories.has('personalInfo')).toBe(true)
    expect(categories.has('projects')).toBe(true)
    expect(categories.has('experience')).toBe(true)
    expect(categories.has('education')).toBe(true)
    expect(categories.has('design')).toBe(true)
    expect(categories.has('music')).toBe(true)
    expect(categories.has('media')).toBe(true)
  })

  it('exports a pre-built knowledge base', () => {
    expect(resumeKnowledgeBase.length).toBeGreaterThan(10)
    expect(resumeKnowledgeBase[0]).toHaveProperty('metadata')
  })

  it('includes project-specific chunks', () => {
    const chunks = buildResumeKnowledgeBase()
    const projectChunks = chunks.filter((chunk) => chunk.metadata.category === 'projects')
    expect(projectChunks.length).toBeGreaterThanOrEqual(4)
  })
})
