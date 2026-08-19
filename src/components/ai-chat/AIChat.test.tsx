import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { AIChat } from './AIChat'
import { useAppStore } from '../../store/useAppStore'
import { t, ta } from '../../i18n/translations'

const setChatOpen = vi.fn()
const clearAiMessages = vi.fn()
const mutateAsync = vi.fn()
const mutationReset = vi.fn()
const mockCompact = vi.fn()

let mockAiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

// 模拟真实运行时的响应式：zustand store 变更与 react-query isPending 翻转都会触发重渲染，
// mock 必须提供同等能力，否则测的是 mock 缺陷而非组件行为。
const mockRuntime = vi.hoisted(() => ({ isPending: false, listeners: new Set<() => void>() }))

function notifyMockState() {
  mockRuntime.listeners.forEach((listener) => listener())
}

vi.mock('../../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}))

vi.mock('../../ai/chatService', async () => {
  const { useEffect, useReducer } = await import('react')
  return {
    useChatService: () => {
      const [, forceRender] = useReducer((x: number) => x + 1, 0)
      useEffect(() => {
        mockRuntime.listeners.add(forceRender)
        return () => {
          mockRuntime.listeners.delete(forceRender)
        }
      }, [])
      return {
        mutateAsync,
        get isPending() {
          return mockRuntime.isPending
        },
        reset: mutationReset,
        error: null,
      }
    },
    compactConversation: (...args: unknown[]) => mockCompact(...args),
    是否中断错误: (err: unknown) => err instanceof DOMException && err.name === 'AbortError',
  }
})

const mockUseAppStore = useAppStore as unknown as ReturnType<typeof vi.fn>

function createMockState(overrides: Record<string, unknown> = {}) {
  return {
    chatOpen: false,
    setChatOpen,
    aiMessages: mockAiMessages,
    aiModel: 'flash',
    aiThinking: true,
    addAiMessage: vi.fn((message) => {
      mockAiMessages.push(message)
      notifyMockState()
    }),
    clearAiMessages,
    setAiModel: vi.fn(),
    setAiThinking: vi.fn(),
    ...overrides,
  }
}

describe('AIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAiMessages = []
    mockRuntime.isPending = false
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn()
    }
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) => selector(createMockState()))
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders floating button when closed', () => {
    render(<AIChat />)
    expect(screen.getByRole('button', { name: t('ai.title') })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens chat dialog when floating button clicked', () => {
    render(<AIChat />)
    fireEvent.click(screen.getByRole('button', { name: t('ai.title') }))
    expect(setChatOpen).toHaveBeenCalledWith(true)
  })

  it('renders chat dialog with quick questions when open', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    expect(screen.getByRole('dialog', { name: t('ai.title') })).toBeInTheDocument()
    expect(screen.getByText(t('ai.empty'))).toBeInTheDocument()

    const quickQuestions = ta('ai.quickQuestions')
    for (const question of quickQuestions) {
      expect(screen.getByText(question)).toBeInTheDocument()
    }
  })

  it('shows default deepseek-v4-flash with thinking on in status bar when open', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    expect(screen.getByText('deepseek-v4-flash · think on · CTX 1M')).toBeInTheDocument()
  })

  it('shows flash selected and Think On by default in the /model panel', async () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getAllByText('● On')).not.toHaveLength(0)
    })
    const flashLines = screen.getAllByText(/deepseek-v4-flash/)
    expect(flashLines.some((el) => (el.textContent ?? '').includes('◉'))).toBe(true)
  })

  it('does not send message when input is empty', async () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(mutateAsync).not.toHaveBeenCalled()
    })
  })

  it('sends message when form submitted', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '你是谁' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: '你是谁' }],
        signal: expect.any(AbortSignal),
      })
    })
  })

  it('clears the input box right after sending（对齐 Claude Code）', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder')) as HTMLInputElement
    fireEvent.change(input, { target: { value: '你是谁' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(input.value).toBe('')
  })

  it('keeps the input editable while busy and queues the message（Claude Code queued 语义）', async () => {
    mutateAsync.mockImplementation(() => new Promise(() => {}))
    mockRuntime.isPending = true
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder')) as HTMLInputElement
    expect(input.disabled).toBe(false)

    fireEvent.change(input, { target: { value: '第二条消息' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(mutateAsync).not.toHaveBeenCalled()
    expect(screen.getByText(/第二条消息/)).toBeInTheDocument()
    expect(screen.getByText(t('ai.queue.hint'))).toBeInTheDocument()

    // 忙→闲：排队消息自动发出（依次）
    act(() => {
      mockRuntime.isPending = false
      notifyMockState()
    })
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: '第二条消息' }],
        signal: expect.any(AbortSignal),
      })
    })
  })

  it('/clear 与 /new 都开启新会话（清空历史）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiMessages: [{ role: 'user', content: '旧消息' }] }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '/new' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(clearAiMessages).toHaveBeenCalled()
    expect(mutationReset).toHaveBeenCalled()
  })

  it('/help 列出对齐 Claude Code 的指令清单', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '/help' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(/\/clear\s+清空对话历史，开始新会话/)).toBeInTheDocument()
    expect(screen.getByText(/\/compact\s+压缩对话历史，保留语义/)).toBeInTheDocument()
  })

  it('未知指令给出 Claude Code 风格的报错', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '/不存在的指令' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(/未知指令：\/不存在的指令/)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('/compact 在无历史时提示而不调用模型', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '/compact' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.commands.compactEmpty'))).toBeInTheDocument()
    expect(mockCompact).not.toHaveBeenCalled()
  })

  it('/compact 在请求进行中时被闸门拦截（在途回合不得漏压）', () => {
    mockRuntime.isPending = true
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiMessages: [{ role: 'user', content: '旧消息' }] }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '/compact' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.commands.compactBusy'))).toBeInTheDocument()
    expect(mockCompact).not.toHaveBeenCalled()
  })

  it('/clear 后在途请求的迟到响应不得写入新会话（孤儿守护）', async () => {
    let 解决请求: ((value: { message: { role: 'assistant'; content: string } }) => void) | undefined
    mutateAsync.mockImplementation(
      () =>
        new Promise((resolve) => {
          解决请求 = resolve
        })
    )
    const addAiMessage = vi.fn((message) => {
      mockAiMessages.push(message)
      notifyMockState()
    })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, addAiMessage }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '在途问题' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    // 请求在途时 /clear 开新会话
    fireEvent.change(input, { target: { value: '/clear' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    // 迟到的响应此刻才返回：不得写入已清空的新会话
    await act(async () => {
      解决请求?.({ message: { role: 'assistant', content: '孤儿响应' } })
      await Promise.resolve()
    })

    const 写入过的内容 = addAiMessage.mock.calls.map((调用) => 调用[0].content)
    expect(写入过的内容).not.toContain('孤儿响应')
  })

  it('sends quick question when clicked', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const quickQuestions = ta('ai.quickQuestions')
    fireEvent.click(screen.getByText(quickQuestions[0]))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: quickQuestions[0] }],
        signal: expect.any(AbortSignal),
      })
    })
  })

  it('shows optimistic user message immediately and persists assistant message after success', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '你是谁' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('你是谁')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('回答')).toBeInTheDocument()
    })
  })

  it('rolls back optimistic message and shows error on failure', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('失败'))

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '你是谁' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('你是谁')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(t('ai.empty'))).toBeInTheDocument()
      expect(screen.getByText(t('ai.error'))).toBeInTheDocument()
    })
  })

  it('renders existing messages and assistant answer', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '问题' },
            { role: 'assistant', content: '答案' },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByText('问题')).toBeInTheDocument()
    expect(screen.getByText('答案')).toBeInTheDocument()
  })

  it('clears messages when reset button clicked', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [{ role: 'user', content: '问题' }],
        })
      )
    )

    render(<AIChat />)
    fireEvent.click(screen.getByRole('button', { name: t('ai.reset') }))
    expect(clearAiMessages).toHaveBeenCalled()
    expect(mutationReset).toHaveBeenCalled()
  })

  it('closes chat when close button clicked', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    fireEvent.click(screen.getByRole('button', { name: t('ai.close') }))
    expect(setChatOpen).toHaveBeenCalledWith(false)
  })

  it('renders ProjectCard component when assistant message has structured component', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '推荐项目' },
            {
              role: 'assistant',
              content: '推荐已删除的经历项目',
              component: { type: 'ProjectCard', projectId: 'xrm' },
            },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByTestId('ui-component-ProjectCard')).toBeInTheDocument()
    expect(screen.getByText('已删除的经历')).toBeInTheDocument()
  })

  it('renders Timeline component when assistant message has timeline component', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '经历' },
            { role: 'assistant', content: '这是我的经历', component: { type: 'Timeline', scope: 'experience' } },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
  })

  it('renders ContactForm component when assistant message has contact component', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '联系' },
            { role: 'assistant', content: '请填写表单', component: { type: 'ContactForm' } },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByTestId('ui-component-ContactForm')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(t('contact.form.name'))).toBeInTheDocument()
  })
})
