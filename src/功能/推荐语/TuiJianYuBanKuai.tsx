import { BanKuai } from '../../组件/基础组件/BanKuai'
import { XianXian } from '../../组件/显现'
import { t } from '../../国际化/翻译'
import { 推荐语列表 } from '../../数据/推荐语'

const 便签角度 = ['-1.6deg', '1.2deg', '-0.8deg', '1.5deg'] as const

export function TuiJianYuBanKuai() {
  const 卡片表 = 推荐语列表()
  return (
    <BanKuai id="testimonials" title={t('testimonials.title')} 无障碍标签={t('testimonials.ariaLabel')}>
      <div className="grid gap-6 md:grid-cols-2">
        {卡片表.map((卡片, 序号) => (
          <XianXian key={卡片.id} className="testimonial-reveal">
            <figure
              className="relative h-full rounded-md border border-border bg-panel px-6 py-5 shadow-sm transition-transform duration-300 ease-out hover:scale-[1.04]"
              style={{
                transform: `rotate(${便签角度[序号 % 便签角度.length]})`,

                willChange: 'transform',
              }}
            >
              {}
              <span
                aria-hidden="true"
                className="absolute -top-2 left-8 h-4 w-16 rotate-[-6deg] rounded-[2px] bg-primary/15"
              />
              <blockquote className="text-[15px] font-bold leading-7 text-text-primary">{卡片.引用语}</blockquote>
              <figcaption className="mt-4 flex items-baseline gap-2 border-t border-border pt-3">
                <span className="text-sm text-text-secondary">{卡片.role}</span>
                <span className="text-xs text-muted">{卡片.上下文}</span>
              </figcaption>
            </figure>
          </XianXian>
        ))}
      </div>
    </BanKuai>
  )
}
