import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AboutSection } from './AboutSection'
import type { 打字机选项, 打字机状态 } from './useTypewriter'
import { 关于我介绍行, type 文本片段 } from '../../data/aboutLines'

type 打字机模块 = { useTypewriter: (选项: 打字机选项) => 打字机状态 }

vi.mock('./useTypewriter', async (导入原模块) => {
  const 原模块: 打字机模块 = await 导入原模块()
  return { ...原模块 }
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

async function 渲染关于我(介绍行表?: 文本片段[][]) {
  let 容器: HTMLElement = document.createElement('div')
  await act(async () => {
    容器 = render(介绍行表 ? <AboutSection 介绍行表={介绍行表} /> : <AboutSection />).container
  })
  return 容器
}

describe('关于我 - 结构与着色', () => {
  it('五行完整占位渲染，aria-label 为纯文本', async () => {
    const container = await 渲染关于我()
    const 段落 = container.querySelectorAll('p[aria-label]')
    expect(段落).toHaveLength(5)
    const 行表 = 关于我介绍行()
    行表.forEach((行, i) => {
      const 期望 = 行.map((段) => 段.text).join('')
      expect(段落[i].getAttribute('aria-label')).toBe(期望)
    })
  })

  it('行号 01–05 顺序编号', async () => {
    const container = await 渲染关于我()
    const 行号 = Array.from(container.querySelectorAll('.tabular-nums')).map((s) => s.textContent)
    expect(行号).toEqual(['01', '02', '03', '04', '05'])
  })

  it('tech 片段带 text-primary，dim 弱化无删除线，accent 带 text-accent', async () => {
    const container = await 渲染关于我()
    const html = container.innerHTML
    expect(html).toContain('text-primary')
    expect(html).toContain('text-muted')
    expect(html).not.toContain('line-through')
    expect(html).toContain('text-accent')
    const dim段 = Array.from(container.querySelectorAll('span')).find(
      (s) =>
        (s.getAttribute('class') ?? '').split(/\s+/).includes('text-muted') && s.textContent?.includes('只能做样品')
    )
    expect(dim段).toBeTruthy()
  })

  it('注入自定义行表时按片段渲染', async () => {
    const 自定义: 文本片段[][] = [[{ text: '仅一行测试', tone: 'plain' }]]
    const container = await 渲染关于我(自定义)
    expect(container.querySelectorAll('p[aria-label]')).toHaveLength(1)
    expect(container.querySelector('p[aria-label]')?.getAttribute('aria-label')).toBe('仅一行测试')
  })

  it('无 title 副标题', async () => {
    const container = await 渲染关于我()
    const 标题区 = container.querySelector('h2')?.parentElement
    expect(标题区?.querySelector('p')).toBeNull()
  })
})

describe('关于我 - 旧版 cmd 终端 chrome', () => {
  it('头部 //about.introLines + { readOnly: true }，尾部 //EOF', async () => {
    const container = await 渲染关于我()
    const html = container.innerHTML
    expect(html).toContain('//about.introLines')
    expect(html).toContain('{ readOnly: true }')
    expect(html).toContain('//EOF')
  })

  it('border-y 终端框与 max-w-4xl 画幅', async () => {
    const container = await 渲染关于我()
    const html = container.innerHTML
    expect(html).toContain('border-y')
    expect(html).toContain('max-w-4xl')
  })

  it('行号列在独立列中（group 行结构 + tabular-nums）', async () => {
    const container = await 渲染关于我()
    const 行容器 = container.querySelectorAll('.group')
    expect(行容器.length).toBeGreaterThanOrEqual(5)
    const 行号 = Array.from(container.querySelectorAll('.tabular-nums')).map((s) => s.textContent)
    expect(行号).toEqual(['01', '02', '03', '04', '05'])
  })

  it('强调行带渐变下划线，且仅含 accent 片段的行有（默认数据 l4 一条）', async () => {
    const container = await 渲染关于我()
    const 强调装饰 = container.querySelectorAll('.from-accent')
    expect(强调装饰).toHaveLength(1)
    expect(强调装饰[0].getAttribute('class')).toContain('bg-gradient-to-r')
  })

  it('每行有 hover 下划线动效', async () => {
    const container = await 渲染关于我()
    expect(container.innerHTML).toContain('group-hover:w-full')
  })

  it('正文字号 text-base / sm:text-lg', async () => {
    const container = await 渲染关于我()
    const html = container.innerHTML
    expect(html).toContain('text-base')
    expect(html).toContain('sm:text-lg')
  })

  it('块状闪烁光标：bg-current 空心块而非文本竖线', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )
    const container = await 渲染关于我()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    const 光标表 = container.querySelectorAll('.caret-blink')
    expect(光标表.length).toBeGreaterThan(0)
    expect(光标表[0].textContent).toBe('')
    expect(光标表[0].getAttribute('class')).toContain('bg-current')
    vi.restoreAllMocks()
  })
})

describe('关于我 - 打字机光标', () => {
  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('打字进行中出现光标，打完后消失', async () => {
    const container = await 渲染关于我()
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(container.querySelectorAll('.caret-blink').length).toBeGreaterThan(0)
    act(() => {
      vi.runAllTimers()
    })
    expect(container.querySelectorAll('.caret-blink')).toHaveLength(0)
  })

  it('reduced-motion 下无光标且直接全文', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )
    const container = await 渲染关于我()
    act(() => {
      vi.runAllTimers()
    })
    expect(container.querySelectorAll('.caret-blink')).toHaveLength(0)
  })
})
