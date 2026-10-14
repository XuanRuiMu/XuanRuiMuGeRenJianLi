import { type ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useJianShaoDongHua } from '../钩子/useJianShaoDongHua'
import { PingHuaGunDong } from './PingHuaGunDong'
import { useYingYongZhuangTai } from '../状态/应用状态仓库'
import { useZhuTiXiTong } from '../组件/主题切换/useZhuTiXiTong'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

function ThemeSync(): null {
  useZhuTiXiTong()
  return null
}

function ReducedMotionSync(): null {
  const reducedMotion = useJianShaoDongHua()
  const setReducedMotion = useYingYongZhuangTai((state) => state.setReducedMotion)

  useEffect(() => {
    setReducedMotion(reducedMotion)
    document.documentElement.classList.toggle('reduced-motion', reducedMotion)
  }, [reducedMotion, setReducedMotion])

  return null
}

interface ProvidersProps {
  children: ReactNode
}

export function TiGongQi({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <ReducedMotionSync />
      <PingHuaGunDong>{children}</PingHuaGunDong>
    </QueryClientProvider>
  )
}
