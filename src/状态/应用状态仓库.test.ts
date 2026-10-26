import { describe, it, expect, beforeEach } from 'vitest'
import { useYingYongZhuangTai, 板块表, 板块顺序 } from './应用状态仓库'

describe('useAppStore', () => {
  beforeEach(() => {
    useYingYongZhuangTai.setState({
      活跃区块: null,
      主题: 'dark',
      命令面板打开: false,
      聊天打开: false,
      AI消息表: [],
      AI思考强度: 'high',
      减少动画: false,
      性能指标: {},
      帧指标: { fps: 0, p95: 0, avg: 0, 降档次数: 0, 升档次数: 0 },
    })
  })

  it('should have correct initial state', () => {
    const 状态 = useYingYongZhuangTai.getState()
    expect(状态.活跃区块).toBeNull()
    expect(状态.主题).toBe('dark')
    expect(状态.命令面板打开).toBe(false)
    expect(状态.聊天打开).toBe(false)
    expect(状态.AI消息表).toHaveLength(0)
    expect(状态.AI思考强度).toBe('high')
  })

  it('should set ai thinking intensity', () => {
    const { 设置AI思考 } = useYingYongZhuangTai.getState()
    设置AI思考('max')
    expect(useYingYongZhuangTai.getState().AI思考强度).toBe('max')
    设置AI思考('off')
    expect(useYingYongZhuangTai.getState().AI思考强度).toBe('off')
  })

  it('should set active section', () => {
    const { 设置活跃区块 } = useYingYongZhuangTai.getState()
    设置活跃区块(板块表.HERO)
    expect(useYingYongZhuangTai.getState().活跃区块).toBe('hero')
  })

  it('should toggle command palette', () => {
    const { 切换命令面板 } = useYingYongZhuangTai.getState()
    切换命令面板()
    expect(useYingYongZhuangTai.getState().命令面板打开).toBe(true)
    切换命令面板()
    expect(useYingYongZhuangTai.getState().命令面板打开).toBe(false)
  })

  it('should toggle chat', () => {
    const { 切换聊天 } = useYingYongZhuangTai.getState()
    切换聊天()
    expect(useYingYongZhuangTai.getState().聊天打开).toBe(true)
  })

  it('should have nine sections in order', () => {
    expect(板块顺序).toHaveLength(9)
    expect(Object.keys(板块表)).toHaveLength(9)
    expect(板块顺序).toContain('media')
    expect(板块顺序).toContain('skills')
    expect(板块顺序).not.toContain('music')
  })

  it('should set performance metrics', () => {
    const { 设置性能指标 } = useYingYongZhuangTai.getState()
    设置性能指标({ lcp: 1200, cls: 0.05 })
    const 状态 = useYingYongZhuangTai.getState()
    expect(状态.性能指标.lcp).toBe(1200)
    expect(状态.性能指标.cls).toBe(0.05)
  })

  it('should update one ai message in place for streaming progress', () => {
    const { 添加AI消息, 更新AI消息 } = useYingYongZhuangTai.getState()
    添加AI消息({ role: 'user', content: '流式问题' })
    添加AI消息({ role: 'assistant', content: '' })
    更新AI消息(1, { 思考内容: '思考一', content: '回答一' })
    const 状态 = useYingYongZhuangTai.getState()
    expect(状态.AI消息表).toHaveLength(2)
    expect(状态.AI消息表[0].content).toBe('流式问题')
    expect(状态.AI消息表[1].思考内容).toBe('思考一')
    expect(状态.AI消息表[1].content).toBe('回答一')
  })

  it('should merge frame metrics', () => {
    const { 设置帧指标 } = useYingYongZhuangTai.getState()
    设置帧指标({ fps: 60, 降档次数: 1 })
    const 状态 = useYingYongZhuangTai.getState()
    expect(状态.帧指标.fps).toBe(60)
    expect(状态.帧指标.降档次数).toBe(1)
    expect(状态.帧指标.升档次数).toBe(0)
  })
})
