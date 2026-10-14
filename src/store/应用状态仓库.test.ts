import { describe, it, expect, beforeEach } from 'vitest'
import { useYingYongZhuangTai, 板块表, 板块顺序 } from './应用状态仓库'

describe('useAppStore', () => {
  beforeEach(() => {
    useYingYongZhuangTai.setState({
      activeSection: null,
      theme: 'dark',
      commandOpen: false,
      chatOpen: false,
      aiMessages: [],
      aiThinking: 'high',
      reducedMotion: false,
      performanceMetrics: {},
      frameMetrics: { fps: 0, p95: 0, avg: 0, downgradeCount: 0, upgradeCount: 0 },
    })
  })

  it('should have correct initial state', () => {
    const state = useYingYongZhuangTai.getState()
    expect(state.activeSection).toBeNull()
    expect(state.theme).toBe('dark')
    expect(state.commandOpen).toBe(false)
    expect(state.chatOpen).toBe(false)
    expect(state.aiMessages).toHaveLength(0)
    expect(state.aiThinking).toBe('high')
  })

  it('should set ai thinking intensity', () => {
    const { setAiThinking } = useYingYongZhuangTai.getState()
    setAiThinking('max')
    expect(useYingYongZhuangTai.getState().aiThinking).toBe('max')
    setAiThinking('off')
    expect(useYingYongZhuangTai.getState().aiThinking).toBe('off')
  })

  it('should set active section', () => {
    const { setActiveSection } = useYingYongZhuangTai.getState()
    setActiveSection(板块表.HERO)
    expect(useYingYongZhuangTai.getState().activeSection).toBe('hero')
  })

  it('should toggle command palette', () => {
    const { toggleCommand } = useYingYongZhuangTai.getState()
    toggleCommand()
    expect(useYingYongZhuangTai.getState().commandOpen).toBe(true)
    toggleCommand()
    expect(useYingYongZhuangTai.getState().commandOpen).toBe(false)
  })

  it('should toggle chat', () => {
    const { toggleChat } = useYingYongZhuangTai.getState()
    toggleChat()
    expect(useYingYongZhuangTai.getState().chatOpen).toBe(true)
  })

  it('should have nine sections in order', () => {
    expect(板块顺序).toHaveLength(9)
    expect(Object.keys(板块表)).toHaveLength(9)
    expect(板块顺序).toContain('media')
    expect(板块顺序).toContain('skills')
    expect(板块顺序).not.toContain('music')
  })

  it('should set performance metrics', () => {
    const { setPerformanceMetrics } = useYingYongZhuangTai.getState()
    setPerformanceMetrics({ lcp: 1200, cls: 0.05 })
    const state = useYingYongZhuangTai.getState()
    expect(state.performanceMetrics.lcp).toBe(1200)
    expect(state.performanceMetrics.cls).toBe(0.05)
  })

  it('should update one ai message in place for streaming progress', () => {
    const { addAiMessage, updateAiMessage } = useYingYongZhuangTai.getState()
    addAiMessage({ role: 'user', content: '流式问题' })
    addAiMessage({ role: 'assistant', content: '' })
    updateAiMessage(1, { reasoning: '思考一', content: '回答一' })
    const state = useYingYongZhuangTai.getState()
    expect(state.aiMessages).toHaveLength(2)
    expect(state.aiMessages[0].content).toBe('流式问题')
    expect(state.aiMessages[1].reasoning).toBe('思考一')
    expect(state.aiMessages[1].content).toBe('回答一')
  })

  it('should merge frame metrics', () => {
    const { setFrameMetrics } = useYingYongZhuangTai.getState()
    setFrameMetrics({ fps: 60, downgradeCount: 1 })
    const state = useYingYongZhuangTai.getState()
    expect(state.frameMetrics.fps).toBe(60)
    expect(state.frameMetrics.downgradeCount).toBe(1)
    expect(state.frameMetrics.upgradeCount).toBe(0)
  })
})
