import { useEffect, useState } from 'react'
import { 检测性能档位, 获取画质设置, 画质档位 } from '../utils/设备能力'
import type { 画质档位值, 画质设置 } from '../domain/类型'

interface 性能档案 {
  等级: 画质档位值
  设置: 画质设置
  加载中: boolean
}

export function useXingNengDangWei(): 性能档案 {
  const [档案, 设档案] = useState<性能档案>({
    等级: 画质档位.高,
    设置: 获取画质设置(画质档位.高),
    加载中: true,
  })

  useEffect(() => {
    let 已取消 = false

    检测性能档位().then((等级) => {
      if (已取消) return
      设档案({
        等级,
        设置: 获取画质设置(等级),
        加载中: false,
      })
    })

    return () => {
      已取消 = true
    }
  }, [])

  return 档案
}
