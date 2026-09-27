import { describe, it, expect } from 'vitest'
import { 计算晾衣架布局, 应用晾衣架布局, 最小带宽, 最大带宽 } from './clotheslineLayout'

/** 按真实布局语义给元素打桩：区域宽 = max(内联 min-width, 外层可用宽)，即外层把区域拉伸铺满 */
function 建宿主(外层可用宽: number, 区域高 = 480) {
  const 区域 = document.createElement('div')
  const 滚动视口 = document.createElement('div')
  滚动视口.appendChild(区域)
  let 视口宽 = 外层可用宽
  Object.defineProperty(滚动视口, 'clientWidth', { get: () => 视口宽, configurable: true })
  Object.defineProperty(区域, 'offsetWidth', {
    get: () => Math.max(Number.parseFloat(区域.style.minWidth) || 0, 视口宽),
    configurable: true,
  })
  Object.defineProperty(区域, 'offsetHeight', { get: () => 区域高, configurable: true })
  return {
    区域,
    滚动视口,
    设视口宽: (宽: number) => {
      视口宽 = 宽
    },
  }
}

const 区域最小宽值 = (区域: HTMLElement) => Number.parseFloat(区域.style.minWidth)

describe('计算晾衣架布局（纯函数：手机版网格已删除，任何设备同一套物理布局）', () => {
  it('窄于最小带宽（手机 390px）：按最小带宽铺开，区域最小宽抬到最小带宽 → 产生横向滚动', () => {
    const 布局 = 计算晾衣架布局(390)
    expect(布局.带宽).toBe(最小带宽)
    expect(布局.区域最小宽).toBe(最小带宽)
    expect(布局.布局偏移X).toBe(0)
  })

  it('中间宽度（900px）：带宽即基准宽，居中偏移为 0', () => {
    const 布局 = 计算晾衣架布局(900)
    expect(布局.带宽).toBe(900)
    expect(布局.区域最小宽).toBe(900)
    expect(布局.布局偏移X).toBe(0)
  })

  it('宽于最大带宽（1920px）：带宽封顶，便签集群居中', () => {
    const 布局 = 计算晾衣架布局(1920)
    expect(布局.带宽).toBe(最大带宽)
    expect(布局.区域最小宽).toBe(1920)
    expect(布局.布局偏移X).toBe((1920 - 最大带宽) / 2)
  })

  it('异常宽度（0 / NaN / 负 / Infinity）不产生 NaN，退化为最小带宽', () => {
    for (const 宽 of [0, -100, Number.NaN, Number.POSITIVE_INFINITY]) {
      const 布局 = 计算晾衣架布局(宽)
      expect(Number.isFinite(布局.带宽)).toBe(true)
      expect(布局.带宽).toBe(最小带宽)
      expect(布局.区域最小宽).toBe(最小带宽)
      expect(Number.isFinite(布局.布局偏移X)).toBe(true)
    }
  })

  it('区域最小宽恒等于 max(容器可用宽, 最小带宽)，且永不小于带宽（滚动容器宽度守恒）', () => {
    for (const 宽 of [320, 390, 767, 768, 800, 1152, 1440, 2560]) {
      const 布局 = 计算晾衣架布局(宽)
      expect(布局.区域最小宽).toBe(Math.max(宽, 最小带宽))
      expect(布局.区域最小宽).toBeGreaterThanOrEqual(布局.带宽)
    }
  })

  it('路径无关：同一入参重复调用逐位相同，且不受先前调用序列影响（纯度）', () => {
    const 探针 = [1920, 390, 640, 1152, 900, 2560]
    const 首次 = 探针.map((宽) => 计算晾衣架布局(宽))
    for (const 宽 of 探针) 计算晾衣架布局(宽)
    探针.reverse().forEach((宽) => 计算晾衣架布局(宽))
    for (const [索引, 宽] of 探针.entries()) {
      expect(计算晾衣架布局(宽)).toEqual(首次[探针.length - 1 - 索引])
    }
  })
})

describe('应用晾衣架布局（测量 → 计算 → 回写 的唯一接缝）', () => {
  it('回写内联 min-width，区域宽恒等于区域最小宽，区域高取自元素', () => {
    const 宿主 = 建宿主(1920, 420)
    const 结果 = 应用晾衣架布局(宿主)
    expect(区域最小宽值(宿主.区域)).toBe(1920)
    expect(结果.区域最小宽).toBe(1920)
    expect(结果.区域宽).toBe(结果.区域最小宽)
    expect(结果.区域高).toBe(420)
    expect(结果.带宽).toBe(最大带宽)
    expect(结果.布局偏移X).toBe((1920 - 最大带宽) / 2)
  })

  it('外层有宽度时完全不读区域外框宽：基准不含任何自身产物', () => {
    const 宿主 = 建宿主(1920)
    let 读取次数 = 0
    Object.defineProperty(宿主.区域, 'offsetWidth', {
      get: () => {
        读取次数 += 1
        return 99999
      },
      configurable: true,
    })
    应用晾衣架布局(宿主)
    expect(读取次数).toBe(0)
    expect(区域最小宽值(宿主.区域)).toBe(1920)
  })

  it('测量前先清空内联 min-width：外层退化而回退读取时不得看到上一轮产物', () => {
    const 区域 = document.createElement('div')
    区域.style.minWidth = '4096px'
    const 读取时快照: string[] = []
    Object.defineProperty(区域, 'offsetWidth', {
      get: () => {
        读取时快照.push(区域.style.minWidth)
        return 0
      },
      configurable: true,
    })
    应用晾衣架布局({ 区域, 滚动视口: null })
    expect(读取时快照.length).toBeGreaterThan(0)
    for (const 快照 of 读取时快照) expect(快照).toBe('')
  })

  it('基准宽只由外层 clientWidth 决定，区域自身外框宽不参与（消除自污染）', () => {
    const 宿主 = 建宿主(1920)
    const 首次 = 应用晾衣架布局(宿主)
    // 把区域自身外框宽改成任意荒谬值：结果必须纹丝不动
    Object.defineProperty(宿主.区域, 'offsetWidth', { get: () => 99999, configurable: true })
    const 二次 = 应用晾衣架布局(宿主)
    expect(二次).toEqual(首次)
    expect(区域最小宽值(宿主.区域)).toBe(1920)
  })

  it('外层缺失或未布局时回退区域自身外框宽，且不产生 NaN', () => {
    const 区域 = document.createElement('div')
    Object.defineProperty(区域, 'offsetWidth', { get: () => 1440, configurable: true })
    const 无外层 = 应用晾衣架布局({ 区域, 滚动视口: null })
    expect(无外层.区域最小宽).toBe(1440)
    expect(Number.isFinite(无外层.带宽)).toBe(true)

    const 外层未布局 = document.createElement('div')
    const 未布局 = 应用晾衣架布局({ 区域, 滚动视口: 外层未布局 })
    expect(未布局.区域最小宽).toBe(1440)
  })

  it('退化基准（区域无外框宽）仍产出可用的最小带宽布局，不留旧 min-width', () => {
    const 区域 = document.createElement('div')
    区域.style.minWidth = '3000px'
    Object.defineProperty(区域, 'offsetWidth', { get: () => 0, configurable: true })
    const 结果 = 应用晾衣架布局({ 区域, 滚动视口: null })
    expect(结果.区域最小宽).toBe(最小带宽)
    expect(结果.带宽).toBe(最小带宽)
    expect(区域最小宽值(区域)).toBe(最小带宽)
  })

  it('宽→窄→宽往返后区域最小宽回到初始值（≤1px），min-width 无单调残留', () => {
    const 宿主 = 建宿主(1920)
    const 初始 = 应用晾衣架布局(宿主)
    宿主.设视口宽(640)
    const 窄 = 应用晾衣架布局(宿主)
    expect(窄.区域最小宽).toBe(最小带宽)
    expect(窄.区域最小宽).toBeLessThan(初始.区域最小宽)
    宿主.设视口宽(1920)
    const 恢复 = 应用晾衣架布局(宿主)
    expect(Math.abs(恢复.区域最小宽 - 初始.区域最小宽)).toBeLessThanOrEqual(1)
    expect(Math.abs(恢复.带宽 - 初始.带宽)).toBeLessThanOrEqual(1)
    expect(Math.abs(恢复.布局偏移X - 初始.布局偏移X)).toBeLessThanOrEqual(1)
    expect(恢复).toEqual(初始)
  })

  it('多轮往返逐位相同：第二次恢复与第一次恢复完全一致（幂等）', () => {
    const 宿主 = 建宿主(1920)
    const 初始 = 应用晾衣架布局(宿主)
    const 跑一轮 = () => {
      宿主.设视口宽(640)
      应用晾衣架布局(宿主)
      宿主.设视口宽(1920)
      return 应用晾衣架布局(宿主)
    }
    const 第一轮 = 跑一轮()
    const 第二轮 = 跑一轮()
    expect(第一轮).toEqual(初始)
    expect(第二轮).toEqual(第一轮)
  })

  it('往返顺序无关：从宽起步与从窄起步回到同一视口宽，终态逐位相同', () => {
    const 甲 = 建宿主(1920)
    const 乙 = 建宿主(1920)
    甲.设视口宽(640)
    应用晾衣架布局(甲)
    甲.设视口宽(390)
    应用晾衣架布局(甲)
    甲.设视口宽(1920)
    const 甲终态 = 应用晾衣架布局(甲)

    乙.设视口宽(2560)
    应用晾衣架布局(乙)
    乙.设视口宽(1152)
    应用晾衣架布局(乙)
    乙.设视口宽(1920)
    const 乙终态 = 应用晾衣架布局(乙)

    expect(甲终态).toEqual(乙终态)
  })

  it('非拉伸几何（区域不被外层拉伸）下基准不自锁：恢复后回到外层宽而非停在旧 min-width', () => {
    // 区域宽只由自身内联 min-width 决定（外层转 flex 且 align-items 不拉伸等真实几何）：
    // 旧实现 min(区域.offsetWidth, 外层.clientWidth) 会选中自己上一轮的 768px 当基准而自锁。
    const 外层可用宽 = { 值: 1920 }
    const 区域 = document.createElement('div')
    const 滚动视口 = document.createElement('div')
    滚动视口.appendChild(区域)
    Object.defineProperty(滚动视口, 'clientWidth', { get: () => 外层可用宽.值, configurable: true })
    Object.defineProperty(区域, 'offsetWidth', {
      get: () => Number.parseFloat(区域.style.minWidth) || 0,
      configurable: true,
    })
    const 宿主 = { 区域, 滚动视口 }

    应用晾衣架布局(宿主)
    expect(区域最小宽值(区域)).toBe(1920)
    外层可用宽.值 = 640
    expect(应用晾衣架布局(宿主).区域最小宽).toBe(最小带宽)
    外层可用宽.值 = 1920
    expect(应用晾衣架布局(宿主).区域最小宽).toBe(1920)
  })

  it('溢出消失时复位 scrollLeft；仍有溢出时保留用户滚动位置', () => {
    const 区域 = document.createElement('div')
    const 滚动视口 = document.createElement('div')
    滚动视口.appendChild(区域)
    let 可视宽 = 1920
    let 内容宽 = 1920
    let 偏移 = 0
    Object.defineProperty(滚动视口, 'clientWidth', { get: () => 可视宽, configurable: true })
    Object.defineProperty(滚动视口, 'scrollWidth', { get: () => Math.max(可视宽, 内容宽), configurable: true })
    Object.defineProperty(滚动视口, 'scrollLeft', {
      get: () => 偏移,
      set: (值: number) => {
        偏移 = Math.max(0, Math.min(值, Math.max(可视宽, 内容宽) - 可视宽))
      },
      configurable: true,
    })
    Object.defineProperty(区域, 'offsetWidth', {
      get: () => Math.max(Number.parseFloat(区域.style.minWidth) || 0, 可视宽),
      configurable: true,
    })
    const 宿主 = { 区域, 滚动视口 }

    // 窄视口：有溢出 → 复位不得动用户的滚动位置
    可视宽 = 640
    内容宽 = 768
    偏移 = 128
    应用晾衣架布局(宿主)
    expect(偏移).toBe(128)

    // 恢复宽视口：溢出消失 → 必须归零
    可视宽 = 1920
    内容宽 = 1920
    应用晾衣架布局(宿主)
    expect(偏移).toBe(0)
    expect(区域最小宽值(区域)).toBe(1920)
  })
})
