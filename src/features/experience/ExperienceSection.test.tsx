import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { ExperienceSection } from './ExperienceSection'
import { experiences } from '../../data/experience'
import { t } from '../../i18n/translations'

describe('ExperienceSection', () => {
  const originalMatchMedia = window.matchMedia
  const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect
  const originalInnerHeight = window.innerHeight

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 800,
    })

    Element.prototype.getBoundingClientRect = vi.fn(function (this: Element) {
      if (this.classList.contains('timeline')) {
        return { top: 0, left: 0, right: 0, bottom: 400, width: 0, height: 400, x: 0, y: 0 } as DOMRect
      }
      if (this.classList.contains('timeline-node')) {
        return { top: 100, left: 0, right: 0, bottom: 100, width: 0, height: 0, x: 0, y: 100 } as DOMRect
      }
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 } as DOMRect
    }) as unknown as typeof Element.prototype.getBoundingClientRect
  })

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: originalInnerHeight,
    })

    Element.prototype.getBoundingClientRect = originalGetBoundingClientRect
  })

  it('renders section title and subtitle', () => {
    render(<ExperienceSection />)
    expect(screen.getByRole('heading', { name: t('experience.title') })).toBeInTheDocument()
    expect(screen.getByText(t('experience.subtitle'))).toBeInTheDocument()
  })

  it('renders timeline as ordered list with accessible label', () => {
    render(<ExperienceSection />)
    const timeline = screen.getByRole('list', { name: t('experience.timelineLabel') })
    expect(timeline).toBeInTheDocument()
    expect(timeline).toHaveClass('timeline')
  })

  it('renders all experience entries as list items', () => {
    render(<ExperienceSection />)
    const timeline = screen.getByRole('list', { name: t('experience.timelineLabel') })
    const items = Array.from(timeline.querySelectorAll(':scope > li')) as HTMLElement[]

    expect(items).toHaveLength(experiences.length)

    for (const [index, entry] of experiences.entries()) {
      const item = items[index]
      expect(item).toHaveAttribute('data-timeline-index', String(index))
      expect(item).toHaveAttribute('aria-labelledby', `experience-title-${entry.id}`)

      const title = within(item).getByRole('heading', { name: t(entry.titleKey) })
      expect(title).toHaveAttribute('id', `experience-title-${entry.id}`)
      expect(within(item).getByText(t(entry.periodKey))).toBeInTheDocument()

      if (entry.organizationKey) {
        expect(within(item).getByText(t(entry.organizationKey))).toBeInTheDocument()
      }

      for (const key of entry.descriptionKeys) {
        expect(within(item).getByText(t(key))).toBeInTheDocument()
      }
    }
  })

  it('renders achievements inside every card (hover reveal keeps content in DOM)', () => {
    render(<ExperienceSection />)
    const cards = document.querySelectorAll('.experience-card')
    expect(cards).toHaveLength(experiences.length)
    for (const [index, entry] of experiences.entries()) {
      const card = cards[index]
      const achievements = card.querySelector('.experience-achievements')
      expect(achievements).not.toBeNull()
      for (const key of entry.achievementKeys ?? []) {
        expect(within(card as HTMLElement).getByText(t(key))).toBeInTheDocument()
      }
    }
  })

  it('ports the react-three-fiber card design: gradient border, tertiary bg and tilt', () => {
    render(<ExperienceSection />)
    const cards = document.querySelectorAll('.experience-card')
    expect(cards.length).toBeGreaterThan(0)
    for (const card of cards) {
      const border = card.querySelector('.experience-gradient-border')
      expect(border).not.toBeNull()
      expect(border!.className).toContain('shadow-[0px_35px_120px_-15px_#211e35]')
      const inner = card.querySelector('.bg-\\[\\#151030\\]')
      expect(inner).not.toBeNull()
      expect(card.querySelector('.tilt-card')).not.toBeNull()
      expect(within(card as HTMLElement).getByText(t('experience.hoverHint'))).toBeInTheDocument()
    }
  })

  it('renders timeline nodes for each entry', () => {
    render(<ExperienceSection />)
    const nodes = document.querySelectorAll('.timeline-node')
    expect(nodes).toHaveLength(experiences.length)
  })

  it('has experience id on section', () => {
    const { container } = render(<ExperienceSection />)
    expect(container.querySelector('section')).toHaveAttribute('id', 'experience')
  })

  it('marks timeline nodes as active when timeline progress reaches their position', () => {
    render(<ExperienceSection />)
    const nodes = document.querySelectorAll('.timeline-node')
    expect(nodes).toHaveLength(experiences.length)
    for (const node of nodes) {
      expect(node).toHaveClass('is-active')
    }
  })

  it('does not mark nodes as active when timeline progress is below their position', () => {
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 400,
    })

    Element.prototype.getBoundingClientRect = vi.fn(function (this: Element) {
      if (this.classList.contains('timeline')) {
        return { top: 0, left: 0, right: 0, bottom: 400, width: 0, height: 400, x: 0, y: 0 } as DOMRect
      }
      if (this.classList.contains('timeline-node')) {
        return { top: 300, left: 0, right: 0, bottom: 300, width: 0, height: 0, x: 0, y: 300 } as DOMRect
      }
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0 } as DOMRect
    }) as unknown as typeof Element.prototype.getBoundingClientRect

    render(<ExperienceSection />)
    const nodes = document.querySelectorAll('.timeline-node')
    for (const node of nodes) {
      expect(node).not.toHaveClass('is-active')
    }
  })

  it('does not mark nodes as active when reduced motion is preferred', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<ExperienceSection />)
    const nodes = document.querySelectorAll('.timeline-node')
    for (const node of nodes) {
      expect(node).not.toHaveClass('is-active')
    }
  })

  it('keeps cards focusable for keyboard users', () => {
    render(<ExperienceSection />)
    const cards = document.querySelectorAll('.experience-card')
    for (const card of cards) {
      expect(card).toHaveAttribute('tabindex', '0')
    }
  })

  it('shows achievements directly under reduced motion', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })

    render(<ExperienceSection />)
    const achievementsBlocks = document.querySelectorAll('.experience-achievements')
    expect(achievementsBlocks).toHaveLength(experiences.length)
    for (const block of achievementsBlocks) {
      expect(block).toHaveClass('is-visible')
    }
  })

  it('does not render the SVG bezier timeline', () => {
    render(<ExperienceSection />)
    expect(document.querySelector('[data-testid="experience-timeline-svg"]')).toBeNull()
  })
})
