import { useEffect, useState } from 'react'
import { detectPerformanceProfile, getQualitySettings, QUALITY_LEVELS } from '../utils/deviceCapabilities'
import type { QualityLevel, QualitySettings } from '../domain/types'

interface PerformanceProfile {
  level: QualityLevel
  settings: QualitySettings
  loading: boolean
}

export function usePerformanceProfile(): PerformanceProfile {
  const [profile, setProfile] = useState<PerformanceProfile>({
    level: QUALITY_LEVELS.HIGH,
    settings: getQualitySettings(QUALITY_LEVELS.HIGH),
    loading: true,
  })

  useEffect(() => {
    let cancelled = false

    detectPerformanceProfile().then((level) => {
      if (cancelled) return
      setProfile({
        level,
        settings: getQualitySettings(level),
        loading: false,
      })
    })

    return () => {
      cancelled = true
    }
  }, [])

  return profile
}
