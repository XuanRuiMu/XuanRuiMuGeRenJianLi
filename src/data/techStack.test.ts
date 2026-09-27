import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { techstackV2 } from './techStack'

/** 取 svg 里出现过的全部色值，三位简写统一展开成六位后小写比较 */
function 取颜色集(文件文本: string): Set<string> {
  const 原始 = 文件文本.match(/#[0-9a-fA-F]{3,8}/g) ?? []
  const 展开 = 原始.map((色值) =>
    色值.length === 4 ? `#${色值[1]}${色值[1]}${色值[2]}${色值[2]}${色值[3]}${色值[3]}` : 色值.slice(0, 7).toLowerCase()
  )
  return new Set(展开)
}

const 纯黑 = (颜色集: Set<string>): boolean => 颜色集.size === 1 && 颜色集.has('#000000')

function 读图标(图标路径: string): string {
  const 相对路径 = 图标路径.startsWith('/') ? 图标路径.slice(1) : 图标路径
  return fs.readFileSync(path.resolve('public', 相对路径), 'utf-8')
}

describe('技术栈图标深浅色可读性', () => {
  it('每个图标文件都真实存在', () => {
    for (const 卡 of techstackV2) {
      expect(() => 读图标(卡.icon), `缺失图标 ${卡.icon}`).not.toThrow()
    }
  })

  it('标了深色反色的图标必须是纯黑单色（反色后才会变纯白）', () => {
    const 反色卡 = techstackV2.filter((卡) => 卡.深色反色)
    expect(反色卡.length).toBeGreaterThan(0)
    for (const 卡 of 反色卡) {
      expect(纯黑(取颜色集(读图标(卡.icon))), `${卡.name} 的图标不是纯黑，反色会毁掉配色`).toBe(true)
    }
  })

  it('纯黑图标必须全部登记深色反色（新增黑色 logo 时不会漏）', () => {
    const 漏登记 = techstackV2.filter((卡) => 纯黑(取颜色集(读图标(卡.icon))) && !卡.深色反色)
    expect(漏登记.map((卡) => 卡.name)).toEqual([])
  })
})
