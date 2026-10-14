import { describe, it, expect } from 'vitest'
import fs from 'node:fs'

/**
 * 翻译文件优先守卫（定向版）：只盯「曾经整页硬编码中文」的四个界面模块。
 * 这些模块是纯 UI 层，任何中文字符串字面量都只能是玩家可见文案，必须走翻译文件。
 *
 * 判定口径（以下均不算硬编码违规）：
 * - 含 ${...} 的模板串：属代码拼接，其中的中文是标识符而非文案；
 * - throw / console.* / new Error 行：内部错误与开发日志，不面向玩家；
 * - lil-gui 的 .add(对象, '属性名', ...)：属性名是代码键，展示名另走 tf() 翻译；
 * - 白名单：SkillTestPage 预设标识表的 id 即翻译键名（skillTest.presets.<id>）。
 */

const 守卫文件 = [
  'src/features/skill-test/SkillTestPage.tsx',
  'src/features/skill-test/SilkShaderToy.tsx',
  'src/features/contact/Gomoku.tsx',
  'src/components/starry-background/StarryGalaxyScene.ts',
]

const 中文字符串 = /'[^'\n]*[一-龥][^'\n]*'|"[^"\n]*[一-龥][^"\n]*"|`[^`]*[一-龥][^`]*`/g
const 代码行 = /(throw\b|console\.|new Error|DOMException|Error\(|\.add\(|assert|日志器实例\.)/

function 提取违例(源码: string, 文件: string): string[] {
  const 去注释 = 源码.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '')
  const 违例: string[] = []
  const 行表 = 去注释.split('\n')
  // import/export ... from '...' 与 require() 是模块路径，不是玩家文案
  const 模块路径行 = /^\s*(import|export)\b.*from\s|^\s*const\s+\w+\s*=\s*require\(/
  for (let i = 0; i < 行表.length; i++) {
    const 行 = 行表[i]
    if (代码行.test(行) || 模块路径行.test(行)) continue
    for (const 匹配 of 行.matchAll(中文字符串)) {
      const 原文 = 匹配[0]
      if (原文.includes('${')) continue
      if (
        文件.endsWith('SkillTestPage.tsx') &&
        /'(经典白丝|暗夜蓝丝|暖金丝绸|玫瑰粉丝|翡翠绿丝|极简灰丝)'/.test(原文)
      ) {
        continue
      }
      违例.push(`${i + 1}: ${原文.slice(0, 70)}`)
    }
  }
  return 违例
}

describe('翻译文件优先：界面模块不得硬编码中文文案', () => {
  for (const 文件 of 守卫文件) {
    it(`${文件} 无硬编码中文字符串`, () => {
      const 源码 = fs.readFileSync(文件, 'utf-8')
      expect(提取违例(源码, 文件), '面向玩家的文字必须走翻译文件（zh-CN.json），禁止硬编码').toEqual([])
    })
  }

  it('丝绸测试页预设 id 均能在翻译文件解析（id 即 skillTest.presets 键名）', async () => {
    const { t } = await import('./i18n/翻译')
    const 源码 = fs.readFileSync('src/features/skill-test/SkillTestPage.tsx', 'utf-8')
    const 标识表 = 源码.match(/预设标识表 = \[([^\]]*)\]/)?.[1] ?? ''
    const 标识 = [...标识表.matchAll(/'([^']+)'/g)].map((m) => m[1])
    expect(标识).toEqual(['经典白丝', '暗夜蓝丝', '暖金丝绸', '玫瑰粉丝', '翡翠绿丝', '极简灰丝'])
    for (const id of 标识) {
      expect(t(`skillTest.presets.${id}` as never), `预设「${id}」在翻译文件中缺失`).toBe(id)
    }
  })
})
