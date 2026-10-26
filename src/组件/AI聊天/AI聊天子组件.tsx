import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { 合并类名 } from '../../库/工具'
import { t } from '../../国际化/翻译'

export function GongJuKuai({ name, 细节 }: { name: string; 细节: string }) {
  return (
    <div className="my-1 font-mono text-[12px] leading-relaxed">
      <div className="flex items-center gap-1.5 text-[#d97757]">
        <span>{name}</span>
      </div>
      <div className="flex items-center gap-1.5 pl-5 text-[#9aa0aa]" data-testid="tool-detail">
        <span aria-hidden="true">⎿</span>
        <span>{细节}</span>
      </div>
    </div>
  )
}

export function SiKaoKuai({ 面板标识, 思考, 展开后 }: { 面板标识: string; 思考: string; 展开后: () => void }) {
  const [展开, 设置展开] = useState(false)
  return (
    <div className="my-1" data-testid="message-reasoning">
      <button
        type="button"
        aria-expanded={展开}
        aria-controls={面板标识}
        onClick={() => {
          设置展开((旧) => !旧)
          展开后()
        }}
        className="flex items-center gap-1 text-[11px] text-[#9aa0aa] transition-colors hover:text-[#d97757]"
      >
        <ChevronRight size={11} aria-hidden="true" className={合并类名('transition-transform', 展开 && 'rotate-90')} />
        <span>{t('ai.reasoningLabel')}</span>
      </button>
      {展开 && (
        <div
          id={面板标识}
          data-testid="message-reasoning-text"
          className="mt-1 whitespace-pre-wrap break-words text-[12px] text-[#9aa0aa]"
        >
          {思考}
        </div>
      )}
    </div>
  )
}
