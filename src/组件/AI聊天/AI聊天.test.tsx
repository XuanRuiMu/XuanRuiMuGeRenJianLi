import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react'
import { AILiaoTian } from './AI聊天'
import { useYingYongZhuangTai } from '../../状态/应用状态仓库'
import { t, 翻译数组 } from '../../国际化/翻译'

const 设置聊天打开 = vi.fn()
const 清空AI消息 = vi.fn()
const 执行异步变更 = vi.fn()
const 重置变更 = vi.fn()
const 模拟压缩 = vi.fn()
const 设置AI思考 = vi.fn()
const 设置AI模型 = vi.fn()
const 暂存会话 = vi.fn()
const 恢复会话 = vi.fn()

let 对象地址计数 = 0
const 模拟创建对象地址 = vi.fn(() => {
  对象地址计数 += 1
  return `blob:mock-${对象地址计数}`
})
const 模拟撤销对象地址 = vi.fn()
const 原生CreateObjectURL = URL.createObjectURL
const 原生RevokeObjectURL = URL.revokeObjectURL

let 模拟AI消息表: Array<{ role: 'user' | 'assistant'; content: string; 思考内容?: string }> = []

const 模拟运行时 = vi.hoisted(() => ({ isPending: false, listeners: new Set<() => void>() }))

function 通知模拟状态() {
  模拟运行时.listeners.forEach((监听器) => 监听器())
}

vi.mock('../../状态/应用状态仓库', () => ({
  useYingYongZhuangTai: vi.fn(),
}))

vi.mock('../../智能/聊天服务', async () => {
  const { useEffect, useReducer } = await import('react')
  return {
    useLiaoTianFuWu: () => {
      const [, 强制渲染] = useReducer((x: number) => x + 1, 0)
      useEffect(() => {
        模拟运行时.listeners.add(强制渲染)
        return () => {
          模拟运行时.listeners.delete(强制渲染)
        }
      }, [])
      return {
        mutateAsync: 执行异步变更,
        get isPending() {
          return 模拟运行时.isPending
        },
        reset: 重置变更,
        error: null,
      }
    },
    压缩对话: (...参数: unknown[]) => 模拟压缩(...参数),
    是否中断错误: (错误: unknown) => 错误 instanceof DOMException && 错误.name === 'AbortError',
  }
})

const 模拟应用仓库 = useYingYongZhuangTai as unknown as ReturnType<typeof vi.fn>

function 创建模拟状态(覆盖项: Record<string, unknown> = {}) {
  return {
    聊天打开: false,
    设置聊天打开,
    AI消息表: 模拟AI消息表,
    AI模型: 'deepseek-v4.1-flash-expires-on-0910',
    AI思考强度: 'high',
    暂存的会话: [],
    添加AI消息: vi.fn((消息) => {
      模拟AI消息表.push(消息)
      通知模拟状态()
    }),
    更新AI消息: vi.fn((下标: number, 补丁: Record<string, unknown>) => {
      模拟AI消息表[下标] = { ...模拟AI消息表[下标], ...补丁 }
      通知模拟状态()
    }),
    清空AI消息,
    设置AI模型,
    暂存会话,
    恢复会话,
    设置AI思考,
    ...覆盖项,
  }
}

describe('AIChat', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    模拟AI消息表 = []
    模拟运行时.isPending = false
    对象地址计数 = 0
    URL.createObjectURL = 模拟创建对象地址 as unknown as typeof URL.createObjectURL
    URL.revokeObjectURL = 模拟撤销对象地址 as unknown as typeof URL.revokeObjectURL
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn()
    }
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态()))
  })

  afterEach(() => {
    cleanup()
    URL.createObjectURL = 原生CreateObjectURL
    URL.revokeObjectURL = 原生RevokeObjectURL
    vi.restoreAllMocks()
  })

  it('renders floating button when closed', () => {
    render(<AILiaoTian />)
    expect(screen.getByRole('button', { name: t('ai.title') })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens chat dialog when floating button clicked', () => {
    render(<AILiaoTian />)
    fireEvent.click(screen.getByRole('button', { name: t('ai.title') }))
    expect(设置聊天打开).toHaveBeenCalledWith(true)
  })

  it('renders chat dialog with quick questions when open', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    expect(screen.getByRole('dialog', { name: t('ai.title') })).toBeInTheDocument()
    expect(screen.getByText(t('ai.empty'))).toBeInTheDocument()
    expect(screen.getByTestId('welcome-line')).toBeInTheDocument()
    expect(screen.getByTestId('welcome-full')).toHaveClass('xuan-harness-fixed-orange')
    expect(screen.getByTestId('welcome-full').textContent).toContain(t('ai.welcomePrefix'))
    expect(screen.getByTestId('welcome-full').textContent).toContain(t('ai.welcomeTitle'))
    expect(screen.getByTestId('welcome-full').textContent).toContain(t('ai.welcomeTitleSuffix'))

    const 快捷问题表 = 翻译数组('ai.quickQuestions')
    for (const 问题 of 快捷问题表) {
      expect(screen.getByText(问题)).toBeInTheDocument()
    }
  })

  it('底部状态条显示 >> 模型·思考与切换提示', async () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 状态条 = await screen.findByTestId('chat-status-line')
    expect(状态条).toHaveTextContent('>>')
    expect(状态条).toHaveTextContent('deepseek-v4.1-flash-expires-on-0910 · think high')
    expect(状态条).toHaveTextContent(t('ai.statusCycle'))
  })

  it('/think 按档循环思考强度并输出状态行', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI思考强度: 'high' }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/think' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(设置AI思考).toHaveBeenCalledWith('max')
    expect(screen.getByText(t('ai.thinkLevel').replace('{level}', 'max'))).toBeInTheDocument()
  })

  function 创建图片文件(type = 'image/png', 尺寸 = 8): File {
    const 文件 = new File([new Uint8Array(8)], '测试图片.png', { type })
    if (尺寸 !== 8) {
      Object.defineProperty(文件, 'size', { value: 尺寸 })
    }
    return 文件
  }

  function 获取文件输入(容器: HTMLElement): HTMLInputElement {
    return 容器.querySelector('input[type="file"]') as HTMLInputElement
  }

  it('非法类型的图片被忽略并提示上传失败', async () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    const { container: 容器 } = render(<AILiaoTian />)
    const 文件输入 = 获取文件输入(容器)
    Object.defineProperty(文件输入, 'files', { value: [创建图片文件('text/plain')] })
    fireEvent.change(文件输入)

    expect(screen.getByText(t('ai.imageUploadFailed'))).toBeInTheDocument()
    expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
  })

  it('超过单张大小上限的图片显示红字上传失败缩略图且不发送', async () => {
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    const { container: 容器 } = render(<AILiaoTian />)
    const 文件输入 = 获取文件输入(容器)
    Object.defineProperty(文件输入, 'files', { value: [创建图片文件('image/png', 17 * 1024 * 1024)] })
    fireEvent.change(文件输入)

    const 失败标记 = await screen.findByTestId('pending-images-failed')
    expect(失败标记).toHaveTextContent(t('ai.imageRejected'))
    expect(screen.queryByText(t('ai.imageUploadFailed'))).not.toBeInTheDocument()

    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '带一张坏图' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith({
        消息表: [{ role: 'user', content: '带一张坏图' }],
        signal: expect.any(AbortSignal),
        进度回调: expect.any(Function),
      })
    })
  })

  it('粘贴合法 PNG 进入待发区并可随消息发出', async () => {
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
    fireEvent.paste(输入, { clipboardData: { files: [创建图片文件()] } })
    await waitFor(() => {
      expect(screen.getByTestId('pending-images')).toBeInTheDocument()
    })

    fireEvent.change(输入, { target: { value: '看这张截图' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith({
        消息表: [
          {
            role: 'user',
            content: '看这张截图',
            图片表: [expect.stringMatching(/^data:image\/png;base64,/)],
          },
        ],
        signal: expect.any(AbortSignal),
        进度回调: expect.any(Function),
      })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
    })
    expect(模拟撤销对象地址).toHaveBeenCalledWith('blob:mock-1')
  })

  it('粘贴文本不触发上传且不影响正常输入', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
    fireEvent.paste(输入, { clipboardData: { files: [] } })

    expect(模拟创建对象地址).not.toHaveBeenCalled()
    expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
  })

  it('粘贴 BMP 显示红字「上传失败」且不随消息发出', async () => {
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
    fireEvent.paste(输入, { clipboardData: { files: [创建图片文件('image/bmp')] } })

    const 失败标记 = await screen.findByTestId('pending-images-failed')
    expect(失败标记).toHaveTextContent(t('ai.imageRejected'))

    fireEvent.change(输入, { target: { value: '描述一下' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith({
        消息表: [{ role: 'user', content: '描述一下' }],
        signal: expect.any(AbortSignal),
        进度回调: expect.any(Function),
      })
    })
    await waitFor(() => {
      expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
    })
  })

  it('待发区上限4张对合格与失败图片一并计数，超出提示上传失败', async () => {
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
    fireEvent.paste(输入, { clipboardData: { files: [创建图片文件(), 创建图片文件('image/bmp'), 创建图片文件()] } })
    await waitFor(() => {
      expect(screen.getByTestId('pending-images').children.length).toBe(3)
    })

    fireEvent.paste(输入, { clipboardData: { files: [创建图片文件(), 创建图片文件()] } })
    await waitFor(() => {
      expect(screen.getByText(t('ai.imageUploadFailed'))).toBeInTheDocument()
    })
    expect(screen.getByTestId('pending-images').children.length).toBe(4)
    expect(screen.getAllByTestId('pending-images-failed').length).toBe(1)

    fireEvent.change(输入, { target: { value: '混排发送' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith(
        expect.objectContaining({
          消息表: [
            expect.objectContaining({
              role: 'user',
              content: '混排发送',
              图片表: [
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
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    const { container: 容器 } = render(<AILiaoTian />)
    const 文件输入 = 获取文件输入(容器)
    Object.defineProperty(文件输入, 'files', { value: [创建图片文件(), 创建图片文件()] })
    fireEvent.change(文件输入)
    await waitFor(() => {
      expect(screen.getByTestId('pending-images').children.length).toBe(2)
    })
    expect(模拟创建对象地址).toHaveBeenCalledTimes(2)

    fireEvent.click(screen.getAllByRole('button', { name: t('ai.removeImage') })[0])
    await waitFor(() => expect(模拟撤销对象地址).toHaveBeenCalledTimes(1), { timeout: 5000 })
    expect(模拟撤销对象地址).toHaveBeenCalledWith('blob:mock-1')

    fireEvent.click(screen.getByRole('button', { name: t('ai.reset') }))
    await waitFor(() => expect(模拟撤销对象地址).toHaveBeenCalledTimes(2), { timeout: 5000 })
    expect(模拟撤销对象地址).toHaveBeenCalledWith('blob:mock-2')
  })

  it('两次粘贴读取交错完成时待发图 key 不冲突，移除互不影响', async () => {
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
      模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

      render(<AILiaoTian />)
      const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
      fireEvent.paste(输入, { clipboardData: { files: [创建图片文件()] } })
      fireEvent.paste(输入, { clipboardData: { files: [创建图片文件()] } })
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
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    const { container: 容器 } = render(<AILiaoTian />)
    const 文件输入 = 获取文件输入(容器)
    Object.defineProperty(文件输入, 'files', { value: [创建图片文件()] })

    fireEvent.change(文件输入)
    await waitFor(() => {
      expect(screen.getByTestId('pending-images')).toBeInTheDocument()
    })

    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '图里有什么' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith({
        消息表: [
          {
            role: 'user',
            content: '图里有什么',
            图片表: [expect.stringMatching(/^data:image\/png;base64,/)],
          },
        ],
        signal: expect.any(AbortSignal),
        进度回调: expect.any(Function),
      })
    })
    await waitFor(() => {
      expect(screen.queryByTestId('pending-images')).not.toBeInTheDocument()
    })
  })

  it('does not send message when input is empty', async () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '   ' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(执行异步变更).not.toHaveBeenCalled()
    })
  })

  it('sends message when form submitted', async () => {
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '你是谁' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith({
        消息表: [{ role: 'user', content: '你是谁' }],
        signal: expect.any(AbortSignal),
        进度回调: expect.any(Function),
      })
    })
  })

  it('clears the input box right after sending（对齐 Claude Code）', async () => {
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
    fireEvent.change(输入, { target: { value: '你是谁' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(输入.value).toBe('')
  })

  it('keeps the input editable while busy and queues the message（Claude Code queued 语义）', async () => {
    执行异步变更.mockImplementation(() => new Promise(() => {}))
    模拟运行时.isPending = true
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLInputElement
    expect(输入.disabled).toBe(false)

    fireEvent.change(输入, { target: { value: '第二条消息' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(执行异步变更).not.toHaveBeenCalled()
    expect(screen.getByText(/第二条消息/)).toBeInTheDocument()
    expect(screen.getByText(t('ai.queue.hint'))).toBeInTheDocument()

    act(() => {
      模拟运行时.isPending = false
      通知模拟状态()
    })
    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith({
        消息表: [{ role: 'user', content: '第二条消息' }],
        signal: expect.any(AbortSignal),
        进度回调: expect.any(Function),
      })
    })
  })

  it('/clear 与 /new 都开启新会话（清空历史）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI消息表: [{ role: 'user', content: '旧消息' }] }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/new' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    expect(清空AI消息).toHaveBeenCalled()
    expect(重置变更).toHaveBeenCalled()
  })

  it('/help 列出对齐 Claude Code 的指令清单', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/help' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByText(/\/clear\s*清空对话历史，开始新会话/)).toBeInTheDocument()
    expect(screen.getByText(/\/compact\s*压缩对话历史，保留语义/)).toBeInTheDocument()
    expect(screen.getByText(/\/model\s*查看或切换模型/)).toBeInTheDocument()
    expect(screen.getByText(/\/resume\s*恢复上一次清空前的会话/)).toBeInTheDocument()
  })

  it('/model 无参数列出可用模型', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByTestId('model-picker')).toBeInTheDocument()
    expect(screen.getByTestId('model-option-1')).toHaveTextContent('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.queryByTestId('model-option-2')).not.toBeInTheDocument()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('/model 序号越界报错且不切换', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/model 2' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(设置AI模型).not.toHaveBeenCalled()
    expect(screen.getByText(/未知模型：/)).toBeInTheDocument()
  })

  it('/model 未知模型报错且不切换', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/model 不存在的模型' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(设置AI模型).not.toHaveBeenCalled()
    expect(screen.getByText(/未知模型：/)).toBeInTheDocument()
  })

  it('/model 裸指令开启键盘选择器（❯高亮当前模型）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByTestId('model-picker')).toBeInTheDocument()
    expect(screen.getByText(t('ai.modelPicker.selectTitle'))).toBeInTheDocument()
    expect(screen.getByText(t('ai.modelPicker.confirmHint'))).toBeInTheDocument()
    const 第一行 = screen.getByTestId('model-option-1')
    expect(第一行).toHaveTextContent('❯')
    expect(第一行).toHaveTextContent('deepseek-v4.1-flash-expires-on-0910')
    expect(第一行).toHaveTextContent('✓')
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('选择器内↑/↓移动高亮，⏎确认切换模型', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    fireEvent.keyDown(输入, { key: 'ArrowDown' })
    expect(screen.getByTestId('model-option-1')).toHaveTextContent('❯')

    fireEvent.keyDown(输入, { key: 'ArrowUp' })
    expect(screen.getByTestId('model-option-1')).toHaveTextContent('❯')

    fireEvent.keyDown(输入, { key: 'Enter' })
    expect(设置AI模型).toHaveBeenCalledWith('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.getByText(/已切换模型：deepseek-v4\.1-flash-expires-on-0910/)).toBeInTheDocument()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('选择器内←/→按档步进思考强度而不发送', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI思考强度: 'high' }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    fireEvent.keyDown(输入, { key: 'ArrowRight' })
    expect(设置AI思考).toHaveBeenCalledWith('max')

    fireEvent.keyDown(输入, { key: 'ArrowLeft' })
    expect(设置AI思考).toHaveBeenCalledWith('low')
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('选择器在强度两端钳制（max 处 → 无操作）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI思考强度: 'max' }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    fireEvent.keyDown(输入, { key: 'ArrowRight' })
    expect(设置AI思考).not.toHaveBeenCalled()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('选择器内 Esc 关闭选择器而不最小化面板', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    expect(screen.getByTestId('model-picker')).toBeInTheDocument()

    fireEvent.keyDown(输入, { key: 'Escape' })
    expect(screen.queryByTestId('model-picker')).not.toBeInTheDocument()
    expect(设置聊天打开).not.toHaveBeenCalled()
  })

  it('选择器开启后一旦打字方向键恢复编辑语义', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI思考强度: 'high' }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    fireEvent.change(输入, { target: { value: 'hello' } })
    fireEvent.keyDown(输入, { key: 'ArrowLeft' })
    expect(设置AI思考).not.toHaveBeenCalled()
  })

  it('对话面板阻止 Lenis 滚轮劫持（原生滚动归面板）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    expect(screen.getByTestId('chat-messages').hasAttribute('data-lenis-prevent')).toBe(true)
    expect(screen.getByRole('dialog').hasAttribute('data-lenis-prevent')).toBe(true)
    expect(screen.getByRole('textbox', { name: t('ai.title') }).hasAttribute('data-lenis-prevent')).toBe(true)
  })

  it('/resume 无暂存时提示且不恢复', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, 暂存的会话: [] }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/resume' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(恢复会话).not.toHaveBeenCalled()
    expect(screen.getByText(t('ai.commands.resumeEmpty'))).toBeInTheDocument()
  })

  it('/resume 恢复上一次清空前的会话', () => {
    const 暂存 = [{ role: 'user', content: '旧会话' }]
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, 暂存的会话: 暂存 }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/resume' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(恢复会话).toHaveBeenCalledWith(暂存)
    expect(screen.getByText(t('ai.commands.resumeRestored'))).toBeInTheDocument()
  })

  it('发送在途时渲染会话视图而非主页（根因回归）', () => {
    模拟运行时.isPending = true
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI消息表: [] }))
    )

    render(<AILiaoTian />)

    expect(screen.queryByText(t('ai.empty'))).not.toBeInTheDocument()

    expect(screen.getByText(t('ai.thinking'), { exact: false })).toBeInTheDocument()
    expect(screen.getByText(t('ai.busyHint'))).toBeInTheDocument()
    expect(screen.getByText(t('ai.toolName'))).toBeInTheDocument()
    expect(screen.getByText(t('ai.toolRetrieving'))).toBeInTheDocument()
    expect(screen.queryByText(/✻/)).not.toBeInTheDocument()
  })

  it('首条消息待回答态显示三要素：问题回显+思考计时+Retrieve占位（pending零⏺单转圈）', async () => {
    执行异步变更.mockImplementation(() => new Promise(() => {}))
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '待回答三要素问题' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    act(() => {
      模拟运行时.isPending = true
      通知模拟状态()
    })

    await waitFor(() => {
      expect(screen.getByText('待回答三要素问题')).toBeInTheDocument()
    })

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
    模拟运行时.isPending = true
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '已落定问题' },
            { role: 'assistant', content: '已落定答案' },
          ],
        })
      )
    )

    render(<AILiaoTian />)

    expect(screen.queryByTestId('pending-thinking')).not.toBeInTheDocument()
    expect(screen.queryAllByText('⏺').length).toBe(1)
  })

  it('排队时系统行不被清空且排队仍显示', async () => {
    执行异步变更.mockImplementation(() => new Promise(() => {}))
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI思考强度: 'high' }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/think' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    expect(screen.getByText(t('ai.thinkLevel').replace('{level}', 'max'))).toBeInTheDocument()

    模拟运行时.isPending = true
    通知模拟状态()
    fireEvent.change(输入, { target: { value: '排队第二条' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.thinkLevel').replace('{level}', 'max'))).toBeInTheDocument()
    expect(screen.getByText(/排队第二条/)).toBeInTheDocument()
    expect(screen.getByText(t('ai.queue.hint'))).toBeInTheDocument()
  })

  it('未知指令给出 Claude Code 风格的报错', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/不存在的指令' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByText(/未知指令：\/不存在的指令/)).toBeInTheDocument()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('/compact 在无历史时提示而不调用模型', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/compact' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.commands.compactEmpty'))).toBeInTheDocument()
    expect(模拟压缩).not.toHaveBeenCalled()
  })

  it('/compact 在请求进行中时被闸门拦截（在途回合不得漏压）', () => {
    模拟运行时.isPending = true
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI消息表: [{ role: 'user', content: '旧消息' }] }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/compact' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.commands.compactBusy'))).toBeInTheDocument()
    expect(模拟压缩).not.toHaveBeenCalled()
  })

  it('/clear 后在途请求的迟到响应不得写入新会话（孤儿守护）', async () => {
    let 解决请求: ((value: { message: { role: 'assistant'; content: string } }) => void) | undefined
    执行异步变更.mockImplementation(
      () =>
        new Promise((完成) => {
          解决请求 = 完成
        })
    )
    const 添加AI消息 = vi.fn((消息) => {
      模拟AI消息表.push(消息)
      通知模拟状态()
    })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, 添加AI消息: 添加AI消息 }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '在途问题' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    fireEvent.change(输入, { target: { value: '/clear' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await act(async () => {
      解决请求?.({ message: { role: 'assistant', content: '孤儿响应' } })
      await Promise.resolve()
    })

    const 写入过的内容 = 添加AI消息.mock.calls.map((调用) => 调用[0].content)
    expect(写入过的内容).not.toContain('孤儿响应')
  })

  it('sends quick question when clicked', async () => {
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 快捷问题表 = 翻译数组('ai.quickQuestions')
    fireEvent.click(screen.getByText(快捷问题表[0]))

    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith({
        消息表: [{ role: 'user', content: 快捷问题表[0] }],
        signal: expect.any(AbortSignal),
        进度回调: expect.any(Function),
      })
    })
  })

  it('shows optimistic user message immediately and persists assistant message after success', async () => {
    执行异步变更.mockResolvedValueOnce({ message: { role: 'assistant', content: '回答' } })

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '你是谁' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('你是谁')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('回答')).toBeInTheDocument()
    })
  })

  it('keeps user message and shows error on failure（异步optimistic保留上下文）', async () => {
    执行异步变更.mockRejectedValueOnce(new Error('失败'))

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '你是谁' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText('你是谁')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText(t('ai.error'))).toBeInTheDocument()
    })
    expect(screen.getByText('你是谁')).toBeInTheDocument()
  })

  it('renders existing messages and assistant answer', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '问题' },
            { role: 'assistant', content: '答案' },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByText('问题')).toBeInTheDocument()
    expect(screen.getByText('答案')).toBeInTheDocument()
  })

  it('用户消息图片渲染缩略图，点击开灯箱，Esc 关灯箱且不关面板', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [{ role: 'user', content: '看图', 图片表: ['data:image/png;base64,QUJD'] }],
        })
      )
    )

    render(<AILiaoTian />)
    const 缩略图 = screen.getByTestId('message-images').querySelector('button') as HTMLButtonElement
    fireEvent.click(缩略图)

    const 灯箱 = screen.getByTestId('chat-lightbox')
    expect(灯箱).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId('chat-lightbox')).not.toBeInTheDocument()
    expect(设置聊天打开).not.toHaveBeenCalledWith(false)
  })

  it('clears messages when reset button clicked', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [{ role: 'user', content: '问题' }],
        })
      )
    )

    render(<AILiaoTian />)
    fireEvent.click(screen.getByRole('button', { name: t('ai.reset') }))
    expect(清空AI消息).toHaveBeenCalled()
    expect(重置变更).toHaveBeenCalled()
  })

  it('closes chat when close button clicked', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    fireEvent.click(screen.getByRole('button', { name: t('ai.close') }))
    expect(设置聊天打开).toHaveBeenCalledWith(false)
  })

  it('renders ProjectCard component when assistant message has structured component', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '推荐项目' },
            {
              role: 'assistant',
              content: '推荐暮澜纪元项目',
              组件: { type: 'ProjectCard', 项目编号: 'xrm' },
            },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByTestId('ui-component-ProjectCard')).toBeInTheDocument()
    expect(screen.getByText('暮澜纪元')).toBeInTheDocument()
  })

  it('renders Timeline component when assistant message has timeline component', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '经历' },
            { role: 'assistant', content: '这是我的经历', 组件: { type: 'Timeline', scope: 'experience' } },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
  })

  it('renders ContactLinks component when assistant message has contact component', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '联系' },
            { role: 'assistant', content: '点下方按钮联系', 组件: { type: 'ContactLinks' } },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByTestId('ui-component-ContactLinks')).toBeInTheDocument()
    expect(screen.getByText(t('ai.contactLinks.github'), { exact: false })).toBeInTheDocument()
  })

  it('Esc 空闲时最小化面板（有输入草稿也不例外，用户确认语义）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '未发出的草稿' } })
    fireEvent.keyDown(输入, { key: 'Escape' })
    expect(设置聊天打开).toHaveBeenCalledWith(false)
  })

  it('Esc 为空输入时最小化面板', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.keyDown(输入, { key: 'Escape' })
    expect(设置聊天打开).toHaveBeenCalledWith(false)
  })

  it('Enter 提交、Shift+Enter 不提交只换行', async () => {
    执行异步变更.mockResolvedValue({ message: { role: 'assistant', content: '回答' } })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '第一行第二行' } })
    fireEvent.keyDown(输入, { key: 'Enter', shiftKey: true })
    expect(执行异步变更).not.toHaveBeenCalled()

    fireEvent.keyDown(输入, { key: 'Enter' })
    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalled()
    })
  })

  it('? 展开指令与快捷键帮助', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '?' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.shortcuts').split('\n')[0])).toBeInTheDocument()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('! 开头输入被诚实拦截而不发送', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '!ls -la' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByText(t('ai.shellUnsupported'))).toBeInTheDocument()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('/ 前缀弹出指令补全，Tab 接受选中项', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    expect(screen.queryByTestId('command-palette')).not.toBeInTheDocument()

    fireEvent.change(输入, { target: { value: '/mod' } })
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /\/model/ })).toBeInTheDocument()

    fireEvent.keyDown(输入, { key: 'Tab' })
    expect(输入.value).toBe('/model')
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('补全打开时回车直接执行输入', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/mod' } })
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()

    fireEvent.keyDown(输入, { key: 'Enter' })
    expect(screen.getByText(`${t('ai.commands.didYouMean')} /model`)).toBeInTheDocument()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('补全打开时 Esc 仍最小化面板而不清空输入', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/mod' } })
    expect(screen.getByTestId('command-palette')).toBeInTheDocument()

    fireEvent.keyDown(输入, { key: 'Escape' })
    expect(设置聊天打开).toHaveBeenCalledWith(false)
  })

  it('拼写相近的未知指令给出联想建议', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/modle' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    expect(screen.getByText(`${t('ai.commands.didYouMean')} /model`)).toBeInTheDocument()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('Alt+T 按档循环思考强度', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI思考强度: 'high' }))
    )

    render(<AILiaoTian />)
    fireEvent.keyDown(window, { key: 't', altKey: true })
    expect(设置AI思考).toHaveBeenCalledWith('max')
    expect(screen.getByText(t('ai.thinkLevel').replace('{level}', 'max'))).toBeInTheDocument()
  })

  it('Alt+P 轮换模型并输出切换行', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI模型: 'deepseek-v4.1-flash-expires-on-0910' }))
    )

    render(<AILiaoTian />)
    fireEvent.keyDown(window, { key: 'p', altKey: true })
    expect(设置AI模型).toHaveBeenCalledTimes(1)
    expect(设置AI模型.mock.calls[0][0]).toBe('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.getByText(t('ai.commands.modelSwitchedPrefix'), { exact: false })).toBeInTheDocument()
  })

  it('助手消息渲染 ⏺/⎿ 工具轨迹（含命中数与耗时）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
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

    render(<AILiaoTian />)
    expect(screen.getByText(t('ai.toolName'))).toBeInTheDocument()
    expect(screen.getByText('命中 3 段 · 42ms')).toBeInTheDocument()
    expect(screen.queryByText(t('ai.toolLocalFallback'), { exact: false })).not.toBeInTheDocument()
  })

  it('远程回答末尾标注依据来源（来源来自检索元数据）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '他能胜任文员吗' },
            {
              role: 'assistant',
              content: '答案',
              meta: { 命中数: 3, 耗时毫秒: 42, 本地兜底: false, 依据来源: ['经历', '教育背景'] },
            },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByText('命中 3 段 · 42ms · 依据：经历、教育背景')).toBeInTheDocument()
  })

  it('本地兜底不标注依据来源（预制文案没有真实检索依据）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '问题' },
            {
              role: 'assistant',
              content: '兜底答案',
              meta: { 命中数: 2, 耗时毫秒: 5, 本地兜底: true, 依据来源: ['经历'] },
            },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByText(t('ai.toolLocalFallback'), { exact: false })).toBeInTheDocument()
    expect(screen.queryByText(/依据：/)).not.toBeInTheDocument()
  })

  it('本地兜底消息明确标注本地兜底', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
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

    render(<AILiaoTian />)
    expect(screen.getByText(t('ai.toolLocalFallback'), { exact: false })).toBeInTheDocument()

    expect(screen.getByTestId('tool-detail').textContent).toBe(
      `⎿${t('ai.toolHits')} 0 ${t('ai.toolSegments')} · 5ms · ${t('ai.toolLocalFallback')}`
    )
  })

  it('无元数据的历史消息回退为通用知识库标注', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '问题' },
            { role: 'assistant', content: '老答案' },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByText(t('ai.toolGeneric'))).toBeInTheDocument()
  })

  it('纯空白正文不算已落定：空闲时既无空白工具轨迹也无永久转圈', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '你的技术栈是什么？' },
            {
              role: 'assistant',
              content: ' '.repeat(232),
              思考内容: '用户问技术栈……',
              meta: { 命中数: 2, 耗时毫秒: 2300, 本地兜底: false, 依据来源: ['技术栈'] },
            },
          ],
        })
      )
    )

    render(<AILiaoTian />)

    expect(screen.queryByTestId('pending-thinking')).not.toBeInTheDocument()
    expect(screen.queryByText(/命中 2 段/)).not.toBeInTheDocument()
    expect(screen.queryAllByText('⏺').length).toBe(0)
    expect(screen.queryByTestId('assistant-answer')).not.toBeInTheDocument()

    expect(screen.getByTestId('message-reasoning')).toBeInTheDocument()
  })

  it('无正文但在途时显示思考中占位（区分「还在跑」与「跑完了但没说话」）', () => {
    模拟运行时.isPending = true
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '你的技术栈是什么？' },
            { role: 'assistant', content: '', 思考内容: '用户问技术栈……' },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByTestId('pending-thinking')).toBeInTheDocument()
    expect(screen.getByText(t('ai.toolRetrieving'))).toBeInTheDocument()
  })

  it('正文落定后渲染工具轨迹与正文（trim 判据下正常路径不受影响）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '你的技术栈是什么？' },
            {
              role: 'assistant',
              content: '核心技术栈：Java 25、Node.js、Python。',
              思考内容: '用户问技术栈……',
              meta: { 命中数: 2, 耗时毫秒: 2300, 本地兜底: false, 依据来源: ['技术栈'] },
            },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.queryByTestId('pending-thinking')).not.toBeInTheDocument()
    expect(screen.getByText('命中 2 段 · 2300ms · 依据：技术栈')).toBeInTheDocument()
    expect(screen.getByText(/核心技术栈：Java 25/)).toBeInTheDocument()
    expect(screen.queryAllByText('⏺').length).toBe(1)
  })

  it('长回答流式追加时消息区跟随贴底（回答不会被顶出视野）', async () => {
    const 原生滚动 = Element.prototype.scrollIntoView
    const 滚动记录 = vi.fn()
    Element.prototype.scrollIntoView = 滚动记录
    const 造状态 = (正文: string) =>
      创建模拟状态({
        聊天打开: true,
        AI消息表: [
          { role: 'user', content: '你的技术栈是什么？' },
          { role: 'assistant', content: 正文 },
        ],
      })
    try {
      模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(造状态('核心技术栈：Java 25')))

      const { rerender: 重渲染 } = render(<AILiaoTian />)
      await waitFor(() => {
        expect(滚动记录).toHaveBeenCalledWith({ behavior: 'smooth' })
      })

      模拟运行时.isPending = true
      滚动记录.mockClear()
      act(() => {
        重渲染(<AILiaoTian />)
      })
      await waitFor(() => {
        expect(滚动记录).toHaveBeenCalledWith({ behavior: 'auto' })
      })

      模拟运行时.isPending = false
      滚动记录.mockClear()
      模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
        选择器(造状态('核心技术栈：Java 25、Node.js、Python、React 19、Three.js、Tailwind。'))
      )
      act(() => {
        重渲染(<AILiaoTian />)
      })
      await waitFor(() => {
        expect(滚动记录).toHaveBeenCalledWith({ behavior: 'smooth' })
      })
    } finally {
      Element.prototype.scrollIntoView = 原生滚动
    }
  })

  it('展开思考过程后消息区重新贴底（展开会让正文被顶出视野）', async () => {
    const 原生滚动 = Element.prototype.scrollIntoView
    const 滚动记录 = vi.fn()
    Element.prototype.scrollIntoView = 滚动记录
    try {
      模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
        选择器(
          创建模拟状态({
            聊天打开: true,
            AI消息表: [
              { role: 'user', content: '你的技术栈是什么？' },
              {
                role: 'assistant',
                content: '核心技术栈：Java 25、Node.js、Python。',
                思考内容: '一段很长的思考流'.repeat(20),
              },
            ],
          })
        )
      )

      render(<AILiaoTian />)
      await waitFor(() => {
        expect(滚动记录).toHaveBeenCalled()
      })

      滚动记录.mockClear()
      fireEvent.click(screen.getByTestId('message-reasoning').querySelector('button') as HTMLButtonElement)
      await waitFor(() => {
        expect(screen.getByTestId('message-reasoning-text')).toBeInTheDocument()
        expect(滚动记录).toHaveBeenCalled()
      })
    } finally {
      Element.prototype.scrollIntoView = 原生滚动
    }
  })

  it('正文被 max_tokens 截断时轨迹如实标注（半截回答不许冒充完整回答）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '你做过哪些项目' },
            {
              role: 'assistant',
              content: '我做过暮澜纪元、和我恋爱吧，还有',
              meta: { 命中数: 4, 耗时毫秒: 2500, 本地兜底: false, 截断: true },
            },
          ],
        })
      )
    )

    render(<AILiaoTian />)

    expect(screen.getByTestId('tool-detail')).toHaveTextContent(t('ai.toolTruncated'))
    expect(screen.getByTestId('tool-detail').textContent).toBe(
      `⎿${t('ai.toolHits')} 4 ${t('ai.toolSegments')} · 2500ms · ${t('ai.toolTruncated')}`
    )
  })

  it('预算耗尽导致的兜底标注为「输出预算耗尽」而非「格式异常」', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '教育背景' },
            {
              role: 'assistant',
              content: '我就读于天津仁爱学院。',
              meta: { 命中数: 4, 耗时毫秒: 2500, 本地兜底: true, 回退原因: 'truncated' },
            },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByTestId('tool-detail')).toHaveTextContent(t('ai.toolLocalFallback'))
    expect(screen.getByTestId('tool-detail')).toHaveTextContent(t('ai.toolBudgetExhausted'))
    expect(screen.getByTestId('tool-detail')).not.toHaveTextContent(t('ai.toolFormatError'))
  })

  it('标题栏显示三行式头部（名称版本/模型计费/路径），底部状态只读不可点', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '问题' },
            { role: 'assistant', content: '答案' },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    expect(screen.getByText(t('ai.headerName'))).toBeInTheDocument()
    expect(screen.getByTestId('header-name')).toHaveClass('xuan-harness-rolling-gradient')
    const 标题状态 = screen.getByTestId('chat-header-status')
    expect(标题状态).toHaveTextContent('deepseek-v4.1-flash-expires-on-0910')
    expect(标题状态).toHaveTextContent(t('ai.headerBilling'))
    expect(screen.getByText(t('ai.headerCwd'))).toBeInTheDocument()
    expect(screen.queryByTitle(t('ai.commands.modelHint'))).not.toBeInTheDocument()
  })

  it('↑/↓ 翻看输入历史', async () => {
    执行异步变更.mockResolvedValue({ message: { role: 'assistant', content: '回答' } })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    const 表单 = 输入.closest('form') as HTMLFormElement
    fireEvent.change(输入, { target: { value: '第一个问题' } })
    fireEvent.submit(表单)
    fireEvent.change(输入, { target: { value: '第二个问题' } })
    fireEvent.submit(表单)

    fireEvent.keyDown(输入, { key: 'ArrowUp' })
    expect(输入.value).toBe('第二个问题')
    fireEvent.keyDown(输入, { key: 'ArrowUp' })
    expect(输入.value).toBe('第一个问题')
    fireEvent.keyDown(输入, { key: 'ArrowDown' })
    expect(输入.value).toBe('第二个问题')
  })

  it('/compact 支持聚焦说明并透传给压缩', async () => {
    模拟压缩.mockResolvedValueOnce('聚焦摘要')
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI消息表: [{ role: 'user', content: '旧消息' }] }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '/compact 只看项目' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(模拟压缩).toHaveBeenCalledWith(
        [{ role: 'user', content: '旧消息' }],
        expect.objectContaining({ focus: '只看项目' })
      )
    })
    expect(screen.getByText(t('ai.commands.compacted'))).toBeInTheDocument()
  })

  it('拖拽图片进入待发区', async () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 面板 = screen.getByRole('dialog', { name: t('ai.title') })
    fireEvent.drop(面板, { dataTransfer: { files: [创建图片文件()] } })

    await waitFor(() => {
      expect(screen.getByTestId('pending-images')).toBeInTheDocument()
    })
  })

  it('输入框为多行且上限放宽到 2000', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    expect(输入.tagName).toBe('TEXTAREA')
    expect(输入).toHaveAttribute('maxlength', '2000')
  })

  it('选择器内 s 仅本次会话切换且发送时透传模型', async () => {
    执行异步变更.mockResolvedValue({
      message: { role: 'assistant', content: '答' },
      meta: { 命中数: 0, 耗时毫秒: 1, 本地兜底: false },
    })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    fireEvent.keyDown(输入, { key: 's' })
    expect(设置AI模型).not.toHaveBeenCalled()
    expect(screen.queryByTestId('model-picker')).not.toBeInTheDocument()
    expect(screen.getByTestId('chat-status-line')).toHaveTextContent(t('ai.modelPicker.sessionBadge'))

    fireEvent.change(输入, { target: { value: '你好' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalledWith(
        expect.objectContaining({ 模型: 'deepseek-v4.1-flash-expires-on-0910' })
      )
    })
  })

  it('选择器内数字键直选并持久化', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    fireEvent.keyDown(输入, { key: '1' })
    expect(设置AI模型).toHaveBeenCalledWith('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.queryByTestId('model-picker')).not.toBeInTheDocument()
    expect(执行异步变更).not.toHaveBeenCalled()
  })

  it('Shift+Tab 轮换默认模型', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI模型: 'deepseek-v4.1-flash-expires-on-0910' }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.keyDown(输入, { key: 'Tab', shiftKey: true })
    expect(设置AI模型).toHaveBeenCalledWith('deepseek-v4.1-flash-expires-on-0910')
    expect(screen.getByText(t('ai.commands.modelSwitchedPrefix'), { exact: false })).toBeInTheDocument()
  })

  it('指令补全为双列且最多显示5行', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/' } })

    const 选项 = screen.getAllByRole('option')
    expect(选项.length).toBe(5)
    expect(选项[0]).toHaveTextContent('/help')
    expect(选项[0]).toHaveTextContent(t('ai.cmdDesc.help'))
  })

  it('选择器展示思考强度行与调整提示', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, AI思考强度: 'high' }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    const 选择器 = screen.getByTestId('model-picker')
    expect(选择器).toHaveTextContent('High effort')
    expect(选择器).toHaveTextContent(t('ai.modelPicker.effortAdjust'))
  })

  it('/clear 清除本次会话模型回到默认', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') }) as HTMLTextAreaElement
    fireEvent.change(输入, { target: { value: '/model' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    fireEvent.keyDown(输入, { key: 'ArrowDown' })
    fireEvent.keyDown(输入, { key: 's' })
    expect(screen.getByTestId('chat-status-line')).toHaveTextContent(t('ai.modelPicker.sessionBadge'))

    fireEvent.change(输入, { target: { value: '/clear' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)
    expect(screen.getByTestId('chat-status-line')).not.toHaveTextContent(t('ai.modelPicker.sessionBadge'))
  })

  it('左边缘拖动加宽窗口', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
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
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
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
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
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
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '和我恋爱吧项目用了什么技术栈' },
            { role: 'assistant', content: '用了Express等' },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    const 建议区 = screen.getByTestId('follow-up-suggestions')
    expect(建议区).toBeInTheDocument()
    expect(screen.getByText(t('ai.followUps.label'))).toBeInTheDocument()
    for (const 建议 of 翻译数组('ai.followUps.tech')) {
      expect(screen.getByText(建议)).toBeInTheDocument()
    }
  })

  it('LLM组件信号同样驱动继续选项（羊来ProjectCard场景）', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '羊来是做什么的' },
            {
              role: 'assistant',
              content: '羊来介绍',
              组件: { type: 'ProjectCard', 项目编号: 'yangLai' },
            },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    const 建议区 = screen.getByTestId('follow-up-suggestions')
    expect(建议区).toBeInTheDocument()
    for (const 建议 of 翻译数组('ai.followUps.projectsYangLai')) {
      expect(screen.getByText(建议)).toBeInTheDocument()
    }
  })

  it('点击继续选项会发送该问题', async () => {
    执行异步变更.mockResolvedValue({ message: { role: 'assistant', content: '答' } })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '介绍一下暮澜纪元' },
            { role: 'assistant', content: '暮澜纪元介绍' },
          ],
        })
      )
    )

    render(<AILiaoTian />)
    const 首个建议 = 翻译数组('ai.followUps.projectsXrm')[0]
    fireEvent.click(screen.getByText(首个建议))
    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalled()
    })
  })

  it('FP-04 流式中断/超时分类语义不变：AbortError 不走本地兜底语义', async () => {
    执行异步变更.mockRejectedValueOnce(new DOMException('The operation was aborted.', 'AbortError'))

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '中断语义问题' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByText(t('ai.commands.interrupted'))).toBeInTheDocument()
    })
    expect(screen.queryByText(t('ai.error'))).not.toBeInTheDocument()
  })

  it('FP-04 流式增量经onProgress落到占位助手消息逐字显示', async () => {
    执行异步变更.mockImplementationOnce(
      (入参: { 进度回调?: (增量: { 思考内容: string; content: string }) => void }) => {
        入参.进度回调?.({ 思考内容: '思考一', content: '' })
        入参.进度回调?.({ 思考内容: '思考一思考二', content: '' })
        入参.进度回调?.({ 思考内容: '思考一思考二', content: '{"text":"流式"}' })
        return Promise.resolve({ message: { role: 'assistant', content: '流式', 思考内容: '思考一思考二' } })
      }
    )

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '流式问题' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(screen.getByTestId('message-reasoning')).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByText('流式')).toBeInTheDocument()
    })
  })

  it('FP-R3 占位先行：mutateAsync执行前已有用户+空助手占位', async () => {
    let 执行时消息: Array<{ role: string; content: string }> = []
    执行异步变更.mockImplementationOnce(() => {
      执行时消息 = 模拟AI消息表.map((消息) => ({ role: 消息.role, content: 消息.content }))
      return Promise.resolve({ message: { role: 'assistant', content: '占位后落定' } })
    })
    const 添加AI消息 = vi.fn((消息) => {
      模拟AI消息表.push(消息)
      通知模拟状态()
    })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, 添加AI消息: 添加AI消息 }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '占位先行问题' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(执行异步变更).toHaveBeenCalled()
    })
    expect(执行时消息).toEqual([
      { role: 'user', content: '占位先行问题' },
      { role: 'assistant', content: '' },
    ])
    await waitFor(() => {
      expect(screen.getByText('占位后落定')).toBeInTheDocument()
    })
  })

  it('SSE增量即落屏多帧递增：正文原样逐帧直写，不做任何格式改写', async () => {
    const 更新序列: string[] = []
    let 捕获进度: ((增量: { 思考内容: string; content: string }) => void) | undefined
    执行异步变更.mockImplementationOnce(
      (入参: { 进度回调?: (增量: { 思考内容: string; content: string }) => void }) => {
        捕获进度 = 入参.进度回调
        return new Promise(() => {})
      }
    )
    const 更新AI消息 = vi.fn((下标: number, 补丁: Record<string, unknown>) => {
      模拟AI消息表[下标] = { ...模拟AI消息表[下标], ...补丁 }
      if (typeof 补丁.content === 'string') 更新序列.push(补丁.content as string)
      通知模拟状态()
    })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(创建模拟状态({ 聊天打开: true, 更新AI消息: 更新AI消息 }))
    )

    render(<AILiaoTian />)
    const 输入 = screen.getByRole('textbox', { name: t('ai.title') })
    fireEvent.change(输入, { target: { value: '多帧递增问题' } })
    fireEvent.submit(输入.closest('form') as HTMLFormElement)

    await waitFor(() => {
      expect(捕获进度).toBeDefined()
    })
    await act(async () => {
      捕获进度?.({ 思考内容: '', content: '流' })
      捕获进度?.({ 思考内容: '', content: '流式真' })
      捕获进度?.({ 思考内容: '', content: '流式真逐字' })
    })

    expect(更新序列).toEqual(['流', '流式真', '流式真逐字'])
    await waitFor(() => {
      expect(screen.getByText('流式真逐字')).toBeInTheDocument()
    })
  })

  it('FP-04 落定助手消息保留reasoning且历史无reasoning回退兼容', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '老问题' },
            { role: 'assistant', content: '老答案' },
            { role: 'user', content: '新问题' },
            { role: 'assistant', content: '新答案', 思考内容: '完整思考流' },
          ],
        })
      )
    )

    render(<AILiaoTian />)

    expect(screen.queryByText('完整思考流')).not.toBeInTheDocument()
    expect(screen.getByText('老答案')).toBeInTheDocument()

    const 开关 = screen.getByRole('button', { name: t('ai.reasoningLabel') })
    expect(开关).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(开关)
    expect(开关).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('message-reasoning-text')).toHaveTextContent('完整思考流')
  })

  it('思考中与空会话不显示继续选项', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) => 选择器(创建模拟状态({ 聊天打开: true })))
    render(<AILiaoTian />)
    expect(screen.queryByTestId('follow-up-suggestions')).not.toBeInTheDocument()
    cleanup()

    模拟运行时.isPending = true
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器(
        创建模拟状态({
          聊天打开: true,
          AI消息表: [
            { role: 'user', content: '你的技术栈' },
            { role: 'assistant', content: '技术栈回答' },
          ],
        })
      )
    )
    render(<AILiaoTian />)
    expect(screen.queryByTestId('follow-up-suggestions')).not.toBeInTheDocument()
    模拟运行时.isPending = false
  })
})
