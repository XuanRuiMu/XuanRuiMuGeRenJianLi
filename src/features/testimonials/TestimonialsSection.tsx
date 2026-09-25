import { Section } from '../../components/ui/Section'
import { Reveal } from '../../components/Reveal'
import { t } from '../../i18n/translations'
import { 推荐语列表 } from '../../data/testimonials'

/** 便签轻微歪斜：固定角度表，避免每帧随机导致布局抖动 */
const 便签角度 = ['-1.6deg', '1.2deg', '-0.8deg', '1.5deg'] as const

export function TestimonialsSection() {
  const 卡片表 = 推荐语列表()
  return (
    <Section id="testimonials" title={t('testimonials.title')} ariaLabel={t('testimonials.ariaLabel')}>
      <div className="grid gap-6 md:grid-cols-2">
        {卡片表.map((卡片, 序号) => (
          <Reveal key={卡片.id} className="testimonial-reveal">
            <figure
              className="relative h-full rounded-md border border-border bg-panel px-6 py-5 shadow-sm transition-transform duration-300 ease-out hover:scale-[1.04]"
              style={{
                transform: `rotate(${便签角度[序号 % 便签角度.length]})`,
                // 永久驻留合成层：hover 缩放动画会把卡片临时提升为合成层，Windows 下合成层文本
                // 改用灰度抗锯齿（ClearType 仅用于非合成文本），动画期间文字观感骤然变细，
                // 表现为「静止加粗、动画不加粗」。will-change 让静止/动画共用同一条光栅化路径，观感恒定。
                willChange: 'transform',
              }}
            >
              {/* 胶带条：打破对称，去掉模板感 */}
              <span
                aria-hidden="true"
                className="absolute -top-2 left-8 h-4 w-16 rotate-[-6deg] rounded-[2px] bg-primary/15"
              />
              <blockquote className="text-[15px] font-bold leading-7 text-text-primary">{卡片.quote}</blockquote>
              <figcaption className="mt-4 flex items-baseline gap-2 border-t border-border pt-3">
                <span className="text-sm text-text-secondary">{卡片.role}</span>
                <span className="text-xs text-muted">{卡片.context}</span>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
