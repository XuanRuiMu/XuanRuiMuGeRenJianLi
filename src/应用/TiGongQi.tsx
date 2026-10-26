import { type ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useJianShaoDongHua } from '../钩子/useJianShaoDongHua'
import { PingHuaGunDong } from './PingHuaGunDong'
import { useYingYongZhuangTai } from '../状态/应用状态仓库'
import { useZhuTiXiTong } from '../组件/主题切换/useZhuTiXiTong'

const 查询客户端 = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

function ZhuTiTongBu(): null {
  useZhuTiXiTong()
  return null
}

function JianShaoDongHuaTongBu(): null {
  const 减少动画 = useJianShaoDongHua()
  const 设置减少动画 = useYingYongZhuangTai((状态) => 状态.设置减少动画)

  useEffect(() => {
    设置减少动画(减少动画)
    document.documentElement.classList.toggle('reduced-motion', 减少动画)
  }, [减少动画, 设置减少动画])

  return null
}

interface 提供器属性 {
  children: ReactNode
}

export function TiGongQi({ children }: 提供器属性) {
  return (
    <QueryClientProvider client={查询客户端}>
      <ZhuTiTongBu />
      <JianShaoDongHuaTongBu />
      <PingHuaGunDong>{children}</PingHuaGunDong>
    </QueryClientProvider>
  )
}
