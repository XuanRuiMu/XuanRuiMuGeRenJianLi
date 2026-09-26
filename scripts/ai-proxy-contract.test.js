/**
 * FP-03：AI 反代环境变量名契约测试。
 *
 * 被这个测试锁住的真实缺陷：vite.config.js 的 dev 反代读 DEEPSEEK_API_KEY，
 * 而 .env.local 当初只写了 VITE_DEEPSEEK_API_KEY —— 键名不匹配时代理会「静默不注入」，
 * 上游恒 401，401 又被上层兜底吞成看起来正常的本地答案，缺陷可以无限期潜伏。
 * 现有 src/ai/credentialGuard.test.ts 只扫 src/**，覆盖不到 vite.config.js 与 .env 契约，
 * 所以这里补齐机器校验：vite 读取的键名集合 === .env.example 声明的键名集合 === nginx 注入的变量。
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEEPSEEK_ENDPOINT } from '../src/ai/deepseekConfig'
import { 创建密钥注入钩子 } from './ai-proxy.js'

const 项目根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const 读文本 = (相对路径) => fs.readFileSync(path.join(项目根, 相对路径), 'utf-8')

/** 密钥类变量名（不带 VITE_ 前缀的合法形态由 scripts/ai-proxy.js 再次校验） */
const 密钥名模式 = /^[A-Z][A-Z0-9_]*_(API_KEY|AUTH_TOKEN|SECRET|PASSWORD)$/
const 带前缀密钥名模式 = /^VITE_.*_(API_KEY|AUTH_TOKEN|SECRET|PASSWORD)$/

/**
 * vite.config.js 里的反代通道：从 创建密钥注入钩子(env, '密钥变量名', '/api/ai/通道') 调用点抓取。
 * 通道派生规则对现存两条通道（deepseek / glm）实测成立；新增通道若不符合，本测试即红，强制人工复核。
 */
function 抓取vite通道(源码) {
  return [...源码.matchAll(/创建密钥注入钩子\(env,\s*'([A-Z0-9_]+)',\s*'([^']+)'\)/g)].map((匹配) => ({
    密钥变量名: 匹配[1],
    端点路径: 匹配[2],
    通道: 匹配[2].split('/').pop(),
  }))
}

/** 代理真正读取的环境变量名：env.X 点号引用 + 钩子调用点的字面量名，两种写法都要抓到 */
function 抓取vite引用的变量名(源码) {
  const 命中 = new Set()
  for (const 匹配 of 源码.matchAll(/(?<![\w.])env\.([A-Z][A-Z0-9_]*)/g)) 命中.add(匹配[1])
  for (const 通道 of 抓取vite通道(源码)) 命中.add(通道.密钥变量名)
  return 命中
}

/** .env.example / .env.local 声明的键名（注释掉的预留通道同样算声明） */
function 抓取声明的键名(文本) {
  const 命中 = new Set()
  for (const 匹配 of 文本.matchAll(/^\s*#?\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/gm)) 命中.add(匹配[1])
  return 命中
}

const 排序密钥名 = (集合) => [...集合].filter((名) => 密钥名模式.test(名)).sort()

const vite源码 = 读文本('vite.config.js')
const 通道表 = 抓取vite通道(vite源码)
const 引用变量名 = 抓取vite引用的变量名(vite源码)
const 模板声明名 = 抓取声明的键名(读文本('.env.example'))
const nginx文本 = 读文本('deploy/nginx.conf')
const nginx非注释 = nginx文本.split(/\r?\n/).filter((行) => !行.trim().startsWith('#'))
const 本地env路径 = path.join(项目根, '.env.local')
const 有本地env = fs.existsSync(本地env路径)

describe('AI 反代键名契约：vite.config.js ↔ .env.example', () => {
  it('守卫本身不得空转（两条通道 + 至少一个密钥名被抓到）', () => {
    expect(通道表.length).toBeGreaterThanOrEqual(2)
    expect(排序密钥名(引用变量名)).toContain('DEEPSEEK_API_KEY')
    expect(排序密钥名(模板声明名)).toContain('DEEPSEEK_API_KEY')
  })

  it('代理读取的密钥变量名集合 === .env.example 声明的密钥变量名集合', () => {
    expect(排序密钥名(引用变量名)).toEqual(排序密钥名(模板声明名))
  })

  it('代理读取的每个变量名都必须在 .env.example 里有声明', () => {
    const 未声明 = [...引用变量名].filter((名) => !模板声明名.has(名)).sort()
    expect(未声明).toEqual([])
  })

  it('代理与模板都不得走 VITE_ 前缀密钥（前缀值会被打进前端产物）', () => {
    expect([...引用变量名].filter((名) => 带前缀密钥名模式.test(名))).toEqual([])
    expect([...模板声明名].filter((名) => 带前缀密钥名模式.test(名))).toEqual([])
  })

  it('每条通道的密钥变量名与端点路径按派生规则自洽', () => {
    for (const 通道 of 通道表) {
      expect(通道.端点路径).toBe(`/api/ai/${通道.通道}`)
      expect(通道.密钥变量名).toBe(`${通道.通道.toUpperCase()}_API_KEY`)
      expect(模板声明名.has(通道.密钥变量名), `${通道.密钥变量名} 未在 .env.example 声明`).toBe(true)
    }
  })

  it('前端实际调用的同源端点必须有对应的反代通道（否则线上必然 404/401）', () => {
    expect(通道表.map((通道) => 通道.端点路径)).toContain(DEEPSEEK_ENDPOINT)
  })
})

describe('AI 反代键名契约：deploy/nginx.conf 生产注入', () => {
  it('每条通道都有未注释的 location 与 Bearer $<通道>_key 注入行', () => {
    for (const 通道 of 通道表) {
      const location行 = nginx非注释.findIndex((行) => 行.includes(`location = ${通道.端点路径} {`))
      expect(location行, `nginx 缺少 location ${通道.端点路径}`).toBeGreaterThanOrEqual(0)
      const 注入行 = nginx非注释.findIndex((行) =>
        行.includes(`proxy_set_header Authorization "Bearer $${通道.通道}_key";`)
      )
      expect(注入行, `nginx 未注入 $${通道.通道}_key`).toBeGreaterThanOrEqual(0)
      // 注入必须落在该 location 块内（块长约 30 行），否则等于没生效
      expect(注入行 - location行).toBeGreaterThan(0)
      expect(注入行 - location行).toBeLessThan(40)
      const 块 = nginx非注释.slice(location行, 注入行 + 1)
      expect(
        块.some((行) => 行.includes('snippets/ai-keys.conf')),
        `${通道.端点路径} 未 include 密钥片段`
      ).toBe(true)
    }
  })

  it('契约链路上的文件都不含明文密钥形态', () => {
    for (const 相对路径 of ['vite.config.js', '.env.example', 'deploy/nginx.conf', 'scripts/ai-proxy.js']) {
      expect(读文本(相对路径), 相对路径).not.toMatch(/sk-[A-Za-z0-9]{6,}/)
    }
  })
})

describe('本机 .env.local 键名契约（gitignored，CI 无此文件时跳过）', () => {
  it.skipIf(!有本地env)('不得存在 VITE_ 前缀的密钥变量名（本次缺陷的原始形态）', () => {
    const 违规 = [...抓取声明的键名(读文本('.env.local'))].filter((名) => 带前缀密钥名模式.test(名)).sort()
    expect(违规).toEqual([])
  })

  it.skipIf(!有本地env)('声明的每个密钥变量名都必须是代理真正会读的（防写错名字静默降级）', () => {
    const 多余 = [...抓取声明的键名(读文本('.env.local'))]
      .filter((名) => 密钥名模式.test(名) && !引用变量名.has(名))
      .sort()
    expect(多余).toEqual([])
  })

  // 断言只看长度：任何失败信息都不许把密钥值带进测试输出
  it.skipIf(!有本地env)('在线通道（前端实际调用的端点）的密钥必须已声明且非空', () => {
    const 在线通道 = 通道表.find((通道) => 通道.端点路径 === DEEPSEEK_ENDPOINT)
    expect(在线通道, `前端端点 ${DEEPSEEK_ENDPOINT} 无对应反代通道`).toBeDefined()
    const 匹配 = 读文本('.env.local').match(new RegExp(`^${在线通道.密钥变量名}=(.*)$`, 'm'))
    expect(匹配, `${在线通道.密钥变量名} 未在 .env.local 声明`).not.toBeNull()
    expect(匹配[1].trim().length, `${在线通道.密钥变量名} 为空值 → 代理不注入 → 上游 401`).toBeGreaterThan(0)
  })
})

describe('缺密钥必须启动即响亮告警（scripts/ai-proxy.js 行为）', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('读到密钥：注入 Bearer 头，且不打印任何日志', () => {
    const 告警 = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const 哨兵值 = 'TEST_ONLY_SENTINEL_NOT_A_REAL_KEY'
    const 代理 = { on: vi.fn() }
    创建密钥注入钩子({ DEEPSEEK_API_KEY: 哨兵值 }, 'DEEPSEEK_API_KEY', '/api/ai/deepseek')(代理)
    expect(代理.on).toHaveBeenCalledTimes(1)
    expect(代理.on.mock.calls[0][0]).toBe('proxyReq')
    const 请求 = { setHeader: vi.fn() }
    代理.on.mock.calls[0][1](请求)
    expect(请求.setHeader).toHaveBeenCalledWith('Authorization', `Bearer ${哨兵值}`)
    expect(告警).not.toHaveBeenCalled()
  })

  it('密钥缺失/空值：告警点名变量名与端点，且绝不 dump env 或输出值', () => {
    const 告警 = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const 哨兵值 = 'TEST_ONLY_SENTINEL_NOT_A_REAL_KEY'
    const 代理 = { on: vi.fn() }
    创建密钥注入钩子({ GLM_API_KEY: 哨兵值, DEEPSEEK_API_KEY: '' }, 'DEEPSEEK_API_KEY', '/api/ai/deepseek')(代理)
    expect(代理.on).not.toHaveBeenCalled()
    expect(告警).toHaveBeenCalledTimes(1)
    const 文案 = 告警.mock.calls[0][0]
    expect(文案).toContain('DEEPSEEK_API_KEY')
    expect(文案).toContain('/api/ai/deepseek')
    expect(文案).toContain('.env.example')
    expect(文案).toContain('401')
    expect(文案).not.toContain(哨兵值)
  })

  it('变量名不合法（VITE_ 前缀或小写）直接抛错，禁止静默不注入', () => {
    const 告警 = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => 创建密钥注入钩子({}, 'VITE_DEEPSEEK_API_KEY', '/api/ai/deepseek')).toThrow(/不带 VITE_ 前缀/)
    expect(() => 创建密钥注入钩子({}, 'deepseek_api_key', '/api/ai/deepseek')).toThrow(/不合法/)
    expect(告警).not.toHaveBeenCalled()
  })
})
