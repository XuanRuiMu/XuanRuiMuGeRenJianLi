import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Speculation Rules', () => {
  it('serves a valid speculation rules JSON', () => {
    const rulesPath = path.resolve(__dirname, '../public/speculation-rules.json')
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'))
    expect(rules.prerender).toBeDefined()
    expect(rules.prerender.length).toBeGreaterThan(0)

    const firstRule = rules.prerender[0]
    expect(firstRule.source).toBe('list')
    expect(firstRule.urls).toContain('/')
    expect(firstRule.eagerness).toMatch(/^(conservative|moderate|eager)$/)
  })

  it('references speculation rules from index.html', () => {
    const html = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8')
    expect(html).toContain('rel="speculationrules"')
    expect(html).toContain('/speculation-rules.json')
  })
})
