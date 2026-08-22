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
const setAiThinking = vi.fn()

// jsdom 未内置 Blob objectURL：stub 供预览与泄漏断言使用，afterEach 还原原生实现
let objectUrlCounter = 0
const createObjectURLMock = vi.fn(() => {
  objectUrlCounter += 1
  return `blob:mock-${objectUrlCounter}`
})
const revokeObjectURLMock = vi.fn()
const 原生CreateObjectURL = URL.createObjectURL
const 原生RevokeObjectURL = URL.revokeObjectURL

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
    aiThinking: true,
    addAiMessage: vi.fn((message) => {
      mockAiMessages.push(message)
      notifyMockState()
    }),
    clearAiMessages,
    setAiThinking,
    ...overrides,
  }
}

describe('AIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAiMessages = []
    mockRuntime.isPending = false
    objectUrlCounter = 0
    URL.createObjectURL = createObjectURLMock as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURLMock as unknown as typeof URL.revokeObjectURL
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn()
    }
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) => selector(createMockState()))
  })

  afterEach(() => {
    cleanup()
    URL.createObjectURL = 原生CreateObjectURL
    URL.revokeObjectURL = 原生RevokeObjectURL
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

  it('shows deepseek-v4-flash-vision-exp with thinking on in status bar when open', async () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    expect(await screen.findByText('deepseek-v4-flash-vision-exp · think on · CTX 1M')).toBeInTheDocument()
  })

  it('/think 切换思考开关并输出状态行', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '/think' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(setAiThinking).toHaveBeenCalledWith(false)
  })

  /** 造一个指定大小的 File（jsdom 中 File.size 由内容长度决定，用 defineProperty 覆写） */
  function 创建图片文件(type = 'image/png', size = 8): File {
    const file = new File([new Uint8Array(8)], '测试图片.png', { type })
    if (size !== 8) {
      Object.defineProperty(file, 'size', { value: size })
    }
    return file
  }

  function 获取文件输入(container: HTMLElement): HTMLInputElement {
    return container.querySelector('input[type="file"]') as HTMLInputElement
  }

  it('非法类型的图片被忽略并提示上传失败', async () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    const { container } = render(<AIChat />)
    const fileInput = 获取文件输入(container)
    Object.defineProperty(fileInput, 'files', { value: [创建图片文件('text/plain')] })
    fireEvent.change(fileInput)

    expect(screen.getByText(t('ai.imageUploadFailed'))).toBeInTheDocument()
    expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
  })

  it('超过单张大小上限的图片显示红字上传失败缩略图且不发送', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    const { container } = render(<AIChat />)
    const fileInput = 获取文件输入(container)
    Object.defineProperty(fileInput, 'files', { value: [创建图片文件('image/png', 17 * 1024 * 1024)] })
    fireEvent.change(fileInput)

    const 失败标记 = await screen.findByTestId('pending-images-failed')
    expect(失败标记).toHaveTextContent(t('ai.imageRejected'))
    expect(screen.queryByText(t('ai.imageUploadFailed'))).not.toBeInTheDocument()

    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '带一张坏图' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: '带一张坏图' }],
        signal: expect.any(AbortSignal),
      })
    })
  })

  it('粘贴合法 PNG 进入待发区并可随消息发出', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder')) as HTMLInputElement
    fireEvent.paste(input, { clipboardData: { files: [创建图片文件()] } })
    await waitFor(() => {
      expect(screen.getByTestId('pending-images')).toBeInTheDocument()
    })

    fireEvent.change(input, { target: { value: '看这张截图' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [
          {
            role: 'user',
            content: '看这张截图',
            images: [expect.stringMatching(/^data:image\/png;base64,/)],
          },
        ],
        signal: expect.any(AbortSignal),
      })
    })
    // 发送消费后清空待发区并释放预览 objectURL
    await waitFor(() => {
      expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
    })
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-1')
  })

  it('粘贴文本不触发上传且不影响正常输入', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder')) as HTMLInputElement
    fireEvent.paste(input, { clipboardData: { files: [] } })

    expect(createObjectURLMock).not.toHaveBeenCalled()
    expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
  })

  it('粘贴 BMP 显示红字「上传失败」且不随消息发出', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder')) as HTMLInputElement
    fireEvent.paste(input, { clipboardData: { files: [创建图片文件('image/bmp')] } })

    const 失败标记 = await screen.findByTestId('pending-images-failed')
    expect(失败标记).toHaveTextContent(t('ai.imageRejected'))

    fireEvent.change(input, { target: { value: '描述一下' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: '描述一下' }],
        signal: expect.any(AbortSignal),
      })
    })
    await waitFor(() => {
      expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
    })
  })

  it('待发区上限4张对合格与失败图片一并计数，超出提示上传失败', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByPlaceholderText(t('ai.placeholder')) as HTMLInputElement
    fireEvent.paste(input, { clipboardData: { files: [创建图片文件(), 创建图片文件('image/bmp'), 创建图片文件()] } })
    await waitFor(() => {
      expect(screen.getByTestId('pending-images').children.length).toBe(3)
    })

    fireEvent.paste(input, { clipboardData: { files: [创建图片文件(), 创建图片文件()] } })
    await waitFor(() => {
      expect(screen.getByText(t('ai.imageUploadFailed'))).toBeInTheDocument()
    })
    expect(screen.getByTestId('pending-images').children.length).toBe(4)
    expect(screen.getAllByTestId('pending-images-failed').length).toBe(1)

    fireEvent.change(input, { target: { value: '混排发送' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            expect.objectContaining({
              role: 'user',
              content: '混排发送',
              images: [expect.stringMatching(/^data:image\/png;base64,/), expect.stringMatching(/^data:image\/png;base64,/), expect.stringMatching(/^data:image\/png;base64,/)],
            }),
          ],
        })
      )
    })
  })

  it('移除与重置清空时对不再使用的预览调用 revokeObjectURL', async () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    const { container } = render(<AIChat />)
    const fileInput = 获取文件输入(container)
    Object.defineProperty(fileInput, 'files', { value: [创建图片文件(), 创建图片文件()] })
    fireEvent.change(fileInput)
    await waitFor(() => {
      expect(screen.getByTestId('pending-images').children.length).toBe(2)
    })
    expect(createObjectURLMock).toHaveBeenCalledTimes(2)

    // 移除第一张：仅释放其 objectURL
    fireEvent.click(screen.getAllByRole('button', { name: t('ai.removeImage') })[0])
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(1)
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-1')

    // 重置清空其余：释放剩余 objectURL
    fireEvent.click(screen.getByRole('button', { name: t('ai.reset') }))
    expect(revokeObjectURLMock).toHaveBeenCalledTimes(2)
    expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-2')
  })

  it('两次粘贴读取交错完成时待发图 key 不冲突，移除互不影响', async () => {
    // 手动放行式 FileReader 假体：控制两批粘贴的读取完成顺序（后发起的先完成），
    // 复现「await 期间计数器被另一批前移」的交错场景；key 冲突时按 key 移除会误删两张。
    const 待放行: Array<() => void> = []
    class 手动FileReader {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      result: string | null = null
      readAsDataURL() {
        待放行.push(() => {
          this.result = 'data:image/png;base64,QUJD'
          this.onload?.()
        })
      }
    }
    const 原生FileReader = window.FileReader
    window.FileReader = 手动FileReader as unknown as typeof FileReader

    try {
      mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
        selector(createMockState({ chatOpen: true }))
      )

      render(<AIChat />)
      const input = screen.getByPlaceholderText(t('ai.placeholder')) as HTMLInputElement
      fireEvent.paste(input, { clipboardData: { files: [创建图片文件()] } })
      fireEvent.paste(input, { clipboardData: { files: [创建图片文件()] } })
      expect(待放行.length).toBe(2)

      待放行[1]()
      待放行[0]()
      await waitFor(() => {
        expect(screen.getByTestId('pending-images').children.length).toBe(2)
      })

      fireEvent.click(screen.getAllByRole('button', { name: t('ai.removeImage') })[0])
      expect(screen.getByTestId('pending-images').children.length).toBe(1)
    } finally {
      window.FileReader = 原生FileReader
    }
  })

  it('合法图片进入待发区，随消息一起发送且发送后清空', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    const { container } = render(<AIChat />)
    const fileInput = 获取文件输入(container)
    Object.defineProperty(fileInput, 'files', { value: [创建图片文件()] })
    // 根因：fireEvent 不得包进 act——FileReader.load 是宏任务，act 退出后其回调触发的
    // 状态更新不会被提交；裸 fireEvent + waitFor（真定时器轮询）才能等到落地。
    fireEvent.change(fileInput)
    await waitFor(() => {
      expect(screen.getByTestId('pending-images')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(t('ai.placeholder'))
    fireEvent.change(input, { target: { value: '图里有什么' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [
          {
            role: 'user',
            content: '图里有什么',
            images: [expect.stringMatching(/^data:image\/png;base64,/)],
          },
        ],
        signal: expect.any(AbortSignal),
      })
    })
    await waitFor(() => {
      expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
    })
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

  it('用户消息图片渲染缩略图，点击开灯箱，Esc 关灯箱且不关面板', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [{ role: 'user', content: '看图', images: ['data:image/png;base64,QUJD'] }],
        })
      )
    )

    render(<AIChat />)
    const 缩略图 = screen.getByTestId('message-images').querySelector('button') as HTMLButtonElement
    fireEvent.click(缩略图)

    const 灯箱 = screen.getByTestId('chat-lightbox')
    expect(灯箱).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('chat-lightbox')).not.toBeInTheDocument()
    expect(setChatOpen).not.toHaveBeenCalledWith(false)
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
