import { useRef, useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { t, type 翻译键 } from '../../国际化/翻译'
import { 合并类名 } from '../../库/工具'
import { 项目表 } from '../../数据/项目'
import { 经历表 } from '../../数据/经历'
import { 教育档案 } from '../../数据/教育'
import { 个人信息 } from '../../数据/个人信息'
import type { 项目卡片组件, 时间线组件, 界面组件 } from '../../智能/结构化输出'

interface 界面组件渲染属性<T extends 界面组件> {
  组件: T
}

function XiangMuKaPianXuanRanQi({ 组件 }: 界面组件渲染属性<项目卡片组件>) {
  const 项目 = 项目表.find((项) => 项.id === 组件.项目编号)

  if (!项目) {
    return (
      <div className="rounded-xl border border-border bg-surface-elevated p-4 text-sm text-muted">
        {t('ai.component.projectNotFound')}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface-elevated">
      <div className="border-b border-border bg-surface px-4 py-3">
        <h3 className="text-sm font-medium text-text-primary">{t(项目.名称键)}</h3>
      </div>
      <div className="px-4 py-3">
        <p className="mb-3 text-xs leading-relaxed text-text-secondary">{t(项目.描述键)}</p>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {项目.标签表.map((标签) => (
            <span key={标签} className="rounded-full bg-secondary/10 px-2 py-0.5 text-[10px] text-secondary">
              {标签}
            </span>
          ))}
        </div>
        {项目.链接表 && 项目.链接表.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {项目.链接表.map((链接) => (
              <a
                key={链接.url}
                href={链接.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {t(链接.标签键)}
                <ExternalLink size={10} />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface 时间线条目 {
  年份: string
  标签: string
}

const 时间线标题键表: Record<NonNullable<时间线组件['scope']>, 翻译键> = {
  experience: 'experience.title',
  media: 'media.title',
  education: 'education.title',
}

function 取媒体时间线条目(): 时间线条目[] {
  return [
    { 年份: '2022', 标签: t('data.media.timeline.2022') },
    { 年份: '2023', 标签: t('data.media.timeline.2023') },
    { 年份: '2024', 标签: t('data.media.timeline.2024') },
    { 年份: '2025', 标签: t('data.media.timeline.2025') },
  ]
}

function 获取经历时间线条目(): 时间线条目[] {
  return 经历表.map((条目) => ({
    年份: t(条目.周期键).split(' ')[0] ?? t(条目.周期键),
    标签: `${t(条目.标题键)}${条目.机构键 ? ` · ${t(条目.机构键)}` : ''}`,
  }))
}

function 取教育时间线条目(): 时间线条目[] {
  const 摘要 = 教育档案.摘要
  return [
    { 年份: 摘要.周期.split(' - ')[0] ?? 摘要.周期, 标签: `${摘要.学校} · ${摘要.专业}` },
    ...教育档案.成就键表.map((key) => ({ 年份: '', 标签: t(key) })),
  ]
}

function 取时间线条目(scope: 时间线组件['scope']): 时间线条目[] {
  switch (scope) {
    case 'experience':
      return 获取经历时间线条目()
    case 'education':
      return 取教育时间线条目()
    case 'media':
      return 取媒体时间线条目()
    default:
      return 获取经历时间线条目()
  }
}

function ShiJianXianXuanRanQi({ 组件 }: 界面组件渲染属性<时间线组件>) {
  const title = 组件.scope ? t(时间线标题键表[组件.scope]) : t('experience.title')
  const 条目表 = 取时间线条目(组件.scope)

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <h3 className="mb-3 text-xs font-medium text-text-primary">{title}</h3>
      <div className="relative space-y-4 pl-4 before:absolute before:left-1.5 before:top-1 before:h-[calc(100%-8px)] before:w-px before:bg-border">
        {条目表.map((条目, 下标) => (
          <div key={`${条目.年份}-${下标}`} className="relative">
            <span className="absolute -left-4 top-1 h-3 w-3 rounded-full border-2 border-border bg-surface" />
            {条目.年份 && <p className="text-[10px] font-medium text-primary">{条目.年份}</p>}
            <p className="text-xs text-text-secondary">{条目.标签}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function LianXiLianJieXuanRanQi() {
  const [已复制, 设置已复制] = useState<string | null>(null)
  const 计时器 = useRef<number | undefined>(undefined)
  const 标记复制成功 = (id: string) => {
    设置已复制(id)
    window.clearTimeout(计时器.current)
    计时器.current = window.setTimeout(() => 设置已复制(null), 2000)
  }
  const 复制文本 = async (id: string, 文本: string) => {
    try {
      await navigator.clipboard.writeText(文本)
      标记复制成功(id)
    } catch {
      return
    }
  }
  const 尝试唤起 = (地址: string) => {
    let 可打开 = false
    try {
      const 解析 = new URL(地址)
      可打开 =
        解析.protocol === 'https:' ||
        解析.protocol === 'http:' ||
        解析.protocol === 'tencent:' ||
        解析.protocol === 'weixin:'
    } catch {
      可打开 = false
    }
    if (!可打开) return
    try {
      window.open(地址, '_blank', 'noopener')
    } catch {
      return
    }
  }
  const 复制并唤起 = (id: string, 文本: string, 地址: string) => {
    void 复制文本(id, 文本)
    尝试唤起(地址)
  }
  const 按钮样式 =
    'inline-flex items-center justify-center gap-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text-primary transition-colors hover:border-primary'
  const 直开项 = [
    { id: 'github', 地址: 个人信息.GitHub, 标签: t('ai.contactLinks.github') },
    { id: 'bilibili', 地址: 个人信息.哔哩哔哩, 标签: t('ai.contactLinks.bilibili') },
  ]
  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-3">
      <div className="grid grid-cols-2 gap-2">
        {直开项.map((项) => (
          <a
            key={项.id}
            href={项.地址}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${项.标签}${t('ai.contactLinks.open')}`}
            className={按钮样式}
          >
            <span className="truncate">{项.标签}</span>
            <ExternalLink size={12} />
          </a>
        ))}
        <button
          type="button"
          aria-label={`${t('ai.contactLinks.qq')}${t('ai.contactLinks.copy')}`}
          onClick={() => 复制并唤起('qq', 个人信息.QQ, `tencent://message/?uin=${encodeURIComponent(个人信息.QQ)}`)}
          className={按钮样式}
        >
          {已复制 === 'qq' ? <Check size={12} /> : <Copy size={12} />}
          <span className="truncate">
            {t('ai.contactLinks.qq')} · {已复制 === 'qq' ? t('ai.contactLinks.copied') : t('ai.contactLinks.copy')}
          </span>
        </button>
        <button
          type="button"
          aria-label={`${t('ai.contactLinks.wechat')}${t('ai.contactLinks.copy')}`}
          onClick={() => 复制并唤起('wechat', 个人信息.wechat, 'weixin://')}
          className={按钮样式}
        >
          {已复制 === 'wechat' ? <Check size={12} /> : <Copy size={12} />}
          <span className="truncate">
            {t('ai.contactLinks.wechat')} ·{' '}
            {已复制 === 'wechat' ? t('ai.contactLinks.copied') : t('ai.contactLinks.copy')}
          </span>
        </button>
        <button
          type="button"
          aria-label={`${t('ai.contactLinks.phone')}${t('ai.contactLinks.copy')}`}
          onClick={() => void 复制文本('phone', 个人信息.电话)}
          className={合并类名(按钮样式, 'col-span-2')}
        >
          {已复制 === 'phone' ? <Check size={12} /> : <Copy size={12} />}
          <span className="truncate">
            {t('ai.contactLinks.phone')} ·{' '}
            {已复制 === 'phone' ? t('ai.contactLinks.copied') : t('ai.contactLinks.copy')}
          </span>
        </button>
      </div>
    </div>
  )
}

interface 界面组件渲染器属性 {
  组件: 界面组件
  className?: string
}

export function JieMianZuJianXuanRanQi({ 组件, className }: 界面组件渲染器属性) {
  return (
    <div className={合并类名('mt-2', className)} data-testid={`ui-component-${组件.type}`}>
      {组件.type === 'ProjectCard' && <XiangMuKaPianXuanRanQi 组件={组件} />}
      {组件.type === 'Timeline' && <ShiJianXianXuanRanQi 组件={组件} />}
      {组件.type === 'ContactLinks' && <LianXiLianJieXuanRanQi />}
    </div>
  )
}
