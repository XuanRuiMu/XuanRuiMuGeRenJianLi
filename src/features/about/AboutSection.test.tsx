import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { AboutSection } from './AboutSection'
import type { 打字机选项, 打字机状态 } from './useTypewriter'
import { 关于我介绍行, type 关于我行 } from '../../data/aboutLines'
import { 求职方向 } from '../../data/careerFocus'

/** 取 <p> 的完整 aria-label 序列（逐行可读，不受打字进度影响） */
const 行标签表 = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('p[aria-label]')).map((p) => p.getAttribute('aria-label') ?? '')

/** 取每行 <p> 的 class 列表 */
const 行类名表 = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('p[aria-label]')).map((p) => p.className)

/** 按空白切成类名集合：'text-text-primary' 含子串 'text-primary'，只能用整词比对 */
const 类集 = (类名: string) => 类名.split(/\s+/)

/**
 * 打字机时长契约的可观测点：透传真实 hook（行为不变）同时留下最后一次入参，
 * 让「每字毫秒是否真的按总字数归一」能在不读组件实现的情况下被断言。
 */
const 打字选项捕获 = vi.hoisted(() => ({
  最新: null as { 每字毫秒?: number; 减少动画?: boolean } | null,
}))

type 打字机模块 = { useTypewriter: (选项: 打字机选项) => 打字机状态 }

vi.mock('./useTypewriter', async (导入原模块) => {
  const 原模块: 打字机模块 = await 导入原模块()
  return {
    ...原模块,
    useTypewriter: (选项: 打字机选项) => {
      打字选项捕获.最新 = 选项
      return 原模块.useTypewriter(选项)
    },
  }
})

// 全文件用假定时器：打字机的 setTimeout 链只允许在 act() 内推进，
// 否则定时器会在断言之间自行触发状态更新，用例结果随耗时波动。
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

/**
 * 渲染并冲刷组件在 mount 期用 queueMicrotask 排入的状态更新；
 * 直接 render() 会让这些更新落在 act 作用域外，触发 React act 警告。
 */
async function 渲染关于我(行表?: 关于我行[]) {
  let 容器: HTMLElement = document.createElement('div')
  await act(async () => {
    容器 = render(行表 ? <AboutSection 介绍行表={行表} /> : <AboutSection />).container
  })
  return 容器
}

describe('关于我 - 高度恒定性', () => {
  it('未打字时完整文本已占位渲染（opacity-0 保留高度，文字前后高度一致）', async () => {
    const container = await 渲染关于我()
    // 每行简介 <p> 都带 aria-label（完整句），其 textContent 应已包含该句全文，
    // 即便尚未“打出”也占位存在 → 该行乃至整段高度恒定，无打字期页面抖动。
    const 段落 = container.querySelectorAll('p[aria-label]')
    expect(段落.length).toBeGreaterThan(0)
    const 拼接 = Array.from(段落)
      .map((p) => p.textContent ?? '')
      .join('')
    const 全文 = 关于我介绍行()
      .map((行) => 行.text)
      .join('')
    expect(拼接.replace(/\s+/g, '')).toBe(全文.replace(/\s+/g, ''))
    expect(行标签表(container)).toEqual(关于我介绍行().map((行) => 行.text))
  })

  it('行号按行序输出 01/02/…，与样式无关', async () => {
    const container = await 渲染关于我()
    const 行号 = Array.from(container.querySelectorAll('.tabular-nums')).map((span) => span.textContent ?? '')
    expect(行号).toEqual(['01', '02', '03', '04', '05'])
  })

  it('底部不再有量化指标网格（量化指标移交技能板块）', async () => {
    const container = await 渲染关于我()
    const 文本 = container.textContent ?? ''
    // 「85+」自本轮起也是正文措辞（85+个可复用AI工作流模板），不再是网格专属签名；
    // 网格是否回流以 .grid 容器与其余指标标签为准。
    for (const 指标 of ['400+', '10+', '50+', '自研Java类', 'AI自定义技能']) {
      expect(文本, `关于我板块不得残留「${指标}」`).not.toContain(指标)
    }
    expect(container.querySelector('.grid')).toBeNull()
  })
  it('标题下不存在定位副标题（定位文案只有 career.direction 一个源）', async () => {
    const container = await 渲染关于我()
    const 标题区 = container.querySelector('h2')?.parentElement
    expect(标题区?.querySelector('p')).toBeNull()
    expect(container.textContent ?? '').not.toContain(求职方向())
  })
})

describe('关于我 - 样式由 style 标记决定，与行序号无关', () => {
  it('真实数据：强调样式落在 style=accent 的那一行，技术样式落在 style=tech 的那一行', async () => {
    const 数据 = 关于我介绍行()
    const container = await 渲染关于我()
    const 类名 = 行类名表(container)
    expect(类名).toHaveLength(数据.length)
    数据.forEach((行, 索引) => {
      const 类 = 类集(类名[索引])
      expect(类.includes('text-accent'), `${行.id} 的 text-accent`).toBe(行.style === 'accent')
      expect(类.includes('rotate-[-0.8deg]'), `${行.id} 的旋转`).toBe(行.style === 'accent')
      expect(类.includes('font-mono'), `${行.id} 的等宽字体`).toBe(行.style !== 'accent')
      expect(类.includes('text-primary'), `${行.id} 的技术色`).toBe(行.style === 'tech')
    })
    // 渐变下划线只在 accent 行出现，数量与 accent 行数一致
    expect(container.querySelectorAll('[class*="bg-gradient-to-r"][class*="from-accent"]')).toHaveLength(
      数据.filter((行) => 行.style === 'accent').length
    )
  })

  it('accent 标到第 1 行时，强调样式随标记出现在第 1 行而非第 4 行', async () => {
    const 行表: 关于我行[] = [
      { id: 'rootCause', text: '第一行就强调。', style: 'accent' },
      { id: 'identity', text: '第二行普通。', style: 'normal' },
      { id: 'aiDelivery', text: '第三行技术。', style: 'tech' },
      { id: 'teaching', text: '第四行普通。', style: 'normal' },
    ]
    const container = await 渲染关于我(行表)
    const 类名 = 行类名表(container).map(类集)
    expect(类名[0]).toContain('text-accent')
    expect(类名[0]).toContain('rotate-[-0.8deg]')
    expect(类名[1]).not.toContain('text-accent')
    expect(类名[1]).not.toContain('text-primary')
    expect(类名[2]).toContain('text-primary')
    // 渐变下划线跟随 accent 标记移动到第 1 行
    const 下划线 = container.querySelectorAll('[class*="from-accent"]')
    expect(下划线).toHaveLength(1)
    const 所属行 = 下划线[0].parentElement as HTMLElement
    expect(所属行.querySelector('p[aria-label]')?.getAttribute('aria-label')).toBe('第一行就强调。')
    // 行号仍按位置编号，证明「样式≠下标」
    expect(Array.from(container.querySelectorAll('.tabular-nums')).map((span) => span.textContent)).toEqual([
      '01',
      '02',
      '03',
      '04',
    ])
  })
})

describe('关于我 - 打字机光标', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 测试环境无 matchMedia：显式 mock，消除对 jsdom 能力与用例执行顺序的隐式依赖
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: false,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const 光标数 = (container: HTMLElement) => container.querySelectorAll('.caret-blink').length

  it('打字进行中光标出现在激活行，全部打完后光标消失', async () => {
    const container = await 渲染关于我()
    // 推进若干字符步：打字进行中，应有且仅有一个光标
    act(() => {
      vi.advanceTimersByTime(48 * 3)
    })
    expect(光标数(container)).toBe(1)
    // 跑完全部定时器：全部打完，光标必须消失（不驻留末行）
    act(() => {
      vi.runAllTimers()
    })
    expect(光标数(container)).toBe(0)
  })

  it('光标紧跟已打出的文字（位于已显文本与隐藏占位之间，随打字前移）', async () => {
    const container = await 渲染关于我()
    act(() => {
      vi.advanceTimersByTime(48 * 5)
    })
    const 光标 = container.querySelector('.caret-blink')
    expect(光标).toBeTruthy()
    const 段落 = 光标!.closest('p[aria-label]')!
    const 子元素 = Array.from(段落.children)
    const 光标位置 = 子元素.indexOf(光标 as Element)
    // 光标必须夹在已显文本（索引0）与隐藏占位（opacity-0）之间，才能随打字逐字前移
    expect(光标位置).toBe(1)
    expect((子元素[2] as HTMLElement).className).toContain('opacity-0')
    const 已显长度 = ((子元素[0] as HTMLElement).textContent ?? '').length
    expect(已显长度).toBeGreaterThan(0)
    expect(已显长度 + ((子元素[2] as HTMLElement).textContent ?? '').length).toBe(
      (段落.getAttribute('aria-label') ?? '').length
    )
    // 推进打字：已显文本增长，光标仍夹在两者之间（跟随移动而非钉在行尾）
    act(() => {
      vi.advanceTimersByTime(48 * 5)
    })
    const 光标后移 = container.querySelector('.caret-blink')
    expect(光标后移).toBeTruthy()
    expect(Array.from(段落.children).indexOf(光标后移 as Element)).toBe(1)
    expect(((Array.from(段落.children)[0] as HTMLElement).textContent ?? '').length).toBeGreaterThan(已显长度)
  })

  it('reduced-motion 下直接呈现全文且全程无光标', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: true,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )
    const 容器 = await 渲染关于我()
    act(() => {
      vi.runAllTimers()
    })
    expect(光标数(容器)).toBe(0)
    expect(行标签表(容器)).toEqual(关于我介绍行().map((行) => 行.text))
  })
})

/**
 * 打字机时长契约（回归：正文从约 250 字涨到 503 字后，固定 48ms/字把整段揭示拖到 24 秒）。
 * 时长常量与 AboutSection 的 正文揭示总时长毫秒 / 每字最小毫秒 同值，钉在此处而非读实现。
 */
describe('关于我 - 整段揭示时长恒定', () => {
  const 目标总时长毫秒 = 7000
  const 每字下限毫秒 = 12
  const 正文总字数 = 关于我介绍行().reduce((总和, 行) => 总和 + 行.text.length, 0)

  const 模拟媒体查询 = (命中: boolean) =>
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: 命中,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )

  beforeEach(() => {
    打字选项捕获.最新 = null
    模拟媒体查询(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('每字毫秒由组件显式算出并传入（hook 已无每字默认值可退）', async () => {
    await 渲染关于我()
    expect(打字选项捕获.最新, '组件未把 每字毫秒 传给 useTypewriter').toBeTruthy()
    expect(打字选项捕获.最新!.每字毫秒, '每字毫秒 必须显式传入').toBeTypeOf('number')
  })

  it('总字数 × 每字毫秒 ≈ 目标时长，且不低于每字下限', async () => {
    await 渲染关于我()
    const 每字毫秒 = 打字选项捕获.最新!.每字毫秒!
    expect(每字毫秒, `每字毫秒 不得低于下限 ${每字下限毫秒}ms`).toBeGreaterThanOrEqual(每字下限毫秒)
    expect(
      Math.abs(正文总字数 * 每字毫秒 - 目标总时长毫秒),
      `整段揭示时长应约 ${目标总时长毫秒}ms（实测 ${正文总字数 * 每字毫秒}ms）；若正文超过 ${
        目标总时长毫秒 / 每字下限毫秒
      } 字则由下限接管，两个常量需一并复核`
    ).toBeLessThanOrEqual(目标总时长毫秒 * 0.05)
  })

  it('超长正文被下限托住：不低于每字下限，不退化成一闪而过', async () => {
    const 超长正文: 关于我行[] = ['identity', 'aiTeam', 'aiAssets'].map((id) => ({
      id,
      text: '字'.repeat(1200),
      style: 'normal',
    }))
    await 渲染关于我(超长正文)
    const 每字毫秒 = 打字选项捕获.最新!.每字毫秒!
    expect(每字毫秒, '7000/3600 已低于下限，必须被 每字下限毫秒 托住').toBe(每字下限毫秒)
  })

  it('reduced-motion 路径不变：入参仍为减少动画，渲染直接落到终态全文且无光标', async () => {
    模拟媒体查询(true)
    const 容器 = await 渲染关于我()
    expect(打字选项捕获.最新!.减少动画).toBe(true)
    const 已显文本 = Array.from(容器.querySelectorAll('p[aria-label]')).map(
      (p) => (p.children[0] as HTMLElement).textContent ?? ''
    )
    expect(已显文本).toEqual(关于我介绍行().map((行) => 行.text))
    expect(容器.querySelectorAll('.caret-blink')).toHaveLength(0)
  })
})
