import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const 根元素 = path.resolve(__dirname, '..')

const 中日韩范围表 = [
  [0x4e00, 0x9fff],
  [0x3000, 0x303f],
  [0xff00, 0xffef],
  [0x3400, 0x4dbf],
]

function 是CJK字符(code) {
  return 中日韩范围表.some(([下限, 上限]) => code >= 下限 && code <= 上限)
}

const 扫描扩展名 = /\.(tsx|ts|jsx|js|json|html|md)$/i

async function 扫描文件(文件路径) {
  let 内容
  try {
    内容 = await fs.readFile(文件路径, 'utf8')
  } catch {
    return []
  }
  const 字符集合 = new Set()

  for (const 字 of 内容) {
    const code = 字.codePointAt(0)
    if (code && 是CJK字符(code)) 字符集合.add(字)
  }
  return [...字符集合]
}

async function 扫描目录(目录) {
  const 字符集合 = new Set()
  let 条目
  try {
    条目 = await fs.readdir(目录, { withFileTypes: true })
  } catch {
    return []
  }
  for (const 项 of 条目) {
    const 完整路径 = path.join(目录, 项.name)
    if (项.isDirectory()) {
      const 子字符 = await 扫描目录(完整路径)
      子字符.forEach((c) => 字符集合.add(c))
    } else if (扫描扩展名.test(项.name)) {
      const 文件字符 = await 扫描文件(完整路径)
      文件字符.forEach((c) => 字符集合.add(c))
    }
  }
  return [...字符集合]
}

async function 提取所有CJK字符() {
  const 全部 = new Set()
  const src字符 = await 扫描目录(path.join(根元素, 'src'))
  src字符.forEach((c) => 全部.add(c))
  const index字符 = await 扫描文件(path.join(根元素, 'index.html'))
  index字符.forEach((c) => 全部.add(c))

  return [...全部].sort((a, b) => a.codePointAt(0) - b.codePointAt(0))
}

async function 查找得意黑源文件() {
  const 候选路径 = [
    path.join(根元素, 'node_modules/@fontpkg/smiley-sans/SmileySans-Oblique.ttf.woff2'),
    path.join(根元素, 'node_modules/@fontpkg/smiley-sans/SmileySans-Oblique.otf.woff2'),
  ]

  for (const 路径 of 候选路径) {
    try {
      await fs.access(路径)
      return 路径
    } catch {}
  }

  throw new Error('未找到得意黑（Smiley Sans）源字体文件，请确认 @fontpkg/smiley-sans 已安装')
}

function 生成UnicodeRange(字符列表) {
  return 字符列表.map((c) => `U+${c.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`).join(', ')
}

async function 更新criticalCssUnicodeRange(新范围) {
  const 样式路径 = path.join(根元素, 'src/样式/关键样式.css')
  const 原内容 = await fs.readFile(样式路径, 'utf8')
  const 匹配 = 原内容.match(/^([ \t]*unicode-range:\s*)([^;]+)(;)/m)
  if (!匹配) {
    throw new Error(`critical.css 未匹配到 unicode-range 行，请检查 ${样式路径}`)
  }

  const 当前范围 = 匹配[2].replace(/\s+/g, ' ').trim()
  if (当前范围 === 新范围) return false
  const 新内容 = 原内容.replace(
    /^([ \t]*unicode-range:\s*)([^;]+)(;)/m,
    (_, 前缀, _旧值, 结尾) => `${前缀}${新范围}${结尾}`
  )

  const prettier = (await import('prettier')).default
  const 格式配置 = (await prettier.resolveConfig(样式路径)) ?? {}
  await fs.writeFile(样式路径, await prettier.format(新内容, { ...格式配置, filepath: 样式路径 }))
  return true
}

async function 子集化得意黑(字符列表) {
  if (字符列表.length === 0) {
    throw new Error('扫描结果为空：src/ 与 index.html 中未发现任何 CJK 字符，无法构建字体子集')
  }
  const 源路径 = await 查找得意黑源文件()
  const 输入 = await fs.readFile(源路径)
  const 输出 = await subsetFont(输入, 字符列表.join(''), { targetFormat: 'woff2' })
  const 输出路径 = path.join(根元素, 'public/fonts/dyh-subset.woff2')
  await fs.mkdir(path.dirname(输出路径), { recursive: true })
  await fs.writeFile(输出路径, 输出)
  return {
    名称: 'dyh-subset.woff2',
    路径: 输出路径,
    大小: 输出.length,
    字符: 字符列表.join(''),
    字符数: 字符列表.length,
    unicodeRange: 生成UnicodeRange(字符列表),
  }
}

async function 生成清单(结果列表) {
  const 清单 = {
    generatedAt: new Date().toISOString(),
    fonts: 结果列表.map((结果) => ({
      file: path.relative(根元素, 结果.路径).replace(/\\/g, '/'),
      size: 结果.大小,
      characters: 结果.字符,
      unicodeRange: 结果.unicodeRange,
    })),
  }
  const 清单路径 = path.join(根元素, 'public/fonts/subset-manifest.json')
  await fs.writeFile(清单路径, JSON.stringify(清单, null, 2))
}

async function 主入口() {
  const 字符列表 = await 提取所有CJK字符()
  const 结果 = await 子集化得意黑(字符列表)
  await 更新criticalCssUnicodeRange(结果.unicodeRange)
  await 生成清单([结果])
  const 预览 = 结果.字符.slice(0, 60)
  console.log(
    `字体子集化完成：${结果.名称} (${结果.大小} 字节)，${结果.字符数} 字 [${预览}${结果.字符.length > 60 ? '…' : ''}]`
  )
}

主入口().catch((错误) => {
  console.error('字体子集化失败：', 错误)
  process.exit(1)
})
