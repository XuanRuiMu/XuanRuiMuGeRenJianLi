import { 个人信息 } from '../../数据/个人信息'
import { t } from '../../国际化/翻译'
import { 资源路径 } from '../../库/资源路径'
import { JiaSeLunBo } from './JiaSeLunBo'
import { JiShuZhan } from './JiShuZhan'
import { XiaZaiCaiDan } from './XiaZaiCaiDan'

export function ShouPingBanKuai() {
  return (
    <section
      id="hero"
      className="relative flex min-h-[calc(100vh-4rem)] items-center overflow-hidden px-4 sm:px-6 lg:px-8"
      aria-label={t('nav.hero')}
    >
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-12 py-16 md:grid-cols-2 md:py-24">
        <div className="flex flex-col justify-center">
          {}
          <h1 className="mb-4">
            <img
              src={资源路径('/images/签字-alpha.webp')}
              alt={个人信息.name}
              className="h-40 w-auto object-contain drop-shadow-[0_2px_10px_rgba(60,30,15,0.35)] sm:h-48 lg:h-56 dark:invert dark:drop-shadow-none light:drop-shadow-none"
              data-testid="hero-signature"
            />
          </h1>
          <JiaSeLunBo />
          <div className="flex flex-wrap gap-3">
            <XiaZaiCaiDan />
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <JiShuZhan />
        </div>
      </div>
    </section>
  )
}
