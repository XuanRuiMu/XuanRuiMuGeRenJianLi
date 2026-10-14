import { t, type TranslationKey } from '../i18n/翻译'
import { yangLaiWebUrl } from './项目'

/**
 * 配图源目录（素材唯一源）。public/showcase/ 是 scripts/同步素材.js 生成的镜像产物，勿直接编辑。
 */
const 项目图目录 = '/showcase'

/**
 * unquoted CSS url() 内不可用的字符（空白、单双引号、圆括号）必须做 URL 百分号编码。
 * 实测 Chromium 与 jsdom 都会把含这些字符的 unquoted url() 整条丢弃
 * （项目名「学历 · 天津仁爱学院」带空格，不编码则该卡在浏览器里静默丢图），编码后照常显示。
 *
 * 与 showcase.test.ts 的 非法字符正则 分工，两者有交集即双保险：
 *   - 编码（本函数）负责「必须转义才安全」的字符：会破坏 url() 解析的空白、单双引号、圆括号；
 *   - 守卫（非法字符正则）负责「不允许出现在项目名里」的字符：Windows 文件名禁用字符，
 *     以及都是 Windows 合法文件名字符、却会让派生 URL 出错的 #（被浏览器当 fragment 截断成 404）、
 *     %（造出非法百分号转义）、` { }（内联 style 与 HTML 属性里危险）。
 * 只影响 URL，素材文件名仍是项目名一字不差。
 */
const 项目名转URL = (项目名: string) =>
  项目名.replace(/[\s'"()]/g, (字) => `%${(字.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(2, '0')}`)

/**
 * 按项目名派生配图 URL。项目名 = zh-CN.json 里 showcase.cards.<id>.title 的字面值，
 * 含其空格、间隔号「·」、书名号《》、全角括号（）一字不改，故源文件名必须与项目名一字不差。
 *
 * 换图流程：把新图重命名为项目名放进 素材/showcase/ → 跑 node scripts/同步素材.js（或重启 npm run dev）
 * → 刷新；public/ 是产物，线上生效需重新构建并部署。
 */
function 项目图路径(titleKey: TranslationKey): string {
  return `${项目图目录}/${项目名转URL(t(titleKey))}.png`
}

/** 卡片原始声明：没有 image 字段（想手写路径会触发 TS 多余属性报错），配图一律由项目名派生 */
export interface 展示卡源 {
  id: string
  titleKey: TranslationKey
  descKey: TranslationKey
  href?: string
  /** 显式声明本卡故意纯黑底不放配图；不写此字段则必有配图（守卫测试据此区分「故意无图」与「忘放图」） */
  无图?: true
}

export interface 展示卡 extends 展示卡源 {
  /** 由 项目图路径() 自动派生；仅 无图 卡为 undefined */
  image?: string
}

export interface 展示行 {
  /** 锚点 id（沿用原 education / design / media，导航跳转不变） */
  anchorId: string
  cards: 展示卡[]
}

interface 板块声明 {
  anchorId: string
  cards: 展示卡源[]
}

/**
 * 作品展示区：按内容分为三个板块，每板块一排卡片，
 * 由 12-next-spline-3d HeroParallax 视差布局承载。板块标签已移除，仅保留纯粹的方块项目。
 */
export const 暮澜链接 = 'https://github.com/XuanRuiMu/XRMChaJian'

const 源板块表: 板块声明[] = [
  {
    anchorId: 'education',
    cards: [
      {
        id: 'degree',
        titleKey: 'showcase.cards.degree.title',
        descKey: 'showcase.cards.degree.desc',
      },
      {
        id: 'coding',
        titleKey: 'showcase.cards.coding.title',
        descKey: 'showcase.cards.coding.desc',
        href: 'https://www.bilibili.com/video/BV11r421j7UV',
      },
      {
        id: 'systems',
        titleKey: 'showcase.cards.systems.title',
        descKey: 'showcase.cards.systems.desc',
        href: 'https://www.bilibili.com/video/BV1x36HYjEoA',
      },
      {
        id: 'lowlevel',
        titleKey: 'showcase.cards.lowlevel.title',
        descKey: 'showcase.cards.lowlevel.desc',
        href: 'https://www.bilibili.com/video/BV1Cw4m1R7SN',
      },
      {
        id: 'teaching',
        titleKey: 'showcase.cards.teaching.title',
        descKey: 'showcase.cards.teaching.desc',
        href: 'https://www.bilibili.com/video/BV1UYGy6rEmj',
      },
      {
        id: 'assembly',
        titleKey: 'showcase.cards.assembly.title',
        descKey: 'showcase.cards.assembly.desc',
        href: 'https://www.bilibili.com/video/BV1ghmfYCELF',
      },
      {
        id: 'arch',
        titleKey: 'showcase.cards.arch.title',
        descKey: 'showcase.cards.arch.desc',
        href: 'https://www.bilibili.com/video/BV12TVfzfEVu',
      },
      {
        id: 'marx',
        titleKey: 'showcase.cards.marx.title',
        descKey: 'showcase.cards.marx.desc',
        href: 'https://www.bilibili.com/video/BV11m421K7vq',
      },
    ],
  },
  {
    anchorId: 'design',
    cards: [
      {
        id: 'resumeTheater',
        titleKey: 'showcase.cards.resumeTheater.title',
        descKey: 'showcase.cards.resumeTheater.desc',
        href: 'https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi',
      },
      {
        id: 'xrmUi',
        titleKey: 'showcase.cards.xrmUi.title',
        descKey: 'showcase.cards.xrmUi.desc',
        href: 暮澜链接,
      },
      {
        id: 'toolbox',
        titleKey: 'showcase.cards.toolbox.title',
        descKey: 'showcase.cards.toolbox.desc',
      },
    ],
  },
  {
    anchorId: 'media',
    cards: [
      {
        id: 'generative',
        titleKey: 'showcase.cards.generative.title',
        descKey: 'showcase.cards.generative.desc',
        无图: true,
      },
      {
        id: 'novel',
        titleKey: 'showcase.cards.novel.title',
        descKey: 'showcase.cards.novel.desc',
      },
      {
        id: 'comedy',
        titleKey: 'showcase.cards.comedy.title',
        descKey: 'showcase.cards.comedy.desc',
        href: 'https://www.bilibili.com/video/BV1vkDGY8Eyw',
      },
      {
        id: 'gameWorld',
        titleKey: 'showcase.cards.gameWorld.title',
        descKey: 'showcase.cards.gameWorld.desc',
        href: 暮澜链接,
      },
      {
        id: 'courses',
        titleKey: 'showcase.cards.courses.title',
        descKey: 'showcase.cards.courses.desc',
        href: 'https://space.bilibili.com/383504924',
      },
    ],
  },
  {
    anchorId: 'opensource',
    cards: [
      {
        id: 'repoLoop',
        titleKey: 'showcase.cards.repoLoop.title',
        descKey: 'showcase.cards.repoLoop.desc',
        href: 'https://github.com/XuanRuiMu/loop-engineering',
      },
      {
        id: 'repoLove',
        titleKey: 'showcase.cards.repoLove.title',
        descKey: 'showcase.cards.repoLove.desc',
        href: 'https://github.com/XuanRuiMu/HeWoLianAiBa',
      },
      {
        id: 'repoData',
        titleKey: 'showcase.cards.repoData.title',
        descKey: 'showcase.cards.repoData.desc',
        href: 'https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin',
      },
      {
        id: 'yanglai',
        titleKey: 'showcase.cards.yanglai.title',
        descKey: 'showcase.cards.yanglai.desc',
        href: yangLaiWebUrl,
      },
    ],
  },
]

export const 展示行表: 展示行[] = 源板块表.map((行) => ({
  anchorId: 行.anchorId,
  cards: 行.cards.map((卡) => (卡.无图 ? { ...卡 } : { ...卡, image: 项目图路径(卡.titleKey) })),
}))
