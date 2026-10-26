import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { render, screen, within, waitFor, cleanup } from '@testing-library/react'
import { ZhanShiBanKuai } from './ZhanShiBanKuai'
import { 解析副标题段 } from './副标题解析'
import { 卡片图标表 } from './KaPianTuBiao'
import {
  归一化位移,
  钳制滚动增量,
  计算份数,
  取缓动时距,
  指数缓动系数,
  是否滚动按键,
  推进一帧,
  缓动时距,
  创建跑马灯控制,
  标记意图滚动,
  同步滚动位置,
  默认跑马灯配置,
  滚动暂停时长,
  最小份数,
  端部余量组数,
  轨道屏幕偏移,
} from './PaoMaDengYinQing'
import { 展示行表, 暮澜链接 } from '../../数据/展示'
import { t } from '../../国际化/翻译'

const 固定高度残留正则 = /(^|\s)([^\s:]+:)*(min-|max-)?h-\[/

describe('ShowcaseSection（12-next-spline-3d HeroParallax 移植）', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders the gradient header with both title lines and subtitle', () => {
    render(<ZhanShiBanKuai />)
    expect(screen.getByText(t('showcase.titleLine1'))).toBeInTheDocument()
    expect(screen.getByText(t('showcase.titleLine2'))).toBeInTheDocument()
    const 副标题 = t('showcase.subtitle')
    const { 前缀段, 后缀段 } = 解析副标题段(副标题)
    const 容器 = document.querySelector('[data-showcase-subtitle]') as HTMLElement
    expect(容器).not.toBeNull()

    expect(容器.textContent).toBe(`${前缀段.join('、')}${后缀段}`)
    expect(容器.textContent).not.toContain('，')
    for (const 短语 of ['设计', '教育', '艺术']) {
      expect(容器.textContent).toContain(短语)
      expect(screen.getByText(短语, { selector: '[data-showcase-subtitle] span span' })).toBeInTheDocument()
    }
  })

  it('副标题三短语各配不同渐变、文本仍来自翻译文件', () => {
    const { container: 渲染容器 } = render(<ZhanShiBanKuai />)
    const 容器 = 渲染容器.querySelector('[data-showcase-subtitle]') as HTMLElement
    const 切分 = 解析副标题段(t('showcase.subtitle'))
    expect(容器.textContent).toBe(`${切分.前缀段.join('、')}${切分.后缀段}`)
    const 渐变段 = Array.from(容器.querySelectorAll('span.bg-clip-text')) as HTMLElement[]
    expect(渐变段.map((段) => 段.textContent)).toEqual(['设计', '教育', '艺术'])
    for (const 段 of 渐变段) {
      expect(段.className).toContain('bg-gradient-to-r')
      expect(段.className).toContain('bg-clip-text')
      expect(段.className).toContain('text-transparent')
    }
    const 去重 = new Set(渐变段.map((段) => 段.className))
    expect(去重.size).toBe(3)
  })

  it('副标题切分结构让后缀可独立替换（FP-05零返工契约）', () => {
    const { 前缀段, 后缀段 } = 解析副标题段(t('showcase.subtitle'))
    expect(前缀段).toEqual(['设计', '教育', '艺术'])
    expect(后缀段).toBe('探索未至之境')
    const 旧切分 = 解析副标题段('设计、教育、艺术，探索未至之境。')
    expect(旧切分.前缀段).toEqual(['设计', '教育', '艺术'])
    expect(旧切分.后缀段).toBe('探索未至之境')
    const { container: 渲染容器 } = render(<ZhanShiBanKuai />)
    const 容器 = 渲染容器.querySelector('[data-showcase-subtitle]') as HTMLElement
    expect(容器.textContent).toBe(`${前缀段.join('、')}${后缀段}`)
  })

  it('FP-05 后缀渲染为 DeepSeek 官网 h1 实测规格（深蓝纯色/居中块/无渐变）', () => {
    const { container: 容器 } = render(<ZhanShiBanKuai />)
    const 后缀 = 容器.querySelector('[data-showcase-subtitle-suffix]') as HTMLElement
    expect(后缀).not.toBeNull()
    expect(后缀.textContent).toBe('探索未至之境')
    expect(后缀.textContent.startsWith('，')).toBe(false)
    expect(后缀.textContent).not.toContain('。')
    expect(后缀.tagName).toBe('SPAN')
    expect(后缀.className).toContain('block')
    expect(后缀.className).toContain('text-center')
    expect(后缀.className).toContain('text-[#152443]')
    expect(后缀.className).toContain('opacity-[0.92]')
    expect(后缀.className).toContain('tracking-[0.2em]')
    expect(后缀.className).toContain('lg:tracking-[0.4em]')
    expect(后缀.className).toContain('leading-[155%]')
    expect(后缀.className).toContain('text-[38px]')
    expect(后缀.className).toContain('md:text-[42px]')
    expect(后缀.className).toContain('lg:text-[46px]')
    expect(后缀.className).toContain('font-normal')
    expect(后缀.className).not.toContain('text-transparent')
    expect(后缀.className).not.toContain('bg-clip-text')
    expect(后缀.className).not.toContain('bg-gradient')
    expect(后缀.className).not.toContain('text-sky-400')
  })

  it('renders every card of all three rows', () => {
    render(<ZhanShiBanKuai />)
    for (const 行 of 展示行表) {
      for (const 卡片 of 行.卡片表) {
        expect(screen.getAllByText(t(卡片.标题键)).length).toBeGreaterThanOrEqual(1)
        expect(screen.getAllByText(t(卡片.描述键)).length).toBeGreaterThanOrEqual(1)
      }
    }

    const 期望值 = 展示行表.reduce((n, r) => n + r.卡片表.length, 0) * 最小份数
    const 卡片表 = document.querySelectorAll('.group\\/card')
    expect(卡片表).toHaveLength(期望值)
  })

  it('keeps original section anchors so navigation still works', () => {
    render(<ZhanShiBanKuai />)
    for (const id of ['education', 'design', 'media']) {
      const 锚点 = document.getElementById(id)
      expect(锚点).not.toBeNull()
    }
  })

  it('ports the neon gradient border design on every card', () => {
    render(<ZhanShiBanKuai />)

    const 期望值 = 展示行表.reduce((n, r) => n + r.卡片表.length, 0) * 最小份数
    const 卡片表 = document.querySelectorAll('.group\\/card')
    expect(卡片表).toHaveLength(期望值)
    for (const 卡片 of 卡片表) {
      const 边框 = 卡片.querySelector('.bg-gradient-to-r') as HTMLElement
      expect(边框).not.toBeNull()
      expect(边框.className).toMatch(/shadow-\[0_0_30px_5px_rgba\(/)
      const 内部 = 边框.firstElementChild as HTMLElement
      expect(内部.className).toContain('bg-black')
    }
  })

  it('renders the bilibili card as an external link and others as plain cards', () => {
    render(<ZhanShiBanKuai />)
    const 已转义标题 = t('showcase.cards.courses.title').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    const 链接表 = screen.getAllByRole('link', { name: new RegExp(已转义标题) })
    expect(链接表.length).toBe(1)
    for (const 链接 of 链接表) {
      expect(链接).toHaveAttribute('target', '_blank')
      expect(链接).toHaveAttribute('href', 'https://space.bilibili.com/383504924')
    }

    const 学位文本节点表 = screen.getAllByText(t('showcase.cards.degree.title'))
    for (const 节点 of 学位文本节点表) {
      const 学位卡片 = 节点.closest('.group\\/card') as HTMLElement
      expect(within(学位卡片).queryByRole('link')).toBeNull()
    }
  })

  it('每排跑马灯使用不可收缩的完整周期副本，轨道由整块 3D 平面包裹', () => {
    const { container: 容器 } = render(<ZhanShiBanKuai />)
    const 轨道表 = 容器.querySelectorAll('.showcase-marquee')
    expect(轨道表).toHaveLength(4)
    for (const 轨道 of 轨道表) {
      expect(轨道.children.length).toBe(最小份数)
      expect(轨道.children[0]).not.toHaveAttribute('inert')
      for (let i = 1; i < 最小份数; i++) expect(轨道.children[i]).toHaveAttribute('inert')
      for (const 周期组 of 轨道.children) {
        expect(周期组.className).toContain('shrink-0')
      }
    }

    const 包裹层 = 容器.querySelector('section[aria-label] > div > div[class*="preserve-3d"]')
    expect(包裹层).not.toBeNull()
    expect((包裹层 as HTMLElement).className).toContain('preserve-3d')
  })

  it('展示区外层无固定高度（高度由内容驱动，消除死白）并保留整体透视', () => {
    const { container: 容器 } = render(<ZhanShiBanKuai />)
    const 外层 = 容器.querySelector('section[aria-label] > div') as HTMLElement
    expect(外层.className).not.toMatch(固定高度残留正则)
    expect(外层.style.height).toBe('')
    expect(外层.className).toContain('[perspective:1000px]')

    expect(外层.className).not.toMatch(/(^|\s)([^\s:]+:)*pb-(\d|\[)/)
  })

  it('固定高度残留正则能抓死白反例且不误伤合法类', () => {
    for (const 残留 of [
      'h-[1750px]',
      'md:h-[2550px]',
      'lg:h-[3000px]',
      'min-h-[2000px]',
      'md:min-h-[2550px]',
      'lg:max-h-[3000px]',
      '2xl:max-h-[300px]',
    ]) {
      expect(`relative flex ${残留} flex-col`).toMatch(固定高度残留正则)
    }

    expect(
      'relative flex flex-col antialiased [perspective:1000px] [transform-style:preserve-3d] z-[100] isolate'
    ).not.toMatch(固定高度残留正则)
    expect('h-32 w-[11rem] shrink-0 md:w-[22rem] lg:h-96 lg:w-[30rem]').not.toMatch(固定高度残留正则)
  })

  it('renders rows statically without inline transform under reduced motion', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia

    render(<ZhanShiBanKuai />)

    const 期望值 = 展示行表.reduce((n, r) => n + r.卡片表.length, 0) * 最小份数
    const 卡片表 = document.querySelectorAll('.group\\/card')
    expect(卡片表).toHaveLength(期望值)
    for (const 卡片 of 卡片表) {
      const 元素 = 卡片 as HTMLElement

      expect(元素.style.transform).toBe('')
    }
    for (const 轨道 of document.querySelectorAll<HTMLElement>('.showcase-marquee')) {
      expect(轨道.style.transform).toBe('')
    }
  })

  it('renders every showcase row anchor so navigation still works', () => {
    render(<ZhanShiBanKuai />)
    for (const 行 of 展示行表) {
      const 锚点 = document.getElementById(行.锚点编号)
      expect(锚点).not.toBeNull()
    }
  })
})

describe('FP-06探索板块重构：8视频与开源仓库可达', () => {
  afterEach(() => {
    cleanup()
  })

  const 视频映射: Array<{ id: string; 标题键: Parameters<typeof t>[0]; href: string }> = [
    { id: 'coding', 标题键: 'showcase.cards.coding.title', href: 'https://www.bilibili.com/video/BV11r421j7UV' },
    { id: 'systems', 标题键: 'showcase.cards.systems.title', href: 'https://www.bilibili.com/video/BV1x36HYjEoA' },
    { id: 'lowlevel', 标题键: 'showcase.cards.lowlevel.title', href: 'https://www.bilibili.com/video/BV1Cw4m1R7SN' },
    { id: 'teaching', 标题键: 'showcase.cards.teaching.title', href: 'https://www.bilibili.com/video/BV1UYGy6rEmj' },
    { id: 'assembly', 标题键: 'showcase.cards.assembly.title', href: 'https://www.bilibili.com/video/BV1ghmfYCELF' },
    { id: 'arch', 标题键: 'showcase.cards.arch.title', href: 'https://www.bilibili.com/video/BV12TVfzfEVu' },
    { id: 'marx', 标题键: 'showcase.cards.marx.title', href: 'https://www.bilibili.com/video/BV11m421K7vq' },
    { id: 'comedy', 标题键: 'showcase.cards.comedy.title', href: 'https://www.bilibili.com/video/BV1vkDGY8Eyw' },
  ]

  const 仓库映射: Array<{ id: string; 标题键: Parameters<typeof t>[0]; href: string; 仓库名?: string }> = [
    {
      id: 'resumeTheater',
      标题键: 'showcase.cards.resumeTheater.title',
      href: 'https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi',
    },
    {
      id: 'repoLoop',
      标题键: 'showcase.cards.repoLoop.title',
      href: 'https://github.com/XuanRuiMu/loop-engineering',
      仓库名: 'loop-engineering',
    },
    {
      id: 'repoLove',
      标题键: 'showcase.cards.repoLove.title',
      href: 'https://github.com/XuanRuiMu/HeWoLianAiBa',
      仓库名: 'HeWoLianAiBa',
    },
    {
      id: 'repoData',
      标题键: 'showcase.cards.repoData.title',
      href: 'https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin',
      仓库名: 'LianAiBaGuanLiZhongXin',
    },
  ]

  it('8个B站视频一一对应可跳转且外链新开', () => {
    render(<ZhanShiBanKuai />)
    expect(视频映射).toHaveLength(8)
    for (const 视频 of 视频映射) {
      const 已转义标题 = t(视频.标题键).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const 链接表 = screen.getAllByRole('link', { name: new RegExp(已转义标题) })
      expect(链接表.length).toBeGreaterThanOrEqual(1)
      for (const 链接 of 链接表) {
        expect(链接).toHaveAttribute('href', 视频.href)
        expect(链接).toHaveAttribute('target', '_blank')
        const rel = 链接.getAttribute('rel') ?? ''
        expect(rel).toContain('noopener')
        expect(rel).toContain('noreferrer')
      }
    }
  })

  it('数据源中8视频href与卡片一一对应', () => {
    const href卡片 = 展示行表.flatMap((行) => 行.卡片表).filter((卡片) => 卡片.href?.includes('bilibili.com/video/BV'))
    expect(href卡片).toHaveLength(8)
    expect(new Set(href卡片.map((卡片) => 卡片.href)).size).toBe(8)
  })

  it('GitHub仓库板块有源且外链新开', () => {
    render(<ZhanShiBanKuai />)
    for (const 仓库 of 仓库映射) {
      if (仓库.仓库名 !== undefined) expect(t(仓库.标题键)).toContain(仓库.仓库名)
      const 已转义标题 = t(仓库.标题键).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const 链接表 = screen.getAllByRole('link', { name: new RegExp(已转义标题) })
      expect(链接表.length).toBeGreaterThanOrEqual(1)
      for (const 链接 of 链接表) {
        expect(链接).toHaveAttribute('href', 仓库.href)
        expect(链接).toHaveAttribute('target', '_blank')
        const rel = 链接.getAttribute('rel') ?? ''
        expect(rel).toContain('noopener')
        expect(rel).toContain('noreferrer')
      }
    }
  })

  it('展示区所有外链统一新开并带安全rel', () => {
    render(<ZhanShiBanKuai />)
    const 链接表 = screen.getAllByRole('link')
    expect(链接表.length).toBeGreaterThanOrEqual(1)
    for (const 链接 of 链接表) {
      expect(链接).toHaveAttribute('target', '_blank')
      const rel = 链接.getAttribute('rel') ?? ''
      expect(rel).toContain('noopener')
      expect(rel).toContain('noreferrer')
    }
  })

  it('保留教育/设计/媒体锚点并新增开源锚点', () => {
    render(<ZhanShiBanKuai />)
    for (const id of ['education', 'design', 'media', 'opensource']) {
      expect(document.getElementById(id)).not.toBeNull()
    }
  })

  it('FP-04：opensource行末羊来卡标题描述链接配图数据驱动', () => {
    const media行 = 展示行表.find((行) => 行.锚点编号 === 'media')
    expect(media行).toBeDefined()
    expect(media行?.卡片表.map((卡片) => 卡片.id)).not.toContain('yanglai')
    expect(media行?.卡片表).toHaveLength(4)
    const opensource行 = 展示行表.find((行) => 行.锚点编号 === 'opensource')
    expect(opensource行).toBeDefined()
    expect(opensource行?.卡片表).toHaveLength(4)
    const 羊来卡 = opensource行?.卡片表.at(-1)
    expect(羊来卡?.id).toBe('yanglai')
    expect(羊来卡?.标题键).toBe('showcase.cards.yanglai.title')
    expect(羊来卡?.描述键).toBe('showcase.cards.yanglai.desc')
    expect(羊来卡?.href).toBe('https://xuanruimu.github.io/YangLai/')
    expect(羊来卡?.图片).toBe('/showcase/羊来.webp')
    expect(t('showcase.cards.yanglai.title')).toBe('羊来')
    expect(t('showcase.cards.yanglai.desc')).toBe('2026年动画电影《羊来》宣传直播间 · 3D互动整蛊舞台')
    expect(fs.existsSync(path.resolve('public/showcase/羊来.webp'))).toBe(true)
    expect(fs.existsSync(path.resolve('public/showcase', `${String.fromCharCode(0x8702, 0x6765)}.webp`))).toBe(false)
  })

  it('每张展示卡都有专属图标映射，缺映射必须显式失败而非静默退化', () => {
    const 全部卡id = 展示行表.flatMap((行) => 行.卡片表.map((卡片) => 卡片.id))
    expect(全部卡id.length).toBeGreaterThan(0)
    const 缺映射 = 全部卡id.filter((id) => !(id in 卡片图标表))
    expect(缺映射).toEqual([])
    expect(全部卡id).toContain('yanglai')
    expect(卡片图标表.yanglai).toBeDefined()
    expect(卡片图标表.yanglai).not.toBe(卡片图标表.toolbox)
  })

  it('FP-04：羊来卡外链新开并带安全rel', () => {
    render(<ZhanShiBanKuai />)
    const 已转义标题 = t('showcase.cards.yanglai.title').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const 链接表 = screen.getAllByRole('link', { name: new RegExp(已转义标题) })
    expect(链接表.length).toBeGreaterThanOrEqual(1)
    for (const 链接 of 链接表) {
      expect(链接).toHaveAttribute('href', 'https://xuanruimu.github.io/YangLai/')
      expect(链接).toHaveAttribute('target', '_blank')
      const rel = 链接.getAttribute('rel') ?? ''
      expect(rel).toContain('noopener')
      expect(rel).toContain('noreferrer')
    }
  })

  it('FP-01：xrmUi与gameWorld展示卡均为指定暮澜链接', () => {
    expect(暮澜链接).toBe('https://github.com/XuanRuiMu/XRMChaJian')
    const 所有卡片 = 展示行表.flatMap((行) => 行.卡片表)
    const 展示暮澜 = 所有卡片.find((卡片) => 卡片.id === 'xrmUi')
    const 游戏世界 = 所有卡片.find((卡片) => 卡片.id === 'gameWorld')
    expect(展示暮澜?.href).toBe('https://github.com/XuanRuiMu/XRMChaJian')
    expect(游戏世界?.href).toBe('https://github.com/XuanRuiMu/XRMChaJian')
  })
})

describe('跑马灯周期归一化', () => {
  it('正负位移收敛到半开区间', () => {
    expect(归一化位移(0, 1200)).toBe(0)
    expect(归一化位移(300, 1200)).toBe(300)
    expect(归一化位移(1200, 1200)).toBe(0)
    expect(归一化位移(1500, 1200)).toBe(300)
    expect(归一化位移(-1, 1200)).toBe(1199)
    expect(归一化位移(-1500, 1200)).toBe(900)
  })

  it('非正周期与非有限位移回零不崩', () => {
    expect(归一化位移(300, 0)).toBe(0)
    expect(归一化位移(300, -5)).toBe(0)
    expect(归一化位移(Number.NaN, 1200)).toBe(0)
  })

  it.each([1, -1] as const)('方向 %i 长序列步进无重置突变', (方向) => {
    const 周期 = 1200
    const 单帧上限 = 50 / 60 + 80 * 0.5 + 1
    let 位移 = 0
    let 速度 = 50
    let 上一视觉 = 0
    for (let i = 0; i < 6000; i++) {
      const 已暂停 = i % 1000 >= 750
      const 滚动增量 = i % 200 < 40 ? ((i * 37) % 320) - 160 : 0
      const 结果 = 推进一帧({
        位移,
        速度,
        周期,
        方向,
        基准速度: 50,
        已暂停,
        滚动暂停中: 已暂停,
        步长秒: 1 / 60,
        滚动增量,
      })
      expect(Number.isFinite(结果.位移)).toBe(true)
      expect(结果.位移).toBeGreaterThanOrEqual(0)
      expect(结果.位移).toBeLessThan(周期)
      const 跳变 = Math.abs(结果.位移 - 上一视觉)
      expect(跳变 <= 单帧上限 || 跳变 >= 周期 - 单帧上限).toBe(true)
      位移 = 结果.位移
      速度 = 结果.速度
      上一视觉 = 结果.位移
    }
  })

  it('非有限滚动增量不污染位移', () => {
    const 结果 = 推进一帧({
      位移: 100,
      速度: 50,
      周期: 1200,
      方向: 1,
      基准速度: 50,
      已暂停: false,
      滚动暂停中: false,
      步长秒: 1 / 60,
      滚动增量: Number.NaN,
    })
    expect(Number.isFinite(结果.位移)).toBe(true)
    expect(结果.位移).toBeGreaterThanOrEqual(0)
    expect(结果.位移).toBeLessThan(1200)
  })
})

describe('跑马灯滚动联动与暂停语义', () => {
  it('滚动增量钳制到对称上限', () => {
    expect(钳制滚动增量(30)).toBe(30)
    expect(钳制滚动增量(-30)).toBe(-30)
    expect(钳制滚动增量(500)).toBe(80)
    expect(钳制滚动增量(-500)).toBe(-80)
    expect(钳制滚动增量(Number.NaN)).toBe(0)
  })

  it('暂停收敛静止但滚动联动仍生效', () => {
    let 速度 = 50
    let 位移 = 0
    for (let i = 0; i < 600; i++) {
      const 结果 = 推进一帧({
        位移,
        速度,
        周期: 1200,
        方向: 1,
        基准速度: 50,
        已暂停: true,
        滚动暂停中: true,
        步长秒: 1 / 60,
        滚动增量: 0,
      })
      位移 = 结果.位移
      速度 = 结果.速度
    }
    expect(速度).toBe(0)
    const 联动 = 推进一帧({
      位移,
      速度,
      周期: 1200,
      方向: 1,
      基准速度: 50,
      已暂停: true,
      滚动暂停中: true,
      步长秒: 1 / 60,
      滚动增量: 60,
    })
    expect(联动.位移).not.toBe(位移)
  })

  it('缓动时距按暂停来源选择', () => {
    expect(取缓动时距(true, true)).toBe(缓动时距.滚动)
    expect(取缓动时距(true, false)).toBe(缓动时距.悬停)
    expect(取缓动时距(false, false)).toBe(缓动时距.恢复)
  })

  it('指数缓动系数边界自洽', () => {
    expect(指数缓动系数(0, 0.7)).toBe(0)
    expect(指数缓动系数(1 / 60, 0)).toBe(0)
    const 快 = 指数缓动系数(1 / 60, 0.18)
    const 慢 = 指数缓动系数(1 / 60, 0.7)
    expect(快).toBeGreaterThan(慢)
    expect(快).toBeGreaterThan(0)
    expect(快).toBeLessThan(1)
  })

  it('滚动按键识别覆盖键盘滚动全通道', () => {
    for (const 按键 of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'PageUp', 'PageDown', 'Home', 'End']) {
      expect(是否滚动按键(按键)).toBe(true)
    }
    expect(是否滚动按键('a')).toBe(false)
    expect(是否滚动按键('Enter')).toBe(false)
  })

  it('副本数钉死字面金值（覆盖视口变化与非法输入）', () => {
    expect(计算份数(1024, 500)).toBe(6)
    expect(计算份数(0, 500)).toBe(3)
    expect(计算份数(1024, 0)).toBe(3)
    expect(计算份数(1440, 4480)).toBe(4)
    expect(计算份数(Number.NaN, 500)).toBe(3)
    for (const 视口 of [320, 768, 1024, 1440, 1920, 3840]) {
      const 份数 = 计算份数(视口, 500)
      expect(份数).toBeGreaterThanOrEqual(3)

      expect(份数 * 500).toBeGreaterThanOrEqual(视口 + 500 + 500)
    }
  })
})

describe('轨道两端余量不变量（真循环根因，字面金值锁死）', () => {
  const 周期 = 1200
  const 视口宽 = 1440

  it('常量与回绕端点字面金值（周期 4480=1440 视口 education 排实测组宽）', () => {
    expect(端部余量组数).toBe(1)
    expect(最小份数).toBe(3)
    expect(轨道屏幕偏移(0, 4480)).toBe(-4480)
    expect(轨道屏幕偏移(4480, 4480)).toBe(-4480)
    expect(轨道屏幕偏移(1, 4480)).toBe(-4481)
    expect(轨道屏幕偏移(4479, 4480)).toBe(-8959)
  })

  it('任意位移下轨道最左完整组恒整体位于视口左缘之外（左余量≥1整组）', () => {
    expect(轨道屏幕偏移(0, 周期)).toBe(-1200)
    for (let i = 0; i <= 24; i++) {
      const 位移 = (i / 24) * 周期
      const 偏移 = 轨道屏幕偏移(位移, 周期)
      expect(偏移).toBeLessThanOrEqual(-1200)
      expect(偏移).toBeGreaterThan(-2400)
    }
  })

  it('可见局部窗口 [位移+周期, 位移+周期+视口宽] 两侧各余 ≥1 周期', () => {
    const 份数 = 计算份数(视口宽, 周期)
    expect(份数).toBe(5)
    for (let i = 0; i <= 24; i++) {
      const 位移 = 归一化位移((i / 24) * 周期, 周期)
      const 窗口左 = 位移 + 周期
      const 窗口右 = 窗口左 + 视口宽
      expect(窗口左).toBeGreaterThanOrEqual(周期)
      expect(窗口右).toBeLessThanOrEqual(份数 * 周期 - 周期)
    }
  })

  it('窄视口与超宽视口均满足余量不变量', () => {
    for (const 视口 of [320, 3840]) {
      const 份数 = 计算份数(视口, 周期)
      for (const 位移 of [0, 周期 / 2, 周期 - 1]) {
        const 窗口右 = 位移 + 视口 + 周期
        expect(窗口右).toBeLessThanOrEqual(份数 * 周期 - 周期)
      }
    }
  })

  it('非法输入回退安全：非正周期回零、非有限位移按零位移处理', () => {
    expect(轨道屏幕偏移(300, 0)).toBe(0)
    expect(轨道屏幕偏移(Number.NaN, 周期)).toBe(-1200)
  })
})

describe('跑马灯布局不变量测量', () => {
  const 原始宽度描述符 = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
  const 原始视口描述符 = Object.getOwnPropertyDescriptor(window, 'innerWidth')

  beforeEach(() => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 })
    Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 500 })
  })

  afterEach(() => {
    if (原始宽度描述符) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', 原始宽度描述符)
    if (原始视口描述符) Object.defineProperty(window, 'innerWidth', 原始视口描述符)
    vi.unstubAllGlobals()
    cleanup()
  })

  it('按布局宽度计算副本数，并以轨道屏幕偏移写入初始 transform', async () => {
    vi.stubGlobal('requestAnimationFrame', () => 0)
    render(<ZhanShiBanKuai />)
    await waitFor(() => {
      const 期望值 = 展示行表.reduce((n, r) => n + r.卡片表.length, 0) * 6
      expect(document.querySelectorAll('.group\\/card')).toHaveLength(期望值)
    })
    const 轨道 = document.querySelector('.showcase-marquee') as HTMLElement
    expect(轨道.children).toHaveLength(6)

    expect(轨道.style.transform).toBe('translate3d(-500px, 0, 0)')
  })
})

describe('FP-03跑马灯启停根因：意图输入与缓冲滚动解耦', () => {
  afterEach(() => {
    cleanup()
  })

  it('意图输入设置暂停锚点=时刻+滚动暂停时长', () => {
    const 控制 = 创建跑马灯控制()
    标记意图滚动(控制, 1000)
    expect(控制.暂停至.current).toBe(1000 + 滚动暂停时长)
  })

  it('默认以当前时间为锚点', () => {
    const 控制 = 创建跑马灯控制()
    const 开始 = performance.now()
    标记意图滚动(控制)
    const 结束 = performance.now()
    expect(控制.暂停至.current).toBeGreaterThanOrEqual(开始 + 滚动暂停时长)
    expect(控制.暂停至.current).toBeLessThanOrEqual(结束 + 滚动暂停时长)
  })

  it('连续意图输入每次重设计时（debounce语义）', () => {
    const 控制 = 创建跑马灯控制()
    标记意图滚动(控制, 1000)
    expect(控制.暂停至.current).toBe(1000 + 滚动暂停时长)
    标记意图滚动(控制, 1500)
    expect(控制.暂停至.current).toBe(1500 + 滚动暂停时长)
  })

  it('缓冲scroll只同步位置不延长暂停（核心回归）', () => {
    const 控制 = 创建跑马灯控制()
    标记意图滚动(控制, 1000)
    const 锚点 = 控制.暂停至.current
    同步滚动位置(控制, 500)
    同步滚动位置(控制, 900)
    同步滚动位置(控制, 1400)
    expect(控制.滚动位置.current).toBe(1400)
    expect(控制.暂停至.current).toBe(锚点)
  })

  it('用户最后一滚后无新意图即按锚点恢复（滚轮停止即计时语义）', () => {
    const 控制 = 创建跑马灯控制()
    标记意图滚动(控制, 1000)
    同步滚动位置(控制, 500)
    const 恢复时刻 = 1000 + 滚动暂停时长
    expect(控制.暂停至.current).toBe(恢复时刻)
    expect(恢复时刻 + 1 < 控制.暂停至.current).toBe(false)
    同步滚动位置(控制, 900)
    expect(控制.暂停至.current).toBe(恢复时刻)
  })

  it('暂停锚点只锚定最后意图时刻，不被缓冲续命', () => {
    const 控制 = 创建跑马灯控制()
    标记意图滚动(控制, 1000)
    标记意图滚动(控制, 1200)
    同步滚动位置(控制, 300)
    标记意图滚动(控制, 1400)
    同步滚动位置(控制, 600)
    同步滚动位置(控制, 900)
    expect(控制.暂停至.current).toBe(1400 + 滚动暂停时长)
    const 恢复时刻 = 1400 + 滚动暂停时长 + 1
    expect(恢复时刻 < 控制.暂停至.current).toBe(false)
  })

  it('同步位置不抢rAF的增量账本', () => {
    const 控制 = 创建跑马灯控制()
    控制.上次滚动位置.current = 100
    同步滚动位置(控制, 160)
    expect(控制.滚动位置.current).toBe(160)
    expect(控制.上次滚动位置.current).toBe(100)
  })

  it('滚动暂停时长可配置，默认与常量一致', () => {
    expect(默认跑马灯配置.滚动暂停时长).toBe(滚动暂停时长)
    const 默认控制 = 创建跑马灯控制()
    expect(默认控制.配置.滚动暂停时长).toBe(滚动暂停时长)
    const 自定义 = 创建跑马灯控制({ 滚动暂停时长: 500 })
    标记意图滚动(自定义, 1000)
    expect(自定义.暂停至.current).toBe(1500)
  })

  it('组件订阅意图与缓冲两类事件并在卸载时清理', () => {
    window.matchMedia = vi.fn().mockImplementation(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia
    const 添加 = vi.spyOn(window, 'addEventListener')
    const 移除 = vi.spyOn(window, 'removeEventListener')
    const { unmount: 卸载 } = render(<ZhanShiBanKuai />)
    expect(添加).toHaveBeenCalledWith('wheel', expect.any(Function), expect.objectContaining({ passive: true }))
    expect(添加).toHaveBeenCalledWith('touchmove', expect.any(Function), expect.objectContaining({ passive: true }))
    expect(添加).toHaveBeenCalledWith('scroll', expect.any(Function), expect.objectContaining({ passive: true }))
    expect(添加).toHaveBeenCalledWith('keydown', expect.any(Function))
    window.dispatchEvent(new WheelEvent('wheel', { bubbles: true, cancelable: true }))
    window.dispatchEvent(new Event('touchmove', { bubbles: true, cancelable: true }))
    window.dispatchEvent(new Event('scroll'))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    卸载()
    expect(移除).toHaveBeenCalledWith('wheel', expect.any(Function))
    expect(移除).toHaveBeenCalledWith('touchmove', expect.any(Function))
    expect(移除).toHaveBeenCalledWith('scroll', expect.any(Function))
    expect(移除).toHaveBeenCalledWith('keydown', expect.any(Function))
    添加.mockRestore()
    移除.mockRestore()
  })
})
