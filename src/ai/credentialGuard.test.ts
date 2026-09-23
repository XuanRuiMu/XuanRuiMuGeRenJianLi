import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DEEPSEEK_ENDPOINT } from './deepseekConfig'
import { 模型列表, 解析模型 } from './models'

const 项目根 = path.resolve(__dirname, '../..')

/** 递归收集 src 下会被打包进前端产物的源码（测试文件不入包，不参与扫描） */
function 收集前端源码(目录: string): string[] {
  const 结果: string[] = []
  for (const 条目 of fs.readdirSync(目录, { withFileTypes: true })) {
    const 路径 = path.join(目录, 条目.name)
    if (条目.isDirectory()) {
      结果.push(...收集前端源码(路径))
    } else if (/\.(ts|tsx)$/.test(条目.name) && !/\.test\.(ts|tsx)$/.test(条目.name)) {
      结果.push(路径)
    }
  }
  return 结果
}

const 前端源码表 = 收集前端源码(path.join(项目根, 'src'))

/** 任何一条命中前端源码，就意味着密钥或直连凭据会随 dist 暴露到公网 */
const 禁止模式: Array<[RegExp, string]> = [
  [/VITE_[A-Z0-9_]*_(API_KEY|AUTH_TOKEN|SECRET|PASSWORD)/, '客户端读取密钥类环境变量'],
  [/https?:\/\/api\.deepseek\.com|https?:\/\/open\.bigmodel\.cn/, '前端直连第三方 AI 域名'],
  [/\bapiKey\b/, '前端持有 apiKey 字段'],
  [/Authorization/, '前端构造鉴权请求头'],
  [/Bearer\s/, '前端拼接 Bearer 凭据'],
]

describe('FP-05 前端零密钥守卫', () => {
  it('扫描到全部前端源码（守卫本身不得空转）', () => {
    expect(前端源码表.length).toBeGreaterThan(50)
  })

  it('前端源码不含密钥环境变量/第三方域名/鉴权头', () => {
    for (const 路径 of 前端源码表) {
      const 源码 = fs.readFileSync(路径, 'utf-8')
      for (const [模式, 说明] of 禁止模式) {
        expect(模式.test(源码), `${path.relative(项目根, 路径)} ${说明}`).toBe(false)
      }
    }
  })

  it('模型定义字段集合封闭，重新加回凭据字段即红', () => {
    for (const 模型 of 模型列表()) {
      expect(Object.keys(模型).sort()).toEqual(['contextLabel', 'endpoint', 'id', 'provider'])
      expect(模型).not.toHaveProperty('apiKey')
    }
  })

  it('模型列表返回值不含任何凭据形态的值', () => {
    for (const 模型 of 模型列表()) {
      const 序列化 = JSON.stringify(模型)
      expect(序列化).not.toMatch(/sk-[A-Za-z0-9-]{8,}/)
      expect(序列化).not.toMatch(/https?:\/\//)
    }
  })

  it('端点恒为同源相对路径（由代理层转发并注入凭据）', () => {
    expect(DEEPSEEK_ENDPOINT).toMatch(/^\/api\//)
    expect(解析模型().endpoint).toMatch(/^\/api\//)
  })

  it('类型层面不存在凭据字段（加回 apiKey 会让本断言因多余的 ts-expect-error 而编译失败）', () => {
    const 模型 = 解析模型()
    // @ts-expect-error 契约：模型定义不含凭据字段
    expect(模型.apiKey).toBeUndefined()
  })
})
