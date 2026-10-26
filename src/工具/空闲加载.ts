export function 当页面加载完毕且空闲(回调: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  let 已取消 = false
  let 空闲句柄: number | null = null
  let 正在等待加载 = false
  const 窗口 = window as unknown as {
    requestIdleCallback?: (回调: () => void, 选项?: { timeout?: number }) => number
    cancelIdleCallback?: (句柄: number) => void
  }
  const 启动 = () => {
    if (已取消) return
    const 调度 =
      窗口.requestIdleCallback ??
      ((回调函数: () => void, _选项?: { timeout?: number }) => window.setTimeout(回调函数, 800))
    空闲句柄 = 调度(
      () => {
        空闲句柄 = null
        if (!已取消) 回调()
      },
      { timeout: 3000 }
    )
  }
  const 加载完成 = () => {
    正在等待加载 = false
    启动()
  }
  if (document.readyState === 'complete') {
    启动()
  } else {
    正在等待加载 = true
    window.addEventListener('load', 加载完成, { once: true })
  }
  return () => {
    已取消 = true
    if (正在等待加载) window.removeEventListener('load', 加载完成)
    if (空闲句柄 !== null) {
      if (窗口.cancelIdleCallback) 窗口.cancelIdleCallback(空闲句柄)
      else window.clearTimeout(空闲句柄)
      空闲句柄 = null
    }
  }
}
