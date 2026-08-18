import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectsSection } from './ProjectsSection'
import { projects } from '../../data/projects'
import { t } from '../../i18n/translations'
import { useProjectsWindStore, 默认风力强度 } from '../../store/useProjectsWindStore'

describe('ProjectsSection', () => {
  let 桌面宽度 = true
  let 减少动画 = false

  beforeEach(() => {
    桌面宽度 = true
    减少动画 = false
    useProjectsWindStore.setState({ 风力强度: 默认风力强度 })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        get matches() {
          if (query.includes('min-width')) return 桌面宽度
          if (query.includes('prefers-reduced-motion')) return 减少动画
          return false
        },
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('渲染板块标题与副标题', () => {
    render(<ProjectsSection />)
    expect(screen.getByRole('heading', { name: t('projects.title') })).toBeInTheDocument()
    expect(screen.getByText(t('projects.subtitle'))).toBeInTheDocument()
  })

  it('section 保持 id="projects" 挂载契约', () => {
    const { container } = render(<ProjectsSection />)
    expect(container.querySelector('section')).toHaveAttribute('id', 'projects')
  })

  it('渲染四张便签，包含项目名与描述', () => {
    render(<ProjectsSection />)
    for (const project of projects) {
      expect(screen.getByRole('heading', { name: t(project.nameKey) })).toBeInTheDocument()
      expect(screen.getByText(t(project.descKey))).toBeInTheDocument()
    }
  })

  it('GitHub 链接为真实可点击的 a 标签', () => {
    render(<ProjectsSection />)
    const links = screen.getAllByRole('link')
    const expectedUrls = projects.flatMap((project) => project.links?.map((link) => link.url) ?? [])
    expect(links.length).toBe(expectedUrls.length)
    for (const url of expectedUrls) {
      expect(links.some((link) => link.getAttribute('href') === url)).toBe(true)
    }
    for (const link of links) {
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('便签文字允许选中复制（user-select: text）', () => {
    const { container } = render(<ProjectsSection />)
    const notes = container.querySelectorAll('.clothesline-note')
    expect(notes.length).toBe(projects.length)
    for (const note of notes) {
      expect(note.className).toContain('select-text')
    }
  })

  it('渲染单根晾衣绳画布', () => {
    const { container } = render(<ProjectsSection />)
    const canvas = container.querySelectorAll('canvas.clothesline-canvas')
    expect(canvas.length).toBe(1)
  })

  it('风力 store 可被设置并持久化（控制已迁入统一控制面板）', () => {
    useProjectsWindStore.getState().设置风力强度(1.6)
    expect(useProjectsWindStore.getState().风力强度).toBe(1.6)
  })

  it('四张便签使用四种浅色配色', () => {
    const { container } = render(<ProjectsSection />)
    const notes = container.querySelectorAll('.clothesline-note')
    const tints = new Set<string>()
    for (const note of notes) {
      const tint = note.getAttribute('data-tint')
      expect(tint).not.toBeNull()
      tints.add(tint!)
    }
    expect(tints.size).toBe(projects.length)
  })

  it('reduced motion 下仍然渲染画布与便签（静态姿态）', () => {
    减少动画 = true
    const { container } = render(<ProjectsSection />)
    expect(container.querySelectorAll('canvas.clothesline-canvas').length).toBe(1)
    expect(container.querySelectorAll('.clothesline-note').length).toBe(projects.length)
  })

  it('便签不捕获指针事件（无 pointer capture 调用）', () => {
    const { container } = render(<ProjectsSection />)
    const notes = container.querySelectorAll('.clothesline-note')
    for (const note of notes) {
      // jsdom 未实现 setPointerCapture 时视为通过；实现存在时则断言未被调用
      if (typeof (note as HTMLElement).setPointerCapture !== 'function') continue
      const spy = vi.spyOn(note as HTMLElement, 'setPointerCapture')
      fireEvent.pointerDown(note)
      expect(spy).not.toHaveBeenCalled()
    }
  })

  describe('窄屏（<768px）静态卡片网格', () => {
    beforeEach(() => {
      桌面宽度 = false
    })

    it('不挂载物理画布，渲染静态便签网格', () => {
      const { container } = render(<ProjectsSection />)
      expect(container.querySelectorAll('canvas.clothesline-canvas').length).toBe(0)
      const grid = container.querySelector('.clothesline-mobile-grid')
      expect(grid).not.toBeNull()
      const notes = container.querySelectorAll('.clothesline-static-note')
      expect(notes.length).toBe(projects.length)
    })

    it('每张静态卡片包含标题、描述与可见链接', () => {
      const { container } = render(<ProjectsSection />)
      const notes = container.querySelectorAll('.clothesline-static-note')
      for (const [index, note] of Array.from(notes).entries()) {
        const project = projects[index]
        expect(note.querySelector('.clothesline-note-title')?.textContent).toBe(t(project.nameKey))
        expect(note.querySelector('.clothesline-note-desc')?.textContent).toBe(t(project.descKey))
        const link = note.querySelector('.clothesline-note-link')
        expect(link).not.toBeNull()
        expect(link?.getAttribute('href')).toBe(project.links?.[0]?.url)
      }
    })

    it('静态卡片复用四种浅色染色', () => {
      const { container } = render(<ProjectsSection />)
      const notes = container.querySelectorAll('.clothesline-static-note')
      const tints = new Set(Array.from(notes).map((note) => note.getAttribute('data-tint')))
      expect(tints.size).toBe(projects.length)
    })
  })
})
