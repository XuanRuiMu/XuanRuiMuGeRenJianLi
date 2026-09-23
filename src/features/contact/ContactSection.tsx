import { useState, useCallback, useRef } from 'react'
import { Mail, ExternalLink, Copy, Check, MessageCircle, MessagesSquare } from 'lucide-react'
import { Section } from '../../components/ui/Section'
import { personalInfo } from '../../data/personalInfo'
import { cn } from '../../lib/utils'
import { t } from '../../i18n/translations'
import { Gomoku } from './Gomoku'

const BilibiliIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.658.373-.907l.027-.027c.267-.249.573-.373.92-.373.347 0 .653.124.92.373L9.653 4.44c.071.071.134.142.187.213h4.267a.836.836 0 0 1 .16-.213l2.853-2.747c.267-.249.573-.373.92-.373.347 0 .662.151.929.4.267.249.391.551.391.907 0 .355-.124.657-.373.906zM5.333 7.24c-.746.018-1.373.276-1.88.773-.506.498-.769 1.13-.786 1.894v7.52c.017.764.28 1.395.786 1.893.507.498 1.134.756 1.88.773h13.334c.746-.017 1.373-.275 1.88-.773.506-.498.769-1.129.786-1.893v-7.52c-.017-.765-.28-1.396-.786-1.894-.507-.497-1.134-.755-1.88-.773zM8 11.107c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c0-.373.129-.689.386-.947.258-.257.574-.386.947-.386zm8 0c.373 0 .684.124.933.373.25.249.383.569.4.96v1.173c-.017.391-.15.711-.4.96-.249.25-.56.374-.933.374s-.684-.125-.933-.374c-.25-.249-.383-.569-.4-.96V12.44c.017-.391.15-.711.4-.96.249-.249.56-.373.933-.373z" />
  </svg>
)

const GithubIcon = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 1C5.925 1 1 5.925 1 12c0 4.86 3.152 8.983 7.523 10.437.55.101.753-.238.753-.529 0-.262-.01-1.129-.015-2.048-3.064.665-3.71-1.46-3.71-1.46-.501-1.273-1.224-1.613-1.224-1.613-.999-.683.076-.669.076-.669 1.105.078 1.686 1.134 1.686 1.134.982 1.682 2.576 1.196 3.204.915.1-.711.384-1.196.699-1.471-2.446-.278-5.018-1.223-5.018-5.445 0-1.202.43-2.185 1.134-2.954-.114-.278-.491-1.397.108-2.91 0 0 .925-.296 3.03 1.129a10.56 10.56 0 0 1 2.752-.37 10.58 10.58 0 0 1 2.752.37c2.104-1.425 3.028-1.129 3.028-1.129.6 1.513.223 2.632.109 2.91.705.769 1.133 1.752 1.133 2.954 0 4.232-2.576 5.163-5.028 5.437.395.34.747 1.01.747 2.036 0 1.471-.014 2.657-.014 3.018 0 .294.2.634.756.527C19.852 20.979 23 16.857 23 12c0-6.075-4.925-11-11-11z" />
  </svg>
)

/**
 * 联系区块
 * 左侧联系卡片（邮箱含一键复制、GitHub、B站、QQ/微信二维码）+ 五子棋小游戏。
 * 留言表单已删除：生产环境无邮件密钥，留言无法送达，保留表单只会误导访客。
 */
export function ContactSection() {
  const [已复制, set已复制] = useState<string | null>(null)
  const [二维码缺失, set二维码缺失] = useState<Record<string, boolean>>({})
  const copyTimer = useRef<number | undefined>(undefined)

  const handleCopy = useCallback(async (id: string, 文本: string) => {
    try {
      await navigator.clipboard.writeText(文本)
      set已复制(id)
      window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => set已复制(null), 2000)
    } catch {
      // 剪贴板不可用时静默降级
    }
  }, [])

  const 复制按钮 = (id: string, 文本: string, 标签: string) => {
    const 命中 = 已复制 === id
    return (
      <button
        type="button"
        onClick={() => void handleCopy(id, 文本)}
        className={cn('contact-pill contact-pill--copy', 命中 && 'is-copied')}
        aria-label={`复制${标签}`}
      >
        {命中 ? <Check size={14} className="text-[#22d3ee]" /> : <Copy size={14} />}
        {命中 && <span>{t('hero.copied')}</span>}
      </button>
    )
  }

  const contactLinks = [
    {
      id: 'email',
      label: t('contact.info.email'),
      value: personalInfo.email,
      href: `mailto:${personalInfo.email}`,
      icon: ({ className }: { className?: string }) => <Mail className={className} aria-hidden="true" />,
    },
    {
      id: 'github',
      label: t('contact.info.github'),
      value: 'XuanRuiMu',
      href: personalInfo.github,
      icon: (props: { className?: string }) => <GithubIcon {...props} />,
    },
    {
      id: 'bilibili',
      label: t('contact.info.bilibili'),
      value: '玄锐暮',
      href: personalInfo.bilibili,
      icon: (props: { className?: string }) => <BilibiliIcon {...props} />,
    },
  ]

  const 二维码卡片 = [
    {
      id: 'qq',
      label: t('contact.info.qq'),
      value: personalInfo.qq,
      src: '/images/qq-qr.png',
      alt: t('contact.qr.qqAlt'),
      icon: ({ className }: { className?: string }) => <MessageCircle className={className} aria-hidden="true" />,
    },
    {
      id: 'wechat',
      label: t('contact.info.wechat'),
      value: personalInfo.wechat,
      src: '/images/wechat-qr.png',
      alt: t('contact.qr.wechatAlt'),
      icon: ({ className }: { className?: string }) => <MessagesSquare className={className} aria-hidden="true" />,
    },
  ]

  return (
    <Section id="contact" title={t('contact.title')} subtitle={t('contact.subtitle')}>
      <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
        {/* 左：联系卡片 */}
        <div className="grid content-start gap-6">
          {contactLinks.map((link) => {
            const Icon = link.icon
            const isEmail = link.id === 'email'
            return (
              <div key={link.id} className="contact-item-link">
                <a
                  href={link.href}
                  target={isEmail ? undefined : '_blank'}
                  rel={isEmail ? undefined : 'noopener noreferrer'}
                  className="contact-item-main flex min-w-0 flex-1 items-center gap-4"
                >
                  <span className="contact-item-icon">
                    <Icon className="h-7 w-7" />
                  </span>
                  <span className="contact-item-details min-w-0">
                    <span className="contact-item-label block text-sm font-semibold">{link.label}</span>
                    <span className="contact-item-value block text-sm font-medium">{link.value}</span>
                  </span>
                </a>
                {isEmail ? (
                  复制按钮(link.id, personalInfo.email, link.label)
                ) : (
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-pill"
                    aria-label={`打开${link.label}`}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            )
          })}

          {二维码卡片.map((卡片) => {
            const Icon = 卡片.icon
            return (
              <div key={卡片.id} className="contact-item-link">
                <div className="flex w-full flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <span className="contact-item-icon">
                      <Icon className="h-7 w-7" />
                    </span>
                    <span className="contact-item-details min-w-0 flex-1">
                      <span className="contact-item-label block text-sm font-semibold">{卡片.label}</span>
                      <span className="contact-item-value block text-sm font-medium">{卡片.value}</span>
                    </span>
                    {复制按钮(卡片.id, 卡片.value, 卡片.label)}
                  </div>
                  {!二维码缺失[卡片.id] && (
                    <div className="flex justify-center">
                      <img
                        src={卡片.src}
                        alt={卡片.alt}
                        loading="lazy"
                        className="h-36 w-36 rounded-lg border border-border object-cover"
                        onError={() => set二维码缺失((prev) => ({ ...prev, [卡片.id]: true }))}
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 右：五子棋小游戏 */}
        <div className="grid content-start gap-6">
          <div className="rounded-xl border border-border bg-surface/40 p-5">
            <h3 className="mb-4 font-mono text-lg font-semibold text-text-primary">{t('contact.stillSure.title')}</h3>
            <div className="flex justify-center">
              <Gomoku />
            </div>
          </div>
        </div>
      </div>
    </Section>
  )
}
