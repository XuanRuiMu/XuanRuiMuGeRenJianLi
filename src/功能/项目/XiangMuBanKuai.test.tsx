import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { XiangMuBanKuai } from './XiangMuBanKuai'
import { 项目表 } from '../../数据/项目'
import { t } from '../../国际化/翻译'
import { useBianQianFengLi, 默认风力强度 } from '../../状态/便签风力仓库'

describe('ProjectsSection', () => {
  let 减少动画 = false

  beforeEach(() => {
    减少动画 = false
    useBianQianFengLi.setState({ 风力强度: 默认风力强度 })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((查询: string) => ({
        get matches() {
          if (查询.includes('prefers-reduced-motion')) return 减少动画
          return false
        },
        媒体: 查询,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('渲染板块标题与副标题', () => {
    render(<XiangMuBanKuai />)
    expect(screen.getByRole('heading', { name: t('projects.title') })).toBeInTheDocument()
    expect(screen.getByText(t('projects.subtitle'))).toBeInTheDocument()
  })

  it('section 保持 id="projects" 挂载契约', () => {
    const { container: 容器 } = render(<XiangMuBanKuai />)
    expect(容器.querySelector('section')).toHaveAttribute('id', 'projects')
  })

  it('渲染四张便签，包含项目名与描述', () => {
    render(<XiangMuBanKuai />)
    for (const 项目 of 项目表) {
      expect(screen.getByRole('heading', { name: t(项目.名称键) })).toBeInTheDocument()
      expect(screen.getByText(t(项目.描述键))).toBeInTheDocument()
    }
  })

  it('GitHub 链接为真实可点击的 a 标签', () => {
    render(<XiangMuBanKuai />)
    const 链接表 = screen.getAllByRole('link')
    const 期望地址表 = 项目表.flatMap((项目) => 项目.链接表?.map((链接) => 链接.url) ?? [])
    expect(链接表.length).toBe(期望地址表.length)
    for (const 地址 of 期望地址表) {
      expect(链接表.some((链接) => 链接.getAttribute('href') === 地址)).toBe(true)
    }
    for (const 链接 of 链接表) {
      expect(链接).toHaveAttribute('target', '_blank')
      expect(链接).toHaveAttribute('rel', 'noopener noreferrer')
    }
  })

  it('便签文字允许选中复制（user-select: text）', () => {
    const { container: 容器 } = render(<XiangMuBanKuai />)
    const 便签表 = 容器.querySelectorAll('.clothesline-note')
    expect(便签表.length).toBe(项目表.length)
    for (const 便签 of 便签表) {
      expect(便签.className).toContain('select-text')
    }
  })

  it('渲染单根晾衣绳画布', () => {
    const { container: 容器 } = render(<XiangMuBanKuai />)
    const 画布 = 容器.querySelectorAll('canvas.clothesline-canvas')
    expect(画布.length).toBe(1)
  })

  it('风力 store 可被设置并持久化（控制已迁入统一控制面板）', () => {
    useBianQianFengLi.getState().设置风力强度(1.6)
    expect(useBianQianFengLi.getState().风力强度).toBe(1.6)
  })

  it('四张便签使用四种浅色配色', () => {
    const { container: 容器 } = render(<XiangMuBanKuai />)
    const 便签表 = 容器.querySelectorAll('.clothesline-note')
    const 色调表 = new Set<string>()
    for (const 便签 of 便签表) {
      const 色调 = 便签.getAttribute('data-tint')
      expect(色调).not.toBeNull()
      色调表.add(色调!)
    }
    expect(色调表.size).toBe(项目表.length)
  })

  it('reduced motion 下仍然渲染画布与便签（静态姿态）', () => {
    减少动画 = true
    const { container: 容器 } = render(<XiangMuBanKuai />)
    expect(容器.querySelectorAll('canvas.clothesline-canvas').length).toBe(1)
    expect(容器.querySelectorAll('.clothesline-note').length).toBe(项目表.length)
  })

  it('便签不捕获指针事件（无 pointer capture 调用）', () => {
    const { container: 容器 } = render(<XiangMuBanKuai />)
    const 便签表 = 容器.querySelectorAll('.clothesline-note')
    for (const 便签 of 便签表) {
      if (typeof (便签 as HTMLElement).setPointerCapture !== 'function') continue
      const 间谍函数 = vi.spyOn(便签 as HTMLElement, 'setPointerCapture')
      fireEvent.pointerDown(便签)
      expect(间谍函数).not.toHaveBeenCalled()
    }
  })

  describe('任何设备都只渲染物理晾衣架（手机版网格已从代码删除）', () => {
    it('不渲染静态网格：无 .clothesline-mobile-grid / .clothesline-static-note', () => {
      const { container: 容器 } = render(<XiangMuBanKuai />)
      expect(容器.querySelector('.clothesline-mobile-grid')).toBeNull()
      expect(容器.querySelector('.clothesline-static-note')).toBeNull()
    })

    it('四张物理便签与滚动容器始终挂载，画布存在', () => {
      const { container: 容器 } = render(<XiangMuBanKuai />)
      expect(容器.querySelectorAll('canvas.clothesline-canvas').length).toBe(1)
      expect(容器.querySelector('.clothesline-scroll')).not.toBeNull()
      const 便签表 = 容器.querySelectorAll('.clothesline-region .clothesline-note')
      expect(便签表.length).toBe(项目表.length)
    })

    it('每张物理便签包含标题与描述，有链接的项目展示可见链接', () => {
      const { container: 容器 } = render(<XiangMuBanKuai />)
      const 便签表 = 容器.querySelectorAll('.clothesline-region .clothesline-note')
      for (const [下标, 便签] of Array.from(便签表).entries()) {
        const 项目 = 项目表[下标]
        expect(便签.querySelector('.clothesline-note-title')?.textContent).toBe(t(项目.名称键))
        expect(便签.querySelector('.clothesline-note-desc')?.textContent).toBe(t(项目.描述键))
        const 链接 = 便签.querySelector('.clothesline-note-link')
        if (项目.链接表?.length) {
          expect(链接).not.toBeNull()
          expect(链接?.getAttribute('href')).toBe(项目.链接表[0].url)
        } else {
          expect(链接).toBeNull()
        }
      }
    })

    it('四种染色仍按序号循环', () => {
      const { container: 容器 } = render(<XiangMuBanKuai />)
      const 便签表 = 容器.querySelectorAll('.clothesline-region .clothesline-note')
      const 色调表 = new Set(Array.from(便签表).map((便签) => 便签.getAttribute('data-tint')))
      expect(色调表.size).toBe(项目表.length)
    })
  })
})
