import { useCallback } from 'react'
import { Download } from 'lucide-react'
import { personalInfo } from '../../data/personalInfo'
import { Button } from '../../components/ui/Button'
import { t } from '../../i18n/translations'
import { downloadResume } from '../../lib/resume'
import { RoleTicker } from './RoleTicker'
import { TechStack } from './TechStack'

export function HeroSection() {
  const handleDownloadResume = useCallback(() => {
    downloadResume()
  }, [])

  return (
    <section
      id="hero"
      className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden px-4 sm:px-6 lg:px-8"
      aria-label={t('nav.hero')}
    >
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col justify-center">
          <h1 className="mb-4 font-display text-4xl font-semibold tracking-tight text-text-primary sm:text-5xl lg:text-6xl">
            {personalInfo.name}
          </h1>
          <RoleTicker />
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={handleDownloadResume} icon={<Download size={18} />}>
              {t('hero.cta.downloadResume')}
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <TechStack />
        </div>
      </div>
    </section>
  )
}
