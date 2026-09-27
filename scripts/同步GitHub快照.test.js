import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { 清洗README, 取语言分布, 按屏蔽词截断, 去除中英间空格 } from './同步GitHub快照.js'

const 快照文件 = path.resolve('src/data/githubSnapshot.ts')

describe('GitHub 快照同步脚本（纯函数）', () => {
  it('README 去噪：代码块、图片、链接、HTML 注释一律不留', () => {
    const 原文 = '<!-- 注释 -->\n# 标题\n```js\nconst 秘密 = 1\n```\n![图](a.png)\n[官网](https://a.b)\n正文 **加粗**'
    const 结果 = 清洗README(原文)
    expect(结果).not.toContain('const 秘密')
    expect(结果).not.toContain('<!--')
    expect(结果).not.toContain('a.png')
    expect(结果).toContain('官网')
    expect(结果).toContain('正文')
  })

  it('语言分布按字节降序且最多取五项', () => {
    const 表 = { Java: 900, JavaScript: 300, HTML: 50, CSS: 20, Shell: 10, Other: 1 }
    const 结果 = 取语言分布(表)
    expect(结果.length).toBe(5)
    expect(结果[0]).toEqual({ 语言: 'Java', 字节: 900 })
    expect(结果.map((项) => 项.字节)).toEqual([900, 300, 50, 20, 10])
  })

  it('语言分布为空表时不炸', () => {
    expect(取语言分布({})).toEqual([])
    expect(取语言分布(undefined)).toEqual([])
  })

  it('README 摘录截到屏蔽词之前（知识库硬断言词不得借 README 回流）', () => {
    expect(按屏蔽词截断('前半段 敏感词 后半段', ['敏感词'])).toBe('前半段')
    expect(按屏蔽词截断('整段都安全', ['敏感词'])).toBe('整段都安全')
    expect(按屏蔽词截断('a 甲 b 乙 c', ['乙', '甲'])).toBe('a')
  })

  it('中英/中数相邻空格被收紧（与 typography.test.ts 同源规则）', () => {
    expect(去除中英间空格('全栈 AI 恋爱模拟游戏')).toBe('全栈AI恋爱模拟游戏')
    expect(去除中英间空格('共 7 个仓库')).toBe('共7个仓库')
    expect(去除中英间空格('Vue3 + Express5')).toBe('Vue3+Express5')
    // 英文内部与·分隔符两侧保留空格
    expect(去除中英间空格('This is fine · 中文')).toBe('This is fine · 中文')
  })
})

describe('已生成的快照文件', () => {
  it('快照存在且每个仓库都有全名与地址', () => {
    expect(fs.existsSync(快照文件)).toBe(true)
    const 文本 = fs.readFileSync(快照文件, 'utf-8')
    // 键名引号会被 prettier 去掉（提交时 lint-staged 格式化），故按「键名+冒号+字符串值」计数
    const 全名数 = (文本.match(/["']?全名["']?:\s*'/g) ?? []).length
    const 地址数 = (文本.match(/["']?地址["']?:\s*'/g) ?? []).length
    expect(全名数).toBeGreaterThan(0)
    expect(地址数).toBe(全名数)
  })

  it('排除清单里的仓库与屏蔽词都不进快照', () => {
    const 配置 = JSON.parse(
      fs.readFileSync(path.resolve('scripts/同步GitHub快照.排除清单.json'), 'utf-8')
    )
    const 文本 = fs.readFileSync(快照文件, 'utf-8')
    for (const 项 of 配置.排除仓库) {
      expect(文本).not.toContain(项.仓库.split('/').pop())
    }
    for (const 项 of 配置.README屏蔽词) {
      expect(文本).not.toContain(项.词)
    }
  })
})
