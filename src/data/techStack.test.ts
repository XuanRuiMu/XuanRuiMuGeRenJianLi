import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { techstackV2 } from './techStack'

function 读图标(图标路径: string): string {
  const 相对路径 = 图标路径.startsWith('/') ? 图标路径.slice(1) : 图标路径
  return fs.readFileSync(path.resolve('public', 相对路径), 'utf-8')
}

describe('技术栈图标资源', () => {
  it('每个图标文件都真实存在', () => {
    for (const 卡 of techstackV2) {
      expect(() => 读图标(卡.icon), `缺失图标 ${卡.icon}`).not.toThrow()
    }
  })
})
