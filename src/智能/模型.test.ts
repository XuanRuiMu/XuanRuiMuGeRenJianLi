import { describe, it, expect } from 'vitest'
import {
  模型列表,
  解析模型,
  默认模型ID,
  聊天超时毫秒,
  步进思考强度,
  循环思考强度,
  默认思考强度,
  读取已选模型ID,
  持久化已选模型ID,
} from './模型'

describe('模型注册表', () => {
  it('仅保留 DeepSeek 默认模型', () => {
    const 标识 = 模型列表().map((模型) => 模型.id)
    expect(标识).toEqual([默认模型ID])
  })

  it('默认模型走 OpenAI 兼容协议', () => {
    const 默认 = 解析模型(默认模型ID)
    expect(默认.供应商).toBe('openai')
  })

  it('未知模型回退到默认模型', () => {
    expect(解析模型('not-exist-model').id).toBe(默认模型ID)
  })

  it('聊天超时毫秒默认30s且为正整数', () => {
    expect(聊天超时毫秒).toBe(30000)
  })
})

describe('已选模型 ID 持久化（外部输入白名单）', () => {
  it('localStorage 中的未知/被篡改 ID 一律回落默认模型', () => {
    localStorage.setItem('xuan-ai-model', 'evil-model-not-in-list')
    expect(读取已选模型ID()).toBe(默认模型ID)
  })

  it('白名单内的 ID 可正常读写', () => {
    持久化已选模型ID(默认模型ID)
    expect(读取已选模型ID()).toBe(默认模型ID)
  })

  it('拒绝把白名单外的 ID 写入 localStorage', () => {
    localStorage.setItem('xuan-ai-model', 默认模型ID)
    持久化已选模型ID('evil-model-not-in-list')
    expect(localStorage.getItem('xuan-ai-model')).toBe(默认模型ID)
  })

  it('存储为空时回落默认模型', () => {
    localStorage.removeItem('xuan-ai-model')
    expect(读取已选模型ID()).toBe(默认模型ID)
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
