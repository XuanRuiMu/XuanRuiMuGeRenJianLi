import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { ZhuTiQieHuan } from './ZhuTiQieHuan'
import { useZhuTiXiTong } from './useZhuTiXiTong'

const setTheme = vi.fn()

vi.mock('./useZhuTiXiTong', () => ({
  useZhuTiXiTong: vi.fn(),
}))

describe('ThemeToggle', () => {
  const mockUseThemeSystem = useZhuTiXiTong as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseThemeSystem.mockReturnValue({ theme: 'system', setTheme })
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
    const darkOption = screen.getByRole('option', { name: /深色模式/i })
    fireEvent.click(darkOption)
    await waitFor(() => {
      expect(setTheme).toHaveBeenCalledWith('dark', { origin: expect.any(Object) })
    })
  })

  it('does not call setTheme when selecting current theme', async () => {
    render(<ZhuTiQieHuan />)
    fireEvent.click(screen.getByRole('button', { name: /选择主题/i }))
    const systemOption = screen.getByRole('option', { name: /跟随系统/i })
    fireEvent.click(systemOption)
    await waitFor(() => {
      expect(setTheme).not.toHaveBeenCalled()
    })
  })

  it('closes menu on Escape and returns focus to trigger', async () => {
    render(<ZhuTiQieHuan />)
    const trigger = screen.getByRole('button', { name: /选择主题/i })
    fireEvent.click(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  it('navigates options with arrow keys and selects with Enter', async () => {
    mockUseThemeSystem.mockReturnValue({ theme: 'light', setTheme })
    render(<ZhuTiQieHuan />)
    const trigger = screen.getByRole('button', { name: /选择主题/i })
    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    await waitFor(() => {
      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
    const options = screen.getAllByRole('option')
    expect(document.activeElement).toBe(options[1])
    fireEvent.keyDown(options[1], { key: 'ArrowDown' })
    expect(document.activeElement).toBe(options[2])
    fireEvent.keyDown(options[2], { key: 'Enter' })
    await waitFor(() => {
      expect(setTheme).toHaveBeenCalledWith('system', { origin: expect.any(Object) })
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
    mockUseThemeSystem.mockReturnValue({ theme: 'dark', setTheme })
    render(<ZhuTiQieHuan />)
    fireEvent.click(screen.getByRole('button', { name: /选择主题/i }))
    const options = screen.getAllByRole('option')
    expect(options[0]).toHaveAttribute('aria-selected', 'true')
    expect(options[1]).toHaveAttribute('aria-selected', 'false')
    expect(options[2]).toHaveAttribute('aria-selected', 'false')
  })
})
