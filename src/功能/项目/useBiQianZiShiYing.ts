import { useEffect, type RefObject } from 'react'

export function useBiQianZiShiYing(内容引用: RefObject<HTMLElement | null>, 最小 = 0.6, 最大 = 0.95, 迭代 = 12) {
  useEffect(() => {
    const 元素 = 内容引用.current
    if (!元素) return

    const 适配 = () => {
      if (!元素.isConnected) return
      const 内容放得下 = () => {
        const 链接 = 元素.querySelector<HTMLElement>('.clothesline-note-link')
        const 链接底部 = 链接 ? 链接.offsetTop + 链接.offsetHeight : 元素.scrollHeight
        return 元素.scrollHeight <= 元素.clientHeight && 链接底部 <= 元素.clientHeight + 1
      }
      let 下限 = 最小
      let 上限 = 最大
      for (let i = 0; i < 迭代; i++) {
        const 中间 = (下限 + 上限) / 2
        元素.style.setProperty('--note-fit', `${中间}rem`)

        if (内容放得下()) {
          下限 = 中间
        } else {
          上限 = 中间
        }
      }

      const 链接 = 元素.querySelector<HTMLElement>('.clothesline-note-link')
      const 最终链接底部 = 链接 ? 链接.offsetTop + 链接.offsetHeight : 元素.scrollHeight
      if (最终链接底部 >= 元素.clientHeight - 1 || 元素.scrollHeight >= 元素.clientHeight - 1) {
        下限 = 下限 * 0.96
      }
      元素.style.setProperty('--note-fit', `${下限}rem`)

      let 收紧步数 = 0
      while (收紧步数 < 8 && 下限 > 最小 && 元素.clientHeight > 0 && !内容放得下()) {
        下限 = Math.max(最小, 下限 * 0.94)
        元素.style.setProperty('--note-fit', `${下限}rem`)
        收紧步数 += 1
      }
    }

    let 帧请求 = 0
    const 调度 = () => {
      cancelAnimationFrame(帧请求)
      帧请求 = requestAnimationFrame(适配)
    }

    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(调度).catch(调度)
    } else {
      调度()
    }

    let 尺寸观察器: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      尺寸观察器 = new ResizeObserver(调度)
      尺寸观察器.observe(元素)
      if (typeof document !== 'undefined' && document.documentElement) {
        尺寸观察器.observe(document.documentElement)
      }
    }

    let 交叉观察器: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== 'undefined') {
      交叉观察器 = new IntersectionObserver(
        (条目表) => {
          for (const e of 条目表) {
            if (e.isIntersecting) {
              调度()
              交叉观察器?.unobserve(e.target)
            }
          }
        },
        { threshold: 0.01 }
      )
      交叉观察器.observe(元素)
    } else {
      调度()
    }

    return () => {
      cancelAnimationFrame(帧请求)
      尺寸观察器?.disconnect()
      交叉观察器?.disconnect()
    }
  }, [内容引用, 最小, 最大, 迭代])
}
