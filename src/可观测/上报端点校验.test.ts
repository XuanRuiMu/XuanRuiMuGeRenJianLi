import { describe, it, expect } from 'vitest'
import { 解析可信上报端点 } from './上报端点校验'

describe('解析可信上报端点（外部输入白名单）', () => {
  it('同源相对路径放行', () => {
    expect(解析可信上报端点('/api/可观测/logs')).toBe('/api/可观测/logs')
  })

  it('https 绝对地址放行', () => {
    expect(解析可信上报端点('https://telemetry.example.com/collect')).toBe('https://telemetry.example.com/collect')
  })

  it('协议相对 URL（//host）指向外部主机，拒绝', () => {
    expect(解析可信上报端点('//evil.example.com/collect')).toBeNull()
  })

  it('http 明文外域拒绝', () => {
    expect(解析可信上报端点('http://evil.example.com/collect')).toBeNull()
  })

  it('http 本机联调端点放行', () => {
    expect(解析可信上报端点('http://localhost:9000/collect')).toBe('http://localhost:9000/collect')
    expect(解析可信上报端点('http://127.0.0.1:9000/collect')).toBe('http://127.0.0.1:9000/collect')
  })

  it('javascript:/data: 等任意协议拒绝', () => {
    expect(解析可信上报端点('javascript:alert(1)')).toBeNull()
    expect(解析可信上报端点('data:text/plain,hi')).toBeNull()
    expect(解析可信上报端点('file:///etc/passwd')).toBeNull()
  })

  it('空值/非字符串/不可解析值拒绝', () => {
    expect(解析可信上报端点()).toBeNull()
    expect(解析可信上报端点('')).toBeNull()
    expect(解析可信上报端点('   ')).toBeNull()
    expect(解析可信上报端点('not a url')).toBeNull()
  })
})
