import { describe, expect, it } from 'vitest'
import { 资源路径 } from './资源路径'

describe('资源路径', () => {
  it('默认根部署时保持以斜杠开头的同源路径', () => {
    expect(import.meta.env.BASE_URL).toBe('/')
    expect(资源路径('/images/标准.webp')).toBe('/images/标准.webp')
  })

  it('重复的前导斜杠只保留一个', () => {
    expect(资源路径('//logos/java.svg')).toBe('/logos/java.svg')
  })

  it('无前导斜杠时同样拼接站点基础路径', () => {
    expect(资源路径('showcase/羊来.webp')).toBe('/showcase/羊来.webp')
  })
})
