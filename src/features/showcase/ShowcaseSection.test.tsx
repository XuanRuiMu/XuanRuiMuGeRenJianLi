import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ShowcaseSection } from './ShowcaseSection'
import { showcaseRows } from '../../data/showcase'
import { t } from '../../i18n/translations'

describe('ShowcaseSection（12-next-spline-3d HeroParallax 移植）', () => {
  it('renders the gradient header with both title lines and subtitle', () => {
    render(<ShowcaseSection />)
    expect(screen.getByText(t('showcase.titleLine1'))).toBeInTheDocument()
    expect(screen.getByText(t('showcase.titleLine2'))).toBeInTheDocument()
    expect(screen.getByText(t('showcase.subtitle'))).toBeInTheDocument()
  })

  it('renders every card of all three rows', () => {
    render(<ShowcaseSection />)
    for (const row of showcaseRows) {
      for (const card of row.cards) {
        expect(screen.getByText(t(card.titleKey))).toBeInTheDocument()
        expect(screen.getByText(t(card.descKey))).toBeInTheDocument()
      }
    }
    // 15 张卡：3 行 × 5 张
    const cards = document.querySelectorAll('.group\\/card')
    expect(cards).toHaveLength(15)
  })

  it('keeps original section anchors so navigation still works', () => {
    render(<ShowcaseSection />)
    for (const id of ['education', 'design', 'media']) {
      const anchor = document.getElementById(id)
      expect(anchor).not.toBeNull()
    }
  })

  it('ports the neon gradient border design on every card', () => {
    render(<ShowcaseSection />)
    const cards = document.querySelectorAll('.group\\/card')
    expect(cards).toHaveLength(15)
    for (const card of cards) {
      const border = card.querySelector('.bg-gradient-to-r') as HTMLElement
      expect(border).not.toBeNull()
      expect(border.className).toMatch(/shadow-\[0_0_30px_5px_rgba\(/)
      const inner = border.firstElementChild as HTMLElement
      expect(inner.className).toContain('bg-black')
    }
  })

  it('renders the bilibili card as an external link and others as plain cards', () => {
    render(<ShowcaseSection />)
    const escapedTitle = t('showcase.cards.courses.title').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const link = screen.getByRole('link', { name: new RegExp(escapedTitle) })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('href', 'https://space.bilibili.com/383504924')

    const degreeCard = screen.getByText(t('showcase.cards.degree.title')).closest('.group\\/card') as HTMLElement
    expect(within(degreeCard).queryByRole('link')).toBeNull()
  })

  it('renders rows statically without inline transform under reduced motion', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia

    render(<ShowcaseSection />)
    const cards = document.querySelectorAll('.group\\/card')
    expect(cards).toHaveLength(15)
    for (const card of cards) {
      const el = card as HTMLElement
      // 减少动效时不应注入 transform 行内样式（仅保留 drift 动画所需的 CSS 变量）
      expect(el.style.transform).toBe('')
    }
  })

  it('renders every showcase row anchor so navigation still works', () => {
    render(<ShowcaseSection />)
    for (const row of showcaseRows) {
      const anchor = document.getElementById(row.anchorId)
      expect(anchor).not.toBeNull()
    }
  })
})
