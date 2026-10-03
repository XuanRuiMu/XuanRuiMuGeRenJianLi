import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import 中文包 from '../i18n/zh-CN.json'
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

  it('带整面底色矩形（rect）的图标必须声明掩码模式，否则点阵会退化成实心方块', () => {
    for (const 卡 of techstackV2) {
      const svg = 读图标(卡.icon)
      if (svg.includes('<rect')) {
        expect(卡.掩码模式, `${卡.name} 的图标含底色 rect，应声明 掩码模式`).toBeDefined()
      }
    }
  })
})

/** 项目归属白名单：项目名从翻译文件的 data.projects 派生，其余三项是派生不出来的附加项 */
const 允许项目表 = [...Object.values(中文包.data.projects).map((项) => 项.name), '本站', '全部项目', '恋爱吧管理中心']

describe('技术栈项目归属', () => {
  it('每张卡都标注了非空项目归属，且每项为非空字符串', () => {
    for (const 卡 of techstackV2) {
      expect(Array.isArray(卡.项目), `${卡.name} 缺少 项目 字段`).toBe(true)
      expect(卡.项目.length, `${卡.name} 的 项目 不得为空数组`).toBeGreaterThan(0)
      for (const 项目 of 卡.项目) {
        expect(项目.trim(), `${卡.name} 的 项目 项不得为空白`).not.toBe('')
      }
    }
  })

  it('项目归属只能取自已核实的白名单，防止写入未核实项目名', () => {
    for (const 卡 of techstackV2) {
      for (const 项目 of 卡.项目) {
        expect(允许项目表, `${卡.name} 的项目「${项目}」不在白名单内`).toContain(项目)
      }
    }
  })

  it('白名单必须覆盖简历自身展示的全部项目，新增项目时守卫要能察觉', () => {
    const 简历项目集 = new Set(Object.values(中文包.data.projects).map((项) => 项.name))
    const 被标注项目集 = new Set(techstackV2.flatMap((卡) => 卡.项目))
    const 漏标 = [...简历项目集].filter((名) => !被标注项目集.has(名))
    expect(漏标, `简历项目未出现在任何技术卡归属中：${漏标.join('、')}`).toEqual([])
  })

  it('Spring Boot 卡已被移除，Guice 卡在位', () => {
    expect(techstackV2.map((卡) => 卡.name)).not.toContain('Spring Boot')
    expect(techstackV2.map((卡) => 卡.name)).toContain('Guice')
  })
})
