import type { Media } from './types'

export const media: Media = {
  headlineKey: 'data.media.headline',
  introKey: 'data.media.intro',
  categories: [
    {
      id: 'writing',
      labelKey: 'data.media.categories.writing.label',
      itemKeys: ['data.media.categories.writing.items.novel', 'data.media.categories.writing.items.blog'],
    },
    {
      id: 'comedy',
      labelKey: 'data.media.categories.comedy.label',
      itemKeys: ['data.media.categories.comedy.items.original', 'data.media.categories.comedy.items.voice'],
    },
    {
      id: 'game',
      labelKey: 'data.media.categories.game.label',
      itemKeys: ['data.media.categories.game.items.worlds', 'data.media.categories.game.items.boss'],
    },
    {
      id: 'video',
      labelKey: 'data.media.categories.video.label',
      itemKeys: ['data.media.categories.video.items.courses', 'data.media.categories.video.items.editing'],
    },
  ],
  timeline: [
    { year: '2022', eventKey: 'data.media.timeline.2022' },
    { year: '2023', eventKey: 'data.media.timeline.2023' },
    { year: '2024', eventKey: 'data.media.timeline.2024' },
    { year: '2025', eventKey: 'data.media.timeline.2025' },
  ],
}
