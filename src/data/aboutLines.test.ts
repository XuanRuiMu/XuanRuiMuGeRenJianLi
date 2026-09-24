import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import zhCN from '../i18n/zh-CN.json'
import { 关于我介绍行, 解析片段 } from './aboutLines'

const 行表 = zhCN.about.introLines as Record<string, { text: string }>

describe('FP-02 关于我结构化行', () => {
  it('五行为序，数据层与 JSON 键序一致', () => {
    expect(Object.keys(行表)).toEqual(['l1', 'l2', 'l3', 'l4', 'l5'])
    expect(关于我介绍行()).toHaveLength(5)
  })

  it('每行片段拼接后与 JSON 原文一致，无空行', () => {
    const 片段行表 = 关于我介绍行()
    Object.keys(行表).forEach((id, i) => {
      const 拼接 = 片段行表[i].map((段) => 段.text).join('')
      expect(拼接).toBe(行表[id].text.replace(/\{\{(tech|dim|accent)\|([^}]*)\}\}/g, '$2'))
      expect(拼接.trim()).not.toBe('')
    })
  })

  it('{{tone|…}} 标记解析为着色片段，纯文本不丢字', () => {
    const 片段 = 解析片段('整合并自研多个{{tech|skill}}，用{{tech|MCP/Hooks/Rules}}确保任务安全性。')
    expect(片段.map((段) => 段.tone)).toEqual(['plain', 'tech', 'plain', 'tech', 'plain'])
    expect(片段.map((段) => 段.text).join('')).toBe('整合并自研多个skill，用MCP/Hooks/Rules确保任务安全性。')
    expect(片段[1].text).toBe('skill')
    expect(片段[3].text).toBe('MCP/Hooks/Rules')
  })

  it('第 4 行 dim/accent 片段按语义着色', () => {
    const 片段 = 解析片段(行表.l4.text)
    const 色调 = Object.fromEntries(片段.map((段) => [段.text, 段.tone]))
    expect(色调['“只能做样品”']).toBe('dim')
    expect(色调['“可交付可验证的作品”']).toBe('accent')
  })

  it('无标记文本整段 plain', () => {
    expect(解析片段(行表.l1.text)).toEqual([{ text: 行表.l1.text, tone: 'plain' }])
  })

  it('源码无 style 字段硬依赖', () => {
    const 源码 = fs.readFileSync(path.resolve(__dirname, './aboutLines.ts'), 'utf-8')
    expect(源码).not.toContain("style: 'normal'")
  })
})
