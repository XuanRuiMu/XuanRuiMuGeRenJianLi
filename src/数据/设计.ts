import type { 设计 } from './类型'

export const 设计数据: 设计 = {
  标题键: 'data.design.headline',
  介绍键: 'data.design.intro',
  作品表: [
    {
      id: 'resumeTheater',
      名称键: 'data.design.works.resumeTheater.name',
      分类键: 'data.design.works.resumeTheater.category',
      描述键: 'data.design.works.resumeTheater.desc',
    },
    {
      id: 'xrmUi',
      名称键: 'data.design.works.xrmUi.name',
      分类键: 'data.design.works.xrmUi.category',
      描述键: 'data.design.works.xrmUi.desc',
    },
    {
      id: 'aiToolchain',
      名称键: 'data.design.works.aiToolchain.name',
      分类键: 'data.design.works.aiToolchain.category',
      描述键: 'data.design.works.aiToolchain.desc',
    },
  ],
  工具键表: [
    'data.design.tools.figma',
    'data.design.tools.threejs',
    'data.design.tools.tailwind',
    'data.design.tools.uiux',
    'data.design.tools.3d',
    'data.design.tools.branding',
  ],
}
