import { useEffect, useMemo, useRef, useState } from 'react'
import { techstackV2 } from '../../data/techStack'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useIsDarkMode } from '../../components/starry-background/useIsDarkMode'
import { t } from '../../i18n/translations'
import { 创建点阵变形器, 技术字形, type 点阵图标定义 } from './asciiMorph'

/**
 * 技术栈 · ASCII 点阵变形动画（替换原 3D 旋转技术球）。
 *
 * 1:1 移植参考站（bilibilitoy wujisuan-ai-test）hero 区的 Logo 字符点阵动画：
 * 15 个技术栈图标逐一点阵化呈现，5 秒自动切换 / 点击切换，切换时最近点贪心配对
 * 形成左→右波次变形 + 弧线弯曲 + 字形过半程轮换，指针悬停产生高斯涟漪。
 * 交互与信息保全：点击画布切换，画布下方展示当前技术名 · 官网链接 · 使用该技术的项目归属；
 * reduced-motion 时静态成点阵、点击瞬切；深浅色主题切换字符颜色。
 */

const 深色字形颜色 = '#cfe6ff'
const 浅色字形颜色 = '#1e293b'

export function TechStack() {
  const reducedMotion = useReducedMotion()
  const isDark = useIsDarkMode()
  const 画布引用 = useRef<HTMLCanvasElement>(null)
  const 变形器引用 = useRef<ReturnType<typeof 创建点阵变形器>>(null)
  const [当前, 设当前] = useState<{ 序号: number; 名称: string; 总数: number } | null>(null)
  const [失败, 设失败] = useState(false)

  const 图标定义 = useMemo<点阵图标定义[]>(
    () =>
      techstackV2.map((卡片) => ({
        id: 卡片.name,
        name: 卡片.name,
        glyph: 技术字形(卡片.name),
        src: 卡片.icon,
        掩码模式: 卡片.掩码模式,
      })),
    []
  )

  const 字形颜色 = isDark ? 深色字形颜色 : 浅色字形颜色

  // 变形器只在挂载时创建一次；主题/reduced-motion 经 setter 同步，避免重建丢动画状态
  useEffect(() => {
    const 画布 = 画布引用.current
    if (!画布) return
    const 变形器 = 创建点阵变形器(画布, 图标定义, {
      静态: reducedMotion,
      颜色: 字形颜色,
      on序号变更: (序号, 名称, 总数) => 设当前({ 序号, 名称, 总数 }),
      on加载失败: () => 设失败(true),
    })
    变形器引用.current = 变形器
    return () => {
      变形器?.销毁()
      变形器引用.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [图标定义])

  useEffect(() => {
    变形器引用.current?.设静态(reducedMotion)
  }, [reducedMotion])

  useEffect(() => {
    变形器引用.current?.设颜色(字形颜色)
  }, [字形颜色])

  const 当前卡片 = 当前 ? techstackV2.find((卡片) => 卡片.name === 当前.名称) : undefined

  return (
    <div className="w-full flex flex-col items-center" aria-label={t('hero.techGroupAria')}>
      <h2 className="mb-4 bg-gradient-to-r from-[#5eead4] via-[#818cf8] to-[#f0abfc] bg-clip-text text-center text-xl font-bold tracking-wide text-transparent">
        {t('hero.techTitle')}
      </h2>
      <button
        type="button"
        // 点击切换由变形器在宿主按钮上监听（与参考站一致），此处不得再绑 onClick 以免双触发
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
          aria-label={`${当前卡片.name} ${t('hero.techLinkAria')}，${t('hero.techProjectAria')} ${当前卡片.项目.join('、')}`}
          data-testid="tech-current-link"
          className="mt-2 font-mono text-[11px] tracking-[0.1em] text-[#b9d5ff] no-underline transition-colors hover:text-[#7dd3fc] light:text-slate-600 light:hover:text-[#0369a1]"
        >
          {当前卡片.name} ↗ <span className="font-sans opacity-60 light:opacity-100">· {当前卡片.项目.join('、')}</span>
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
