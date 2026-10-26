import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import ts from 'typescript'

const 守卫文件 = [
  'src/功能/丝绸测试/SiChouCeShiYe.tsx',
  'src/功能/丝绸测试/SiChouZhaoSeQi.tsx',
  'src/功能/联系/WuZiQi.tsx',
  'src/组件/星空背景/星空星系场景.ts',
]

const 含汉字 = (文本: string) => /[\u3400-\u9fff]/.test(文本)
const 预设白名单 = /^(经典白丝|暗夜蓝丝|暖金丝绸|玫瑰粉丝|翡翠绿丝|极简灰丝)$/
const 字段名白名单 = new Set([
  '速度',
  '波浪振幅',
  '波浪频率',
  '丝绸频率一',
  '丝绸频率二',
  '布料尺度',
  '布料强度',
  '高光颜色',
  '高光强度',
  '阴影强度',
  '伽马',
  '柔和度',
  '色调颜色',
  '色调强度',
  '主文本',
  '次文本',
  '次要文本',
  '卡片背景',
  '卡片不透明度',
  '边框',
  '主色',
  '遮罩不透明度',
])

function 是模块路径(节点: ts.Node): boolean {
  let 当前: ts.Node | undefined = 节点
  while (当前) {
    if (ts.isImportDeclaration(当前) || ts.isExportDeclaration(当前) || ts.isImportTypeNode(当前)) return true
    if (ts.isCallExpression(当前) && ts.isIdentifier(当前.expression) && 当前.expression.text === 'require') return true
    当前 = 当前.parent
  }
  return false
}

function 是内部错误或日志(节点: ts.Node): boolean {
  let 当前: ts.Node | undefined = 节点
  while (当前) {
    if (ts.isThrowStatement(当前)) return true
    if (ts.isNewExpression(当前) && ts.isIdentifier(当前.expression)) {
      if (当前.expression.text === 'Error' || 当前.expression.text === 'DOMException') return true
    }
    if (ts.isCallExpression(当前)) {
      const 表达式 = 当前.expression
      if (ts.isIdentifier(表达式) && (表达式.text === 'Error' || 表达式.text === 'DOMException')) return true
      if (ts.isPropertyAccessExpression(表达式)) {
        const 对象名 = 表达式.expression.getText()
        if (对象名 === 'console' || 对象名 === '日志器实例') return true
        if (表达式.name.text === 'add' && 当前.arguments[1] === 节点) return true
      }
    }
    当前 = 当前.parent
  }
  return false
}

function 提取违例(源码: string, 文件: string): string[] {
  const 源 = ts.createSourceFile(文件, 源码, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const 违例: string[] = []
  const 走 = (节点: ts.Node) => {
    const 是可检查文本 = ts.isStringLiteral(节点) || ts.isNoSubstitutionTemplateLiteral(节点)
    if (是可检查文本) {
      const 文本 = 节点.text
      if (含汉字(文本) && !是模块路径(节点) && !是内部错误或日志(节点)) {
        if (!(文件.endsWith('SiChouCeShiYe.tsx') && (预设白名单.test(文本) || 字段名白名单.has(文本)))) {
          const 位置 = 源.getLineAndCharacterOfPosition(节点.getStart())
          违例.push(`${位置.line + 1}: ${文本.slice(0, 70)}`)
        }
      }
    }
    ts.forEachChild(节点, 走)
  }
  走(源)
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
    const { t } = await import('./国际化/翻译')
    const 源码 = fs.readFileSync('src/功能/丝绸测试/SiChouCeShiYe.tsx', 'utf-8')
    const 标识表 = 源码.match(/预设标识表 = \[([^\]]*)\]/)?.[1] ?? ''
    const 标识 = [...标识表.matchAll(/'([^']+)'/g)].map((匹配) => 匹配[1])
    expect(标识).toEqual(['经典白丝', '暗夜蓝丝', '暖金丝绸', '玫瑰粉丝', '翡翠绿丝', '极简灰丝'])
    for (const id of 标识) {
      expect(t(`skillTest.presets.${id}` as never), `预设「${id}」在翻译文件中缺失`).toBe(id)
    }
  })
})
