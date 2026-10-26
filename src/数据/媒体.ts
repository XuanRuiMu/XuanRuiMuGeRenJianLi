import type { 媒体 } from './类型'

export const 媒体数据: 媒体 = {
  标题键: 'data.media.headline',
  介绍键: 'data.media.intro',
  分类表: [
    {
      id: 'writing',
      标签键: 'data.media.categories.writing.label',
      条目键表: ['data.media.categories.writing.items.novel', 'data.media.categories.writing.items.blog'],
    },
    {
      id: 'comedy',
      标签键: 'data.media.categories.comedy.label',
      条目键表: ['data.media.categories.comedy.items.original', 'data.media.categories.comedy.items.voice'],
    },
    {
      id: 'game',
      标签键: 'data.media.categories.game.label',
      条目键表: ['data.media.categories.game.items.worlds', 'data.media.categories.game.items.boss'],
    },
    {
      id: 'video',
      标签键: 'data.media.categories.video.label',
      条目键表: ['data.media.categories.video.items.courses', 'data.media.categories.video.items.editing'],
    },
  ],
  时间线: [
    { 年份: '2022', 事件键: 'data.media.timeline.2022' },
    { 年份: '2023', 事件键: 'data.media.timeline.2023' },
    { 年份: '2024', 事件键: 'data.media.timeline.2024' },
    { 年份: '2025', 事件键: 'data.media.timeline.2025' },
  ],
}
