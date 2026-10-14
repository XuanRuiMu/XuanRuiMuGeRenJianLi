import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { t } from '../i18n/翻译'
import { 展示行表, type 展示卡 } from './展示'

const 项目根 = path.resolve(__dirname, '../..')
/** 受 git 跟踪的素材唯一源（fresh clone 跑测试不依赖 public 产物） */
const 素材图目录 = path.resolve(项目根, '素材/showcase')
/** scripts/同步素材.js 生成的产物镜像，仅作「素材加了图但忘跑同步」的第二道闸门 */
const 产物图目录 = path.resolve(项目根, 'public/showcase')

const 全部卡 = 展示行表.flatMap((行) => 行.cards)
const 配图卡 = 全部卡.filter((卡) => !卡.无图)
const 无图卡 = 全部卡.filter((卡) => 卡.无图)
/** 项目名 = 卡片标题字面值，素材文件名与它一字不差 */
const 项目名 = (卡: 展示卡) => t(卡.titleKey)
const 图文件名 = (卡: 展示卡) => `${项目名(卡)}.png`
const 源文件路径 = (卡: 展示卡) => path.resolve(素材图目录, 图文件名(卡))
/** 手写路径守卫读的是实现源码本身（类型系统已挡一层，这里再挡字符串与隐式 existsSync 两条退路） */
const showcase源码 = fs.readFileSync(path.resolve(项目根, 'src/data/展示.ts'), 'utf-8')

/**
 * 项目名非法字符：Windows 文件名禁用字符（派生出的图片文件名必须能落盘）
 * + 都是 Windows 合法文件名字符、却会让派生 URL 出错的字符（# % ` { } 与 "）。
 * 与 showcase.ts 的 项目名转URL 分工：守卫负责「不允许出现在项目名里」，编码负责「必须转义才安全」。
 */
const 非法字符正则 = /[\\/:*?"<>|#%`{}]/
const 含控制字符 = (值: string) => Array.from(值).some((字) => (字.codePointAt(0) ?? 0) < 0x20 || 字 === '\x7f')

describe('FP-03 作品配图「文件名=项目名」派生守卫', () => {
  it('除显式声明 无图 的卡外，每张卡的素材源图必须存在', () => {
    expect(全部卡.length).toBeGreaterThan(0)
    expect(配图卡.length).toBeGreaterThan(0)
    const 缺失 = 配图卡.filter((卡) => !fs.existsSync(源文件路径(卡))).map(图文件名)
    expect(缺失, '素材/showcase/ 下缺这些图：把图按项目名重命名后放进 素材/showcase/').toEqual([])
  })

  it('故意无图的卡必须显式声明 无图，且不带 image（不得靠文件缺失静默无图）', () => {
    expect(无图卡.map((卡) => 卡.id)).toEqual(['generative'])
    for (const 卡 of 无图卡) expect(卡.image, `无图卡不该有 image：${卡.id}`).toBeUndefined()
    expect(showcase源码, '不得用「文件不存在就静默无图」的隐式方式').not.toMatch(/existsSync/)
  })

  it('素材/showcase 下每个文件恰好被一张卡引用（无孤儿、无重复引用、无漏卡）', () => {
    const 源文件表 = fs
      .readdirSync(素材图目录, { withFileTypes: true })
      .filter((条目) => 条目.isFile())
      .map((条目) => 条目.name)
    expect(源文件表.length).toBeGreaterThan(0)
    const 引用表 = new Map<string, string[]>()
    for (const 卡 of 配图卡) {
      const 名单 = 引用表.get(图文件名(卡)) ?? []
      名单.push(卡.id)
      引用表.set(图文件名(卡), 名单)
    }
    for (const 文件名 of 源文件表) {
      expect(
        引用表.get(文件名) ?? [],
        `素材图「${文件名}」没有被任何卡片引用（孤儿图或项目名与文件名不一致）`
      ).toHaveLength(1)
    }
    expect(引用表.size, '两张卡派生出了同一个文件名').toBe(配图卡.length)
    expect(源文件表.length, '素材图数量与配图卡数量必须一致').toBe(配图卡.length)
  })

  it('项目名可安全落盘：无非法字符、无控制字符、无首尾空白与尾点，且确已解析出中文名', () => {
    for (const 卡 of 全部卡) {
      const 名 = 项目名(卡)
      expect(名, `卡片 ${卡.id} 的 titleKey 未解析出项目名（拿到了键路径本身）`).not.toBe(卡.titleKey)
      expect(名, `项目名不得含文件系统非法字符：${卡.id}`).not.toMatch(非法字符正则)
      expect(含控制字符(名), `项目名不得含控制字符（如换行、制表符）：${卡.id}`).toBe(false)
      expect(名, `项目名不得有首尾空白或以点结尾（Windows 文件名规则）：${卡.id}`).not.toMatch(/^\s|\s$|\.$/)
    }
  })

  it('非法字符集覆盖 URL 敏感字符：项目名含 # 必须被守卫拦下（否则派生 URL 被浏览器当 fragment 截断成 404，守卫却仍判绿）', () => {
    const 必拦 = ['#', '%', '`', '{', '}', '"']
    expect(
      必拦.filter((字) => !非法字符正则.test(`项目${字}名`)),
      '守卫漏拦了这些字符：项目名含它们时派生 URL 会出错，所有守卫却仍全绿'
    ).toEqual([])
    expect(非法字符正则.test('学历#1 · 天津仁爱学院'), '含 # 的项目名必须判红').toBe(true)
  })

  it('image 由项目名严格派生：URL 解码回来必须一字不差等于 素材文件名，且不含空白', () => {
    for (const 卡 of 配图卡) {
      const 图URL = 卡.image ?? ''
      expect(图URL).not.toMatch(/\s/)
      expect(decodeURIComponent(图URL.slice('/showcase/'.length)), `派生路径与项目名不一致：${卡.id}`).toBe(
        图文件名(卡)
      )
    }
    expect(showcase源码, '配图路径必须由项目名派生，不得手写字符串路径').not.toMatch(/image:\s*['"]/)
  })

  it('派生 URL 命中独立预言：基准卡的字面量写死（手算并 decode 往返核对过，不复用被测实现）', () => {
    const 基准卡 = 全部卡.find((卡) => 卡.id === 'degree')
    expect(基准卡, '缺少 id=degree 的基准卡，本预言失效').toBeTruthy()
    expect(基准卡?.image).toBe('/showcase/学历%20·%20天津仁爱学院.png')
    expect(decodeURIComponent('/showcase/学历%20·%20天津仁爱学院.png'.slice('/showcase/'.length))).toBe(
      '学历 · 天津仁爱学院.png'
    )
  })

  it('编码字符类不得回退：空白、单双引号、圆括号都在内（unquoted url() 含它们会被浏览器整条丢弃）', () => {
    /** 项目名转URL 刻意不导出（避免只为测试而扩 API），故只能在源码层守这条不变式 */
    const 编码字符类 = showcase源码.match(/项目名\.replace\(\/\[([^\]]*)\]\//)?.[1]
    expect(编码字符类, '未能在 showcase.ts 里定位 项目名转URL 的编码字符类').toBeTruthy()
    expect(编码字符类).toContain('\\s')
    for (const 字 of ['"', "'", '(', ')']) {
      expect(编码字符类, `编码字符类漏了 ${字}：项目名含它时派生 URL 会被浏览器整条丢弃，该卡静默丢图`).toContain(字)
    }
  })

  it('派生出的 URL 真能作为 CSS background-image 生效（含空格的项目名不得被浏览器丢弃）', () => {
    expect(
      配图卡.some((卡) => /\s/.test(图文件名(卡))),
      '需至少一张卡的项目名带空格，否则本守卫会空转'
    ).toBe(true)
    for (const 卡 of 配图卡) {
      const 元素 = document.createElement('div')
      元素.style.backgroundImage = `url(${卡.image ?? ''})`
      expect(元素.style.backgroundImage, `该 URL 无法作为 CSS url() 生效（会被浏览器整条丢弃）：${卡.id}`).not.toBe('')
    }
  })

  it('public 产物镜像已同步：素材源里有的图，public/showcase 下也必须存在', () => {
    const 缺产物 = 配图卡.filter((卡) => !fs.existsSync(path.resolve(产物图目录, 图文件名(卡)))).map(图文件名)
    expect(缺产物, '素材已加图但没跑 node scripts/同步素材.js（或需重新构建部署）').toEqual([])
  })
})
