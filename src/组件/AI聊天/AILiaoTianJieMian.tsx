import { X, Loader2, RefreshCw, ImagePlus } from 'lucide-react'
import { 合并类名 } from '../../库/工具'
import { t, 翻译数组 } from '../../国际化/翻译'
import { 模型列表 } from '../../智能/模型'
import { 有可见正文 } from '../../智能/结构化输出'
import { JieMianZuJianXuanRanQi } from './界面组件注册表'
import { 渲染Markdown, 工具轨迹描述, 努力符号表 } from './AI聊天工具'
import { GongJuKuai, SiKaoKuai } from './AI聊天子组件'
import type { AILiaoTianZhuangTai } from './useAILiaoTianZhuangTai'

export function AILiaoTianJieMian({ 状态, className }: { 状态: AILiaoTianZhuangTai; className?: string }) {
  const {
    AI思考,
    设置思考展开次数,
    设置拖拽中,
    设置补全下标,
    会话模型,
    努力标签,
    重置输入历史下标,
    压缩中,
    发送错误,
    可见消息,
    在途,
    处理快捷问题,
    处理按键,
    处理重置,
    开始调整尺寸,
    待处理图片,
    思考秒数,
    拖拽中,
    排队中,
    接收图片文件,
    提交输入,
    文件输入引用,
    显示全局思考行,
    有会话,
    有效模型,
    模型选择下标,
    模型选择中,
    消息末尾引用,
    灯箱地址,
    确认补全,
    移除待发图片,
    系统行表,
    聊天打开,
    补全下标,
    补全候选,
    补全可见数,
    补全打开,
    补全起始,
    设置灯箱地址,
    设置聊天打开,
    设置输入,
    输入,
    输入引用,
    进行中,
    追问建议,
    面板尺寸,
  } = 状态

  if (!聊天打开) {
    return (
      <button
        type="button"
        onClick={() => 设置聊天打开(true)}
        className={合并类名(
          'fixed bottom-4 right-4 z-[70] flex h-12 w-12 items-center justify-center rounded-xl',
          'bg-[#1a1a1a] text-[#d97757] shadow-2xl ring-1 ring-[#2a2a2a] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d97757]',
          className
        )}
        aria-label={t('ai.title')}
      >
        <span className="font-mono text-lg font-bold">❯_</span>
      </button>
    )
  }

  return (
    <div
      data-lenis-prevent=""
      className={合并类名(
        'fixed bottom-4 right-4 z-[70] flex max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-md border border-[#262626] bg-[#0a0a0a] font-mono text-[#e6e6e6] shadow-2xl',
        className
      )}
      style={{ width: 面板尺寸.宽, height: 面板尺寸.高 }}
      role="dialog"
      aria-modal="true"
      aria-label={t('ai.title')}
      onDragOver={(事件) => {
        if (Array.from(事件.dataTransfer.types).includes('Files')) {
          事件.preventDefault()
          设置拖拽中(true)
        }
      }}
      onDragLeave={(事件) => {
        if (事件.currentTarget.contains(事件.relatedTarget as Node | null)) return
        设置拖拽中(false)
      }}
      onDrop={(事件) => {
        事件.preventDefault()
        设置拖拽中(false)
        void 接收图片文件(事件.dataTransfer.files)
      }}
    >
      {拖拽中 && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/70 text-sm text-[#d97757]">
          {t('ai.dropHint')}
        </div>
      )}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t('ai.resizeWidth')}
        data-testid="resize-left"
        onPointerDown={开始调整尺寸('宽')}
        className="absolute bottom-0 left-0 top-0 z-20 w-2 cursor-ew-resize touch-none hover:bg-[#d77757]/40"
      />
      <div
        role="separator"
        aria-orientation="horizontal"
        aria-label={t('ai.resizeHeight')}
        data-testid="resize-top"
        onPointerDown={开始调整尺寸('高')}
        className="absolute left-0 right-0 top-0 z-20 h-2 cursor-ns-resize touch-none hover:bg-[#d77757]/40"
      />
      <div
        role="separator"
        aria-label={t('ai.resizeBoth')}
        data-testid="resize-corner"
        onPointerDown={开始调整尺寸('双向')}
        className="absolute left-0 top-0 z-30 h-4 w-4 cursor-nwse-resize touch-none hover:bg-[#d77757]/60"
      />
      {}
      <div className="flex items-start justify-between border-b border-[#1f1f1f] bg-[#0d0d0d] px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex min-w-0 flex-col leading-tight">
            <div className="text-sm">
              <span className="font-semibold tracking-tight xuan-harness-rolling-gradient" data-testid="header-name">
                {t('ai.headerName')}
              </span>
              <span className="text-[#999999]">{` ${t('ai.headerVersion')}`}</span>
            </div>
            <div className="truncate text-[10px] text-[#999999]" data-testid="chat-header-status">
              {`${有效模型} · ${t('ai.headerBilling')}`}
            </div>
            <div className="truncate text-[10px] text-[#999999]">{t('ai.headerCwd')}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={处理重置}
            className="rounded p-1.5 text-[#888] transition-colors hover:bg-white/10 hover:text-[#e6e6e6]"
            aria-label={t('ai.reset')}
            title={t('ai.reset')}
          >
            <RefreshCw size={14} />
          </button>
          <button
            type="button"
            onClick={() => 设置聊天打开(false)}
            className="rounded p-1.5 text-[#888] transition-colors hover:bg-white/10 hover:text-[#e6e6e6]"
            aria-label={t('ai.close')}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div
        data-testid="chat-messages"
        data-lenis-prevent=""
        className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 scrollbar-thin"
      >
        {有会话 ? (
          <div className="flex flex-col gap-3">
            {可见消息.map((消息, 下标) => {
              const 有正文 = 有可见正文(消息.content)
              if (消息.role === 'user') {
                return (
                  <div key={`user-${下标}`} className="flex gap-2 text-[13px] leading-relaxed text-[#ededed]">
                    <span className="select-none text-[#d97757]" aria-hidden="true">
                      ❯
                    </span>
                    <div className="min-w-0 flex-1">
                      {消息.图片表 && 消息.图片表.length > 0 && (
                        <div className="mb-1.5 flex flex-wrap gap-1.5" data-testid="message-images">
                          {消息.图片表.map((src, 图片下标) => (
                            <button
                              key={`${图片下标}-${src.slice(-12)}`}
                              type="button"
                              onClick={() => 设置灯箱地址(src)}
                              className="overflow-hidden rounded border border-[#2a2a2a] transition-colors hover:border-[#d97757]"
                            >
                              <img src={src} alt="" className="h-16 w-16 object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                      {消息.content && <span className="whitespace-pre-wrap break-words">{消息.content}</span>}
                    </div>
                  </div>
                )
              }
              return (
                <div
                  key={`assistant-${下标}`}
                  className="flex gap-2 text-[13px] leading-relaxed text-[#e6e6e6]"
                  data-testid="assistant-placeholder"
                >
                  {有正文 && (
                    <span className="select-none pt-0.5 text-[#d97757]" aria-hidden="true">
                      ⏺
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {有正文 ? (
                      <GongJuKuai name={t('ai.toolName')} 细节={工具轨迹描述(消息)} />
                    ) : 在途 ? (
                      <div
                        data-testid="pending-thinking"
                        className="flex min-w-0 flex-1 flex-col text-[13px] text-[#9aa0aa]"
                      >
                        <div className="flex items-center gap-1.5">
                          <Loader2 size={13} className="animate-spin text-[#d97757]" />
                          <span>{`${t('ai.thinking')} · ${思考秒数}s · ${t('ai.cancelHint')}`}</span>
                        </div>
                        <GongJuKuai name={t('ai.toolName')} 细节={t('ai.toolRetrieving')} />
                      </div>
                    ) : null}
                    {消息.思考内容 && 消息.思考内容.length > 0 && (
                      <SiKaoKuai
                        面板标识={`message-reasoning-panel-${下标}`}
                        思考={消息.思考内容}
                        展开后={() => 设置思考展开次数((旧) => 旧 + 1)}
                      />
                    )}
                    {有正文 && (
                      <div
                        data-testid="assistant-answer"
                        dangerouslySetInnerHTML={{ __html: 渲染Markdown(消息.content) }}
                      />
                    )}
                    {有正文 && 消息.组件 && <JieMianZuJianXuanRanQi 组件={消息.组件} />}
                  </div>
                </div>
              )
            })}
            {显示全局思考行 && (
              <div data-testid="pending-thinking" className="flex gap-2 text-[13px] text-[#9aa0aa]">
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin text-[#d97757]" />
                    <span>
                      {压缩中
                        ? t('ai.commands.compacting')
                        : `${t('ai.thinking')} · ${思考秒数}s · ${t('ai.cancelHint')}`}
                    </span>
                  </div>
                  {!压缩中 && <GongJuKuai name={t('ai.toolName')} 细节={t('ai.toolRetrieving')} />}
                </div>
              </div>
            )}
            {模型选择中 && (
              <div
                className="border-t border-[#b1b9f9] pt-2 font-mono text-[12px] leading-relaxed"
                data-testid="model-picker"
              >
                <div className="font-bold text-[#b1b9f9]">{t('ai.modelPicker.selectTitle')}</div>
                <div className="whitespace-pre-wrap text-[#9aa0aa]">{t('ai.modelPicker.selectDesc')}</div>
                {会话模型 && (
                  <div className="text-[#9aa0aa]">{`${t('ai.modelPicker.sessionLinePrefix')} ${会话模型} ${t('ai.modelPicker.sessionLineSuffix')}`}</div>
                )}
                <div className="mt-1 flex flex-col">
                  {模型列表().map((模型, 下标) => {
                    const 高亮 = 下标 === 模型选择下标
                    const 当前生效 = 模型.id === 有效模型
                    return (
                      <div key={模型.id} data-testid={`model-option-${下标 + 1}`} className="flex items-center gap-1">
                        <span className={高亮 ? 'text-[#b1b9f9]' : 'text-transparent'} aria-hidden="true">
                          ❯
                        </span>
                        <span className="text-[#9aa0aa]">{`${下标 + 1}.`}</span>
                        <span className={当前生效 ? 'text-[#4eba65]' : 高亮 ? 'text-[#b1b9f9]' : 'text-[#9aa0aa]'}>
                          {模型.id}
                          {当前生效 && <span className="text-[#af87ff]"> ✓</span>}
                        </span>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-1">
                  <span className="text-[#d77757]">{`${努力符号表[AI思考]} ${努力标签}`}</span>
                  <span className="text-[#505050]">{` ${t('ai.modelPicker.effortAdjust')}`}</span>
                </div>
                <div className="italic text-[#9aa0aa]">{t('ai.modelPicker.confirmHint')}</div>
              </div>
            )}
            {系统行表.length > 0 && (
              <div className="whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-[#9aa0aa]">
                {系统行表.map((行, 下标) => (
                  <div key={`${下标}-${行.slice(0, 8)}`}>{行}</div>
                ))}
              </div>
            )}
            {!进行中 && !压缩中 && !模型选择中 && 追问建议.length === 3 && (
              <div className="mt-1" data-testid="follow-up-suggestions">
                <p className="mb-1.5 text-[11px] text-[#666]">{t('ai.followUps.label')}</p>
                <div className="flex flex-wrap gap-2">
                  {追问建议.map((建议) => (
                    <button
                      key={建议}
                      type="button"
                      disabled={进行中 || 压缩中}
                      onClick={() => 处理快捷问题(建议)}
                      className="rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1 text-xs text-[#cfcfcf] transition-colors hover:border-[#d97757] hover:text-[#f0f0f0] disabled:opacity-50"
                    >
                      {建议}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div ref={消息末尾引用} />
          </div>
        ) : (
          <div className="flex h-full flex-col justify-center gap-2 text-[13px]">
            <p data-testid="welcome-line">
              <span className="xuan-harness-fixed-orange" data-testid="welcome-full">
                <span aria-hidden="true">✻ </span>
                {t('ai.welcomePrefix')}&nbsp;{t('ai.welcomeTitle')}
                {t('ai.welcomeTitleSuffix')}
              </span>
            </p>
            <p className="text-[#cfcfcf]">{t('ai.empty')}</p>
            <p className="text-xs text-[#9aa0aa]">{t('ai.welcomeIntro')}</p>
            <p className="text-[11px] text-[#666]">{t('ai.welcomeTips')}</p>
            <p className="mt-1 text-[11px] text-[#666]">{t('ai.extendedLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {翻译数组('ai.quickQuestions').map((问题) => (
                <button
                  key={问题}
                  type="button"
                  disabled={进行中}
                  onClick={() => 处理快捷问题(问题)}
                  className="rounded-full border border-[#2a2a2a] bg-[#161616] px-3 py-1 text-xs text-[#cfcfcf] transition-colors hover:border-[#d97757] hover:text-[#f0f0f0] disabled:opacity-50"
                >
                  {问题}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {发送错误 && (
        <div className="border-t border-[#2a2a2a] bg-[#3b1d1d] px-3 py-2 text-xs text-[#f0a0a0]" role="alert">
          {发送错误}
        </div>
      )}

      {}
      {排队中.length > 0 && (
        <div className="border-t border-[#1f1f1f] bg-[#0d0d0d] px-3 py-1.5 font-mono text-[11px] text-[#9aa0aa]">
          {排队中.map((项, 下标) => (
            <div key={`${下标}-${项.content.slice(0, 8)}`} className="truncate">
              ⏳ {t('ai.queue.label')} {下标 + 1}：{项.content}
              {项.图片表 && 项.图片表.length > 0 ? ` [${项.图片表.length} img]` : ''}
            </div>
          ))}
          <div className="text-[#666]">{t('ai.queue.hint')}</div>
        </div>
      )}

      <form
        onSubmit={(事件) => {
          事件.preventDefault()
          提交输入(输入)
        }}
        className="relative border-t border-[#1f1f1f] bg-[#0a0a0a] p-2.5"
      >
        {补全打开 && (
          <div
            role="listbox"
            aria-label={t('ai.commands.modelHint')}
            data-testid="command-palette"
            className="absolute inset-x-2.5 bottom-full z-10 mb-1 overflow-hidden rounded border border-[#2a2a2a] bg-[#121212] py-1 shadow-2xl"
          >
            {补全候选.map((项, 下标) =>
              下标 < 补全起始 || 下标 >= 补全起始 + 补全可见数 ? null : (
                <button
                  key={项.指令}
                  type="button"
                  role="option"
                  aria-selected={下标 === 补全下标}
                  onMouseDown={(事件) => {
                    事件.preventDefault()
                    设置补全下标(下标)
                    确认补全()
                  }}
                  onMouseEnter={() => 设置补全下标(下标)}
                  className={合并类名(
                    'flex w-full items-center gap-3 px-2.5 py-1.5 text-left text-[12px]',
                    下标 === 补全下标 ? 'text-[#b1b9f9]' : 'text-[#9aa0aa]'
                  )}
                >
                  <span className="shrink-0 font-mono">{项.指令}</span>
                  <span className="truncate">{项.描述}</span>
                </button>
              )
            )}
          </div>
        )}
        {待处理图片.length > 0 && (
          <div className="mb-1.5 flex flex-wrap gap-1.5" data-testid="pending-images">
            {待处理图片.map((图片) => (
              <span key={图片.key} className="relative inline-block">
                <img
                  src={图片.预览地址}
                  alt=""
                  className={合并类名(
                    'h-12 w-12 rounded object-cover',
                    图片.ok ? 'ring-1 ring-[#2a2a2a]' : 'ring-2 ring-red-500'
                  )}
                />
                {!图片.ok && (
                  <span
                    data-testid="pending-images-failed"
                    className="absolute inset-0 flex items-center justify-center rounded bg-black/60 p-0.5 text-center text-[10px] font-semibold leading-tight text-red-500"
                  >
                    {t('ai.imageRejected')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => 移除待发图片(图片.key)}
                  aria-label={t('ai.removeImage')}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#333] text-[10px] leading-none text-[#eee] hover:bg-[#d97757]"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex items-start gap-2 rounded-none border-x-0 border-y border-[#888] bg-[#121212] px-2.5 py-2 transition-colors focus-within:border-[#a6a6a6]">
          <span className="select-none pt-0.5 text-[#e6e6e6]" aria-hidden="true">
            ❯
          </span>
          <textarea
            ref={输入引用}
            name="message"
            rows={1}
            value={输入}
            onChange={(事件) => {
              设置输入(事件.target.value)
              重置输入历史下标()
            }}
            onKeyDown={处理按键}
            onPaste={(事件) => {
              const 剪贴板文件 = 事件.clipboardData?.files
              if (!剪贴板文件 || 剪贴板文件.length === 0) return
              const 图片文件 = Array.from(剪贴板文件).filter(
                (文件) => 文件.type.startsWith('image/') || 文件.type === ''
              )
              if (图片文件.length > 0) {
                事件.preventDefault()
                void 接收图片文件(图片文件)
              }
            }}
            aria-label={t('ai.title')}
            data-lenis-prevent=""
            className="max-h-40 flex-1 resize-none overflow-y-auto overscroll-contain bg-transparent text-[13px] leading-relaxed text-[#e6e6e6] outline-none"
            maxLength={2000}
          />
          <button
            type="button"
            onClick={() => 文件输入引用.current?.click()}
            className="text-[#666] transition-colors hover:text-[#d97757]"
            aria-label={t('ai.attachImage')}
            title={t('ai.attachImage')}
          >
            <ImagePlus size={16} />
          </button>
          <input
            ref={文件输入引用}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(事件) => {
              void 接收图片文件(事件.target.files)
              事件.target.value = ''
            }}
          />
          <span
            aria-hidden="true"
            className={合并类名('inline-block h-4 w-[7px] bg-[#e6e6e6]', !进行中 && 'animate-pulse')}
          />
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px]">
          <span className="min-w-0 flex-1 truncate" data-testid="chat-status-line">
            <span className="text-[#ff6b80]" aria-hidden="true">
              {'>> '}
            </span>
            <span className="text-[#ff6b80]">{`${有效模型} · think ${AI思考}${会话模型 ? ` · ${t('ai.modelPicker.sessionBadge')}` : ''}`}</span>
            <span className="text-[#666]">{` ${t('ai.statusCycle')}`}</span>
          </span>
          <span className="shrink-0 text-[#666]">{进行中 || 压缩中 ? t('ai.busyHint') : t('ai.idleHint')}</span>
        </div>
      </form>

      {}
      {灯箱地址 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('ai.title')}
          data-testid="chat-lightbox"
          onClick={() => 设置灯箱地址(null)}
          className="fixed inset-0 z-[80] flex cursor-zoom-out items-center justify-center bg-black/85 p-6"
        >
          <img
            src={灯箱地址}
            alt=""
            onClick={(事件) => 事件.stopPropagation()}
            className="max-h-full max-w-full cursor-default rounded-lg shadow-2xl"
          />
        </div>
      )}
    </div>
  )
}
