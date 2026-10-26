import { useEffect } from 'react'
import { 当页面加载完毕且空闲 } from '../工具/空闲加载'

export function useJingMoZhanShiTu(): void {
  useEffect(() => {
    let 已取消 = false
    const 清理 = 当页面加载完毕且空闲(async () => {
      try {
        const { 展示行表 } = await import('../数据/展示')
        if (已取消) return
        const 地址表 = [...new Set(展示行表.flatMap((行) => 行.卡片表.map((卡片) => 卡片.图片)))]
        let 下标 = 0
        const 下一个 = () => {
          if (已取消 || 下标 >= 地址表.length) return
          const 图片 = new Image()
          图片.decoding = 'async'
          图片.src = 地址表[下标]
          下标 += 1
          window.setTimeout(下一个, 180)
        }
        下一个()
      } catch {}
    })
    return () => {
      已取消 = true
      清理()
    }
  }, [])
}
