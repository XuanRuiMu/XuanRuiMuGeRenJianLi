import { describe, it, expect, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import { JiaSeLunBo } from './JiaSeLunBo'
import { 字符渐变色 } from './JiaSeJianBian'

vi.mock('../../钩子/useJianShaoDongHua', () => ({ useJianShaoDongHua: () => true }))

describe('字符渐变色（按完整词预分配最终颜色）', () => {
  it('首字符取渐变起点色，末字符取渐变终点色', () => {
    expect(字符渐变色(0, 7)).toBe('rgb(94, 234, 212)')
    expect(字符渐变色(6, 7)).toBe('rgb(240, 171, 252)')
  })

  it('中点字符取渐变中点色', () => {
    expect(字符渐变色(3, 7)).toBe('rgb(129, 140, 248)')
  })

  it('任意进度下已显字符颜色恒定：部分文本与完整文本的每字颜色序列前缀一致', () => {
    const 全词 = '游戏服务端架构'
    const 完整序列 = Array.from({ length: 全词.length }, (_, i) => 字符渐变色(i, 全词.length))
    for (let 进度 = 1; 进度 <= 全词.length; 进度++) {
      for (let i = 0; i < 进度; i++) {
        expect(字符渐变色(i, 全词.length), `进度 ${进度} 的第 ${i} 字颜色漂移`).toBe(完整序列[i])
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
    const 角色表 = ['全栈开发工程师']
    const { container: 容器 } = render(<JiaSeLunBo 角色表={角色表} />)
    const 跨度表 = 容器.querySelectorAll('[data-testid="role-typewriter"] span[style]')
    expect(跨度表).toHaveLength(角色表[0].length)
    跨度表.forEach((跨度, i) => {
      expect(跨度.getAttribute('style')).toContain(字符渐变色(i, 角色表[0].length))
    })
  })

  it('打字过程中已显字符颜色不随进度变化（组件级）', async () => {
    vi.resetModules()
    vi.doMock('../../钩子/useJianShaoDongHua', () => ({ useJianShaoDongHua: () => false }))
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const { JiaSeLunBo: 动态组件 } = await import('./JiaSeLunBo')
      const 词 = 'DevOps 工程师'
      const 期望色 = (i: number) => 字符渐变色(i, 词.length)
      let 上次颜色序列: string[] | null = null

      const { container: 容器 } = render(<动态组件 角色表={[词]} 打字速度={10} 返回速度={10} 返回延迟={20} />)

      const 取当前颜色 = (): string[] =>
        Array.from(容器.querySelectorAll('span[style]')).map((元素) => 元素.getAttribute('style') ?? '')

      for (let 帧 = 0; 帧 < 6; 帧++) {
        await act(async () => {
          await vi.advanceTimersByTimeAsync(15)
        })
        const 当前 = 取当前颜色()
        if (上次颜色序列) {
          const [较短, 较长] = 当前.length <= 上次颜色序列.length ? [当前, 上次颜色序列] : [上次颜色序列, 当前]
          expect(较长.slice(0, 较短.length)).toEqual(较短)
        }
        当前.forEach((style, i) => expect(style).toContain(期望色(i)))
        上次颜色序列 = 当前
      }
    } finally {
      vi.useRealTimers()
      vi.doUnmock('../../钩子/useJianShaoDongHua')
    }
  })
})
