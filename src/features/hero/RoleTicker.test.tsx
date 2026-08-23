import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { RoleTicker } from './RoleTicker'
import { 字符渐变色 } from './roleGradient'

describe('字符渐变色（按完整词预分配最终颜色）', () => {
  it('首字符取渐变起点色，末字符取渐变终点色', () => {
    expect(字符渐变色(0, 7)).toBe('rgb(94, 234, 212)')
    expect(字符渐变色(6, 7)).toBe('rgb(240, 171, 252)')
  })

  it('中点字符取渐变中点色', () => {
    // total=7 时 index=3 → t=0.5 → 中点
    expect(字符渐变色(3, 7)).toBe('rgb(129, 140, 248)')
  })

  it('任意进度下已显字符颜色恒定：部分文本与完整文本的每字颜色序列前缀一致', () => {
    const 全词 = '游戏服务端架构'
    const 完整序列 = Array.from({ length: 全词.length }, (_, i) => 字符渐变色(i, 全词.length))
    for (let 进度 = 1; 进度 <= 全词.length; 进度++) {
      for (let i = 0; i < 进度; i++) {
        expect(
          字符渐变色(i, 全词.length),
          `进度 ${进度} 的第 ${i} 字颜色漂移`
        ).toBe(完整序列[i])
      }
    }
  })

  it('total<=1 与越界索引安全回退到端点色', () => {
    expect(字符渐变色(0, 0)).toBe('rgb(94, 234, 212)')
    expect(字符渐变色(5, 1)).toBe('rgb(94, 234, 212)')
    expect(字符渐变色(-1, 7)).toBe('rgb(94, 234, 212)')
    expect(字符渐变色(99, 7)).toBe('rgb(240, 171, 252)')
  })
})

describe('RoleTicker 组件渲染', () => {
  it('reduced-motion 静态显示首词且逐字着色符合纯函数', () => {
    vi.mock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))
    const roles = ['全栈开发工程师']
    const { container } = render(<RoleTicker roles={roles} />)
    const spans = container.querySelectorAll('[data-testid="role-typewriter"] span[style]')
    expect(spans).toHaveLength(roles[0].length)
    spans.forEach((span, i) => {
      expect(span.getAttribute('style')).toContain(字符渐变色(i, roles[0].length))
    })
  })

  it('打字过程中已显字符颜色不随进度变化（组件级）', async () => {
    vi.resetModules()
    vi.doMock('../../hooks/useReducedMotion', () => ({ useReducedMotion: () => false }))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { RoleTicker: 动态组件 } = await import('./RoleTicker')
      const 词 = 'DevOps 工程师'
      const 期望色 = (i: number) => 字符渐变色(i, 词.length)
      let 上次颜色序列: string[] | null = null

      const { container } = render(<动态组件 roles={[词]} typeSpeed={10} backSpeed={10} backDelay={20} />)

      const 取当前颜色 = (): string[] =>
        Array.from(container.querySelectorAll('span[style]')).map((el) => el.getAttribute('style') ?? '')

      // 推进若干帧，每次校验公共前缀不变性（打字阶段序列增长、删字阶段缩短，
      // shouldAdvanceTime 会把真实时间灌入 fake timer，故两种阶段都必须兼容）：
      // 较短序列必须是较长序列的前缀——即已显字符的颜色永不随进度变化
      for (let 帧 = 0; 帧 < 6; 帧++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(15)
        })
        const 当前 = 取当前颜色()
        if (上次颜色序列) {
          const [较短, 较长] =
            当前.length <= 上次颜色序列.length ? [当前, 上次颜色序列] : [上次颜色序列, 当前]
          expect(较长.slice(0, 较短.length)).toEqual(较短)
        }
        当前.forEach((style, i) => expect(style).toContain(期望色(i)))
        上次颜色序列 = 当前
      }
    } finally {
      vi.useRealTimers()
      vi.doUnmock('../../hooks/useReducedMotion')
    }
  })
})
