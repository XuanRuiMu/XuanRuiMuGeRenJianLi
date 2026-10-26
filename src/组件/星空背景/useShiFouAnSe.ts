import { useEffect, useState } from 'react'
import { 读取初始明暗 } from '../../状态/应用状态仓库'

export function useShiFouAnSe(): boolean {
  const [是深色, 设置是深色] = useState(() => 读取初始明暗() === 'dark')

  useEffect(() => {
    if (typeof document === 'undefined') return
    const 根元素 = document.documentElement
    const 更新 = () => 设置是深色(根元素.classList.contains('dark'))
    更新()
    const 观察器 = new MutationObserver(更新)
    观察器.observe(根元素, { attributes: true, attributeFilter: ['class'] })
    return () => 观察器.disconnect()
  }, [])

  return 是深色
}
