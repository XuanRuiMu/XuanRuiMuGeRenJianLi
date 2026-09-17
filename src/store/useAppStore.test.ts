import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore, SECTIONS, SECTION_ORDER } from './useAppStore'

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
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
    const state = useAppStore.getState()
    expect(state.activeSection).toBeNull()
    expect(state.theme).toBe('dark')
    expect(state.commandOpen).toBe(false)
    expect(state.chatOpen).toBe(false)
    expect(state.aiMessages).toHaveLength(0)
    expect(state.aiThinking).toBe('high')
  })

  it('should set ai thinking intensity', () => {
    const { setAiThinking } = useAppStore.getState()
    setAiThinking('max')
    expect(useAppStore.getState().aiThinking).toBe('max')
    setAiThinking('off')
    expect(useAppStore.getState().aiThinking).toBe('off')
  })

  it('should set active section', () => {
    const { setActiveSection } = useAppStore.getState()
    setActiveSection(SECTIONS.HERO)
    expect(useAppStore.getState().activeSection).toBe('hero')
  })

  it('should toggle command palette', () => {
    const { toggleCommand } = useAppStore.getState()
    toggleCommand()
    expect(useAppStore.getState().commandOpen).toBe(true)
    toggleCommand()
    expect(useAppStore.getState().commandOpen).toBe(false)
  })

  it('should toggle chat', () => {
    const { toggleChat } = useAppStore.getState()
    toggleChat()
    expect(useAppStore.getState().chatOpen).toBe(true)
  })

  it('should have nine sections in order', () => {
    expect(SECTION_ORDER).toHaveLength(9)
    expect(Object.keys(SECTIONS)).toHaveLength(9)
    expect(SECTION_ORDER).toContain('media')
    expect(SECTION_ORDER).toContain('skills')
    expect(SECTION_ORDER).not.toContain('music')
  })

  it('should set performance metrics', () => {
    const { setPerformanceMetrics } = useAppStore.getState()
    setPerformanceMetrics({ lcp: 1200, cls: 0.05 })
    const state = useAppStore.getState()
    expect(state.performanceMetrics.lcp).toBe(1200)
    expect(state.performanceMetrics.cls).toBe(0.05)
  })

  it('should update one ai message in place for streaming progress', () => {
    const { addAiMessage, updateAiMessage } = useAppStore.getState()
    addAiMessage({ role: 'user', content: '流式问题' })
    addAiMessage({ role: 'assistant', content: '' })
    updateAiMessage(1, { reasoning: '思考一', content: '回答一' })
    const state = useAppStore.getState()
    expect(state.aiMessages).toHaveLength(2)
    expect(state.aiMessages[0].content).toBe('流式问题')
    expect(state.aiMessages[1].reasoning).toBe('思考一')
    expect(state.aiMessages[1].content).toBe('回答一')
  })

  it('should merge frame metrics', () => {
    const { setFrameMetrics } = useAppStore.getState()
    setFrameMetrics({ fps: 60, downgradeCount: 1 })
    const state = useAppStore.getState()
    expect(state.frameMetrics.fps).toBe(60)
    expect(state.frameMetrics.downgradeCount).toBe(1)
    expect(state.frameMetrics.upgradeCount).toBe(0)
  })
})
