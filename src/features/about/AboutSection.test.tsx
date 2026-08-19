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
