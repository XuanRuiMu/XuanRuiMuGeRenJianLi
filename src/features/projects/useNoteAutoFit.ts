import { useEffect, type RefObject } from 'react'

/**
 * FP-04 卷轴文字运行时自适应
 * --------------------------------------------------------------------------
 * 根因：旧 CSS 用固定 `clamp()` 字号 + `overflow:hidden`，文字过长就溢出被裁，
 * GitHub 链接因此被隐藏。本 hook 把「单一 CSS 变量 `--note-fit`」当成唯一的字号旋钮——
 * title/desc/link 全部以 `--note-fit` 为 em 基准，所以只调这一个变量即可整组缩放。
 *
 * 适配算法：在 [最小, 最大] 区间做一次性二分搜索，把 `--note-fit` 推到
 * 「scrollHeight <= clientHeight + 1（刚好放得下）」的最大值。二分约 12 次即得终态，
 * 不会在每一帧测量（性能优先）。
 *
 * 触发时机（均经 requestAnimationFrame 防抖）：
 *  - document.fonts.ready：等关键字体加载完，否则用 fallback 测量会失真；
 *  - ResizeObserver：content 盒子尺寸变化（含视口 resize）时重适配；
 *  - IntersectionObserver：便签进入视口时懒适配（离屏不无意义测量）。
 * reduced-motion 下直接设定终态（CSS 本身无 transition，无需额外处理）。
 */
export function useNoteAutoFit(
  contentRef: RefObject<HTMLElement | null>,
  最小 = 0.6,
  最大 = 0.95,
  迭代 = 12
) {
  useEffect(() => {
    const el = contentRef.current
    if (!el) return

    const 适配 = () => {
      if (!el.isConnected) return
      let lo = 最小
      let hi = 最大
      for (let i = 0; i < 迭代; i++) {
        const mid = (lo + hi) / 2
        el.style.setProperty('--note-fit', `${mid}rem`)
        // 强制同步布局，读取「盒内最底部元素（链接）的布局底边」是否仍在 content 盒内。
        // 直接用链接 offsetTop+offsetHeight（布局坐标，旋转无关）比整数 scrollHeight 更精确，
        // 可避免 sub-pixel 四舍五入把真实溢出误判为放得下。无链接时退化为 scrollHeight 判据。
        const 链接 = el.querySelector<HTMLElement>('.clothesline-note-link')
        const linkBottom = 链接 ? 链接.offsetTop + 链接.offsetHeight : el.scrollHeight
        // 门限取严格 scrollHeight <= clientHeight（吸收整数上取整 + 行高尾部 leading 的 1px 误差），
        // 同时保证链接底边 <= 盒底边 +1；二者皆满足则验收 #1 稳过且链接绝不裁切。
        const 放得下 = el.scrollHeight <= el.clientHeight && linkBottom <= el.clientHeight + 1
        if (放得下) {
          lo = mid // 放得下 → 尝试更大
        } else {
          hi = mid // 放不下 → 需更小
        }
      }
      // FP-01 防孤儿折行：二分落定后做一次保守性回退。
      // 若链接紧贴盒底或内容贴满，把 lo 调小一档（×0.96），
      // 让首屏始终留约 1 行行距的安全气口，杜绝首字/末字贴边的孤儿观感。
      const 链接 = el.querySelector<HTMLElement>('.clothesline-note-link')
      const finalLinkBottom = 链接 ? 链接.offsetTop + 链接.offsetHeight : el.scrollHeight
      if (finalLinkBottom >= el.clientHeight - 1 || el.scrollHeight >= el.clientHeight - 1) {
        lo = lo * 0.96
      }
      el.style.setProperty('--note-fit', `${lo}rem`)
    }

    let raf = 0
    const 调度 = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(适配)
    }

    // 1) 关键字体加载完再测（避免 fallback 字体导致误判）
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(调度).catch(调度)
    } else {
      调度()
    }

    // 2) content 盒子尺寸变化（resize / 父级布局变化）重适配
    let ro: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(调度)
      ro.observe(el)
    }

    // 3) 进入视口时懒适配（避免离屏便签无谓测量，且物理引擎初始宽度可能未稳定）
    let io: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              调度()
              io?.unobserve(e.target)
            }
          }
        },
        { threshold: 0.01 }
      )
      io.observe(el)
    } else {
      调度()
    }

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      io?.disconnect()
    }
  }, [contentRef, 最小, 最大, 迭代])
}
