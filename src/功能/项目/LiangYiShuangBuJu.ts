export const 最小带宽 = 768
export const 最大带宽 = 1152

export interface 晾衣架布局 {
  带宽: number

  布局偏移X: number

  区域最小宽: number
}

export interface 晾衣架区域宿主 {
  区域: HTMLElement

  滚动视口: HTMLElement | null
}

export interface 晾衣架区域布局 extends 晾衣架布局 {
  区域宽: number

  区域高: number
}

export function 计算晾衣架布局(容器可用宽: number): 晾衣架布局 {
  const 有效宽 = Number.isFinite(容器可用宽) && 容器可用宽 > 0 ? 容器可用宽 : 0
  const 带宽 = Math.min(最大带宽, Math.max(最小带宽, 有效宽))
  return {
    带宽,
    布局偏移X: Math.max(0, (有效宽 - 带宽) / 2),
    区域最小宽: Math.max(有效宽, 最小带宽),
  }
}

export function 应用晾衣架布局(宿主: 晾衣架区域宿主): 晾衣架区域布局 {
  const { 区域, 滚动视口 } = 宿主
  区域.style.minWidth = ''
  const 外层可用宽 = 滚动视口 ? 滚动视口.clientWidth : 0
  const 容器可用宽 = 外层可用宽 > 0 ? 外层可用宽 : 区域.offsetWidth
  const 布局 = 计算晾衣架布局(容器可用宽)
  区域.style.minWidth = `${布局.区域最小宽}px`
  if (滚动视口 && 滚动视口.scrollWidth <= 滚动视口.clientWidth && 滚动视口.scrollLeft !== 0) {
    滚动视口.scrollLeft = 0
  }
  return { ...布局, 区域宽: 布局.区域最小宽, 区域高: 区域.offsetHeight }
}
