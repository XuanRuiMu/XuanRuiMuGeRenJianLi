import type { TranslationKey } from '../i18n/translations'

export interface ShowcaseCard {
  id: string
  titleKey: TranslationKey
  descKey: TranslationKey
  href?: string
  /**
   * 卡片配图路径（相对站点根目录，资源放在 public/showcase/ 下）。
   * 留空则卡片保持纯黑底；替换同名图片文件后刷新页面即可生效，无需重新构建。
   */
  image?: string
}

export interface ShowcaseRow {
  /** 锚点 id（沿用原 education / design / media，导航跳转不变） */
  anchorId: string
  cards: ShowcaseCard[]
}

/**
 * 作品展示区：按内容分为三个板块，每板块一排卡片，
 * 由 12-next-spline-3d HeroParallax 视差布局承载。板块标签已移除，仅保留纯粹的方块项目。
 */
export const 暮澜链接 = 'https://github.com/XuanRuiMu/XRMChaJian'

export const showcaseRows: ShowcaseRow[] = [
  {
    anchorId: 'education',
    cards: [
      {
        id: 'degree',
        titleKey: 'showcase.cards.degree.title',
        descKey: 'showcase.cards.degree.desc',
        image: '/showcase/学历天津仁爱学院.png',
      },
      {
        id: 'coding',
        titleKey: 'showcase.cards.coding.title',
        descKey: 'showcase.cards.coding.desc',
        href: 'https://www.bilibili.com/video/BV11r421j7UV',
        image: '/showcase/Python编程题精讲.png',
      },
      {
        id: 'systems',
        titleKey: 'showcase.cards.systems.title',
        descKey: 'showcase.cards.systems.desc',
        href: 'https://www.bilibili.com/video/BV1x36HYjEoA',
        image: '/showcase/计算机网络.png',
      },
      {
        id: 'lowlevel',
        titleKey: 'showcase.cards.lowlevel.title',
        descKey: 'showcase.cards.lowlevel.desc',
        href: 'https://www.bilibili.com/video/BV1Cw4m1R7SN',
        image: '/showcase/MySQL数据库精讲.png',
      },
      {
        id: 'teaching',
        titleKey: 'showcase.cards.teaching.title',
        descKey: 'showcase.cards.teaching.desc',
        href: 'https://www.bilibili.com/video/BV1UYGy6rEmj',
        image: '/showcase/毕业论文全流程指导.png',
      },
      {
        id: 'assembly',
        titleKey: 'showcase.cards.assembly.title',
        descKey: 'showcase.cards.assembly.desc',
        href: 'https://www.bilibili.com/video/BV1ghmfYCELF',
        image: '/showcase/汇编语言程序设计.png',
      },
      {
        id: 'arch',
        titleKey: 'showcase.cards.arch.title',
        descKey: 'showcase.cards.arch.desc',
        href: 'https://www.bilibili.com/video/BV12TVfzfEVu',
        image: '/showcase/计算机组成原理.png',
      },
      {
        id: 'marx',
        titleKey: 'showcase.cards.marx.title',
        descKey: 'showcase.cards.marx.desc',
        href: 'https://www.bilibili.com/video/BV11m421K7vq',
        image: '/showcase/马克思主义原理精讲.png',
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
        href: 'https://github.com/XuanRuiMu/XuanRuiMuResume',
        image: '/showcase/个人简历网站.png',
      },
      {
        id: 'xrmUi',
        titleKey: 'showcase.cards.xrmUi.title',
        descKey: 'showcase.cards.xrmUi.desc',
        href: 暮澜链接,
        image: '/showcase/暮澜纪元UI设计.png',
      },
      {
        id: 'toolbox',
        titleKey: 'showcase.cards.toolbox.title',
        descKey: 'showcase.cards.toolbox.desc',
        image: '/showcase/设计工具箱.png',
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
      },
      {
        id: 'novel',
        titleKey: 'showcase.cards.novel.title',
        descKey: 'showcase.cards.novel.desc',
        image: '/showcase/暮澜纪元小说.png',
      },
      {
        id: 'comedy',
        titleKey: 'showcase.cards.comedy.title',
        descKey: 'showcase.cards.comedy.desc',
        href: 'https://www.bilibili.com/video/BV1vkDGY8Eyw',
        image: '/showcase/原创相声传统与科技.png',
      },
      {
        id: 'gameWorld',
        titleKey: 'showcase.cards.gameWorld.title',
        descKey: 'showcase.cards.gameWorld.desc',
        href: 暮澜链接,
        image: '/showcase/游戏世界设计.png',
      },
      {
        id: 'courses',
        titleKey: 'showcase.cards.courses.title',
        descKey: 'showcase.cards.courses.desc',
        href: 'https://space.bilibili.com/383504924',
        image: '/showcase/B站课程主页玄锐暮.png',
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
        image: '/showcase/循环工程loop-engineering.png',
      },
      {
        id: 'repoLove',
        titleKey: 'showcase.cards.repoLove.title',
        descKey: 'showcase.cards.repoLove.desc',
        href: 'https://github.com/XuanRuiMu/HeWoLianAiBa',
        image: '/showcase/和我恋爱吧HeWoLianAiBa.png',
      },
      {
        id: 'repoData',
        titleKey: 'showcase.cards.repoData.title',
        descKey: 'showcase.cards.repoData.desc',
        href: 'https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin',
        image: '/showcase/恋爱吧管理中心LianAiBaGuanLiZhongXin.png',
      },
      {
        id: 'fenglai',
        titleKey: 'showcase.cards.fenglai.title',
        descKey: 'showcase.cards.fenglai.desc',
        href: 'https://xuanruimu.github.io/FengLai/index.html',
        image: '/showcase/蜂来.png',
      },
    ],
  },
]
