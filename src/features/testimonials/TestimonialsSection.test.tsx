import { describe, it, expect, afterEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import { TestimonialsSection } from './TestimonialsSection'
import { 推荐语列表 } from '../../data/testimonials'
import { t } from '../../i18n/translations'

/** Reveal 在不支持 IntersectionObserver 的环境里用 queueMicrotask 点亮，渲染须在 act 内冲刷 */
async function 渲染推荐语(): Promise<HTMLElement> {
  let 容器: HTMLElement = document.createElement('div')
  await act(async () => {
    容器 = render(<TestimonialsSection />).container
  })
  return 容器
}

const 卡片节点 = (容器: HTMLElement) => Array.from(容器.querySelectorAll('figure'))
const 类名 = (元素: Element | null) => 元素?.className.split(/\s+/) ?? []

afterEach(cleanup)

describe('FP-05 推荐语板块渲染', () => {
  it('只有两张卡片，顺序与数据层一致，正文逐字来自翻译文件', async () => {
    const 容器 = await 渲染推荐语()
    const 卡片表 = 推荐语列表()
    const 图形 = 卡片节点(容器)
    expect(图形).toHaveLength(2)
    expect(卡片表.map((卡片) => 卡片.id)).toEqual(['student', 'aiDeveloper'])
    图形.forEach((图, 序) => {
      const 卡片 = 卡片表[序]
      const 段落 = Array.from(图.querySelectorAll('figcaption p'))
      expect(图.querySelector('blockquote')?.textContent).toContain(卡片.quote)
      expect(图.querySelector('blockquote')?.textContent).toMatch(/^“/)
      expect(段落).toHaveLength(2)
      expect(段落[0].textContent).toBe(卡片.role)
      expect(段落[1].textContent).toBe(卡片.context)
    })
  })

  it('板块只有标题，副标题不再渲染', async () => {
    const 容器 = await 渲染推荐语()
    const 标题 = 容器.querySelector('h2')
    expect(标题?.textContent).toBe(t('testimonials.title'))
    const 标题区 = 标题?.closest('div') ?? null
    expect(标题区?.querySelectorAll('p')).toHaveLength(0)
  })

  it('免责说明不再渲染：卡片之外没有任何多余段落', async () => {
    const 容器 = await 渲染推荐语()
    const 卡外段落 = Array.from(容器.querySelectorAll('section p')).filter((p) => !p.closest('figure'))
    expect(卡外段落.map((p) => p.textContent)).toEqual([])
  })

  it('卡面/文字色全部走主题令牌，两列并排', async () => {
    const 容器 = await 渲染推荐语()
    const 网格 = 卡片节点(容器)[0].parentElement?.parentElement ?? null
    expect(类名(网格)).toContain('md:grid-cols-2')
    for (const 图 of 卡片节点(容器)) {
      expect(类名(图)).toEqual(expect.arrayContaining(['bg-panel', 'border-border']))
      expect(类名(图.querySelector('blockquote'))).toContain('text-text-secondary')
      const 段落 = Array.from(图.querySelectorAll('figcaption p'))
      expect(类名(段落[0])).toContain('text-text-primary')
      expect(类名(段落[1])).toContain('text-text-secondary')
      expect(类名(图.querySelector('figcaption'))).toContain('border-border')
    }
  })
})
