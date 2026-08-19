import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AboutSection } from './AboutSection'
import { t } from '../../i18n/translations'

describe('关于我 - 高度恒定性', () => {
  it('未打字时完整文本已占位渲染（opacity-0 保留高度，文字前后高度一致）', () => {
    const { container } = render(<AboutSection />)
    // 每行简介 <p> 都带 aria-label（完整句），其 textContent 应已包含该句全文，
    // 即便尚未“打出”也占位存在 → 该行乃至整段高度恒定，无打字期页面抖动。
    const 段落 = container.querySelectorAll('p[aria-label]')
    expect(段落.length).toBeGreaterThan(0)
    const 拼接 = Array.from(段落)
      .map((p) => p.textContent ?? '')
      .join('')
    expect(拼接.replace(/\s+/g, '')).toBe(t('about.intro').replace(/\s+/g, ''))
  })
})

describe('关于我 - 打字机光标', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 测试环境无 matchMedia：显式 mock，消除对 jsdom 能力与用例执行顺序的隐式依赖
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
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const 光标数 = (container: HTMLElement) => container.querySelectorAll('.caret-blink').length

  it('打字进行中光标出现在激活行，全部打完后光标消失', () => {
    const { container } = render(<AboutSection />)
    // 推进若干字符步：打字进行中，应有且仅有一个光标
    act(() => {
      vi.advanceTimersByTime(48 * 3)
    })
    expect(光标数(container)).toBe(1)
    // 跑完全部定时器：全部打完，光标必须消失（不驻留末行）
    act(() => {
      vi.runAllTimers()
    })
    expect(光标数(container)).toBe(0)
  })

  it('光标紧跟已打出的文字（位于已显文本与隐藏占位之间，随打字前移）', () => {
    const { container } = render(<AboutSection />)
    act(() => {
      vi.advanceTimersByTime(48 * 5)
    })
    const 光标 = container.querySelector('.caret-blink')
    expect(光标).toBeTruthy()
    const 段落 = 光标!.closest('p[aria-label]')!
    const 子元素 = Array.from(段落.children)
    const 光标位置 = 子元素.indexOf(光标 as Element)
    // 光标必须夹在已显文本（索引0）与隐藏占位（opacity-0）之间，才能随打字逐字前移
    expect(光标位置).toBe(1)
    expect((子元素[2] as HTMLElement).className).toContain('opacity-0')
    const 已显长度 = ((子元素[0] as HTMLElement).textContent ?? '').length
    expect(已显长度).toBeGreaterThan(0)
    expect(已显长度 + ((子元素[2] as HTMLElement).textContent ?? '').length).toBe(
      (段落.getAttribute('aria-label') ?? '').length
    )
    // 推进打字：已显文本增长，光标仍夹在两者之间（跟随移动而非钉在行尾）
    act(() => {
      vi.advanceTimersByTime(48 * 5)
    })
    const 光标后移 = container.querySelector('.caret-blink')
    expect(光标后移).toBeTruthy()
    expect(Array.from(段落.children).indexOf(光标后移 as Element)).toBe(1)
    expect(((Array.from(段落.children)[0] as HTMLElement).textContent ?? '').length).toBeGreaterThan(已显长度)
  })

  it('reduced-motion 下直接呈现全文且全程无光标', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )
    const { container } = render(<AboutSection />)
    act(() => {
      vi.runAllTimers()
    })
    expect(光标数(container)).toBe(0)
  })
})
