import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const 测试目录 = path.dirname(fileURLToPath(import.meta.url))
const 样式源码 = fs.readFileSync(path.resolve(测试目录, '../../index.css'), 'utf-8')
const 组件源码 = fs.readFileSync(path.resolve(测试目录, './AIChat.tsx'), 'utf-8')
const 恒橙类名 = 'xuan-harness-fixed-orange'
const 渐变类名 = 'xuan-harness-rolling-gradient'
const 恒橙色值 = '#ff9500'

describe('顶栏渐变与欢迎行恒橙', () => {
  it('渐变谱系经由CSS变量集中定义', () => {
    for (const 变量 of [
      '--xuan-harness-gradient-duration',
      '--xuan-harness-gradient-from',
      '--xuan-harness-gradient-mid',
      '--xuan-harness-gradient-to',
      '--xuan-harness-gradient-fallback',
    ]) {
      expect(样式源码, `${变量}应集中定义`).toContain(变量)
    }
    expect(样式源码).toContain('@keyframes xuan-harness-gradient-scroll')
    expect(样式源码).toContain('background-position: -300% 0')
  })

  it('恒橙变量与色值集中定义且无动画', () => {
    expect(样式源码).toContain('--xuan-harness-fixed-orange')
    expect(样式源码).toContain(恒橙色值)
    const 恒橙块起 = 样式源码.indexOf(`.${恒橙类名}`)
    expect(恒橙块起).toBeGreaterThan(-1)
    const 恒橙块 = 样式源码.slice(恒橙块起, 恒橙块起 + 300)
    expect(恒橙块).toContain('color: var(--xuan-harness-fixed-orange)')
    expect(恒橙块).not.toContain('animation')
  })

  it('欢迎行整行为单个恒橙span并拼接三段翻译键', () => {
    expect(组件源码).toContain("t('ai.welcomePrefix')")
    expect(组件源码).toContain("t('ai.welcomeTitle')")
    expect(组件源码).toContain("t('ai.welcomeTitleSuffix')")
    expect(组件源码).toContain('data-testid="welcome-full"')
    const 整行下标 = 组件源码.indexOf('data-testid="welcome-full"')
    const 整行段 = 组件源码.slice(Math.max(0, 整行下标 - 200), 整行下标)
    expect(整行段).toContain(恒橙类名)
    expect(整行段).not.toContain(渐变类名)
    expect(组件源码).toContain('aria-hidden="true">✻')
  })

  it('顶栏headerName挂载渐变类', () => {
    const 键下标 = 组件源码.indexOf("t('ai.headerName')")
    expect(键下标).toBeGreaterThan(-1)
    const 类段 = 组件源码.slice(Math.max(0, 键下标 - 400), 键下标)
    expect(类段).toContain(渐变类名)
    expect(类段).not.toContain(恒橙类名)
  })

  it('双色类可挂载', () => {
    render(
      <p>
        <span className={恒橙类名}>✻ Welcome to Xuan Harness!</span>
        <span className={渐变类名}>Xuan Harness</span>
      </p>
    )
    expect(screen.getByText('✻ Welcome to Xuan Harness!')).toHaveClass(恒橙类名)
    expect(screen.getByText('Xuan Harness')).toHaveClass(渐变类名)
  })
})
