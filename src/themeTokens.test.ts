import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const 源根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '.')
const 读 = (相对路径: string) => fs.readFileSync(path.join(源根, 相对路径), 'utf-8')

const 样式表 = 读('index.css')

function 索引(文本: string, 标记: string, 用途: string): number {
  const 位 = 文本.indexOf(标记)
  expect(位, `index.css 里找不到标记「${标记}」（${用途}），守卫锚点需同步更新`).toBeGreaterThanOrEqual(0)
  return 位
}

/** 取 `{` 起始标记处的块体（本项目 CSS 主题块无嵌套花括号，遇到首个 `}` 即闭合） */
function 取花括号块(文本: string, 起始标记: string, 用途: string): string {
  const 起 = 索引(文本, 起始标记, 用途)
  return 文本.slice(起, 文本.indexOf('}', 起) + 1)
}

/** 顶层 .light 块：@supports 内的同名块有缩进（"  .light {"），故用行首无空格精确锁定 */
function 取顶层浅色块(文本: string): string {
  const 起 = 索引(文本, '\n.light {', '顶层浅色覆盖块')
  const 止 = 文本.indexOf('\n}', 起)
  expect(止, '顶层 .light 块未闭合').toBeGreaterThan(起)
  return 文本.slice(起, 止)
}

/** 从 起始 处向后取一整个花括号配平的块（@supports 这类内含子规则的块不能用 取花括号块） */
function 取配平块(文本: string, 起始: number, 用途: string): string {
  const 开 = 文本.indexOf('{', 起始)
  expect(开, `找不到 ${用途} 的开始花括号`).toBeGreaterThan(-1)
  let 深度 = 0
  let 闭 = -1
  for (let 位 = 开; 位 < 文本.length; 位++) {
    const 字符 = 文本[位]
    if (字符 === '{') 深度++
    else if (字符 === '}' && --深度 === 0) {
      闭 = 位
      break
    }
  }
  expect(闭, `${用途} 的花括号未配平`).toBeGreaterThan(开)
  return 文本.slice(开, 闭 + 1)
}

/** 全表的 .light 系规则块（顶层块、@supports/@media 内的缩进块、`.light xxx` scoped 覆盖），带源码位置 */
function 取浅色规则块表(文本: string): Array<{ 位置: number; 令牌: Set<string> }> {
  return [...文本.matchAll(/(^|[,{\s])\.light(?![\w-])[^{};)]*\{/gm)].map((命中) => ({
    位置: 命中.index,
    令牌: new Set(令牌名列表(取配平块(文本, 命中.index + 命中[0].length - 1, '.light 规则块'))),
  }))
}

/** 全表的 :root 规则块（含 @supports/@media 内嵌套的那些）及其 --color-* 声明的源码位置 */
function 取根规则块表(文本: string): Array<Array<{ 令牌: string; 位置: number }>> {
  return [...文本.matchAll(/(^|[,{\s]):root(?![\w-])[^{};)]*\{/gm)].map((命中) => {
    const 块起 = 命中.index + 命中[0].length - 1
    const 块 = 取配平块(文本, 块起, ':root 规则块')
    return [...块.matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map((声明) => ({
      令牌: 声明[1],
      位置: 块起 + 声明.index,
    }))
  })
}

/** 棋盘样式区：连珠脉冲关键帧起，到 Ink Reveal 注释前止（覆盖正/背面、棋子、高亮全部规则） */
function 取棋盘样式区(文本: string): string {
  return 文本.slice(
    索引(文本, '@keyframes gomoku-win-pulse', '棋盘样式区起点'),
    索引(文本, '/* Ink Reveal Overlay', '棋盘样式区终点')
  )
}

/** 导航样式区：.glass-nav 起，到页脚层级体系注释前止（覆盖玻璃条、胶囊、hover/focus 及其 .light scoped 覆盖） */
function 取导航样式区(文本: string): string {
  return 文本.slice(
    索引(文本, '\n.glass-nav {', '导航样式区起点'),
    索引(文本, '/* ============ 页脚层级体系', '导航样式区终点')
  )
}

const 暗色主题块 = 取花括号块(样式表, '@theme {', '暗色默认令牌')
const 浅色覆盖块 = 取顶层浅色块(样式表)

/** .light 覆盖的全部 --color-* 令牌名：顶层 .light 块 + 任意以 .light 开头的 scoped 规则
 *  （如导航胶囊的 .light .glass-nav .nav-link-pill，浅色值刻意收窄作用域，见 CSS 注释） */
function 浅色覆盖令牌名(文本: string): Set<string> {
  const 集合 = new Set(令牌名列表(浅色覆盖块))
  for (const 命中 of 文本.matchAll(/^\.light[^{]*\{([^}]*)\}/gm)) {
    for (const 令牌 of 令牌名列表(命中[1])) 集合.add(令牌)
  }
  return 集合
}

/** 块内声明过的 --color-* 令牌名（按出现顺序去重） */
function 令牌名列表(块: string): string[] {
  return [...new Set([...块.matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map((命中) => 命中[1]))]
}

/** 块内某令牌的声明值；未声明返回 null */
function 令牌值(块: string, 令牌: string): string | null {
  const 命中 = new RegExp(`${令牌}\\s*:\\s*([^;]+);`).exec(块)
  return 命中 ? 命中[1].trim() : null
}

/* =========================================================================
 * 守卫清单（新增板块只改这几张表，下面的断言逻辑不动）
 *
 * 1) 令牌值清单：每个语义令牌的暗色值必须等于「浅色修复前组件里写死的字面值」
 *    （= 暗色视觉零变化），浅色值必须是浅底可用的值。浅色覆盖默认在顶层 .light 块；
 *    若覆盖被作用域收窄（如导航胶囊只在 .light .glass-nav 内覆盖，见 CSS 注释），
 *    用 覆盖标记 钉住所在规则块。
 * 2) 禁改清单：某文件里出现过、已被令牌替换掉的暗色字面值；再出现即红。
 *    FP-05 推荐语卡片已按同样结构接入：卡面底色直接复用 bg-panel，
 *    作者/正文色用既有的 text-text-secondary / text-text-primary，无需新增令牌。
 * 3) 使用的颜色类：组件引用的自定义颜色类必须有同名 --color-* 令牌（暗+浅双声明）。
 * 4) 棋盘区必含令牌引用：防止把整条规则删掉来「清零字面值」。
 * 5) 导航样式区（FP-09）：与棋盘区同构——禁的是绕过令牌的字面色，不是禁 CSS；
 *    .glass-nav/.nav-link-pill 的底色/描边/文字/光晕/焦点环必须走 --color-nav-*。
 * 6) 渐变机制（FP-09 缺陷 1 根因守卫）：渐变图由 --渐变-* 自定义属性提供、clip 机制
 *    只在基线规则写一次；.light 覆盖只允许重新赋值自定义属性。
 * 7) :root 覆盖顺序（FP-11 R7）：任何 :root（含 @supports/@media 内那几份）改写的
 *    --color-*，都必须在其后再出现一条 .light 声明；同特异度只看源码顺序，
 *    写在 :root 之前的顶层 .light 会被压过，浅色主题直接变暗。
 *
 * 新增令牌不必改本文件：只要它在 @theme 声明，「每个暗色令牌都要有 .light 覆盖」
 * 那条断言会自动要求浅色覆盖（顶层块或 .light 前缀的 scoped 规则均可）。
 * ========================================================================= */

const 令牌值清单: Array<{ 令牌: string; 暗色值: string; 浅色值: string; 覆盖标记?: string }> = [
  { 令牌: '--color-panel', 暗色值: '#151030', 浅色值: '#ffffff' },
  { 令牌: '--color-panel-shadow', 暗色值: '#211e35', 浅色值: 'rgba(15, 23, 42, 0.18)' },
  { 令牌: '--color-board-start', 暗色值: '#0f1b2e', 浅色值: '#f7e7c3' },
  { 令牌: '--color-board-end', 暗色值: '#0a0f1a', 浅色值: '#eed6a0' },
  { 令牌: '--color-board-border', 暗色值: 'rgba(255, 255, 255, 0.1)', 浅色值: 'rgba(120, 85, 40, 0.35)' },
  { 令牌: '--color-board-line', 暗色值: 'rgba(255, 255, 255, 0.16)', 浅色值: 'rgba(74, 47, 15, 0.75)' },
  { 令牌: '--color-board-star', 暗色值: 'rgba(255, 255, 255, 0.4)', 浅色值: 'rgba(74, 47, 15, 0.95)' },
  { 令牌: '--color-board-hover', 暗色值: 'rgba(255, 255, 255, 0.05)', 浅色值: 'rgba(74, 47, 15, 0.12)' },
  { 令牌: '--color-board-focus', 暗色值: 'rgba(56, 189, 248, 0.5)', 浅色值: 'rgba(0, 122, 153, 0.85)' },
  { 令牌: '--color-stone-last-ring', 暗色值: 'rgba(255, 255, 255, 0.85)', 浅色值: 'rgba(3, 105, 161, 0.95)' },
  { 令牌: '--color-stone-win', 暗色值: '#fde047', 浅色值: '#c2410c' },
  // FP-09 导航令牌：暗色值 = glass-nav 移植原样字面值（暗色零变化）；胶囊浅色值被
  // 收窄到 .light .glass-nav 作用域（移动端下拉面板恒为深色底），用 覆盖标记 钉住
  { 令牌: '--color-nav-surface', 暗色值: 'rgba(7, 19, 45, 0.18)', 浅色值: 'rgba(255, 255, 255, 0.72)' },
  { 令牌: '--color-nav-border', 暗色值: 'rgba(125, 211, 252, 0.08)', 浅色值: 'rgba(7, 89, 133, 0.2)' },
  {
    令牌: '--color-nav-pill-text',
    暗色值: '#bae6fd',
    浅色值: '#075985',
    覆盖标记: '.light .glass-nav .nav-link-pill {',
  },
  {
    令牌: '--color-nav-pill-border',
    暗色值: 'rgba(125, 211, 252, 0.4)',
    浅色值: 'rgba(12, 74, 110, 0.8)',
    覆盖标记: '.light .glass-nav .nav-link-pill {',
  },
  {
    令牌: '--color-nav-pill-glow',
    暗色值: 'rgba(56, 189, 248, 0.25)',
    浅色值: 'rgba(3, 105, 161, 0.28)',
    覆盖标记: '.light .glass-nav .nav-link-pill {',
  },
  {
    令牌: '--color-nav-pill-hover-surface',
    暗色值: 'rgba(125, 211, 252, 0.1)',
    浅色值: 'rgba(7, 89, 133, 0.1)',
    覆盖标记: '.light .glass-nav .nav-link-pill:hover,',
  },
  {
    令牌: '--color-nav-pill-hover-border',
    暗色值: 'rgba(125, 211, 252, 0.7)',
    浅色值: 'rgba(12, 74, 110, 0.95)',
    覆盖标记: '.light .glass-nav .nav-link-pill:hover,',
  },
  {
    令牌: '--color-nav-pill-hover-glow',
    暗色值: 'rgba(56, 189, 248, 0.45)',
    浅色值: 'rgba(3, 105, 161, 0.45)',
    覆盖标记: '.light .glass-nav .nav-link-pill:hover,',
  },
  {
    令牌: '--color-nav-focus-ring',
    暗色值: 'rgba(56, 189, 248, 0.6)',
    浅色值: 'rgba(3, 105, 161, 0.9)',
    覆盖标记: '\n\n.light .glass-nav .nav-link-pill:focus-visible {',
  },
]

const 禁改清单: Array<{ 文件: string; 已令牌化字面值: string[] }> = [
  {
    文件: 'features/experience/ExperienceSection.tsx',
    // text-white/70 是 text-white 的超串，一条即可覆盖
    已令牌化字面值: ['#151030', '#211e35', '#aaa6c3', 'text-white', 'border-white/10'],
  },
  {
    文件: 'features/contact/Gomoku.tsx',
    已令牌化字面值: [
      'rgba(255,255,255,0.16)',
      'rgba(255,255,255,0.4)',
      '#2a2a2a',
      '#9aa0aa',
      '#cfcfcf',
      '#e6e6e6',
      '#f0f0f0',
      'ring-[#38bdf8]',
      'bg-white/5',
      // 「五子棋」标题的三端点字面渐变（浅色 1.43–2.89:1）→ .text-gradient-teal
      'from-[#5eead4]',
      'via-[#818cf8]',
      'to-[#f0abfc]',
      // 棋盘外框投影（浅色 0.55 黑过重）→ var(--color-panel-shadow)
      'rgba(0,0,0,0.55)',
    ],
  },
  // FP-05 推荐语卡片：卡面底色复用 bg-panel（暗值即 #151030，暗色零变化），
  // 正文/头衔色复用 text-text-secondary / text-text-primary
  {
    文件: 'features/testimonials/TestimonialsSection.tsx',
    已令牌化字面值: ['#151030', '#cfc9e6', '#aaa6c3', 'text-white', 'border-white/10'],
  },
]

const 使用的颜色类 = [
  'bg-panel',
  'text-text-primary',
  'text-text-secondary',
  'border-border',
  'border-bg',
  'bg-bg',
]

const 棋盘区必含令牌引用 = [
  'var(--color-board-start)',
  'var(--color-board-end)',
  'var(--color-board-border)',
  'var(--color-board-line)',
  'var(--color-board-star)',
  'var(--color-stone-last-ring)',
  'var(--color-stone-win)',
]

/** 棋盘区允许保留的字面值：围棋子是实体黑/白子，两主题下同色，不属于主题色 */
const 棋盘区保留字面值 = ['#5b6573', '#0a0e16', '#cbd5e1', 'rgba(10, 15, 26, 0.95)', 'rgba(56, 189, 248, 0.85)']

/** 导航样式区禁改字面值（FP-09）：已收进 --color-nav-* 令牌的暗面色，再出现即绕过令牌。
 *  不含 glass-nav box-shadow 的投影层（rgba(12, 74, 110, …)/0.04 发丝环）：纯深度投影，
 *  两主题通用，非缺陷 2 的「绕过令牌暗色字面值」 */
const 导航区禁改字面值 = [
  'rgba(7, 19, 45',
  'rgba(125, 211, 252, 0.08)',
  'rgba(125, 211, 252, 0.4)',
  'rgba(125, 211, 252, 0.1)',
  'rgba(125, 211, 252, 0.7)',
  '#bae6fd',
  'rgba(56, 189, 248, 0.25)',
  'rgba(56, 189, 248, 0.45)',
  'rgba(56, 189, 248, 0.6)',
]

const 导航区必含令牌引用 = [
  'var(--color-nav-surface)',
  'var(--color-nav-border)',
  'var(--color-nav-pill-text)',
  'var(--color-nav-pill-border)',
  'var(--color-nav-pill-glow)',
  'var(--color-nav-pill-hover-surface)',
  'var(--color-nav-pill-hover-border)',
  'var(--color-nav-pill-hover-glow)',
  'var(--color-nav-focus-ring)',
]

/**
 * 渐变文字机制契约（FP-09 缺陷 1 根因守卫）：基线规则声明 --渐变-* 自定义属性、
 * 用 background-image: var(...) 提供渐变图，clip 机制只写一次；.light 覆盖只允许
 * 重新赋值 --渐变-*。教训：.light 覆盖曾用 background: 简写，特异度压过基线的
 * background-clip: text 并被简写重置回 border-box，渐变整条画出成实心色块。
 * 新增渐变文字类时在此追加一条。
 */
const 渐变机制: Array<{ 基线选择器: string; 浅色选择器: string; 属性: string }> = [
  { 基线选择器: '.text-gradient-blue', 浅色选择器: '.light .text-gradient-blue', 属性: '--渐变-蓝' },
  { 基线选择器: '.text-gradient-green', 浅色选择器: '.light .text-gradient-green', 属性: '--渐变-绿' },
  { 基线选择器: '.text-gradient-pink', 浅色选择器: '.light .text-gradient-pink', 属性: '--渐变-粉' },
  { 基线选择器: '.text-gradient-teal', 浅色选择器: '.light .text-gradient-teal', 属性: '--渐变-青' },
]

/**
 * 渐变文字类的浅色覆盖：亮端渐变（#56ccf2/#38ef7d/#fc6767）在白底卡面上只有 1.4–2.9:1，
 * 必须存在同色系的 .light 深色覆盖。
 */
const 渐变文字浅色覆盖 = 渐变机制.map((项) => 项.浅色选择器)

describe('浅色主题令牌守卫：暗色字面值必须走 @theme 令牌 + .light 覆盖', () => {
  it('每个 @theme 暗色令牌都有 .light 覆盖（顶层块或 .light scoped 规则；新增令牌自动纳入）', () => {
    const 浅色令牌 = 浅色覆盖令牌名(样式表)
    const 缺覆盖 = 令牌名列表(暗色主题块).filter((令牌) => !浅色令牌.has(令牌))
    expect(缺覆盖, `以下令牌只有暗色默认值，浅色主题下会渲染成深色块：${缺覆盖.join(', ')}`).toEqual([])
  })

  it('每个 :root 覆盖的 --color-* 之后都必须还有 .light 重新声明（同特异度只看源码顺序）', () => {
    const 浅色规则块 = 取浅色规则块表(样式表)
    const 问题: string[] = []
    for (const 根块声明表 of 取根规则块表(样式表)) {
      for (const { 令牌, 位置 } of 根块声明表) {
        // 只认排在该 :root 声明之后的 .light：顶层 .light 若写在 @supports :root 之前，
        // 同特异度下后者胜出，浅色主题会被压回暗色——这正是本条要堵的漏洞
        const 有后继覆盖 = 浅色规则块.some((块) => 块.位置 > 位置 && 块.令牌.has(令牌))
        if (!有后继覆盖) 问题.push(`${令牌}（:root 声明位置 ${位置}）`)
      }
    }
    expect(问题, `以下 :root 令牌覆盖之后没有任何 .light 规则重新声明，浅色主题会被压暗：\n${问题.join('\n')}`).toEqual(
      []
    )
  })

  it('语义令牌的暗色值钉住修复前字面值、浅色值为浅底可用值', () => {
    for (const { 令牌, 暗色值, 浅色值, 覆盖标记 } of 令牌值清单) {
      expect(令牌值(暗色主题块, 令牌), `@theme 里 ${令牌} 的暗色值应等于修复前字面值`).toBe(暗色值)
      const 浅色块 = 覆盖标记 ? 取花括号块(样式表, 覆盖标记, `${令牌} 的浅色覆盖规则`) : 浅色覆盖块
      expect(令牌值(浅色块, 令牌), `${覆盖标记 ?? '顶层 .light 块'} 里 ${令牌} 的浅色覆盖值`).toBe(浅色值)
    }
  })

  it.each(禁改清单.map((项) => [项.文件, 项.已令牌化字面值] as const))(
    '%s 不再出现已令牌化的暗色字面值',
    (文件, 字面值表) => {
      const 源码 = 读(文件)
      const 命中 = 字面值表.filter((字面值) => 源码.includes(字面值))
      expect(命中, `${文件} 又写死了暗色字面值，浅色主题下必然出现深色块：${命中.join(', ')}`).toEqual([])
    }
  )

  it('index.css 棋盘样式区底色/描边/高亮改用令牌且令牌引用齐全', () => {
    const 棋盘区 = 取棋盘样式区(样式表)
    const 残留 = [
      '#0f1b2e',
      '#0a0f1a',
      '#fde047',
      'rgba(255, 255, 255, 0.1)',
      'rgba(255, 255, 255, 0.06)',
      'rgba(255, 255, 255, 0.85)',
      'linear-gradient(135deg, #',
    ].filter((字面值) => 棋盘区.includes(字面值))
    expect(残留, `棋盘样式区仍有绕过令牌的底色/描边字面值：${残留.join(', ')}`).toEqual([])
    const 缺失 = 棋盘区必含令牌引用.filter((引用) => !棋盘区.includes(引用))
    expect(缺失, `棋盘样式区未引用以下令牌（规则被删也会走到这里）：${缺失.join(', ')}`).toEqual([])
  })

  it('棋子实体色保持写死（黑/白子在两主题下都是实体色，不得令牌化）', () => {
    const 棋盘区 = 取棋盘样式区(样式表)
    const 丢失 = 棋盘区保留字面值.filter((字面值) => !棋盘区.includes(字面值))
    expect(丢失, `黑子渐变/白子深色描边被改动需人工确认，缺失：${丢失.join(', ')}`).toEqual([])
  })

  it('渐变文字类都有 .light 深色覆盖（白底卡面上亮端不可读）', () => {
    const 缺失 = 渐变文字浅色覆盖.filter((选择器) => !样式表.includes(`${选择器} {`))
    expect(缺失, `缺少浅色覆盖，浅色主题下渐变文字会掉到 AA 对比度以下：${缺失.join(', ')}`).toEqual([])
  })

  it('组件用到的自定义颜色类都有同名 --color-* 令牌且暗浅双声明', () => {
    const 暗色令牌 = new Set(令牌名列表(暗色主题块))
    const 浅色令牌 = new Set(令牌名列表(浅色覆盖块))
    const 受管源码 = 禁改清单.map((项) => 读(项.文件)).join('\n')
    const 问题: string[] = []
    for (const 类名 of 使用的颜色类) {
      const 令牌 = `--color-${类名.replace(/^(bg|text|border)-/, '')}`
      if (!暗色令牌.has(令牌)) 问题.push(`${类名} → 缺少 @theme ${令牌}`)
      if (!浅色令牌.has(令牌)) 问题.push(`${类名} → 缺少 .light ${令牌}`)
      if (!受管源码.includes(类名)) 问题.push(`${类名} → 受管组件已不再使用，清单需清理`)
    }
    expect(问题).toEqual([])
  })

  it('受管文件与 index.css 引用的每个 var(--color-*) 都在 @theme 中声明', () => {
    const 暗色令牌 = new Set(令牌名列表(暗色主题块))
    const 源码 = [样式表, ...禁改清单.map((项) => 读(项.文件))].join('\n')
    const 引用 = [...new Set([...源码.matchAll(/var\(\s*(--color-[a-z0-9-]+)/g)].map((命中) => 命中[1]))]
    const 未声明 = 引用.filter((令牌) => !暗色令牌.has(令牌))
    expect(未声明, `引用了未声明的令牌（Tailwind 不会生成，值解析为空）：${未声明.join(', ')}`).toEqual([])
  })

  it('index.css 导航样式区底色/描边/文字/光晕/焦点环改用 --color-nav-* 令牌', () => {
    const 导航区 = 取导航样式区(样式表)
    const 残留 = 导航区禁改字面值.filter((字面值) => 导航区.includes(字面值))
    expect(残留, `导航样式区又写死了暗色字面值，浅色主题必现低对比（缺陷 2 回归）：${残留.join(', ')}`).toEqual([])
    const 缺失 = 导航区必含令牌引用.filter((引用) => !导航区.includes(引用))
    expect(缺失, `导航样式区未引用以下令牌（规则被删也会走到这里）：${缺失.join(', ')}`).toEqual([])
  })

  it.each(渐变机制.map((项) => [项.浅色选择器, 项.属性] as const))(
    '.light 渐变覆盖 %s 只允许赋值自定义属性——background/color 等简写会静默重置 background-clip（缺陷 1 根因：覆盖层 background 简写压过基线 clip，渐变整条画出成实心色块）',
    (浅色选择器, 属性) => {
      const 块 = 取花括号块(样式表, `${浅色选择器} {`, `渐变浅色覆盖 ${浅色选择器}`)
      const 声明表 = 块
        .slice(块.indexOf('{') + 1, 块.lastIndexOf('}'))
        .split(';')
        .map((声明) => 声明.trim())
        .filter(Boolean)
      const 违规 = 声明表.filter((声明) => !声明.startsWith('--'))
      expect(违规, `${浅色选择器} 出现非自定义属性声明，会重置基线 clip 机制：${违规.join('; ')}`).toEqual([])
      expect(块, `${浅色选择器} 应重新赋值 ${属性}`).toContain(`${属性}:`)
    }
  )

  it.each(渐变机制.map((项) => [项.基线选择器, 项.属性] as const))(
    '渐变基线 %s 由 var(自定义属性) 提供渐变图且 clip 机制只写一次',
    (基线选择器, 属性) => {
      const 块 = 取花括号块(样式表, `\n${基线选择器} {`, `渐变基线规则 ${基线选择器}`)
      expect(块, `基线应声明 ${属性}`).toContain(`${属性}: linear-gradient`)
      expect(块, `基线应通过 var(${属性}) 提供渐变图`).toContain(`background-image: var(${属性})`)
      expect(块).toContain('-webkit-background-clip: text')
      expect(块).toContain('background-clip: text')
      expect(块).toContain('-webkit-text-fill-color: transparent')
      expect(/(^|[^-\w])background\s*:/.test(块), `${基线选择器} 基线不得用 background 简写（同样会重置 clip）`).toBe(
        false
      )
    }
  )
})
