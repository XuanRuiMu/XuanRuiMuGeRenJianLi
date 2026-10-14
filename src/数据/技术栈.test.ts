import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import 中文包 from '../国际化/zh-CN.json'
import { 技术卡表, 解析项目归属 } from './技术栈'

function 读图标(图标路径: string): string {
  const 相对路径 = 图标路径.startsWith('/') ? 图标路径.slice(1) : 图标路径
  return fs.readFileSync(path.resolve('public', 相对路径), 'utf-8')
}

describe('技术栈图标资源', () => {
  it('每个图标文件都真实存在', () => {
    for (const 卡 of 技术卡表) {
      expect(() => 读图标(卡.icon), `缺失图标 ${卡.icon}`).not.toThrow()
    }
  })

  it('带整面底色矩形（rect）的图标必须声明掩码模式，否则点阵会退化成实心方块', () => {
    for (const 卡 of 技术卡表) {
      const svg = 读图标(卡.icon)
      if (svg.includes('<rect')) {
        expect(卡.掩码模式, `${卡.name} 的图标含底色 rect，应声明 掩码模式`).toBeDefined()
      }
    }
  })
})

/**
 * 项目归属 id 白名单：简历自身项目 id 从翻译文件的 data.projects 派生，
 * 其余三项是派生不出来的附加归属（本站 / 全部项目 / 恋爱吧管理中心）。
 * 代码里只准出现 id，可见名称一律由翻译文件下发。
 */
const 允许归属id表 = [...Object.keys(中文包.data.projects), ...Object.keys(中文包.data.项目归属)]

describe('技术栈项目归属', () => {
  it('每张卡都标注了非空项目归属，且每项为非空白 id', () => {
    for (const 卡 of 技术卡表) {
      expect(Array.isArray(卡.项目), `${卡.name} 缺少 项目 字段`).toBe(true)
      expect(卡.项目.length, `${卡.name} 的 项目 不得为空数组`).toBeGreaterThan(0)
      for (const 归属id of 卡.项目) {
        expect(归属id.trim(), `${卡.name} 的 项目 项不得为空白`).not.toBe('')
      }
    }
  })

  it('项目归属只能取自已核实的 id 白名单，防止写入未核实项目', () => {
    for (const 卡 of 技术卡表) {
      for (const 归属id of 卡.项目) {
        expect(允许归属id表, `${卡.name} 的项目归属「${归属id}」不在白名单内`).toContain(归属id)
      }
    }
  })

  it('每个归属 id 都能在翻译文件里解析出非空名称', () => {
    for (const 卡 of 技术卡表) {
      for (const 归属id of 卡.项目) {
        const 名称 = 解析项目归属(归属id)
        expect(名称, `${卡.name} 的归属 id「${归属id}」解析不到翻译名称`).not.toBeNull()
        expect((名称 ?? '').trim(), `${卡.name} 的归属 id「${归属id}」名称为空白`).not.toBe('')
      }
    }
  })

  it('代码层不直写已翻译项目的显示名，显示名单一来源为翻译文件', () => {
    const 源码 = fs.readFileSync(path.resolve('src/数据/技术栈.ts'), 'utf-8')
    const 归属数组 = 源码.match(/项目:\s*\[([^\]]*)\]/g) ?? []
    expect(归属数组.length, '未抓到任何项目归属数组，断言空转').toBe(技术卡表.length)
    // data.projects 里已有翻译显示名的项目，代码层只准用 id 引用，不得再写一遍中文显示名
    const 已翻译显示名表 = Object.values(中文包.data.projects).map((项) => 项.name)
    for (const 数组串 of 归属数组) {
      for (const 显示名 of 已翻译显示名表) {
        expect(数组串, `项目归属不得直写已翻译的显示名「${显示名}」，应改用 id：${数组串}`).not.toContain(显示名)
      }
    }
  })

  it('白名单必须覆盖简历自身展示的全部项目，新增项目时守卫要能察觉', () => {
    const 简历项目id集 = new Set(Object.keys(中文包.data.projects))
    const 被标注项目集 = new Set(技术卡表.flatMap((卡) => 卡.项目))
    const 漏标 = [...简历项目id集].filter((id) => !被标注项目集.has(id))
    expect(漏标, `简历项目未出现在任何技术卡归属中：${漏标.join('、')}`).toEqual([])
  })

  it('Spring Boot 卡已被移除，Guice 卡在位', () => {
    expect(技术卡表.map((卡) => 卡.name)).not.toContain('Spring Boot')
    expect(技术卡表.map((卡) => 卡.name)).toContain('Guice')
  })
})
