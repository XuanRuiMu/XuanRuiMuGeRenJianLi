import type { TranslationKey } from '../i18n/translations'

export interface ShowcaseCard {
  id: string
  titleKey: TranslationKey
  descKey: TranslationKey
  href?: string
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
export const showcaseRows: ShowcaseRow[] = [
  {
    anchorId: 'education',
    cards: [
      { id: 'degree', titleKey: 'showcase.cards.degree.title', descKey: 'showcase.cards.degree.desc' },
      { id: 'coding', titleKey: 'showcase.cards.coding.title', descKey: 'showcase.cards.coding.desc' },
      { id: 'systems', titleKey: 'showcase.cards.systems.title', descKey: 'showcase.cards.systems.desc' },
      { id: 'lowlevel', titleKey: 'showcase.cards.lowlevel.title', descKey: 'showcase.cards.lowlevel.desc' },
      { id: 'teaching', titleKey: 'showcase.cards.teaching.title', descKey: 'showcase.cards.teaching.desc' },
    ],
  },
  {
    anchorId: 'design',
    cards: [
      { id: 'resumeTheater', titleKey: 'showcase.cards.resumeTheater.title', descKey: 'showcase.cards.resumeTheater.desc' },
      { id: 'xrmUi', titleKey: 'showcase.cards.xrmUi.title', descKey: 'showcase.cards.xrmUi.desc' },
      { id: 'aiToolchain', titleKey: 'showcase.cards.aiToolchain.title', descKey: 'showcase.cards.aiToolchain.desc' },
      { id: 'toolbox', titleKey: 'showcase.cards.toolbox.title', descKey: 'showcase.cards.toolbox.desc' },
      { id: 'generative', titleKey: 'showcase.cards.generative.title', descKey: 'showcase.cards.generative.desc' },
    ],
  },
  {
    anchorId: 'media',
    cards: [
      { id: 'novel', titleKey: 'showcase.cards.novel.title', descKey: 'showcase.cards.novel.desc' },
      { id: 'comedy', titleKey: 'showcase.cards.comedy.title', descKey: 'showcase.cards.comedy.desc' },
      { id: 'gameWorld', titleKey: 'showcase.cards.gameWorld.title', descKey: 'showcase.cards.gameWorld.desc' },
      {
        id: 'courses',
        titleKey: 'showcase.cards.courses.title',
        descKey: 'showcase.cards.courses.desc',
        href: 'https://space.bilibili.com/383504924',
      },
      { id: 'escape', titleKey: 'showcase.cards.escape.title', descKey: 'showcase.cards.escape.desc' },
    ],
  },
]
