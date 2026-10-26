import { t, type 翻译键 } from '../国际化/翻译'
import { 资源路径 } from '../库/资源路径'
import { 羊来官网地址 } from './项目'

const 项目图目录 = 资源路径('/showcase')

const 项目名转URL = (项目名: string) =>
  项目名.replace(/[\s'"()]/g, (字) => `%${(字.codePointAt(0) ?? 0).toString(16).toUpperCase().padStart(2, '0')}`)

function 项目图路径(标题键: 翻译键): string {
  return `${项目图目录}/${项目名转URL(t(标题键))}.webp`
}

export interface 展示卡源 {
  id: string
  标题键: 翻译键
  描述键: 翻译键
  href?: string
}

export interface 展示卡 extends 展示卡源 {
  图片: string
}

export interface 展示行 {
  锚点编号: string
  卡片表: 展示卡[]
}

interface 板块声明 {
  锚点编号: string
  卡片表: 展示卡源[]
}

export const 暮澜链接 = 'https://github.com/XuanRuiMu/XRMChaJian'

const 源板块表: 板块声明[] = [
  {
    锚点编号: 'education',
    卡片表: [
      {
        id: 'degree',
        标题键: 'showcase.cards.degree.title',
        描述键: 'showcase.cards.degree.desc',
      },
      {
        id: 'coding',
        标题键: 'showcase.cards.coding.title',
        描述键: 'showcase.cards.coding.desc',
        href: 'https://www.bilibili.com/video/BV11r421j7UV',
      },
      {
        id: 'systems',
        标题键: 'showcase.cards.systems.title',
        描述键: 'showcase.cards.systems.desc',
        href: 'https://www.bilibili.com/video/BV1x36HYjEoA',
      },
      {
        id: 'lowlevel',
        标题键: 'showcase.cards.lowlevel.title',
        描述键: 'showcase.cards.lowlevel.desc',
        href: 'https://www.bilibili.com/video/BV1Cw4m1R7SN',
      },
      {
        id: 'teaching',
        标题键: 'showcase.cards.teaching.title',
        描述键: 'showcase.cards.teaching.desc',
        href: 'https://www.bilibili.com/video/BV1UYGy6rEmj',
      },
      {
        id: 'assembly',
        标题键: 'showcase.cards.assembly.title',
        描述键: 'showcase.cards.assembly.desc',
        href: 'https://www.bilibili.com/video/BV1ghmfYCELF',
      },
      {
        id: 'arch',
        标题键: 'showcase.cards.arch.title',
        描述键: 'showcase.cards.arch.desc',
        href: 'https://www.bilibili.com/video/BV12TVfzfEVu',
      },
      {
        id: 'marx',
        标题键: 'showcase.cards.marx.title',
        描述键: 'showcase.cards.marx.desc',
        href: 'https://www.bilibili.com/video/BV11m421K7vq',
      },
    ],
  },
  {
    锚点编号: 'design',
    卡片表: [
      {
        id: 'resumeTheater',
        标题键: 'showcase.cards.resumeTheater.title',
        描述键: 'showcase.cards.resumeTheater.desc',
        href: 'https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi',
      },
      {
        id: 'xrmUi',
        标题键: 'showcase.cards.xrmUi.title',
        描述键: 'showcase.cards.xrmUi.desc',
        href: 暮澜链接,
      },
      {
        id: 'toolbox',
        标题键: 'showcase.cards.toolbox.title',
        描述键: 'showcase.cards.toolbox.desc',
      },
    ],
  },
  {
    锚点编号: 'media',
    卡片表: [
      {
        id: 'novel',
        标题键: 'showcase.cards.novel.title',
        描述键: 'showcase.cards.novel.desc',
      },
      {
        id: 'comedy',
        标题键: 'showcase.cards.comedy.title',
        描述键: 'showcase.cards.comedy.desc',
        href: 'https://www.bilibili.com/video/BV1vkDGY8Eyw',
      },
      {
        id: 'gameWorld',
        标题键: 'showcase.cards.gameWorld.title',
        描述键: 'showcase.cards.gameWorld.desc',
        href: 暮澜链接,
      },
      {
        id: 'courses',
        标题键: 'showcase.cards.courses.title',
        描述键: 'showcase.cards.courses.desc',
        href: 'https://space.bilibili.com/383504924',
      },
    ],
  },
  {
    锚点编号: 'opensource',
    卡片表: [
      {
        id: 'repoLoop',
        标题键: 'showcase.cards.repoLoop.title',
        描述键: 'showcase.cards.repoLoop.desc',
        href: 'https://github.com/XuanRuiMu/loop-engineering',
      },
      {
        id: 'repoLove',
        标题键: 'showcase.cards.repoLove.title',
        描述键: 'showcase.cards.repoLove.desc',
        href: 'https://github.com/XuanRuiMu/HeWoLianAiBa',
      },
      {
        id: 'repoData',
        标题键: 'showcase.cards.repoData.title',
        描述键: 'showcase.cards.repoData.desc',
        href: 'https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin',
      },
      {
        id: 'yanglai',
        标题键: 'showcase.cards.yanglai.title',
        描述键: 'showcase.cards.yanglai.desc',
        href: 羊来官网地址,
      },
    ],
  },
]

export const 展示行表: 展示行[] = 源板块表.map((行) => ({
  锚点编号: 行.锚点编号,
  卡片表: 行.卡片表.map((卡) => ({ ...卡, 图片: 项目图路径(卡.标题键) })),
}))
