import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup, within } from '@testing-library/react'
import { CommandPalette } from './CommandPalette'
import { useAppStore } from '../../store/useAppStore'
import { downloadResume } from '../../lib/resume'
import { t } from '../../i18n/translations'
import { personalInfo } from '../../data/personalInfo'

const startViewTransition = vi.fn((callback: () => void) => {
  callback()
  return Promise.resolve()
})

vi.mock('../../utils/viewTransition', () => ({
  startViewTransition: (...args: unknown[]) => startViewTransition(args[0] as () => void),
}))

const setCommandOpen = vi.fn()
const toggleChat = vi.fn()
const transitionToSection = vi.fn()
const setTheme = vi.fn()

vi.mock('../../store/useAppStore', () => ({
  useAppStore: vi.fn(),
  SECTION_ORDER: ['hero', 'about', 'projects', 'skills', 'experience', 'education', 'design', 'media', 'contact'],
}))

vi.mock('../theme-toggle/useThemeSystem', () => ({
  useThemeSystem: () => ({ theme: 'system', setTheme }),
}))

vi.mock('../../lib/resume', () => ({
  downloadResume: vi.fn(),
}))

describe('CommandPalette', () => {
  const mockUseAppStore = useAppStore as unknown as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    startViewTransition.mockClear()
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
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        commandOpen: true,
        setCommandOpen,
        toggleChat,
        transitionToSection,
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
    render(<CommandPalette />)
    expect(screen.getByRole('dialog', { name: t('command.title') })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(t('command.placeholder'))).toBeInTheDocument()
  })

  it('focuses the search input when the command dialog opens', async () => {
    render(<CommandPalette />)
    const input = screen.getByRole('combobox')

    await waitFor(() => {
      expect(document.activeElement).toBe(input)
      expect(document.body.style.overflow).toBe('hidden')
    })
  })

  it('keeps Tab focus inside the command dialog', async () => {
    render(<CommandPalette />)
    const dialog = screen.getByRole('dialog', { name: t('command.title') })
    const input = screen.getByRole('combobox')

    await waitFor(() => {
      expect(document.activeElement).toBe(input)
    })
    fireEvent.keyDown(dialog, { key: 'Tab' })
    expect(document.activeElement).toBe(input)
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(input)
  })

  it('restores the trigger focus after the command dialog closes', async () => {
    const 触发按钮 = document.createElement('button')
    document.body.append(触发按钮)
    触发按钮.focus()
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        commandOpen: false,
        setCommandOpen,
        toggleChat,
        transitionToSection,
      })
    )

    const { rerender } = render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(setCommandOpen).toHaveBeenCalledWith(true)

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        commandOpen: true,
        setCommandOpen,
        toggleChat,
        transitionToSection,
      })
    )
    rerender(<CommandPalette />)
    expect(document.activeElement).toBe(screen.getByRole('combobox'))

    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        commandOpen: false,
        setCommandOpen,
        toggleChat,
        transitionToSection,
      })
    )
    rerender(<CommandPalette />)
    await waitFor(() => {
      expect(document.activeElement).toBe(触发按钮)
      expect(document.body.style.overflow).toBe('')
    })
    触发按钮.remove()
  })

  it('keeps command palette within the mobile and desktop viewport budget', () => {
    render(<CommandPalette />)
    const dialog = screen.getByRole('dialog', { name: t('command.title') })
    const command = dialog.querySelector('[cmdk-root]')
    const list = within(dialog).getByRole('listbox')

    expect(dialog).toHaveClass('pt-[10dvh]', 'sm:pt-[12dvh]')
    expect(command).toHaveClass('max-h-[calc(90dvh-1.5rem)]', 'sm:max-h-[calc(88dvh-1.5rem)]')
    expect(list).toHaveClass('min-h-0', 'flex-1', 'overflow-y-auto')
  })

  it('renders editor chrome with grouped indexed commands and selected state', () => {
    render(<CommandPalette />)
    const dialog = screen.getByRole('dialog', { name: t('command.title') })

    expect(within(dialog).getByText(t('command.title'), { selector: 'span' })).toBeInTheDocument()
    expect(within(dialog).getByText(t('command.sections'))).toBeInTheDocument()
    expect(within(dialog).getByText(t('command.actions'))).toBeInTheDocument()
    expect(within(dialog).getByText('ESC')).toBeInTheDocument()
    expect(within(dialog).getByRole('listbox')).toHaveAttribute('aria-label', t('command.suggestions'))
    expect(within(dialog).getAllByRole('option')).toHaveLength(14)
    expect(dialog.querySelectorAll('[data-command-index]')).toHaveLength(14)
    expect(within(dialog).getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true')
  })

  it('supports keyboard navigation and selection', async () => {
    render(<CommandPalette />)
    const input = screen.getByRole('combobox')
    const items = within(screen.getByRole('dialog')).getAllByRole('option')

    await waitFor(() => {
      expect(document.activeElement).toBe(input)
    })
    fireEvent.keyDown(document.activeElement as Element, { key: 'ArrowDown' })
    expect(items[1]).toHaveAttribute('aria-selected', 'true')
    fireEvent.keyDown(document.activeElement as Element, { key: 'Enter' })

    await waitFor(() => {
      expect(transitionToSection).toHaveBeenCalledWith('about')
    })
    expect(setCommandOpen).toHaveBeenCalledWith(false)
  })

  it('returns null when closed', () => {
    mockUseAppStore.mockImplementationOnce((selector: (state: unknown) => unknown) =>
      selector({
        commandOpen: false,
        setCommandOpen,
        toggleChat,
        transitionToSection,
      })
    )
    const { container } = render(<CommandPalette />)
    expect(container.firstChild).toBeNull()
  })

  it('closes on Escape key', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(setCommandOpen).toHaveBeenCalledWith(false)
    expect(startViewTransition).not.toHaveBeenCalled()
  })

  it('closes on Cmd+K shortcut when open', () => {
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(setCommandOpen).toHaveBeenCalledWith(false)
    expect(startViewTransition).not.toHaveBeenCalled()
  })

  it('opens on Ctrl+K shortcut when closed with view transition', () => {
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        commandOpen: false,
        setCommandOpen,
        toggleChat,
        transitionToSection,
      })
    )
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(setCommandOpen).toHaveBeenCalledWith(true)
    expect(startViewTransition).toHaveBeenCalledOnce()
  })

  it('cancels a pending open transition when Escape arrives', () => {
    let 待执行: (() => void) | undefined
    startViewTransition.mockImplementationOnce((回调: () => void) => {
      待执行 = 回调
      return Promise.resolve()
    })
    mockUseAppStore.mockImplementation((selector: (state: unknown) => unknown) =>
      selector({
        commandOpen: false,
        setCommandOpen,
        toggleChat,
        transitionToSection,
      })
    )
    render(<CommandPalette />)
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true })
    expect(setCommandOpen).not.toHaveBeenCalledWith(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(setCommandOpen).toHaveBeenCalledWith(false)
    待执行?.()
    expect(setCommandOpen).not.toHaveBeenCalledWith(true)
  })

  it('renders section navigation items', () => {
    render(<CommandPalette />)
    expect(screen.getByText(t('nav.hero'))).toBeInTheDocument()
    expect(screen.getByText(t('nav.contact'))).toBeInTheDocument()
  })

  it('navigates to section and closes when section item selected', async () => {
    render(<CommandPalette />)
    fireEvent.click(screen.getByText(t('nav.projects')))
    await waitFor(() => {
      expect(transitionToSection).toHaveBeenCalledWith('projects')
    })
    expect(setCommandOpen).toHaveBeenCalledWith(false)
  })

  it('toggles theme when theme item selected', () => {
    render(<CommandPalette />)
    fireEvent.click(screen.getByText(t('command.toggleTheme')))
    expect(setTheme).toHaveBeenCalledWith('dark')
    expect(setCommandOpen).toHaveBeenCalledWith(false)
  })

  it('copies email when copy email item selected', async () => {
    render(<CommandPalette />)
    fireEvent.click(screen.getByText(t('command.copyEmail')))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(personalInfo.email)
    })
    expect(setCommandOpen).toHaveBeenCalledWith(false)
  })

  it('copies github when copy github item selected', async () => {
    render(<CommandPalette />)
    fireEvent.click(screen.getByText(t('command.copyGithub')))
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(personalInfo.github)
    })
    expect(setCommandOpen).toHaveBeenCalledWith(false)
  })

  it('opens AI chat when chat item selected', () => {
    render(<CommandPalette />)
    fireEvent.click(screen.getByText(t('command.openChat')))
    expect(toggleChat).toHaveBeenCalled()
    expect(setCommandOpen).toHaveBeenCalledWith(false)
  })

  it('downloads resume when download item selected', () => {
    render(<CommandPalette />)
    fireEvent.click(screen.getByText(t('command.downloadResume')))
    expect(downloadResume).toHaveBeenCalled()
    expect(setCommandOpen).toHaveBeenCalledWith(false)
  })
})
