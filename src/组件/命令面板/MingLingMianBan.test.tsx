import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { MingLingMianBan } from './MingLingMianBan'
import { useYingYongZhuangTai } from '../../状态/应用状态仓库'
import { 下载简历 } from '../../库/简历'
import { t } from '../../国际化/翻译'
import { 个人信息 } from '../../数据/个人信息'

const 启动视图过渡 = vi.fn((回调: () => void) => {
  回调()
  return Promise.resolve()
})

vi.mock('../../工具/视图过渡', () => ({
  启动视图过渡: (...参数: unknown[]) => 启动视图过渡(参数[0] as () => void),
}))

const 设置命令面板打开 = vi.fn()
const 切换聊天 = vi.fn()
const 切换区块 = vi.fn()
const 设置主题 = vi.fn()

vi.mock('../../状态/应用状态仓库', () => ({
  useYingYongZhuangTai: vi.fn(),
  板块顺序: ['hero', 'about', 'projects', 'skills', 'experience', 'education', 'design', 'media', 'contact'],
}))

vi.mock('../主题切换/useZhuTiXiTong', () => ({
  useZhuTiXiTong: () => ({ theme: 'system', setTheme: 设置主题 }),
}))

vi.mock('../../库/简历', () => ({
  下载简历: vi.fn(),
}))

describe('CommandPalette', () => {
  const 模拟应用仓库 = useYingYongZhuangTai as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    启动视图过渡.mockClear()
    vi.stubGlobal(
      'ResizeObserver',
      class ResizeObserver {
        observe = vi.fn()
        unobserve = vi.fn()
        disconnect = vi.fn()
      }
    )
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = vi.fn()
    }
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器({
        命令面板打开: true,
        设置命令面板打开,
        切换聊天,
        切换到区块: 切换区块,
      })
    )
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders command dialog when open', () => {
    render(<MingLingMianBan />)
    expect(screen.getByRole('dialog', { name: t('command.title') })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(t('command.placeholder'))).toBeInTheDocument()
  })

  it('focuses the search input when the command dialog opens', async () => {
    render(<MingLingMianBan />)
    const 输入 = screen.getByRole('combobox')

    await waitFor(() => {
      expect(document.activeElement).toBe(输入)
      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  it('keeps Tab focus inside the command dialog', async () => {
    render(<MingLingMianBan />)
    const 对话框 = screen.getByRole('dialog', { name: t('command.title') })
    const 输入 = screen.getByRole('combobox')

    await waitFor(() => {
      expect(document.activeElement).toBe(输入)
    })
    fireEvent.keyDown(对话框, { key: 'Tab' })
    expect(document.activeElement).toBe(输入)
    fireEvent.keyDown(对话框, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(输入)
  })

  it('restores the trigger focus after the command dialog closes', async () => {
    const 触发按钮 = document.createElement('button')
    document.body.append(触发按钮)
    触发按钮.focus()
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器({
        命令面板打开: false,
        设置命令面板打开,
        切换聊天,
        切换到区块: 切换区块,
      })
    )

    const { rerender: 重渲染 } = render(<MingLingMianBan />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(设置命令面板打开).toHaveBeenCalledWith(true)

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器({
        命令面板打开: true,
        设置命令面板打开,
        切换聊天,
        切换到区块: 切换区块,
      })
    )
    重渲染(<MingLingMianBan />)
    expect(document.activeElement).toBe(screen.getByRole('combobox'))

    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器({
        命令面板打开: false,
        设置命令面板打开,
        切换聊天,
        切换到区块: 切换区块,
      })
    )
    重渲染(<MingLingMianBan />)
    await waitFor(() => {
      expect(document.activeElement).toBe(触发按钮)
      expect(document.body.style.overflow).toBe('')
    })
    触发按钮.remove()
  })

  it('keeps command palette within the mobile and desktop viewport budget', () => {
    render(<MingLingMianBan />)
    const 对话框 = screen.getByRole('dialog', { name: t('command.title') })
    const 命令 = 对话框.querySelector('[cmdk-root]')
    const 列表 = within(对话框).getByRole('listbox')

    expect(对话框).toHaveClass('pt-[10dvh]', 'sm:pt-[12dvh]')
    expect(命令).toHaveClass('max-h-[calc(90dvh-1.5rem)]', 'sm:max-h-[calc(88dvh-1.5rem)]')
    expect(列表).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto')
  })

  it('renders editor chrome with grouped indexed commands and selected state', () => {
    render(<MingLingMianBan />)
    const 对话框 = screen.getByRole('dialog', { name: t('command.title') })

    expect(within(对话框).getByText(t('command.title'), { selector: 'span' })).toBeInTheDocument()
    expect(within(对话框).getByText(t('command.sections'))).toBeInTheDocument()
    expect(within(对话框).getByText(t('command.actions'))).toBeInTheDocument()
    expect(within(对话框).getByText('ESC')).toBeInTheDocument()
    expect(within(对话框).getByRole('listbox')).toHaveAttribute('aria-label', t('command.suggestions'))
    expect(within(对话框).getAllByRole('option')).toHaveLength(14)
    expect(对话框.querySelectorAll('[data-command-index]')).toHaveLength(14)
    expect(within(对话框).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('supports keyboard navigation and selection', async () => {
    render(<MingLingMianBan />)
    const 输入 = screen.getByRole('combobox')
    const 条目表 = within(screen.getByRole('dialog')).getAllByRole('option')

    await waitFor(() => {
      expect(document.activeElement).toBe(输入)
    })
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' })
    expect(条目表[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' })

    await waitFor(() => {
      expect(切换区块).toHaveBeenCalledWith('about')
    })
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
  })

  it('returns null when closed', () => {
    模拟应用仓库.mockImplementationOnce((选择器: (状态: unknown) => unknown) =>
      选择器({
        命令面板打开: false,
        设置命令面板打开,
        切换聊天,
        切换到区块: 切换区块,
      })
    )
    const { container: 容器 } = render(<MingLingMianBan />)
    expect(容器.firstChild).toBeNull()
  })

  it('closes on Escape key', () => {
    render(<MingLingMianBan />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
    expect(启动视图过渡).not.toHaveBeenCalled()
  })

  it('closes on Cmd+K shortcut when open', () => {
    render(<MingLingMianBan />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
    expect(启动视图过渡).not.toHaveBeenCalled()
  })

  it('opens on Ctrl+K shortcut when closed with view transition', () => {
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器({
        命令面板打开: false,
        设置命令面板打开,
        切换聊天,
        切换到区块: 切换区块,
      })
    )
    render(<MingLingMianBan />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(设置命令面板打开).toHaveBeenCalledWith(true)
    expect(启动视图过渡).toHaveBeenCalledOnce()
  })

  it('cancels a pending open transition when Escape arrives', () => {
    let 待执行: (() => void) | undefined
    启动视图过渡.mockImplementationOnce((回调: () => void) => {
      待执行 = 回调
      return Promise.resolve()
    })
    模拟应用仓库.mockImplementation((选择器: (状态: unknown) => unknown) =>
      选择器({
        命令面板打开: false,
        设置命令面板打开,
        切换聊天,
        切换到区块: 切换区块,
      })
    )
    render(<MingLingMianBan />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(设置命令面板打开).not.toHaveBeenCalledWith(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
    待执行?.()
    expect(设置命令面板打开).not.toHaveBeenCalledWith(true)
  })

  it('renders section navigation items', () => {
    render(<MingLingMianBan />)
    expect(screen.getByText(t('nav.hero'))).toBeInTheDocument()
    expect(screen.getByText(t('nav.contact'))).toBeInTheDocument()
  })

  it('navigates to section and closes when section item selected', async () => {
    render(<MingLingMianBan />)
    fireEvent.click(screen.getByText(t('nav.projects')))
    await waitFor(() => {
      expect(切换区块).toHaveBeenCalledWith('projects')
    })
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
  })

  it('toggles theme when theme item selected', () => {
    render(<MingLingMianBan />)
    fireEvent.click(screen.getByText(t('command.toggleTheme')))
    expect(设置主题).toHaveBeenCalledWith('dark')
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
  })

  it('copies email when copy email item selected', async () => {
    render(<MingLingMianBan />)
    fireEvent.click(screen.getByText(t('command.copyEmail')))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(个人信息.邮箱)
    })
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
  })

  it('copies github when copy github item selected', async () => {
    render(<MingLingMianBan />)
    fireEvent.click(screen.getByText(t('command.copyGithub')))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(个人信息.GitHub)
    })
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
  })

  it('opens AI chat when chat item selected', () => {
    render(<MingLingMianBan />)
    fireEvent.click(screen.getByText(t('command.openChat')))
    expect(切换聊天).toHaveBeenCalled()
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
  })

  it('downloads resume when download item selected', () => {
    render(<MingLingMianBan />)
    fireEvent.click(screen.getByText(t('command.downloadResume')))
    expect(下载简历).toHaveBeenCalled()
    expect(设置命令面板打开).toHaveBeenCalledWith(false)
  })
})
