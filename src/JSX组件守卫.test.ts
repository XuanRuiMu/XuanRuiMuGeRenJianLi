import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

const 源根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.')

function 收集生产tsx(相对目录: string, 累计: string[] = []): string[] {
  for (const 条目 of fs.readdirSync(path.join(源根, 相对目录), { withFileTypes: true })) {
    const 全路径 = path.join(源根, 相对目录, 条目.name)
    if (条目.isDirectory()) 收集生产tsx(path.relative(源根, 全路径), 累计)
    else if (条目.name.endsWith('.tsx') && !条目.name.endsWith('.test.tsx')) 累计.push(全路径)
  }
  return 累计
}

function 含汉字(文本: string): boolean {
  return /[\u3400-\u9fff]/.test(文本)
}

describe('JSX 组件标识符守卫', () => {
  it('生产源码里没有汉字命名的 JSX 组件标签', () => {
    const 违规: string[] = []
    for (const 文件 of 收集生产tsx('')) {
      const 源码 = fs.readFileSync(文件, 'utf-8')
      const 源 = ts.createSourceFile(文件, 源码, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
      const 相对 = path.relative(源根, 文件)
      const 走 = (节点: ts.Node) => {
        if (
          (ts.isJsxOpeningElement(节点) || ts.isJsxSelfClosingElement(节点) || ts.isJsxClosingElement(节点)) &&
          ts.isIdentifier(节点.tagName) &&
          含汉字(节点.tagName.text)
        ) {
          违规.push(`${相对} → <${节点.tagName.text}>`)
        }
        ts.forEachChild(节点, 走)
      }
      走(源)
    }
    expect(违规, `改用拼音 PascalCase 组件名：\n${违规.join('\n')}`).toEqual([])
  })
})
