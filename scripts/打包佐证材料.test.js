import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const 项目根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist目录 = path.join(项目根, 'dist')
const 源目录 = path.join(项目根, '佐证材料')
const 有构建产物 = fs.existsSync(dist目录)

function 收集文件(目录) {
  const 结果 = []
  for (const 项 of fs.readdirSync(目录, { withFileTypes: true })) {
    const 全路径 = path.join(目录, 项.name)
    if (项.isDirectory()) 结果.push(...收集文件(全路径))
    else 结果.push(全路径)
  }
  return 结果
}

function 原始素材文件名() {
  return fs
    .readdirSync(源目录)
    .filter(
      (名) => !['脱敏后', '脱敏规则.json', '审计切片'].includes(名) && !fs.statSync(path.join(源目录, 名)).isDirectory()
    )
}

describe('佐证材料 dist 防回归守卫', () => {
  it('public/佐证材料.zip 存在且非空', () => {
    const zip = path.join(项目根, 'public', '佐证材料.zip')
    expect(fs.existsSync(zip), '缺少 public/佐证材料.zip，请运行 python scripts/打包佐证材料.py').toBe(true)
    expect(fs.statSync(zip).size).toBeGreaterThan(1_000_000)
  })

  it('打包脚本审计判定逻辑自检（python --selftest）', { timeout: 60_000 }, () => {
    const 输出 = execFileSync(
      process.env.PYTHON || 'python',
      [path.join(项目根, 'scripts', '打包佐证材料.py'), '--selftest'],
      { encoding: 'utf8', cwd: 项目根 }
    )
    expect(输出).toContain('自检通过')
  })

  it.skipIf(!有构建产物)('dist 根目录含 佐证材料.zip', () => {
    expect(fs.existsSync(path.join(dist目录, '佐证材料.zip'))).toBe(true)
  })

  it.skipIf(!有构建产物)('dist 不含任何佐证材料原始件', () => {
    const dist文件 = 收集文件(dist目录)
    const 基名表 = new Map(dist文件.map((p) => [path.basename(p), p]))
    for (const 名 of 原始素材文件名()) {
      expect(基名表.has(名), `原始件 ${名} 泄漏进 dist: ${基名表.get(名) ?? ''}`).toBe(false)
    }
    expect(fs.existsSync(path.join(dist目录, '佐证材料'))).toBe(false)
  })

  it.skipIf(!有构建产物)('Workbox 预缓存清单（sw.js）不含 佐证材料.zip', () => {
    const sw文件 = 收集文件(dist目录).filter((p) => /sw\.js$/.test(p))
    expect(sw文件.length).toBeGreaterThan(0)
    for (const p of sw文件) {
      const 内容 = fs.readFileSync(p, 'utf8')
      expect(内容, `${p} 预缓存了 佐证材料.zip`).not.toContain(encodeURIComponent('佐证材料.zip'))
      expect(内容, `${p} 预缓存了 佐证材料.zip`).not.toContain('佐证材料.zip')
    }
  })
})
