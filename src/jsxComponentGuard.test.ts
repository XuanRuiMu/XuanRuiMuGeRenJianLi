import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const 源根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.')

function 收集生产tsx(relativeDir: string, 累计: string[] = []): string[] {
  for (const 条目 of fs.readdirSync(path.join(源根, relativeDir), { withFileTypes: true })) {
    const 全路径 = path.join(源根, relativeDir, 条目.name)
    if (条目.isDirectory()) 收集生产tsx(path.relative(源根, 全路径), 累计)
    else if (条目.name.endsWith('.tsx') && !条目.name.endsWith('.test.tsx')) 累计.push(全路径)
  }
  return 累计
}

function 去注释(源码: string): string {
  return 源码.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
}

/**
 * 生产包里 JSX 组件标签名必须是 ASCII 标识符。
 * 汉字标签名在 dev 转译（vitest）下正常，但经 React Compiler + rolldown 压缩后引用会丢绑定，
 * 运行时抛 ReferenceError 并整页崩，单测结构上抓不到——只在全新构建产物里复现。
 * 测试文件走 dev 转译，不受该约束，故排除。
 */
describe('JSX 组件标识符守卫', () => {
  it('生产源码里没有汉字命名的 JSX 组件标签', () => {
    const 违规: string[] = []
    const 汉字标签 = /(?<![\w$.<])<([\p{Script=Han}][\p{Script=Han}\w$]*)[\s/>]/gu
    for (const 文件 of 收集生产tsx('')) {
      const 正文 = 去注释(fs.readFileSync(文件, 'utf-8'))
      const 相对 = path.relative(源根, 文件)
      let 项: RegExpExecArray | null
      while ((项 = 汉字标签.exec(正文))) 违规.push(`${相对} → <${项[1]}>`)
    }
    expect(违规, `改用 ASCII 组件名或字面量 JSX：\n${违规.join('\n')}`).toEqual([])
  })
})
