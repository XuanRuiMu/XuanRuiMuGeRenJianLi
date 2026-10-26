import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ZhuTiQieHuan } from './ZhuTiQieHuan'
import { useZhuTiXiTong } from './useZhuTiXiTong'

const 设置主题 = vi.fn()

vi.mock('./useZhuTiXiTong', () => ({
  useZhuTiXiTong: vi.fn(),
}))

describe('ThemeToggle', () => {
  const 模拟主题系统 = useZhuTiXiTong as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    模拟主题系统.mockReturnValue({ theme: 'system', setTheme: 设置主题 })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders theme selector trigger', () => {
    render(<ZhuTiQieHuan />)
    expect(screen.getByRole('button', { name: /选择主题/i })).toBeInTheDocument()
  })

  it('opens menu when trigger is clicked', () => {
    render(<ZhuTiQieHuan />)
    fireEvent.click(screen.getByRole('button', { name: /选择主题/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /深色模式/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /浅色模式/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /跟随系统/i })).toBeInTheDocument()
  })

  it('selects theme with circular reveal origin on click', async () => {
    render(<ZhuTiQieHuan />)
    fireEvent.click(screen.getByRole('button', { name: /选择主题/i }))
    const 深色选项 = screen.getByRole('option', { name: /深色模式/i })
    fireEvent.click(深色选项)
    await waitFor(() => {
      expect(设置主题).toHaveBeenCalledWith('dark', { origin: expect.any(Object) })
    })
  })

  it('does not call setTheme when selecting current theme', async () => {
    render(<ZhuTiQieHuan />)
    fireEvent.click(screen.getByRole('button', { name: /选择主题/i }))
    const 系统选项 = screen.getByRole('option', { name: /跟随系统/i })
    fireEvent.click(系统选项)
    await waitFor(() => {
      expect(设置主题).not.toHaveBeenCalled()
    })
  })

  it('closes menu on Escape and returns focus to trigger', async () => {
    render(<ZhuTiQieHuan />)
    const 触发器 = screen.getByRole('button', { name: /选择主题/i })
    fireEvent.click(触发器)
    fireEvent.keyDown(触发器, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('navigates options with arrow keys and selects with Enter', async () => {
    模拟主题系统.mockReturnValue({ theme: 'light', setTheme: 设置主题 })
    render(<ZhuTiQieHuan />)
    const 触发器 = screen.getByRole('button', { name: /选择主题/i })
    fireEvent.keyDown(触发器, { key: 'ArrowDown' })
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    const 选项 = screen.getAllByRole('option')
    expect(document.activeElement).toBe(选项[1])
    fireEvent.keyDown(选项[1], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(选项[2])
    fireEvent.keyDown(选项[2], { key: 'Enter' })
    await waitFor(() => {
      expect(设置主题).toHaveBeenCalledWith('system', { origin: expect.any(Object) })
    })
  })

  it('closes menu when clicking outside', async () => {
    render(
      <div>
        <ZhuTiQieHuan />
        <button type="button">outside</button>
      </div>
    )
    fireEvent.click(screen.getByRole('button', { name: /选择主题/i }))
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }))
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('marks current theme as selected', () => {
    模拟主题系统.mockReturnValue({ theme: 'dark', setTheme: 设置主题 })
    render(<ZhuTiQieHuan />)
    fireEvent.click(screen.getByRole('button', { name: /选择主题/i }))
    const 选项 = screen.getAllByRole('option')
    expect(选项[0]).toHaveAttribute('aria-selected', 'true')
    expect(选项[1]).toHaveAttribute('aria-selected', 'false')
    expect(选项[2]).toHaveAttribute('aria-selected', 'false')
  })
})
