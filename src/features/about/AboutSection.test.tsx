import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
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
