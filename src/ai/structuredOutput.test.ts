import { describe, it, expect } from 'vitest'
import { 有可见正文, 提取信封正文 } from './structuredOutput'

describe('有可见正文（全站唯一「这算不算回答」判据）', () => {
  it('空串、纯空白、纯零宽都不算回答', () => {
    expect(有可见正文('')).toBe(false)
    expect(有可见正文('   ')).toBe(false)
    expect(有可见正文('\n\t  \n')).toBe(false)
    expect(有可见正文('\u00a0')).toBe(false)
    expect(有可见正文('\u3000')).toBe(false)
    expect(有可见正文('\ufeff')).toBe(false)
  })

  it('零宽字符族不被 trim 移除，必须显式剥离（用同一把尺子验同一把尺子无法自证）', () => {
    expect(有可见正文('\u200b')).toBe(false)
    expect(有可见正文('\u2060')).toBe(false)
    expect(有可见正文('\u00ad')).toBe(false)
    expect(有可见正文('\u200b'.repeat(232))).toBe(false)
    expect(有可见正文('  \u3000\ufeff')).toBe(false)
  })

  it('Cf 格式字符、控制符与组合记号同样被剥离（复审实测旧正则放过这三类）', () => {
    expect(有可见正文('\u200e')).toBe(false)
    expect(有可见正文('\u202e')).toBe(false)
    expect(有可见正文('\u2066')).toBe(false)
    expect(有可见正文('\u0300'.repeat(50))).toBe(false)
    expect(有可见正文('\u0000')).toBe(false)
  })

  it('真实上游 padding（纯 U+0020，3 次实测命中 1 次）被拦住', () => {
    expect(有可见正文(' '.repeat(232))).toBe(false)
    expect(有可见正文(' '.repeat(307))).toBe(false)
  })

  it('任何可见字符都算回答', () => {
    expect(有可见正文('答')).toBe(true)
    expect(有可见正文('  答  ')).toBe(true)
    expect(有可见正文('Java 25 与 Node.js')).toBe(true)
  })
})

describe('提取信封正文（只服务显式要求 JSON 的 /compact；聊天链路不调用）', () => {
  it('合法信封取 text 字段', () => {
    expect(提取信封正文('{"text":"摘要内容"}')).toBe('摘要内容')
  })

  it('忽略其他字段与转义', () => {
    expect(提取信封正文('{"text":"第一行\\n第二行\\"引号\\"","other":1}')).toBe('第一行\n第二行"引号"')
  })

  it('真实上游偶发夹带额外键（json_bc/rl）也能取出正文', () => {
    expect(提取信封正文('{"json_bc":1,"rl":2,"text":"核心技术栈：Java 25"}')).toBe('核心技术栈：Java 25')
  })

  it('没有 text 字段返回空串（交调用方兜底，绝不回显 JSON 原文）', () => {
    expect(提取信封正文('{"answer":"别的字段名"}')).toBe('')
    expect(提取信封正文('{"text":123}')).toBe('')
    expect(提取信封正文('{}')).toBe('')
  })

  it('非 JSON 与未闭合 JSON 都返回空串（绝不返回半截）', () => {
    expect(提取信封正文('纯文本')).toBe('')
    expect(提取信封正文('{"text":"半截')).toBe('')
    expect(提取信封正文('```json\n{"text":"x"}\n```')).toBe('')
  })
})
