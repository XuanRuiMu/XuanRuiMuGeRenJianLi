import type { Design } from './types'

export const design: Design = {
  headlineKey: 'data.design.headline',
  introKey: 'data.design.intro',
  works: [
    {
      id: 'resumeTheater',
      nameKey: 'data.design.works.resumeTheater.name',
      categoryKey: 'data.design.works.resumeTheater.category',
      descKey: 'data.design.works.resumeTheater.desc',
    },
    {
      id: 'xrmUi',
      nameKey: 'data.design.works.xrmUi.name',
      categoryKey: 'data.design.works.xrmUi.category',
      descKey: 'data.design.works.xrmUi.desc',
    },
    {
      id: 'aiToolchain',
      nameKey: 'data.design.works.aiToolchain.name',
      categoryKey: 'data.design.works.aiToolchain.category',
      descKey: 'data.design.works.aiToolchain.desc',
    },
  ],
  toolKeys: [
    'data.design.tools.figma',
    'data.design.tools.threejs',
    'data.design.tools.tailwind',
    'data.design.tools.uiux',
    'data.design.tools.3d',
    'data.design.tools.branding',
  ],
}
