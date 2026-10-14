import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { t } from '../../国际化/翻译'

const 状态 = vi.hoisted(() => ({
  enabled: true,
  mutate: vi.fn(),
  total: 128 as number | null | undefined,
}))

vi.mock('../../库/分析接口', () => ({
  // 根因：mock 工厂在模块实例化时求值，直接写死常量会固化开关值；
  // 用 getter 按访问时取值，测试间切换 状态.enabled 才会生效
  get 访问统计开关() {
    return 状态.enabled
  },
  useFangWenTongJi: () => ({
    data: 状态.total == null ? null : { 总数: 状态.total, 近一日: 9, 已存储: true },
    isLoading: false,
  }),
  useShangBaoFangWen: () => ({ mutate: 状态.mutate }),
}))

async function 载入组件() {
  vi.resetModules()
  localStorage.removeItem('visitor-count')
  const { FangKeJiShu } = await import('./FangKeJiShu')
  return FangKeJiShu
}

describe('VisitorCounter（页脚访问人数）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    状态.enabled = true
    状态.total = 128
  })

  it('渲染标签与后端返回的总浏览数', async () => {
    状态.enabled = true
    状态.total = 128
    const FangKeJiShu = await 载入组件()
    render(<FangKeJiShu />)
    expect(screen.getByTestId('visitor-counter')).toHaveTextContent(t('footer.visitorsLabel'))
    expect(screen.getByTestId('visitor-counter')).toHaveTextContent('128')
  })

  it('挂载即上报一次 PV；重复卸载重挂不重复上报（StrictMode 守护）', async () => {
    状态.enabled = true
    const FangKeJiShu = await 载入组件()

    await act(async () => {
      const { unmount } = render(<FangKeJiShu />)
      unmount()
    })
    await act(async () => {
      render(<FangKeJiShu />)
    })

    expect(状态.mutate).toHaveBeenCalledTimes(1)
    expect(状态.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        路径: '/',
        时间戳: expect.any(Number),
      })
    )
  })

  it('访问统计开关 关闭时仍渲染徽章，并用 localStorage 累计本机访问', async () => {
    状态.enabled = false
    状态.total = null
    const FangKeJiShu = await 载入组件()
    await act(async () => {
      render(<FangKeJiShu />)
    })
    expect(screen.getByTestId('visitor-counter')).toBeInTheDocument()
    expect(screen.getByTestId('visitor-counter')).toHaveTextContent(t('footer.visitorsLabel'))
    // 无后端时不虚报 0、不消失：显示本机累计（本次挂载 +1）
    expect(screen.getByTestId('visitor-counter')).toHaveTextContent('1')
    expect(localStorage.getItem('visitor-count')).toBe('1')
    expect(状态.mutate).not.toHaveBeenCalled()
  })

  it('后端无数据时回退本地计数，徽章不显示省略号', async () => {
    状态.enabled = true
    状态.total = null
    localStorage.setItem('visitor-count', '7')
    const FangKeJiShu = await 载入组件()
    // 载入组件会清掉 key，这里再写一次模拟「已有累计」
    localStorage.setItem('visitor-count', '7')
    await act(async () => {
      render(<FangKeJiShu />)
    })
    const 文本 = screen.getByTestId('visitor-counter').textContent ?? ''
    expect(文本).not.toContain('…')
    expect(文本).toMatch(/访问人数：[\d,，]+/)
  })

  it('徽章呈高级显眼样式：图标+等宽数字', async () => {
    状态.enabled = true
    状态.total = 128
    const FangKeJiShu = await 载入组件()
    const { container } = render(<FangKeJiShu />)
    expect(container.querySelector('.visitor-counter-icon')).not.toBeNull()
    const 数字 = container.querySelector('.visitor-counter-number')
    expect(数字).not.toBeNull()
    expect(数字).toHaveClass('tabular-nums')
    expect(数字).toHaveTextContent('128')
  })

  it('访问人数与其数字可被选中复制（根因：user-select禁选）', async () => {
    状态.enabled = true
    const FangKeJiShu = await 载入组件()
    const { container } = render(<FangKeJiShu />)
    const 卡片 = container.querySelector('.visitor-counter-card') as HTMLElement
    const 数字 = container.querySelector('.visitor-counter-number') as HTMLElement
    expect(卡片).not.toBeNull()
    expect(数字).not.toBeNull()
    const 卡片选中 = window.getComputedStyle(卡片).userSelect
    const 数字选中 = window.getComputedStyle(数字).userSelect
    expect(卡片选中).not.toBe('none')
    expect(数字选中).not.toBe('none')
  })
})
