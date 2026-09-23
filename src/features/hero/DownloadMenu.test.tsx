import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { DownloadMenu } from './DownloadMenu'
import { t } from '../../i18n/translations'

const 下载简历 = vi.fn()
const 下载佐证 = vi.fn()

vi.mock('../../lib/resume', () => ({
  downloadResume: () => 下载简历(),
  buildResumeMarkdown: () => '',
}))
vi.mock('../../lib/evidence', () => ({
  佐证材料包路径: '/佐证材料.zip',
  下载佐证材料包: () => 下载佐证(),
}))

function 箭头(): HTMLElement {
  return screen.getByRole('button', { name: t('hero.downloadMenu.trigger') })
}

function 菜单项(名称: string): HTMLElement {
  return screen.getByRole('menuitem', { name: 名称 })
}

function 全部菜单项(): HTMLElement[] {
  return screen.getAllByRole('menuitem')
}

function 焦点(): Element | null {
  return document.activeElement
}

/** 真键盘链路：按键打在「当前获得焦点的节点」上并冒泡，而不是打在容器上——这是上一轮 6 个测试全部用 click 绕过、漏掉致命缺陷的地方。 */
function 按键(键: string) {
  const 目标 = 焦点()
  expect(目标, `按 ${键} 前必须先有焦点节点`).not.toBeNull()
  fireEvent.keyDown(目标 as Element, { key: 键 })
}

describe('DownloadMenu', () => {
  beforeEach(() => {
    下载简历.mockClear()
    下载佐证.mockClear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('主按钮保持原有直接下载简历行为，不经菜单', () => {
    render(<DownloadMenu />)
    fireEvent.click(screen.getByRole('button', { name: t('hero.cta.downloadResume') }))
    expect(下载简历).toHaveBeenCalledTimes(1)
    expect(下载佐证).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('箭头展开菜单，含简历与佐证材料两项', () => {
    render(<DownloadMenu />)
    expect(箭头()).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(箭头())
    expect(箭头()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeTruthy()
    expect(菜单项(t('hero.cta.downloadResume'))).toBeTruthy()
    expect(菜单项(t('hero.downloadMenu.evidence'))).toBeTruthy()
  })

  it('菜单里点佐证材料触发下载并收起', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    fireEvent.click(菜单项(t('hero.downloadMenu.evidence')))
    expect(下载佐证).toHaveBeenCalledTimes(1)
    expect(下载简历).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('Escape 关闭菜单', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('ArrowDown/ArrowUp 在首尾之间循环移动高亮', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    const 项 = () => screen.getAllByRole('menuitem')
    expect(项()[0]).toHaveAttribute('data-active', 'true')
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })
    expect(项()[1]).toHaveAttribute('data-active', 'true')
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' })
    expect(项()[0]).toHaveAttribute('data-active', 'true')
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' })
    expect(项()[1]).toHaveAttribute('data-active', 'true')
  })

  it('键盘展开：焦点从触发按钮进入首个 menuitem', () => {
    render(<DownloadMenu />)
    箭头().focus()
    expect(焦点()).toBe(箭头())
    按键('ArrowDown')
    expect(箭头()).toHaveAttribute('aria-expanded', 'true')
    expect(焦点()).toBe(菜单项(t('hero.cta.downloadResume')))
  })

  it('ArrowUp 从触发按钮展开并聚焦末项', () => {
    render(<DownloadMenu />)
    箭头().focus()
    按键('ArrowUp')
    expect(焦点()).toBe(菜单项(t('hero.downloadMenu.evidence')))
  })

  it('展开后焦点即在首项，且 roving tabindex 只放行高亮项', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    expect(焦点()).toBe(全部菜单项()[0])
    expect(全部菜单项()[0]).toHaveAttribute('tabindex', '0')
    expect(全部菜单项()[1]).toHaveAttribute('tabindex', '-1')
  })

  it('ArrowDown/ArrowUp 真的移动 document.activeElement，而不只是移动高亮', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    按键('ArrowDown')
    expect(焦点()).toBe(菜单项(t('hero.downloadMenu.evidence')))
    expect(全部菜单项()[1]).toHaveAttribute('tabindex', '0')
    expect(全部菜单项()[0]).toHaveAttribute('tabindex', '-1')
    按键('ArrowUp')
    expect(焦点()).toBe(菜单项(t('hero.cta.downloadResume')))
    按键('ArrowDown')
    按键('ArrowDown')
    expect(焦点()).toBe(菜单项(t('hero.cta.downloadResume')))
  })

  it('Home/End 把焦点移到首/末项', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    按键('End')
    expect(焦点()).toBe(菜单项(t('hero.downloadMenu.evidence')))
    按键('Home')
    expect(焦点()).toBe(菜单项(t('hero.cta.downloadResume')))
  })

  it('终审复现路径：点箭头 → ArrowDown → Enter = 恰好一次佐证材料下载，焦点回箭头', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    按键('ArrowDown')
    按键('Enter')
    expect(下载佐证).toHaveBeenCalledTimes(1)
    expect(下载简历).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(焦点()).toBe(箭头())
  })

  it('Enter 落在首个 menuitem 时只下载一次（原生 click 不得重复触发）', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    按键('Enter')
    expect(下载简历).toHaveBeenCalledTimes(1)
    expect(下载佐证).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(焦点()).toBe(箭头())
  })

  it('Space 执行当前高亮项', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    按键('ArrowDown')
    按键(' ')
    expect(下载佐证).toHaveBeenCalledTimes(1)
    expect(下载简历).not.toHaveBeenCalled()
    expect(screen.queryByRole('menu')).toBeNull()
    expect(焦点()).toBe(箭头())
  })

  it('Escape 关闭菜单并把焦点送回箭头', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    expect(焦点()).toBe(全部菜单项()[0])
    按键('Escape')
    expect(screen.queryByRole('menu')).toBeNull()
    expect(焦点()).toBe(箭头())
  })

  it('Tab 关闭菜单', () => {
    render(<DownloadMenu />)
    fireEvent.click(箭头())
    按键('Tab')
    expect(screen.queryByRole('menu')).toBeNull()
  })

  it('点击容器外关闭菜单', () => {
    const { container } = render(
      <div>
        <div data-testid="外部" />
        <DownloadMenu />
      </div>
    )
    fireEvent.click(箭头())
    expect(screen.getByRole('menu')).toBeTruthy()
    fireEvent.pointerDown(container.querySelector('[data-testid="外部"]') as Element)
    expect(screen.queryByRole('menu')).toBeNull()
  })
})
