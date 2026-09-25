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
      const 段落 = Array.from(图.querySelectorAll('figcaption span'))
      expect(图.querySelector('blockquote')?.textContent).toContain(卡片.quote)
      expect(图.querySelector('blockquote')?.textContent?.length ?? 0).toBeGreaterThan(10)
      expect(段落).toHaveLength(2)
      expect(段落[0].textContent).toBe(卡片.role)
      expect(段落[1].textContent).toBe(卡片.context)
    })
  })

  it('标题值为空时不渲染标题区，两张卡片仍保留', async () => {
    const 容器 = await 渲染推荐语()
    expect(t('testimonials.title')).toBe('')
    expect(容器.querySelector('h2')).toBeNull()
    expect(卡片节点(容器)).toHaveLength(2)
    expect(容器.querySelector('section')?.id).toBe('testimonials')
    expect(容器.querySelector('section')).toHaveAttribute('aria-label', t('testimonials.ariaLabel'))
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
      expect(图.parentElement?.className).toContain('testimonial-reveal')
      expect(类名(图)).toEqual(expect.arrayContaining(['bg-panel', 'border-border']))
      expect(类名(图.querySelector('blockquote'))).toEqual(expect.arrayContaining(['font-bold', 'text-text-primary']))
      const 段落 = Array.from(图.querySelectorAll('figcaption span'))
      expect(类名(段落[0])).toContain('text-text-secondary')
      expect(类名(段落[1])).toContain('text-muted')
      expect(类名(图.querySelector('figcaption'))).toContain('border-border')
    }
  })
})
