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
        // 每张逻辑卡片至少渲染一次（marquee 无缝循环会渲染两份相同卡片组）
        expect(screen.getAllByText(t(card.titleKey)).length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText(t(card.descKey)).length).toBeGreaterThanOrEqual(1)
      }
    }
    // 15 张逻辑卡 × 2 份（无缝 marquee 轨道）：3 行 × 5 张 × 2
    const expected = showcaseRows.reduce((n, r) => n + r.cards.length, 0) * 2
    const cards = document.querySelectorAll('.group\\/card')
    expect(cards).toHaveLength(expected)
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
    // 30 张 = 15 逻辑卡 × 2 份 marquee 轨道
    const cards = document.querySelectorAll('.group\\/card')
    expect(cards).toHaveLength(30)
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
    // marquee 渲染两份，故 bilibili 链接出现两次，均应为外链
    const links = screen.getAllByRole('link', { name: new RegExp(escapedTitle) })
    expect(links.length).toBe(2)
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('href', 'https://space.bilibili.com/383504924')
    }

    const degreeTextNodes = screen.getAllByText(t('showcase.cards.degree.title'))
    for (const node of degreeTextNodes) {
      const degreeCard = node.closest('.group\\/card') as HTMLElement
      expect(within(degreeCard).queryByRole('link')).toBeNull()
    }
  })

  it('renders rows statically without inline transform under reduced motion', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia

    render(<ShowcaseSection />)
    // 30 张 = 15 逻辑卡 × 2 份 marquee 轨道（reduced-motion 下静止但仍渲染两份）
    const cards = document.querySelectorAll('.group\\/card')
    expect(cards).toHaveLength(30)
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
