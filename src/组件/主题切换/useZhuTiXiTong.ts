import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react'
import { useYingYongZhuangTai, 解析主题明暗, 读取初始明暗, 主题存储键, type 应用主题 } from '../../状态/应用状态仓库'
import { 启动视图过渡, 启动圆形揭示过渡, type 圆形揭示原点 } from '../../工具/视图过渡'

export interface 设置主题选项 {
  origin?: 圆形揭示原点
}

export function useZhuTiXiTong() {
  const 主题 = useYingYongZhuangTai((状态) => 状态.主题)
  const 减少动画 = useYingYongZhuangTai((状态) => 状态.减少动画)
  const 设置主题仓库 = useYingYongZhuangTai((状态) => 状态.设置主题)
  const [已解析主题, 设置已解析主题] = useState<'dark' | 'light'>(读取初始明暗)
  const 待处理原点引用 = useRef<圆形揭示原点 | null>(null)

  const 应用主题 = useEffectEvent((下一个: 应用主题) => {
    const 已解析 = 解析主题明暗(下一个)
    const 更新 = () => {
      设置已解析主题(已解析)
      const 根元素 = document.documentElement
      根元素.classList.remove('light', 'dark')
      根元素.classList.add(已解析)
      根元素.style.colorScheme = 已解析
    }
    const 来源 = 待处理原点引用.current
    待处理原点引用.current = null
    if (来源 && !减少动画) {
      启动圆形揭示过渡(更新, 来源)
    } else {
      启动视图过渡(更新)
    }
  })

  useEffect(() => {
    应用主题(主题)
  }, [主题])

  useEffect(() => {
    const 媒体查询 = window.matchMedia('(prefers-color-scheme: dark)')
    const 处理器 = () => {
      if (主题 === 'system') {
        应用主题('system')
      }
    }
    媒体查询.addEventListener('change', 处理器)
    return () => 媒体查询.removeEventListener('change', 处理器)
  }, [主题])

  useEffect(() => {
    try {
      const 已存 = window.localStorage.getItem(主题存储键)
      if (已存 === 'dark' || 已存 === 'light' || 已存 === 'system') {
        设置主题仓库(已存)
      }
    } catch {}
  }, [设置主题仓库])

  const 设置主题 = useCallback(
    (下一个: 应用主题, 选项?: 设置主题选项) => {
      待处理原点引用.current = 选项?.origin ?? null
      设置主题仓库(下一个)
      try {
        window.localStorage.setItem(主题存储键, 下一个)
      } catch {}
    },
    [设置主题仓库]
  )

  return { theme: 主题, resolvedTheme: 已解析主题, setTheme: 设置主题 }
}
