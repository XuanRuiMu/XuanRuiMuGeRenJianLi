import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Speculation Rules', () => {
  it('index.html 内联 speculationrules 且 JSON 合法', () => {
    const 网页文本 = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8')
    expect(网页文本).not.toContain('rel="speculationrules"')
    const 匹配 = 网页文本.match(/<script type="speculationrules">([\s\S]*?)<\/script>/)
    expect(匹配).not.toBeNull()
    const 规则 = JSON.parse(匹配![1].replace(/%BASE_URL%/g, '/'))
    expect(规则.prerender).toBeDefined()
    expect(规则.prerender.length).toBeGreaterThan(0)
    const 首条规则 = 规则.prerender[0]
    expect(首条规则.source).toBe('list')
    expect(首条规则.urls).toEqual(['/'])
    expect(首条规则.eagerness).toMatch(/^(conservative|moderate|eager)$/)
  })
})
