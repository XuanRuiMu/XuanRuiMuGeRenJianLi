import { describe, it, expect } from 'vitest'
import { 共享意图表, 是否纯问候, 是否感谢, 是否告别, 检测项目卡片, 命中共享意图 } from './intentTable'

describe('intentTable（RAG与本地共享意图表）', () => {
  it('无重复暮澜规则（暮澜纪元只出现一次）', () => {
    const 命中数 = 共享意图表.filter((项) => 项.关键词.includes('暮澜纪元')).length
    expect(命中数).toBe(1)
  })

  it('纯问候识别（你好/您好/hi/hello）且不误伤混合问句', () => {
    for (const q of ['你好', '您好', 'hi', 'hello']) expect(是否纯问候(q)).toBe(true)
    expect(是否纯问候('您好，请问你是谁')).toBe(false)
    expect(是否纯问候('介绍一下暮澜纪元')).toBe(false)
    expect(是否纯问候('')).toBe(false)
  })

  it('感谢与告别识别', () => {
    expect(是否感谢('谢谢')).toBe(true)
    expect(是否感谢('谢谢你')).toBe(true)
    expect(是否感谢('你好')).toBe(false)
    expect(是否告别('再见')).toBe(true)
    expect(是否告别('拜拜')).toBe(true)
    expect(是否告别('你好')).toBe(false)
  })

  it('项目卡片检测四型齐全（xrm/lovewithme/aiConsole/fengLai）', () => {
    expect(检测项目卡片('介绍一下暮澜纪元')).toBe('xrm')
    expect(检测项目卡片('介绍一下和我恋爱吧')).toBe('lovewithme')
    expect(检测项目卡片('蜂来是做什么的')).toBe('fengLai')
    expect(检测项目卡片('介绍一下循环工程skill')).toBe('aiConsole')
    expect(检测项目卡片('你好')).toBeUndefined()
  })

  it('问联系稳定命中contact且宽泛词不污染', () => {
    for (const q of ['联系方式', '怎么联系你', '你的邮箱是什么', '电话多少', '微信怎么加', 'qq多少', '手机号多少']) {
      expect(命中共享意图('contact', q)).toBe(true)
    }
    expect(命中共享意图('contact', '介绍一下暮澜纪元')).toBe(false)
    expect(命中共享意图('contact', '你的github项目有哪些')).toBe(false)
    expect(命中共享意图('contact', 'bilibili视频在哪看')).toBe(false)
  })
})
