import { useEffect, useMemo, useRef, useState } from 'react'
import { 技术卡表, 取项目归属名 } from '../../数据/技术栈'
import { useJianShaoDongHua } from '../../钩子/useJianShaoDongHua'
import { useShiFouAnSe } from '../../组件/星空背景/useShiFouAnSe'
import { t } from '../../国际化/翻译'
import { 创建点阵变形器, 技术字形, type 点阵图标定义 } from './DianZhenBianXing'

const 深色字形颜色 = '#cfe6ff'
const 浅色字形颜色 = '#1e293b'

export function JiShuZhan() {
  const 减少动画 = useJianShaoDongHua()
  const 是深色 = useShiFouAnSe()
  const 画布引用 = useRef<HTMLCanvasElement>(null)
  const 变形器引用 = useRef<ReturnType<typeof 创建点阵变形器>>(null)
  const [当前, 设当前] = useState<{ 序号: number; 名称: string; 总数: number } | null>(null)
  const [失败, 设失败] = useState(false)

  const 图标定义 = useMemo<点阵图标定义[]>(
    () =>
      技术卡表.map((卡片) => ({
        id: 卡片.name,
        name: 卡片.name,
        字形: 技术字形(卡片.name),
        src: 卡片.图标,
        掩码模式: 卡片.掩码模式,
      })),
    []
  )

  const 字形颜色 = 是深色 ? 深色字形颜色 : 浅色字形颜色
  const 当前减少动画 = useRef(减少动画)
  const 当前字形颜色 = useRef(字形颜色)

  useEffect(() => {
    当前减少动画.current = 减少动画
    变形器引用.current?.设静态(减少动画)
  }, [减少动画])

  useEffect(() => {
    当前字形颜色.current = 字形颜色
    变形器引用.current?.设颜色(字形颜色)
  }, [字形颜色])

  useEffect(() => {
    const 画布 = 画布引用.current
    if (!画布) return
    const 变形器 = 创建点阵变形器(画布, 图标定义, {
      静态: 当前减少动画.current,
      颜色: 当前字形颜色.current,
      on序号变更: (序号, 名称, 总数) => 设当前({ 序号, 名称, 总数 }),
      on加载失败: () => 设失败(true),
    })
    变形器引用.current = 变形器
    return () => {
      变形器?.销毁()
      变形器引用.current = null
    }
  }, [图标定义])

  const 当前卡片 = 当前 ? 技术卡表.find((卡片) => 卡片.name === 当前.名称) : undefined
  const 归属名表 = 当前卡片 ? 当前卡片.项目.map(取项目归属名) : []

  return (
    <div className="w-full flex flex-col items-center" aria-label={t('hero.techGroupAria')}>
      <h2 className="mb-4 bg-gradient-to-r from-[#5eead4] via-[#818cf8] to-[#f0abfc] bg-clip-text text-center text-xl font-bold tracking-wide text-transparent">
        {t('hero.techTitle')}
      </h2>
      <button
        type="button"

        aria-label={当前 ? `${t('hero.techSwitchAria')} ${当前.名称}` : t('hero.techSwitchAria')}
        aria-disabled={失败 || undefined}
        data-testid="tech-morph-button"
        className="block w-full max-w-[520px] cursor-pointer rounded-xl p-0 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-4 focus-visible:outline-[#7dd3fc]/70 light:focus-visible:outline-[#0369a1]/70"
      >
        <canvas
          ref={画布引用}
          role="img"
          aria-label={当前 ? `${当前.名称}${t('hero.techCanvasAria')}` : t('hero.techTitle')}
          data-testid="tech-ascii-canvas"
          className="block h-[320px] w-full"
        />
      </button>
      {当前卡片 && (
        <a
          href={当前卡片.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${当前卡片.name} ${t('hero.techLinkAria')}，${t('hero.techProjectAria')} ${归属名表.join('、')}`}
          data-testid="tech-current-link"
          className="mt-2 font-mono text-[11px] tracking-[0.1em] text-[#b9d5ff] no-underline transition-colors hover:text-[#7dd3fc] light:text-slate-600 light:hover:text-[#0369a1]"
        >
          {当前卡片.name} ↗ <span className="font-sans opacity-60 light:opacity-100">· {归属名表.join('、')}</span>
        </a>
      )}
      {失败 && (
        <p role="status" data-testid="tech-load-fail" className="mt-3 text-xs text-[#f0abfc] light:text-rose-600">
          {t('hero.techLoadFail')}
        </p>
      )}
    </div>
  )
}
