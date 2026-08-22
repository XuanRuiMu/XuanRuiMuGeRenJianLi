import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { t } from '../../i18n/translations'

const 状态 = vi.hoisted(() => ({
  enabled: true,
  mutate: vi.fn(),
}))

vi.mock('../../lib/api', () => ({
  // 根因：mock 工厂在模块实例化时求值，直接写死常量会固化开关值；
  // 用 getter 按访问时取值，测试间切换 状态.enabled 才会生效
  get ANALYTICS_ENABLED() {
    return 状态.enabled
  },
  useAnalyticsStats: () => ({ data: { total: 128, last24h: 9 }, isLoading: false }),
  useTrackVisit: () => ({ mutate: 状态.mutate }),
}))

async function 载入组件() {
  vi.resetModules()
  const { VisitorCounter } = await import('./VisitorCounter')
  return VisitorCounter
}

describe('VisitorCounter（页脚访问人数，对接后端）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    状态.enabled = true
  })

  it('渲染标签与后端返回的总浏览数', async () => {
    状态.enabled = true
    const VisitorCounter = await 载入组件()
    render(<VisitorCounter />)
    expect(screen.getByTestId('visitor-counter')).toHaveTextContent(t('footer.visitorsLabel'))
    expect(screen.getByTestId('visitor-counter')).toHaveTextContent('128')
  })

  it('挂载即上报一次 PV；重复卸载重挂不重复上报（StrictMode 守护）', async () => {
    状态.enabled = true
    const VisitorCounter = await 载入组件()

    const { unmount } = render(<VisitorCounter />)
    unmount()
    render(<VisitorCounter />)

    expect(状态.mutate).toHaveBeenCalledTimes(1)
    expect(状态.mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        path: '/',
        timestamp: expect.any(Number),
      })
    )
  })

  it('ANALYTICS_ENABLED 关闭时整体不渲染', async () => {
    状态.enabled = false
    const VisitorCounter = await 载入组件()
    render(<VisitorCounter />)
    expect(screen.queryByTestId('visitor-counter')).not.toBeInTheDocument()
  })
})
