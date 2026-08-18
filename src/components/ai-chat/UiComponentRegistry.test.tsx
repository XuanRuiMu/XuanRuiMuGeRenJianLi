import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UiComponentRenderer } from './UiComponentRegistry'
import { t } from '../../i18n/translations'

describe('UiComponentRenderer', () => {
  it('renders ProjectCard component', () => {
    render(<UiComponentRenderer component={{ type: 'ProjectCard', projectId: 'xrm' }} />)
    expect(screen.getByTestId('ui-component-ProjectCard')).toBeInTheDocument()
    expect(screen.getByText('已删除的经历')).toBeInTheDocument()
  })

  it('renders Timeline component with experience scope', () => {
    render(<UiComponentRenderer component={{ type: 'Timeline', scope: 'experience' }} />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
    expect(screen.getByText(t('experience.title'))).toBeInTheDocument()
  })

  it('renders Timeline component with experience scope by default', () => {
    render(<UiComponentRenderer component={{ type: 'Timeline' }} />)
    expect(screen.getByTestId('ui-component-Timeline')).toBeInTheDocument()
    expect(screen.getByText(t('experience.title'))).toBeInTheDocument()
  })

  it('renders ContactForm component', () => {
    render(<UiComponentRenderer component={{ type: 'ContactForm' }} />)
    expect(screen.getByTestId('ui-component-ContactForm')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(t('contact.form.name'))).toBeInTheDocument()
  })

  it('submits ContactForm with valid input', () => {
    render(<UiComponentRenderer component={{ type: 'ContactForm' }} />)
    fireEvent.change(screen.getByPlaceholderText(t('contact.form.name')), { target: { value: '张三' } })
    fireEvent.change(screen.getByPlaceholderText(t('contact.form.email')), {
      target: { value: 'zhangsan@example.com' },
    })
    fireEvent.change(screen.getByPlaceholderText(t('contact.form.message')), {
      target: { value: '这是一条有效的留言内容' },
    })
    fireEvent.click(screen.getByRole('button', { name: t('contact.form.submit') }))
    expect(screen.getByText(t('contact.form.success'))).toBeInTheDocument()
  })
})
