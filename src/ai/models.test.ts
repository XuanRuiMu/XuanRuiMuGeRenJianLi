import { describe, it, expect } from 'vitest'
import { 模型列表, 解析模型, 默认模型ID, 聊天超时毫秒, 步进思考强度, 循环思考强度, 默认思考强度 } from './models'

describe('模型注册表', () => {
  it('仅保留 DeepSeek 默认模型', () => {
    const 标识 = 模型列表().map((模型) => 模型.id)
    expect(标识).toEqual([默认模型ID])
  })

  it('默认模型走 OpenAI 兼容协议', () => {
    const 默认 = 解析模型(默认模型ID)
    expect(默认.provider).toBe('openai')
  })

  it('未知模型回退到默认模型', () => {
    expect(解析模型('not-exist-model').id).toBe(默认模型ID)
  })

  it('聊天超时毫秒默认30s且为正整数', () => {
    expect(聊天超时毫秒).toBe(30000)
  })
})

describe('思考强度档位', () => {
  it('默认强度为 high（对齐 DeepSeek 官方默认 effort）', () => {
    expect(默认思考强度).toBe('high')
  })

  it('步进在两端钳制不循环', () => {
    expect(步进思考强度('off', -1)).toBe('off')
    expect(步进思考强度('off', 1)).toBe('low')
    expect(步进思考强度('low', 1)).toBe('high')
    expect(步进思考强度('high', 1)).toBe('max')
    expect(步进思考强度('max', 1)).toBe('max')
    expect(步进思考强度('max', -1)).toBe('high')
  })

  it('循环按 off→low→high→max→off 轮换', () => {
    expect(循环思考强度('off')).toBe('low')
    expect(循环思考强度('low')).toBe('high')
    expect(循环思考强度('high')).toBe('max')
    expect(循环思考强度('max')).toBe('off')
  })
})
