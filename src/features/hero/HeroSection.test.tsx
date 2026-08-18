import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { HeroSection } from './HeroSection'
import { personalInfo } from '../../data/personalInfo'
import { t } from '../../i18n/translations'

const setChatOpen = vi.fn()
const transitionToSection = vi.fn()

vi.mock('../../store/useAppStore', () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({
      setChatOpen,
      transitionToSection,
    }),
}))

describe('HeroSection', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(() => Promise.resolve()),
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders name, rotating role typewriter and tech stack', () => {
    render(<HeroSection />)
    expect(screen.getByRole('heading', { name: personalInfo.name })).toBeInTheDocument()
    expect(screen.getByTestId('role-typewriter')).toBeInTheDocument()
    expect(screen.getAllByText('Docker').length).toBeGreaterThanOrEqual(1)
  })

  it('renders all CTA buttons', () => {
    render(<HeroSection />)
    expect(screen.getByRole('button', { name: t('hero.cta.copyEmail') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('hero.cta.viewProjects') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('hero.cta.downloadResume') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('hero.cta.openAIChat') })).toBeInTheDocument()
  })

  it('copies email to clipboard and shows copied state', async () => {
    render(<HeroSection />)
    const button = screen.getByRole('button', { name: t('hero.cta.copyEmail') })
    fireEvent.click(button)

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(personalInfo.email)
    })
    expect(screen.getByRole('button', { name: t('hero.copied') })).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(2500)
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: t('hero.cta.copyEmail') })).toBeInTheDocument()
    })
  })

  it('navigates to projects section', () => {
    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: t('hero.cta.viewProjects') }))
    expect(transitionToSection).toHaveBeenCalledWith('projects')
  })

  it('opens AI chat', () => {
    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: t('hero.cta.openAIChat') }))
    expect(setChatOpen).toHaveBeenCalledWith(true)
  })

  it('downloads resume markdown file', () => {
    const createObjectURL = vi.fn(() => 'blob://resume')
    const revokeObjectURL = vi.fn()
    const click = vi.fn()
    const appendChild = vi.spyOn(document.body, 'appendChild')
    const removeChild = vi.spyOn(document.body, 'removeChild')

    Object.assign(URL, { createObjectURL, revokeObjectURL })
    const originalCreateElement = document.createElement
    document.createElement = vi.fn((tagName: string) => {
      const element = originalCreateElement.call(document, tagName)
      if (tagName === 'a') {
        element.click = click
      }
      return element
    }) as typeof document.createElement

    render(<HeroSection />)
    fireEvent.click(screen.getByRole('button', { name: t('hero.cta.downloadResume') }))

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(appendChild).toHaveBeenCalled()
    expect(removeChild).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob://resume')

    document.createElement = originalCreateElement
  })

  it('renders the tech stack (TECH STACK marquee with docker/cloudinary)', () => {
    render(<HeroSection />)
    expect(screen.getAllByText('Docker').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Cloudinary').length).toBeGreaterThanOrEqual(1)
  })
})
