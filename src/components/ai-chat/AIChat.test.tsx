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
const setAiModel = vi.fn()
const stashSession = vi.fn()
const restoreSession = vi.fn()

// jsdom 未内置 Blob objectURL：stub 供预览与泄漏断言使用，afterEach 还原原生实现
let objectUrlCounter = 0
const createObjectURLMock = vi.fn(() => {
  objectUrlCounter += 1
  return `blob:mock-${objectUrlCounter}`
})
const revokeObjectURLMock = vi.fn()
const 原生CreateObjectURL = URL.createObjectURL
const 原生RevokeObjectURL = URL.revokeObjectURL

let mockAiMessages: Array<{ role: 'user' | 'assistant'; content: string; reasoning?: string }> = []

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
    aiModel: 'deepseek-v4.1-flash-expires-on-0910',
    aiThinking: 'high',
    stashedSession: [],
    addAiMessage: vi.fn((message) => {
      mockAiMessages.push(message)
      notifyMockState()
    }),
    updateAiMessage: vi.fn((index: number, patch: Record<string, unknown>) => {
      mockAiMessages[index] = { ...mockAiMessages[index], ...patch }
      notifyMockState()
    }),
    clearAiMessages,
    setAiModel,
    stashSession,
    restoreSession,
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
    expect(screen.getByTestId('welcome-line')).toBeInTheDocument()
    expect(screen.getByTestId('welcome-full')).toHaveClass('xuan-harness-fixed-orange')
    expect(screen.getByTestId('welcome-full').textContent).toContain(t('ai.welcomePrefix'))
    expect(screen.getByTestId('welcome-full').textContent).toContain(t('ai.welcomeTitle'))
    expect(screen.getByTestId('welcome-full').textContent).toContain(t('ai.welcomeTitleSuffix'))

    const quickQuestions = ta('ai.quickQuestions')
    for (const question of quickQuestions) {
      expect(screen.getByText(question)).toBeInTheDocument()
    }
  })

  it('底部状态条显示 >> 模型·思考与切换提示', async () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const 状态条 = await screen.findByTestId('chat-status-line')
    expect(状态条).toHaveTextContent('>>')
    expect(状态条).toHaveTextContent('deepseek-v4.1-flash-expires-on-0910 · think high')
    expect(状态条).toHaveTextContent(t('ai.statusCycle'))
  })

  it('/think 按档循环思考强度并输出状态行', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiThinking: 'high' }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/think' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(setAiThinking).toHaveBeenCalledWith('max')
    expect(screen.getByText(t('ai.thinkLevel').replace('{level}', 'max'))).toBeInTheDocument()
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

    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '带一张坏图' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: '带一张坏图' }],
        signal: expect.any(AbortSignal),
        onProgress: expect.any(Function),
      })
    })
  })

  it('粘贴合法 PNG 进入待发区并可随消息发出', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
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
        onProgress: expect.any(Function),
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
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
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
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
    fireEvent.paste(input, { clipboardData: { files: [创建图片文件('image/bmp')] } })

    const 失败标记 = await screen.findByTestId('pending-images-failed')
    expect(失败标记).toHaveTextContent(t('ai.imageRejected'))

    fireEvent.change(input, { target: { value: '描述一下' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: '描述一下' }],
        signal: expect.any(AbortSignal),
        onProgress: expect.any(Function),
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
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
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
              images: [
                expect.stringMatching(/^data:image\/png;base64,/),
                expect.stringMatching(/^data:image\/png;base64,/),
                expect.stringMatching(/^data:image\/png;base64,/),
              ],
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
      const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
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

    const input = screen.getByRole('textbox', { name: t('ai.title') })
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
        onProgress: expect.any(Function),
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
    const input = screen.getByRole('textbox', { name: t('ai.title') })
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
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '你是谁' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: '你是谁' }],
        signal: expect.any(AbortSignal),
        onProgress: expect.any(Function),
      })
    })
  })

  it('clears the input box right after sending（对齐 Claude Code）', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
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
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
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
        onProgress: expect.any(Function),
      })
    })
  })

  it('/clear 与 /new 都开启新会话（清空历史）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiMessages: [{ role: 'user', content: '旧消息' }] }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
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
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/help' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(/\/clear\s*清空对话历史，开始新会话/)).toBeInTheDocument()
    expect(screen.getByText(/\/compact\s*压缩对话历史，保留语义/)).toBeInTheDocument()
    expect(screen.getByText(/\/model\s*查看或切换模型/)).toBeInTheDocument()
    expect(screen.getByText(/\/resume\s*恢复上一次清空前的会话/)).toBeInTheDocument()
  })

  it('/model 无参数列出可用模型', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByTestId('model-picker')).toBeInTheDocument()
    expect(screen.getByTestId('model-option-1')).toHaveTextContent('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.queryByTestId('model-option-2')).not.toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('/model 序号越界报错且不切换', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/model 2' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(setAiModel).not.toHaveBeenCalled()
    expect(screen.getByText(/未知模型：/)).toBeInTheDocument()
  })

  it('/model 未知模型报错且不切换', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/model 不存在的模型' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(setAiModel).not.toHaveBeenCalled()
    expect(screen.getByText(/未知模型：/)).toBeInTheDocument()
  })

  it('/model 裸指令开启键盘选择器（❯高亮当前模型）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByTestId('model-picker')).toBeInTheDocument()
    expect(screen.getByText(t('ai.modelPicker.selectTitle'))).toBeInTheDocument()
    expect(screen.getByText(t('ai.modelPicker.confirmHint'))).toBeInTheDocument()
    const 第一行 = screen.getByTestId('model-option-1')
    expect(第一行).toHaveTextContent('❯')
    expect(第一行).toHaveTextContent('deepseek-v4.1-flash-expires-on-0910')
    expect(第一行).toHaveTextContent('✓')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('选择器内↑/↓移动高亮，⏎确认切换模型', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.getByTestId('model-option-1')).toHaveTextContent('❯')

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(screen.getByTestId('model-option-1')).toHaveTextContent('❯')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(setAiModel).toHaveBeenCalledWith('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.getByText(/已切换模型：deepseek-v4\.1-flash-expires-on-0910/)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('选择器内←/→按档步进思考强度而不发送', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiThinking: 'high' }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(setAiThinking).toHaveBeenCalledWith('max')

    fireEvent.keyDown(input, { key: 'ArrowLeft' })
    expect(setAiThinking).toHaveBeenCalledWith('low')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('选择器在强度两端钳制（max 处 → 无操作）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiThinking: 'max' }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(setAiThinking).not.toHaveBeenCalled()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('选择器内 Esc 关闭选择器而不最小化面板', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(screen.getByTestId('model-picker')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(screen.queryByTestId('model-picker')).not.toBeInTheDocument()
    expect(setChatOpen).not.toHaveBeenCalled()
  })

  it('选择器开启后一旦打字方向键恢复编辑语义', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiThinking: 'high' }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    fireEvent.change(input, { target: { value: 'hello' } })
    fireEvent.keyDown(input, { key: 'ArrowLeft' })
    expect(setAiThinking).not.toHaveBeenCalled()
  })

  it('对话面板阻止 Lenis 滚轮劫持（原生滚动归面板）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    expect(screen.getByTestId('chat-messages').hasAttribute('data-lenis-prevent')).toBe(true)
    expect(screen.getByRole('dialog').hasAttribute('data-lenis-prevent')).toBe(true)
    expect(screen.getByRole('textbox', { name: t('ai.title') }).hasAttribute('data-lenis-prevent')).toBe(true)
  })

  it('/resume 无暂存时提示且不恢复', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, stashedSession: [] }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/resume' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(restoreSession).not.toHaveBeenCalled()
    expect(screen.getByText(t('ai.commands.resumeEmpty'))).toBeInTheDocument()
  })

  it('/resume 恢复上一次清空前的会话', () => {
    const 暂存 = [{ role: 'user', content: '旧会话' }]
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, stashedSession: 暂存 }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/resume' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(restoreSession).toHaveBeenCalledWith(暂存)
    expect(screen.getByText(t('ai.commands.resumeRestored'))).toBeInTheDocument()
  })

  it('发送在途时渲染会话视图而非主页（根因回归）', () => {
    mockRuntime.isPending = true
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiMessages: [] }))
    )

    render(<AIChat />)

    expect(screen.queryByText(t('ai.empty'))).not.toBeInTheDocument()
    // 思考行带计时与中断提示后缀（对齐 Claude Code 的 Thinking…(Xs)），按前缀包含断言；
    // 底部忙提示同样含 esc中断，故此处断言忙提示整行唯一文本
    expect(screen.getByText(t('ai.thinking'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.busyHint'))).toBeInTheDocument()
    expect(screen.getByText(t('ai.toolName'))).toBeInTheDocument()
    expect(screen.getByText(t('ai.toolRetrieving'))).toBeInTheDocument()
    expect(screen.queryByText(/✻/)).not.toBeInTheDocument()
  })

  it('首条消息待回答态显示三要素：问题回显+思考计时+Retrieve占位（pending零⏺单转圈）', async () => {
    mutateAsync.mockImplementation(() => new Promise(() => {}))
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '待回答三要素问题' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    act(() => {
      mockRuntime.isPending = true
      notifyMockState()
    })

    await waitFor(() => {
      expect(screen.getByText('待回答三要素问题')).toBeInTheDocument()
    })
    // 占位先行后思考计时与Retrieve占位落在空助手占位行内（单轨迹仍用 pending-thinking 标识），零⏺单转圈
    const pending块 = screen.getByTestId('pending-thinking')
    expect(pending块.querySelectorAll('svg.animate-spin').length).toBe(1)
    expect(pending块.textContent).toContain(t('ai.thinking'))
    expect(pending块.textContent).toContain(t('ai.toolName'))
    expect(pending块.textContent).toContain(t('ai.toolRetrieving'))
    expect(screen.queryByText(/✻/)).not.toBeInTheDocument()
    expect(screen.queryByText(t('ai.empty'))).not.toBeInTheDocument()
    expect(screen.queryAllByText('⏺').length).toBe(0)
    const 思考行 = pending块.querySelector('div.flex.items-center')
    expect(思考行).not.toBeNull()
    expect(思考行?.textContent).toContain(t('ai.thinking'))
    expect(思考行?.querySelector('svg.animate-spin')).not.toBeNull()
  })

  it('FP-03 pending单图标与助手⏺列对齐： settled⏺保留，pending零⏺单转圈同列', () => {
    mockRuntime.isPending = true
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '已落定问题' },
            { role: 'assistant', content: '已落定答案' },
          ],
        })
      )
    )

    render(<AIChat />)
    // 已落定助手行自带⏺；在途全局 pending 行仅在无助手位时兜底出现，此处应无全局行
    expect(screen.queryByTestId('pending-thinking')).not.toBeInTheDocument()
    expect(screen.queryAllByText('⏺').length).toBe(1)
  })

  it('排队时系统行不被清空且排队仍显示', async () => {
    mutateAsync.mockImplementation(() => new Promise(() => {}))
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiThinking: 'high' }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/think' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(screen.getByText(t('ai.thinkLevel').replace('{level}', 'max'))).toBeInTheDocument()

    mockRuntime.isPending = true
    notifyMockState()
    fireEvent.change(input, { target: { value: '排队第二条' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.thinkLevel').replace('{level}', 'max'))).toBeInTheDocument()
    expect(screen.getByText(/排队第二条/)).toBeInTheDocument()
    expect(screen.getByText(t('ai.queue.hint'))).toBeInTheDocument()
  })

  it('未知指令给出 Claude Code 风格的报错', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
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
    const input = screen.getByRole('textbox', { name: t('ai.title') })
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
    const input = screen.getByRole('textbox', { name: t('ai.title') })
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
    const input = screen.getByRole('textbox', { name: t('ai.title') })
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
        onProgress: expect.any(Function),
      })
    })
  })

  it('shows optimistic user message immediately and persists assistant message after success', async () => {
    mutateAsync.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '你是谁' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('你是谁')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('回答')).toBeInTheDocument()
    })
  })

  it('keeps user message and shows error on failure（异步optimistic保留上下文）', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('失败'))

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '你是谁' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('你是谁')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(t('ai.error'))).toBeInTheDocument()
    })
    expect(screen.getByText('你是谁')).toBeInTheDocument()
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
              content: '推荐暮澜纪元项目',
              component: { type: 'ProjectCard', projectId: 'xrm' },
            },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByTestId('ui-component-ProjectCard')).toBeInTheDocument()
    expect(screen.getByText('暮澜纪元')).toBeInTheDocument()
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

  it('renders ContactLinks component when assistant message has contact component', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '联系' },
            { role: 'assistant', content: '点下方按钮联系', component: { type: 'ContactLinks' } },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByTestId('ui-component-ContactLinks')).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.github'), { exact: false })).toBeInTheDocument()
  })

  it('Esc 空闲时最小化面板（有输入草稿也不例外，用户确认语义）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '未发出的草稿' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(setChatOpen).toHaveBeenCalledWith(false)
  })

  it('Esc 为空输入时最小化面板', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(setChatOpen).toHaveBeenCalledWith(false)
  })

  it('Enter 提交、Shift+Enter 不提交只换行', async () => {
    mutateAsync.mockResolvedValue({ message: { role: 'assistant', content: '回答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '第一行第二行' } })
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true })
    expect(mutateAsync).not.toHaveBeenCalled()

    fireEvent.keyDown(input, { key: 'Enter' })
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled()
    })
  })

  it('? 展开指令与快捷键帮助', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '?' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.shortcuts').split('\n')[0])).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('! 开头输入被诚实拦截而不发送', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '!ls -la' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.shellUnsupported'))).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('/ 前缀弹出指令补全，Tab 接受选中项', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument()

    fireEvent.change(input, { target: { value: '/mod' } })
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /\/model/ })).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Tab' })
    expect(input.value).toBe('/model')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('补全打开时回车直接执行输入', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/mod' } })
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText(`${t('ai.commands.didYouMean')} /model`)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('补全打开时 Esc 仍最小化面板而不清空输入', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/mod' } })
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()

    fireEvent.keyDown(input, { key: 'Escape' })
    expect(setChatOpen).toHaveBeenCalledWith(false)
  })

  it('拼写相近的未知指令给出联想建议', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/modle' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    expect(screen.getByText(`${t('ai.commands.didYouMean')} /model`)).toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('Alt+T 按档循环思考强度', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiThinking: 'high' }))
    )

    render(<AIChat />)
    fireEvent.keyDown(window, { key: 't', altKey: true })
    expect(setAiThinking).toHaveBeenCalledWith('max')
    expect(screen.getByText(t('ai.thinkLevel').replace('{level}', 'max'))).toBeInTheDocument()
  })

  it('Alt+P 轮换模型并输出切换行', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiModel: 'deepseek-v4.1-flash-expires-on-0910' }))
    )

    render(<AIChat />)
    fireEvent.keyDown(window, { key: 'p', altKey: true })
    expect(setAiModel).toHaveBeenCalledTimes(1)
    expect(setAiModel.mock.calls[0][0]).toBe('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.getByText(t('ai.commands.modelSwitchedPrefix'), { exact: false })).toBeInTheDocument()
  })

  it('助手消息渲染 ⏺/⎿ 工具轨迹（含命中数与耗时）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '问题' },
            {
              role: 'assistant',
              content: '答案',
              meta: { 命中数: 3, 耗时毫秒: 42, 本地兜底: false },
            },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByText(t('ai.toolName'))).toBeInTheDocument()
    expect(screen.getByText('命中 3 段 · 42ms')).toBeInTheDocument()
    expect(screen.queryByText(t('ai.toolLocalFallback'), { exact: false })).not.toBeInTheDocument()
  })

  it('本地兜底消息明确标注本地兜底', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '问题' },
            {
              role: 'assistant',
              content: '兜底答案',
              meta: { 命中数: 0, 耗时毫秒: 5, 本地兜底: true },
            },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByText(t('ai.toolLocalFallback'), { exact: false })).toBeInTheDocument()
  })

  it('无元数据的历史消息回退为通用知识库标注', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '问题' },
            { role: 'assistant', content: '老答案' },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByText(t('ai.toolGeneric'))).toBeInTheDocument()
  })

  it('标题栏显示三行式头部（名称版本/模型计费/路径），底部状态只读不可点', () => {
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
    expect(screen.getByText(t('ai.headerName'))).toBeInTheDocument()
    expect(screen.getByTestId('header-name')).toHaveClass('xuan-harness-rolling-gradient')
    const 标题状态 = screen.getByTestId('chat-header-status')
    expect(标题状态).toHaveTextContent('deepseek-v4.1-flash-expires-on-0910')
    expect(标题状态).toHaveTextContent(t('ai.headerBilling'))
    expect(screen.getByText(t('ai.headerCwd'))).toBeInTheDocument()
    expect(screen.queryByTitle(t('ai.commands.modelHint'))).not.toBeInTheDocument()
  })

  it('↑/↓ 翻看输入历史', async () => {
    mutateAsync.mockResolvedValue({ message: { role: 'assistant', content: '回答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    const 表单 = input.closest('form') as HTMLFormElement
    fireEvent.change(input, { target: { value: '第一个问题' } })
    fireEvent.submit(表单)
    fireEvent.change(input, { target: { value: '第二个问题' } })
    fireEvent.submit(表单)

    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('第二个问题')
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    expect(input.value).toBe('第一个问题')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.value).toBe('第二个问题')
  })

  it('/compact 支持聚焦说明并透传给压缩', async () => {
    mockCompact.mockResolvedValueOnce('聚焦摘要')
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiMessages: [{ role: 'user', content: '旧消息' }] }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '/compact 只看项目' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(mockCompact).toHaveBeenCalledWith(
        [{ role: 'user', content: '旧消息' }],
        expect.objectContaining({ focus: '只看项目' })
      )
    })
    expect(screen.getByText(t('ai.commands.compacted'))).toBeInTheDocument()
  })

  it('拖拽图片进入待发区', async () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const 面板 = screen.getByRole('dialog', { name: t('ai.title') })
    fireEvent.drop(面板, { dataTransfer: { files: [创建图片文件()] } })

    await waitFor(() => {
      expect(screen.getByTestId('pending-images')).toBeInTheDocument()
    })
  })

  it('输入框为多行且上限放宽到 2000', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    expect(input.tagName).toBe('TEXTAREA')
    expect(input).toHaveAttribute('maxlength', '2000')
  })

  it('选择器内 s 仅本次会话切换且发送时透传模型', async () => {
    mutateAsync.mockResolvedValue({
      message: { role: 'assistant', content: '答' },
      meta: { 命中数: 0, 耗时毫秒: 1, 本地兜底: false },
    })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    fireEvent.keyDown(input, { key: 's' })
    expect(setAiModel).not.toHaveBeenCalled()
    expect(screen.queryByTestId('model-picker')).not.toBeInTheDocument()
    expect(screen.getByTestId('chat-status-line')).toHaveTextContent(t('ai.modelPicker.sessionBadge'))

    fireEvent.change(input, { target: { value: '你好' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'deepseek-v4.1-flash-expires-on-0910' })
      )
    })
  })

  it('选择器内数字键直选并持久化', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    fireEvent.keyDown(input, { key: '1' })
    expect(setAiModel).toHaveBeenCalledWith('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.queryByTestId('model-picker')).not.toBeInTheDocument()
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('Shift+Tab 轮换默认模型', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiModel: 'deepseek-v4.1-flash-expires-on-0910' }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true })
    expect(setAiModel).toHaveBeenCalledWith('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.getByText(t('ai.commands.modelSwitchedPrefix'), { exact: false })).toBeInTheDocument()
  })

  it('指令补全为双列且最多显示5行', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/' } })

    const 选项 = screen.getAllByRole('option')
    expect(选项.length).toBe(5)
    expect(选项[0]).toHaveTextContent('/help')
    expect(选项[0]).toHaveTextContent(t('ai.cmdDesc.help'))
  })

  it('选择器展示思考强度行与调整提示', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, aiThinking: 'high' }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    const 选择器 = screen.getByTestId('model-picker')
    expect(选择器).toHaveTextContent('High effort')
    expect(选择器).toHaveTextContent(t('ai.modelPicker.effortAdjust'))
  })

  it('/clear 清除本次会话模型回到默认', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(input, { target: { value: '/model' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 's' })
    expect(screen.getByTestId('chat-status-line')).toHaveTextContent(t('ai.modelPicker.sessionBadge'))

    fireEvent.change(input, { target: { value: '/clear' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)
    expect(screen.getByTestId('chat-status-line')).not.toHaveTextContent(t('ai.modelPicker.sessionBadge'))
  })

  it('左边缘拖动加宽窗口', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const 面板 = screen.getByRole('dialog', { name: t('ai.title') })
    expect(面板.style.width).toBe('416px')

    const 左柄 = screen.getByTestId('resize-left')
    act(() => {
      左柄.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 300 }))
      window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 150, clientY: 300 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    })
    expect(面板.style.width).toBe('466px')
  })

  it('顶边缘拖动加高窗口', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const 面板 = screen.getByRole('dialog', { name: t('ai.title') })
    expect(面板.style.height).toBe('544px')

    const 顶柄 = screen.getByTestId('resize-top')
    act(() => {
      顶柄.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 300, clientY: 200 }))
      window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 300, clientY: 150 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    })
    expect(面板.style.height).toBe('594px')
  })

  it('拐角拖动同时调整宽高且不小于最小尺寸', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const 面板 = screen.getByRole('dialog', { name: t('ai.title') })

    const 拐角 = screen.getByTestId('resize-corner')
    act(() => {
      拐角.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true, clientX: 200, clientY: 200 }))
      window.dispatchEvent(new MouseEvent('pointermove', { bubbles: true, clientX: 1000, clientY: 1000 }))
    })
    act(() => {
      window.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }))
    })
    expect(面板.style.width).toBe('320px')
    expect(面板.style.height).toBe('400px')
  })

  it('回答完成后显示3个继续聊天选项（技术栈场景）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '和我恋爱吧项目用了什么技术栈' },
            { role: 'assistant', content: '用了Express等' },
          ],
        })
      )
    )

    render(<AIChat />)
    const 建议区 = screen.getByTestId('follow-up-suggestions')
    expect(建议区).toBeInTheDocument()
    expect(screen.getByText(t('ai.followUps.label'))).toBeInTheDocument()
    for (const 建议 of ta('ai.followUps.tech')) {
      expect(screen.getByText(建议)).toBeInTheDocument()
    }
  })

  it('LLM组件信号同样驱动继续选项（蜂来ProjectCard场景）', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '蜂来是做什么的' },
            {
              role: 'assistant',
              content: '蜂来介绍',
              component: { type: 'ProjectCard', projectId: 'fengLai' },
            },
          ],
        })
      )
    )

    render(<AIChat />)
    const 建议区 = screen.getByTestId('follow-up-suggestions')
    expect(建议区).toBeInTheDocument()
    for (const 建议 of ta('ai.followUps.projectsFengLai')) {
      expect(screen.getByText(建议)).toBeInTheDocument()
    }
  })

  it('点击继续选项会发送该问题', async () => {
    mutateAsync.mockResolvedValue({ message: { role: 'assistant', content: '答' } })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '介绍一下暮澜纪元' },
            { role: 'assistant', content: '暮澜纪元介绍' },
          ],
        })
      )
    )

    render(<AIChat />)
    const 首个建议 = ta('ai.followUps.projectsXrm')[0]
    fireEvent.click(screen.getByText(首个建议))
    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled()
    })
  })

  it('FP-04 流式中断/超时分类语义不变：AbortError 不走本地兜底语义', async () => {
    mutateAsync.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'))

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '中断语义问题' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText(t('ai.commands.interrupted'))).toBeInTheDocument()
    })
    expect(screen.queryByText(t('ai.error'))).not.toBeInTheDocument()
  })

  it('FP-04 流式增量经onProgress落到占位助手消息逐字显示', async () => {
    mutateAsync.mockImplementationOnce(
      (入参: { onProgress?: (增量: { reasoning: string; content: string }) => void }) => {
        入参.onProgress?.({ reasoning: '思考一', content: '' })
        入参.onProgress?.({ reasoning: '思考一思考二', content: '' })
        入参.onProgress?.({ reasoning: '思考一思考二', content: '{"text":"流式"}' })
        return Promise.resolve({ message: { role: 'assistant', content: '流式', reasoning: '思考一思考二' } })
      }
    )

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '流式问题' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByTestId('message-reasoning')).toHaveTextContent('思考一思考二')
    })
    await waitFor(() => {
      expect(screen.getByText('流式')).toBeInTheDocument()
    })
  })

  it('FP-R3 占位先行：mutateAsync执行前已有用户+空助手占位', async () => {
    let 执行时消息: Array<{ role: string; content: string }> = []
    mutateAsync.mockImplementationOnce(() => {
      执行时消息 = mockAiMessages.map((消息) => ({ role: 消息.role, content: 消息.content }))
      return Promise.resolve({ message: { role: 'assistant', content: '占位后落定' } })
    })
    const addAiMessage = vi.fn((message) => {
      mockAiMessages.push(message)
      notifyMockState()
    })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, addAiMessage }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '占位先行问题' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalled()
    })
    expect(执行时消息).toEqual([
      { role: 'user', content: '占位先行问题' },
      { role: 'assistant', content: '' },
    ])
    await waitFor(() => {
      expect(screen.getByText('占位后落定')).toBeInTheDocument()
    })
  })

  it('FP-R3 SSE增量即落屏多帧递增：半包亦显示已到字符且每帧直接update', async () => {
    const 更新序列: string[] = []
    let 捕获进度: ((增量: { reasoning: string; content: string }) => void) | undefined
    mutateAsync.mockImplementationOnce(
      (入参: { onProgress?: (增量: { reasoning: string; content: string }) => void }) => {
        捕获进度 = 入参.onProgress
        return new Promise(() => {})
      }
    )
    const updateAiMessage = vi.fn((index: number, patch: Record<string, unknown>) => {
      mockAiMessages[index] = { ...mockAiMessages[index], ...patch }
      if (typeof patch.content === 'string') 更新序列.push(patch.content as string)
      notifyMockState()
    })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true, updateAiMessage }))
    )

    render(<AIChat />)
    const input = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(input, { target: { value: '多帧递增问题' } })
    fireEvent.submit(input.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(捕获进度).toBeDefined()
    })
    await act(async () => {
      捕获进度?.({ reasoning: '', content: '{"text":"流' })
      捕获进度?.({ reasoning: '', content: '{"text":"流式真' })
      捕获进度?.({ reasoning: '', content: '{"text":"流式真逐字"}' })
    })

    expect(更新序列).toEqual(['流', '流式真', '流式真逐字'])
    await waitFor(() => {
      expect(screen.getByText('流式真逐字')).toBeInTheDocument()
    })
  })

  it('FP-04 落定助手消息保留reasoning且历史无reasoning回退兼容', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '老问题' },
            { role: 'assistant', content: '老答案' },
            { role: 'user', content: '新问题' },
            { role: 'assistant', content: '新答案', reasoning: '完整思考流' },
          ],
        })
      )
    )

    render(<AIChat />)
    expect(screen.getByText('完整思考流')).toBeInTheDocument()
    expect(screen.getByTestId('message-reasoning')).toHaveTextContent('完整思考流')
    expect(screen.getByText('老答案')).toBeInTheDocument()
  })

  it('思考中与空会话不显示继续选项', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(createMockState({ chatOpen: true }))
    )
    render(<AIChat />)
    expect(screen.queryByTestId('follow-up-suggestions')).not.toBeInTheDocument()
    cleanup()

    mockRuntime.isPending = true
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector(
        createMockState({
          chatOpen: true,
          aiMessages: [
            { role: 'user', content: '你的技术栈' },
            { role: 'assistant', content: '技术栈回答' },
          ],
        })
      )
    )
    render(<AIChat />)
    expect(screen.queryByTestId('follow-up-suggestions')).not.toBeInTheDocument()
    mockRuntime.isPending = false
  })
})
