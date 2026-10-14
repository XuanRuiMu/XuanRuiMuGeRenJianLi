import { useState, useEffect } from 'react'

function 读取初始减少动画偏好(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useJianShaoDongHua(): boolean {
  const [偏好减少动画, 设偏好减少动画] = useState(读取初始减少动画偏好)

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return

    const 媒体查询 = window.matchMedia('(prefers-reduced-motion: reduce)')

    const 处理器 = (event: MediaQueryListEvent) => {
      设偏好减少动画(event.matches)
    }

    媒体查询.addEventListener('change', 处理器)
    return () => 媒体查询.removeEventListener('change', 处理器)
  }, [])

  return 偏好减少动画
}
