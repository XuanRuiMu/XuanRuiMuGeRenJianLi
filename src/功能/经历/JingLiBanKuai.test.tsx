import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { JingLiBanKuai } from './JingLiBanKuai'
import { 经历表, 教育者B站地址, 公会视频地址, 暮澜链接 } from '../../数据/经历'
import { 个人信息 } from '../../数据/个人信息'
import { t } from '../../国际化/翻译'

describe('ExperienceSection', () => {
  const 原始媒体查询 = window.matchMedia
  const 原始获取边界矩形 = Element.prototype.getBoundingClientRect
  const 原始内部高度 = window.innerHeight

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
      value: 原始媒体查询,
    })

    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 原始内部高度,
    })

    Element.prototype.getBoundingClientRect = 原始获取边界矩形
  })

  it('renders section title（经历副标题已移除，不得再渲染时间线副标题）', () => {
    render(<JingLiBanKuai />)
    expect(screen.getByRole('heading', { name: t('experience.title') })).toBeInTheDocument()
    const 标题容器 = screen.getByRole('heading', { name: t('experience.title') }).parentElement
    expect(标题容器?.querySelector('p')).toBeNull()
  })

  it('renders timeline as ordered list with accessible label', () => {
    render(<JingLiBanKuai />)
    const 时间线 = screen.getByRole('list', { name: t('experience.timelineLabel') })
    expect(时间线).toBeInTheDocument()
    expect(时间线).toHaveClass('timeline')
  })

  it('renders all experience entries as list items', () => {
    render(<JingLiBanKuai />)
    const 时间线 = screen.getByRole('list', { name: t('experience.timelineLabel') })
    const 条目表 = Array.from(时间线.querySelectorAll(':scope > li')) as HTMLElement[]

    expect(条目表).toHaveLength(经历表.length)

    for (const [下标, 条目] of 经历表.entries()) {
      const 项 = 条目表[下标]
      expect(项).toHaveAttribute('data-timeline-index', String(下标))
      expect(项).toHaveAttribute('aria-labelledby', `experience-title-${条目.id}`)

      const title = within(项).getByRole('heading', { name: t(条目.标题键) })
      expect(title).toHaveAttribute('id', `experience-title-${条目.id}`)
      expect(within(项).getByText(t(条目.周期键))).toBeInTheDocument()

      if (条目.机构键) {
        expect(within(项).getByText(t(条目.机构键))).toBeInTheDocument()
      }

      for (const key of 条目.描述键表) {
        expect(within(项).getByText(t(key))).toBeInTheDocument()
      }
    }
  })

  it('renders achievements inside every card (hover reveal keeps content in DOM)', () => {
    render(<JingLiBanKuai />)
    const 卡片表 = document.querySelectorAll('.experience-card')
    expect(卡片表).toHaveLength(经历表.length)
    for (const [下标, 条目] of 经历表.entries()) {
      const 卡片 = 卡片表[下标]
      const 成就表 = 卡片.querySelector('.experience-achievements')
      expect(成就表).not.toBeNull()
      for (const key of 条目.成就键表 ?? []) {
        expect(within(卡片 as HTMLElement).getByText(t(key))).toBeInTheDocument()
      }
    }
  })

  it('ports the react-three-fiber card design: gradient border, tertiary bg and tilt', () => {
    render(<JingLiBanKuai />)
    const 卡片表 = document.querySelectorAll('.experience-card')
    expect(卡片表.length).toBeGreaterThan(0)
    for (const 卡片 of 卡片表) {
      const 边框 = 卡片.querySelector('.experience-gradient-border')
      expect(边框).not.toBeNull()
      expect(边框!.className).toContain('shadow-[0px_35px_120px_-15px_var(--color-panel-shadow)]')
      const 内部 = 卡片.querySelector('.bg-panel')
      expect(内部).not.toBeNull()
      expect(卡片).toHaveClass('tilt-card')
      expect(卡片).toHaveAttribute('data-tilt-outer', 'true')
    }
  })

  it('不渲染悬停/聚焦提示行（hoverHint 已移除）', () => {
    render(<JingLiBanKuai />)
    expect(screen.queryByText('悬停或聚焦查看成就与亮点')).not.toBeInTheDocument()
  })

  it('renders timeline nodes for each entry', () => {
    render(<JingLiBanKuai />)
    const 节点表 = document.querySelectorAll('.timeline-node')
    expect(节点表).toHaveLength(经历表.length)
  })

  it('has experience id on section', () => {
    const { container: 容器 } = render(<JingLiBanKuai />)
    expect(容器.querySelector('section')).toHaveAttribute('id', 'experience')
  })

  it('marks timeline nodes as active when timeline progress reaches their position', () => {
    render(<JingLiBanKuai />)
    const 节点表 = document.querySelectorAll('.timeline-node')
    expect(节点表).toHaveLength(经历表.length)
    for (const 节点 of 节点表) {
      expect(节点).toHaveClass('is-active')
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

    render(<JingLiBanKuai />)
    const 节点表 = document.querySelectorAll('.timeline-node')
    for (const 节点 of 节点表) {
      expect(节点).not.toHaveClass('is-active')
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

    render(<JingLiBanKuai />)
    const 节点表 = document.querySelectorAll('.timeline-node')
    for (const 节点 of 节点表) {
      expect(节点).not.toHaveClass('is-active')
    }
  })

  it('keeps cards focusable for keyboard users', () => {
    render(<JingLiBanKuai />)
    const 卡片表 = document.querySelectorAll('.experience-card')
    for (const 卡片 of 卡片表) {
      expect(卡片).toHaveAttribute('tabindex', '0')
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

    render(<JingLiBanKuai />)
    const 成就块表 = document.querySelectorAll('.experience-achievements')
    expect(成就块表).toHaveLength(经历表.length)
    for (const 块 of 成就块表) {
      expect(块).toHaveClass('is-visible')
    }
  })

  it('does not render the SVG bezier timeline', () => {
    render(<JingLiBanKuai />)
    expect(document.querySelector('[data-testid="experience-timeline-svg"]')).toBeNull()
  })

  it('FP-05：有外链的经历卡片链接可点击跳转', () => {
    render(<JingLiBanKuai />)
    const 用例表 = [
      { id: 'mcserver', labelKey: 'projects.link.github', url: 暮澜链接 },
      { id: 'educator', labelKey: 'projects.link.bilibili', url: 教育者B站地址 },
      { id: 'wowguild', labelKey: 'projects.link.bilibili', url: 公会视频地址 },
      { id: 'indie', labelKey: 'projects.link.github', url: 个人信息.GitHub },
    ] as const
    for (const c of 用例表) {
      const 卡片 = document.querySelector(`[data-experience-card="${c.id}"]`)
      expect(卡片).not.toBeNull()
      const 链接 = within(卡片 as HTMLElement).getByRole('link', {
        name: `${t(`data.experience.entries.${c.id}.title`)}：${t(c.labelKey)}`,
      })
      expect(链接).toHaveAttribute('href', c.url)
      expect(链接).toHaveAttribute('target', '_blank')
      expect(链接).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('FP-05：无外链的经历卡片不渲染链接', () => {
    render(<JingLiBanKuai />)
    for (const id of ['bachelor', 'aiengineer']) {
      const 卡片 = document.querySelector(`[data-experience-card="${id}"]`)
      expect(卡片).not.toBeNull()
      expect(within(卡片 as HTMLElement).queryByRole('link')).toBeNull()
    }
  })

  it('FP-01：经历首条挂指定暮澜链接', () => {
    expect(暮澜链接).toBe('https://github.com/XuanRuiMu/XRMChaJian')
    const 首条 = 经历表.find((条目) => 条目.id === 'mcserver')
    expect(首条?.链接表?.[0].url).toBe('https://github.com/XuanRuiMu/XRMChaJian')
  })

  it('FP-05：独立开发者经历挂GitHub主页而非单个项目', () => {
    const 独立 = 经历表.find((条目) => 条目.id === 'indie')
    expect(独立?.链接表?.[0].url).toBe(个人信息.GitHub)
  })
})
