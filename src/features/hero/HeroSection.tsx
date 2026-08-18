import { useState, useCallback } from 'react'
import { Mail, FolderGit2, Download, MessageSquare } from 'lucide-react'
import { personalInfo } from '../../data/personalInfo'
import { Button } from '../../components/ui/Button'
import { useAppStore } from '../../store/useAppStore'
import { t } from '../../i18n/translations'
import { downloadResume } from '../../lib/resume'
import { RoleTicker } from './RoleTicker'
import { TechStack } from './TechStack'

export function HeroSection() {
  const [copied, setCopied] = useState(false)
  const setChatOpen = useAppStore((state) => state.setChatOpen)
  const transitionToSection = useAppStore((state) => state.transitionToSection)

  const handleCopyEmail = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(personalInfo.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // 剪贴板写入失败时静默降级，不影响用户体验
    }
  }, [])

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
            <Button onClick={handleCopyEmail} icon={<Mail size={18} />}>
              {copied ? t('hero.copied') : t('hero.cta.copyEmail')}
            </Button>
            <Button variant="secondary" onClick={() => transitionToSection('projects')} icon={<FolderGit2 size={18} />}>
              {t('hero.cta.viewProjects')}
            </Button>
            <Button variant="ghost" onClick={handleDownloadResume} icon={<Download size={18} />}>
              {t('hero.cta.downloadResume')}
            </Button>
            <Button variant="ghost" onClick={() => setChatOpen(true)} icon={<MessageSquare size={18} />}>
              {t('hero.cta.openAIChat')}
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
