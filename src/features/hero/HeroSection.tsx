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
          {/* 主页标题：手写签字图（透明底衍生资产，深浅两主题共用）；h1+img.alt 保持标题语义与无障碍名 */}
          <h1 className="mb-4">
            <img
              src="/images/主页签字-alpha.png"
              alt={personalInfo.name}
              className="h-40 w-auto object-contain drop-shadow-[0_2px_10px_rgba(60,30,15,0.35)] sm:h-48 lg:h-56 dark:drop-shadow-none light:invert light:drop-shadow-none"
              data-testid="hero-signature"
            />
          </h1>
          <RoleTicker />
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={handleDownloadResume}
              icon={<Download size={32} />}
              className="h-16 px-10 text-lg"
            >
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
