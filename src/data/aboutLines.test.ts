import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import zhCN from '../i18n/zh-CN.json'
import { 关于我介绍行, type 关于我样式 } from './aboutLines'

const 项目根 = path.resolve(__dirname, '../..')
const 行表 = zhCN.about.introLines as Record<string, { text: string; style: string }>
const 行id集 = Object.keys(行表)
const 合法样式: 关于我样式[] = ['normal', 'tech', 'accent']

describe('FP-02 关于我结构化行', () => {
  it('每行都有非空 text、合法 style，无空行', () => {
    expect(行id集.length).toBeGreaterThan(0)
    for (const id of 行id集) {
      expect(行表[id].text.trim(), `${id} 行文案不得为空`).not.toBe('')
      expect(合法样式, `${id} 行 style 非法`).toContain(行表[id].style)
    }
  })

  it('数据层行序与 JSON 键序一致（新增行不会漏渲染）', () => {
    expect(关于我介绍行().map((行) => 行.id)).toEqual(行id集)
  })

  it('数据层逐字透出文案，不改写内容', () => {
    for (const 行 of 关于我介绍行()) {
      expect(行.text).toBe(行表[行.id].text)
    }
  })

  it('恰有一个强调行与一个技术行，且样式不靠下标', () => {
    const 样式表 = 关于我介绍行().map((行) => 行.style)
    expect(样式表.filter((样) => 样 === 'accent')).toHaveLength(1)
    expect(样式表.filter((样) => 样 === 'tech')).toHaveLength(1)
  })

  it('单行样式非法时回退 normal，不影响其他行', () => {
    const 首行id = 行id集[0]
    const 末行id = 行id集[行id集.length - 1]
    const 原值 = 行表[首行id].style
    try {
      行表[首行id].style = 'bogus'
      const 数据 = 关于我介绍行()
      expect(数据[0].style).toBe('normal')
      expect(数据[数据.length - 1].style).toBe(行表[末行id].style)
    } finally {
      行表[首行id].style = 原值
    }
    expect(关于我介绍行()[0].style).toBe('normal')
  })

  it('旧单段 intro 与 metrics 结构已移除', () => {
    expect('intro' in zhCN.about).toBe(false)
    expect('metrics' in zhCN.about).toBe(false)
  })

  it('AboutSection 源码无魔法下标、不再引用 about.metrics', () => {
    const 源码 = fs.readFileSync(path.resolve(项目根, 'src/features/about/AboutSection.tsx'), 'utf-8')
    expect(源码).not.toMatch(/索引 === \d/)
    expect(源码).not.toContain('about.metrics')
    expect(源码).not.toContain('chaiFenJianJie')
  })
})
