import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { AIChat } from './AIChat'
import { useAppStore } from '../../store/useAppStore'
import { t, ta } from '../../i18n/translations'

const setChatOpen = vi.fn()
const clearAiMessages = vi.fn()
const mutateAsync = vi.fn()
const mutationReset = vi.fn()

let mockAiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = []

vi.mock('../../store/useAppStore', () => ({
  useAppStore: vi.fn(),
}))

vi.mock('../../ai/chatService', () => ({
  useChatService: () => ({
    mutateAsync,
    isPending: false,
    reset: mutationReset,
    error: null,
  }),
}))

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
      expect(mutateAsync).toHaveBeenCalledWith([{ role: 'user', content: '你是谁' }])
    })
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
      expect(mutateAsync).toHaveBeenCalledWith([{ role: 'user', content: quickQuestions[0] }])
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
