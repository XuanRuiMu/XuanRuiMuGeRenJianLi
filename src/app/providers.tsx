import { type ReactNode, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { SmoothScroll } from './SmoothScroll'
import { useAppStore } from '../store/useAppStore'
import { useThemeSystem } from '../components/theme-toggle/useThemeSystem'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

function ThemeSync(): null {
  useThemeSystem()
  return null
}

function ReducedMotionSync(): null {
  const reducedMotion = useReducedMotion()
  const setReducedMotion = useAppStore((state) => state.setReducedMotion)

  useEffect(() => {
    setReducedMotion(reducedMotion)
    document.documentElement.classList.toggle('reduced-motion', reducedMotion)
  }, [reducedMotion, setReducedMotion])

  return null
}

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeSync />
      <ReducedMotionSync />
      <SmoothScroll>{children}</SmoothScroll>
    </QueryClientProvider>
  )
}
