import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
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
  SECTION_ORDER: ['hero', 'about', 'projects', 'experience', 'education', 'design', 'media', 'contact'],
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

  it('renders section navigation items', () => {
    render(<CommandPalette />)
    expect(screen.getByText(t('nav.hero'))).toBeInTheDocument()
    expect(screen.getByText(t('nav.contact'))).toBeInTheDocument()
  })

  it('navigates to section and closes when section item selected', () => {
    render(<CommandPalette />)
    fireEvent.click(screen.getByText(t('nav.projects')))
    expect(transitionToSection).toHaveBeenCalledWith('projects')
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
