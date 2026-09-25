import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, act, cleanup, fireEvent } from '@testing-library/react'
import { SkillsSection } from './SkillsSection'
import { 量化指标, 技能组表 } from '../../data/skillGroups'
import { radarAxes, dimensionLabelKey, dimensionBasisKey } from '../../data/radar'
import { t } from '../../i18n/translations'

/** 数字滚动只允许在 act 内推进；这里冻结 rAF 让终态文本稳定可读 */
async function 渲染技能板块({ 减少动画 = false }: { 减少动画?: boolean } = {}) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    () =>
      ({
        matches: 减少动画,
        media: '(prefers-reduced-motion: reduce)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList
  )
  const 帧调度 = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0)
  let 容器: HTMLElement = document.createElement('div')
  await act(async () => {
    容器 = render(<SkillsSection />).container
  })
  帧调度.mockRestore()
  return { 容器 }
}

const 指标节点 = (容器: HTMLElement) => Array.from(容器.querySelectorAll('[data-skill-metric]'))
const 分组节点 = (容器: HTMLElement) => Array.from(容器.querySelectorAll('[data-skill-group]'))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('FP-03 技能板块 - 量化指标', () => {
  it('板块顶部渲染 4 张指标卡，数字与标签逐项对上（减少动画下直接终态）', async () => {
    const { 容器 } = await 渲染技能板块({ 减少动画: true })
    const 卡表 = 指标节点(容器)
    expect(卡表.map((卡) => 卡.getAttribute('data-skill-metric'))).toEqual(量化指标().map((指标) => 指标.id))
    量化指标().forEach((指标, 索引) => {
      const 文本 = 卡表[索引].textContent ?? ''
      expect(文本).toContain(指标.value)
      expect(文本).toContain(指标.label)
    })
  })

  it('滚动动画开启且未进视口时先显示 0 形态，不提前剧透终态', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: false,
          media: '(prefers-reduced-motion: reduce)',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )
    // 不提供 IntersectionObserver：组件会走 queueMicrotask 置启动；
    // 这里冻结 rAF，动画不推进，用来观察「启动前 / 启动后首帧」的显示形态。
    let 帧队列: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((帧) => {
      帧队列.push(帧)
      return 0
    })
    const 原IO = window.IntersectionObserver
    // @ts-expect-error 故意移除以固定 start 置位路径
    delete window.IntersectionObserver

    let 容器: HTMLElement = document.createElement('div')
    await act(async () => {
      容器 = render(<SkillsSection />).container
    })

    const 形态 = () =>
      量化指标().map((指标) => {
        const 数字 = 容器.querySelector(`[data-skill-metric="${指标.id}"]`)?.textContent ?? ''
        return 数字.replace(指标.label, '').trim()
      })

    // 启动微任务落地后、动画帧未跑：仍是 0 形态
    await act(async () => {})
    expect(形态()).toEqual(['0+', '0+', '0', '0年'])

    window.IntersectionObserver = 原IO
    帧队列 = []
  })

  it('四条说明文案已删除：标题下无副标题、指标与雷达下无免责说明', async () => {
    const { 容器 } = await 渲染技能板块()
    const 正文 = 容器.textContent ?? ''
    for (const 说明 of [
      '量化结果、能力清单与雷达自评，均为本人实际做过的事，面试可现场演示。',
      '量化结果',
      '数字来自已上线项目与长期运维实践。',
      '雷达为基于真实项目的自评熟练度；数字为能力档位，每条依据见对应说明。',
    ]) {
      expect(正文, `技能板块不得残留说明文案「${说明}」`).not.toContain(说明)
    }
    const 标题区 = 容器.querySelector('h2')?.parentElement
    expect(标题区?.querySelector('p'), 'Section 标题下不得再有副标题').toBeNull()
  })

  it('指标卡位于能力分组与雷达之前', async () => {
    const { 容器 } = await 渲染技能板块()
    const 锚点表 = ['[data-skill-metrics]', '[data-skill-group]', 'svg'].map((选择器) => {
      const 节点 = 容器.querySelector(选择器)
      expect(节点, `技能板块缺少数序锚点 ${选择器}`).not.toBeNull()
      return 节点!
    })
    const 在后 = Node.DOCUMENT_POSITION_FOLLOWING
    expect(锚点表[0].compareDocumentPosition(锚点表[1]) & 在后).toBe(在后)
    expect(锚点表[1].compareDocumentPosition(锚点表[2]) & 在后).toBe(在后)
  })

  it('减少动画偏好下直接呈现终态数字', async () => {
    const { 容器 } = await 渲染技能板块({ 减少动画: true })
    for (const 指标 of 量化指标()) {
      expect((容器.textContent ?? '').includes(指标.value)).toBe(true)
    }
  })

  /**
   * 滚动时长的行为守卫：技能板块的时长在调用点显式声明为 1280ms，
   * 半程（640ms）必须仍在滚动、满程（1280ms）必须已到终态。
   * 谁把时长改回旧的 640ms，半程断言即红；改成别的时间，满程断言即红。
   */
  it('指标数字滚动时长 1280ms：半程仍在滚动，满程落到终态', async () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      () =>
        ({
          matches: false,
          media: '(prefers-reduced-motion: reduce)',
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList
    )
    let 时钟 = 0
    vi.spyOn(performance, 'now').mockImplementation(() => 时钟)
    let 帧队列: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((帧) => {
      帧队列.push(帧)
      return 0
    })

    let 容器: HTMLElement = document.createElement('div')
    await act(async () => {
      容器 = render(<SkillsSection />).container
    })
    const 推进到 = async (时间ms: number) => {
      时钟 = 时间ms
      const 本批 = 帧队列
      帧队列 = []
      await act(async () => {
        for (const 帧 of 本批) 帧(时间ms)
      })
    }

    // 第一帧：各卡记录各自的起始时间
    await 推进到(0)
    await 推进到(640)
    const 半程 = 容器.querySelector('[data-skill-metric="javaClasses"]')?.textContent ?? ''
    expect(半程).not.toBe('')
    expect(半程).not.toContain('400+')

    await 推进到(1280)
    for (const 指标 of 量化指标()) {
      const 文本 = 容器.querySelector(`[data-skill-metric="${指标.id}"]`)?.textContent ?? ''
      expect(文本, `${指标.id} 应在 1280ms 处到达终态`).toContain(指标.value)
    }
  })
})

describe('FP-03 技能板块 - 能力分组', () => {
  it('渲染 4 组且 AI Agent能力排在第一组', async () => {
    const { 容器 } = await 渲染技能板块()
    const 组表 = 分组节点(容器)
    const 数据 = 技能组表()
    expect(组表.map((组) => 组.getAttribute('data-skill-group'))).toEqual(数据.map((组) => 组.id))
    expect(组表[0].getAttribute('data-skill-group')).toBe('aiAgent')
    expect(组表[0].querySelector('h4')?.textContent).toBe('AI Agent能力')
    expect(数据[0].items).toHaveLength(5)
  })

  it('每组的陈述句与标签全部渲染，无空组', async () => {
    const { 容器 } = await 渲染技能板块()
    const 组表 = 分组节点(容器)
    技能组表().forEach((组, 索引) => {
      const 节点 = 组表[索引]
      expect(节点.querySelector('h4')?.textContent).toBe(组.label)
      expect(节点.querySelector('p')?.textContent).toBe(组.description)
      const 陈述 = Array.from(节点.querySelectorAll('ul li')).filter((项) => !项.hasAttribute('data-skill-tag'))
      expect(陈述.map((项) => 项.textContent)).toEqual(组.items)
      const 标签 = Array.from(节点.querySelectorAll('[data-skill-tag]')).map((项) => 项.getAttribute('data-skill-tag'))
      expect(标签).toEqual(组.tags)
    })
  })
})

describe('FP-03 技能板块 - 雷达与残留', () => {
  it('悬停技能点时气泡仅显示该技能的详细阐述', async () => {
    const { 容器 } = await 渲染技能板块()
    expect(容器.querySelector('[role="tooltip"]')).toBeNull()

    const 点 = 容器.querySelector('[data-radar-point="aiAgent"]')
    expect(点).not.toBeNull()
    fireEvent.mouseEnter(点!)

    const 气泡 = 容器.querySelector('[role="tooltip"]')
    const 轴 = radarAxes.find((项) => 项.id === 'aiAgent')!
    expect(气泡?.textContent).toBe(t(`data.radar.dimensions.${轴.id}.description` as never))
    expect(气泡?.textContent).not.toContain(t(`data.radar.dimensions.${轴.id}.basis` as never))
    expect(点?.getAttribute('aria-describedby')).toBe(气泡?.getAttribute('id'))
  })

  it('键盘聚焦优先于鼠标悬停，旧鼠标点离开时不关闭当前说明', async () => {
    const { 容器 } = await 渲染技能板块()
    const 鼠标点 = 容器.querySelector('[data-radar-point="aiAgent"]')!
    const 键盘点 = 容器.querySelector('[data-radar-point="backendArchitecture"]')!

    fireEvent.mouseEnter(鼠标点)
    fireEvent.focus(键盘点)
    fireEvent.mouseLeave(鼠标点)

    const 气泡 = 容器.querySelector('[data-radar-tooltip="backendArchitecture"]')
    expect(气泡?.textContent).toBe(t('data.radar.dimensions.backendArchitecture.description'))
    expect(键盘点.getAttribute('aria-describedby')).toBe(气泡?.getAttribute('id'))
  })

  it('六个技能气泡使用独立切角造型并区分技术色与创意色', async () => {
    const { 容器 } = await 渲染技能板块()
    const 点表 = Array.from(容器.querySelectorAll('[data-radar-point]'))
    expect(点表.map((点) => 点.getAttribute('data-radar-point'))).toEqual(radarAxes.map((轴) => 轴.id))

    const 造型表: string[] = []
    const 色系表 = new Set<string>()
    for (const 点 of 点表) {
      fireEvent.mouseEnter(点)
      const 轴Id = 点.getAttribute('data-radar-point')!
      const 气泡 = 容器.querySelector(`[data-radar-tooltip="${轴Id}"]`) as HTMLElement | null
      expect(气泡?.getAttribute('data-radar-shape')).toBe(轴Id)
      造型表.push(气泡?.style.clipPath ?? '')
      色系表.add(气泡?.getAttribute('data-radar-tone') ?? '')
    }

    expect(new Set(造型表)).toHaveProperty('size', 6)
    expect(Array.from(色系表).sort()).toEqual(['creative', 'technical'])
  })

  it('气泡使用 200ms 进入与 120ms 退出，减少动画时直接呈现', async () => {
    const { 容器 } = await 渲染技能板块()
    const 普通点 = 容器.querySelector('[data-radar-point="aiAgent"]')!
    fireEvent.mouseEnter(普通点)
    const 普通气泡 = 容器.querySelector('[data-radar-tooltip="aiAgent"]')
    expect(普通气泡?.getAttribute('data-motion-enter-ms')).toBe('200')
    expect(普通气泡?.getAttribute('data-motion-exit-ms')).toBe('120')
    expect(普通气泡?.getAttribute('data-reduced-motion')).toBe('false')
    fireEvent.mouseLeave(普通点)

    const { 容器: 减少容器 } = await 渲染技能板块({ 减少动画: true })
    const 减少点 = 减少容器.querySelector('[data-radar-point="aiAgent"]')!
    fireEvent.mouseEnter(减少点)
    const 减少气泡 = 减少容器.querySelector('[data-radar-tooltip="aiAgent"]')
    expect(减少气泡?.getAttribute('data-reduced-motion')).toBe('true')
  })

  it('雷达尺寸保持 max-w-sm，气泡按六种预置方位贴近节点并带引导线', async () => {
    const { 容器 } = await 渲染技能板块()
    const 雷达容器 = 容器.querySelector('[data-radar-overlay]')
    const 图形 = 容器.querySelector('figure svg')
    expect(图形?.parentElement).toBe(雷达容器)
    expect(图形?.closest('figure')?.getAttribute('class') ?? '').toContain('max-w-sm')

    const 方位表: string[] = []
    for (const 轴 of radarAxes) {
      const 点 = 容器.querySelector(`[data-radar-point="${轴.id}"]`)!
      fireEvent.mouseEnter(点)
      const 气泡 = 容器.querySelector(`[data-radar-tooltip="${轴.id}"]`)!
      const 定位层 = 气泡.parentElement!
      方位表.push(定位层.getAttribute('data-radar-placement') ?? '')
      expect(定位层.getAttribute('style')).toContain('%')
      expect(容器.querySelector(`[data-radar-connector="${轴.id}"]`)).not.toBeNull()
    }

    expect(new Set(方位表)).toHaveProperty('size', 6)
  })

  it('雷达点使用可聚焦图像语义，不伪装成无动作按钮', async () => {
    const { 容器 } = await 渲染技能板块()
    expect(容器.querySelector('figure svg')?.getAttribute('role')).toBe('group')
    for (const 点 of 容器.querySelectorAll('[data-radar-point]')) {
      expect(点.getAttribute('role')).toBe('img')
      expect(点.getAttribute('tabindex')).toBe('0')
      expect(点.getAttribute('class')).toContain('focus-visible:stroke-primary')
    }
  })

  it('雷达只画 6 条轴，图例与轴集一致', async () => {
    const { 容器 } = await 渲染技能板块()
    expect(容器.querySelectorAll('svg text')).toHaveLength(radarAxes.length)
    expect(radarAxes.filter((轴) => !轴.minor)).toHaveLength(4)
    const 图例 = Array.from(容器.querySelectorAll('[class*="rounded-xl border"]')).filter((节点) =>
      (节点.textContent ?? '').includes(t('data.radar.dimensions.aiAgent.basis'))
    )
    expect(图例).toHaveLength(1)
    const 轴标签 = Array.from(容器.querySelectorAll('svg text')).map((项) => 项.textContent)
    expect(轴标签).toEqual(radarAxes.map((轴) => t(`data.radar.dimensions.${轴.id}.label` as never)))
  })

  it('板块文本里没有任何音乐/内容创作残留', async () => {
    const { 容器 } = await 渲染技能板块()
    const 正文 = 容器.textContent ?? ''
    for (const 残留 of ['音乐', '架子鼓', '爵士乐', '内容创作', '工程开发', '创作设计', '教学协作']) {
      expect(正文, `技能板块不得残留「${残留}」`).not.toContain(残留)
    }
  })

  it('板块文本里不出现影子技能词', async () => {
    const { 容器 } = await 渲染技能板块()
    const 正文 = 容器.textContent ?? ''
    for (const 词 of [
      '影刀',
      'UiPath',
      '宜搭',
      '微搭',
      '简道云',
      'Milvus',
      'Qdrant',
      'pgvector',
      'LangChain',
      'Dify',
    ]) {
      expect(正文, `技能板块不得把「${词}」写成技能`).not.toContain(词)
    }
  })

  it('右侧四条主轴说明的顺序、等级与依据保持不变', async () => {
    const { 容器 } = await 渲染技能板块()
    const 雷达 = 容器.querySelector('figure')!
    const 右侧 = 雷达.parentElement?.nextElementSibling as HTMLElement
    const 卡片表 = Array.from(右侧.querySelectorAll(':scope > .reveal > div'))
    const 主轴表 = radarAxes.filter((轴) => !轴.minor)

    expect(卡片表).toHaveLength(4)
    主轴表.forEach((轴, 索引) => {
      const 文本 = 卡片表[索引]?.textContent ?? ''
      expect(文本).toContain(t(dimensionLabelKey(轴.id)))
      expect(文本).toContain(String(轴.level))
      expect(文本).toContain(t(dimensionBasisKey(轴.id)))
    })

    const 悬停前 = 右侧.innerHTML
    fireEvent.mouseEnter(容器.querySelector('[data-radar-point="aiAgent"]')!)
    expect(右侧.innerHTML).toBe(悬停前)
  })

  it('雷达 viewBox 四周为轴标签留出余量（把标签留白改回 0 让裁切缺陷回归，本条必红）', async () => {
    const { 容器 } = await 渲染技能板块()
    const 图形 = 容器.querySelector('svg')
    expect(图形).not.toBeNull()
    const 原值 = 图形!.getAttribute('viewBox')
    expect(原值).toBeTruthy()
    const [起点x, 起点y, 宽, 高] = (原值 ?? '').split(/\s+/).map(Number)
    expect([起点x, 起点y, 宽, 高].every(Number.isFinite)).toBe(true)
    // 画布几何尺寸固定 320（SIZE/CENTER/RADIUS 见 SkillsSection 顶部常量）；
    // 轴标签画在 1.18×半径=137px 处，再加文字外延，两侧各至少 40px 才不被裁。
    const 几何尺寸 = 320
    expect(宽).toBeGreaterThan(几何尺寸)
    expect(宽 - 几何尺寸).toBeGreaterThanOrEqual(80)
    expect(起点x).toBeLessThanOrEqual(-40)
    expect(起点x + 宽 - 几何尺寸).toBeGreaterThanOrEqual(40)
    expect(起点y).toBeLessThan(0)
    expect(高).toBeGreaterThan(几何尺寸)
  })
})
