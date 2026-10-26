import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { 合并类名 } from '../../库/工具'
import { t, 填充 } from '../../国际化/翻译'

const 尺寸 = 15
const 空位 = 0
const 黑子 = 1
const 白子 = 2

type 棋子 = typeof 空位 | typeof 黑子 | typeof 白子
type 棋盘结构 = 棋子[][]
type 坐标 = [number, number]
type 对局模式 = 'pve' | 'pvp'

const 方向表: 坐标[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

const 星位表: 坐标[] = [
  [7, 7],
  [3, 3],
  [3, 11],
  [11, 3],
  [11, 11],
]

function 创建棋盘(): 棋盘结构 {
  return Array.from({ length: 尺寸 }, () => Array<棋子>(尺寸).fill(空位))
}

function QiPanWangGe() {
  return (
    <svg
      viewBox="0 0 14 14"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
    >
      {Array.from({ length: 尺寸 }).map((_, i) => (
        <line key={`v${i}`} x1={i} y1={0} x2={i} y2={14} stroke="var(--color-board-line)" strokeWidth={0.03} />
      ))}
      {Array.from({ length: 尺寸 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i} x2={14} y2={i} stroke="var(--color-board-line)" strokeWidth={0.03} />
      ))}
      {星位表.map(([r, c]) => (
        <circle key={`s${r}${c}`} cx={c} cy={r} r={0.13} fill="var(--color-board-star)" />
      ))}
    </svg>
  )
}

let 落子音频上下文: AudioContext | null = null
function 获取落子音频上下文(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const 构造器 =
    window.AudioContext || (window as unknown as { WebKit音频上下文?: typeof AudioContext }).WebKit音频上下文
  if (!构造器) return null
  if (!落子音频上下文) 落子音频上下文 = new 构造器()
  if (落子音频上下文.state === 'suspended') void 落子音频上下文.resume()
  return 落子音频上下文
}

function 播放落子音效(颜色: 棋子): void {
  const 上下文 = 获取落子音频上下文()
  if (!上下文) return
  const 当前时刻 = 上下文.currentTime
  const 起始频率 = 颜色 === 白子 ? 616 : 440
  const 结束频率 = 颜色 === 白子 ? 252 : 180
  const 振荡 = 上下文.createOscillator()
  const 增益 = 上下文.createGain()
  振荡.type = 'triangle'
  振荡.frequency.setValueAtTime(起始频率, 当前时刻)
  振荡.frequency.exponentialRampToValueAtTime(结束频率, 当前时刻 + 0.09)
  增益.gain.setValueAtTime(0.0001, 当前时刻)
  增益.gain.exponentialRampToValueAtTime(0.22, 当前时刻 + 0.005)
  增益.gain.exponentialRampToValueAtTime(0.0001, 当前时刻 + 0.12)
  振荡.connect(增益).connect(上下文.destination)
  振荡.start(当前时刻)
  振荡.stop(当前时刻 + 0.13)
}

function 评估落点(棋盘: 棋盘结构, r: number, c: number, 玩家: 棋子): number {
  let 总计 = 0
  for (const [dr, dc] of 方向表) {
    let 数量 = 1
    let 开放端数 = 0
    for (const 符号 of [1, -1]) {
      let 半径 = r + dr * 符号
      let 连子数 = c + dc * 符号
      while (半径 >= 0 && 半径 < 尺寸 && 连子数 >= 0 && 连子数 < 尺寸 && 棋盘[半径][连子数] === 玩家) {
        数量++
        半径 += dr * 符号
        连子数 += dc * 符号
      }
      if (半径 >= 0 && 半径 < 尺寸 && 连子数 >= 0 && 连子数 < 尺寸 && 棋盘[半径][连子数] === 空位) 开放端数++
    }
    if (数量 >= 5) 总计 += 1_000_000
    else if (数量 === 4) 总计 += 开放端数 === 2 ? 50_000 : 8_000
    else if (数量 === 3) 总计 += 开放端数 === 2 ? 2_000 : 400
    else if (数量 === 2) 总计 += 开放端数 === 2 ? 120 : 30
    else 总计 += 5
  }
  return 总计
}

function 寻找最佳落子(棋盘: 棋盘结构, 电脑玩家: 棋子, 人类玩家: 棋子): 坐标 {
  let 最优 = -1
  let 落子: 坐标 = [Math.floor(尺寸 / 2), Math.floor(尺寸 / 2)]
  for (let r = 0; r < 尺寸; r++) {
    for (let c = 0; c < 尺寸; c++) {
      if (棋盘[r][c] !== 空位) continue
      let 最近 = false
      for (let 半径 = Math.max(0, r - 2); 半径 <= Math.min(尺寸 - 1, r + 2) && !最近; 半径++) {
        for (let 连子数 = Math.max(0, c - 2); 连子数 <= Math.min(尺寸 - 1, c + 2); 连子数++) {
          if (棋盘[半径][连子数] !== 空位) {
            最近 = true
            break
          }
        }
      }
      if (!最近) continue
      const 得分 = 评估落点(棋盘, r, c, 电脑玩家) + 评估落点(棋盘, r, c, 人类玩家) * 1.15
      if (得分 > 最优) {
        最优 = 得分
        落子 = [r, c]
      }
    }
  }
  return 落子
}

function 获取获胜连线(棋盘: 棋盘结构, r: number, c: number, 玩家: 棋子): 坐标[] | null {
  for (const [dr, dc] of 方向表) {
    const 行: 坐标[] = [[r, c]]
    for (const 符号 of [1, -1]) {
      let 半径 = r + dr * 符号
      let 连子数 = c + dc * 符号
      while (半径 >= 0 && 半径 < 尺寸 && 连子数 >= 0 && 连子数 < 尺寸 && 棋盘[半径][连子数] === 玩家) {
        行.push([半径, 连子数])
        半径 += dr * 符号
        连子数 += dc * 符号
      }
    }
    if (行.length >= 5) return 行
  }
  return null
}

export function WuZiQi() {
  const [mode, 设置模式] = useState<对局模式>('pve')
  const [棋盘, 设置棋盘] = useState<棋盘结构>(创建棋盘)
  const [回合, 设置回合] = useState<棋子>(黑子)
  const [获胜者, 设置获胜者] = useState<棋子 | null>(null)
  const [最后落子, 设置最后落子] = useState<坐标 | null>(null)
  const [获胜连线, 设置获胜连线] = useState<坐标[]>([])
  const [思考中, 设置思考中] = useState(false)
  const [翻转中, 设置翻转中] = useState(false)
  const 翻转清除定时器引用 = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(翻转清除定时器引用.current), [])

  const 电脑落子 = useCallback((下一个: 棋盘结构) => {
    const [r, c] = 寻找最佳落子(下一个, 白子, 黑子)
    const 之后 = 下一个.map((行) => 行.slice())
    之后[r][c] = 白子
    播放落子音效(白子)
    设置棋盘(之后)
    设置最后落子([r, c])
    const 行 = 获取获胜连线(之后, r, c, 白子)
    if (行) {
      设置获胜者(白子)
      设置获胜连线(行)
    } else {
      设置回合(黑子)
    }
    设置思考中(false)
  }, [])

  const 处理落子 = useCallback(
    (r: number, c: number) => {
      if (获胜者 || 棋盘[r][c] !== 空位) return

      if (mode === 'pve' && 回合 !== 黑子) return
      const 下一个 = 棋盘.map((行) => 行.slice())
      下一个[r][c] = 回合
      播放落子音效(回合)
      设置棋盘(下一个)
      设置最后落子([r, c])
      const 行 = 获取获胜连线(下一个, r, c, 回合)
      if (行) {
        设置获胜者(回合)
        设置获胜连线(行)
        设置思考中(false)
        return
      }
      if (mode === 'pve') {
        设置回合(白子)
        设置思考中(true)
        window.setTimeout(() => 电脑落子(下一个), 240)
      } else {
        设置回合(回合 === 黑子 ? 白子 : 黑子)
      }
    },
    [棋盘, 回合, 获胜者, mode, 电脑落子]
  )

  const 清空棋盘 = useCallback(() => {
    设置棋盘(创建棋盘())
    设置回合(黑子)
    设置获胜者(null)
    设置最后落子(null)
    设置获胜连线([])
    设置思考中(false)
  }, [])

  const 重置 = useCallback(() => {
    if (翻转中) return
    const 归约 = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (归约) {
      清空棋盘()
      return
    }
    设置翻转中(true)
    window.clearTimeout(翻转清除定时器引用.current)
    翻转清除定时器引用.current = window.setTimeout(清空棋盘, 400)
  }, [翻转中, 清空棋盘])

  const 切换模式 = useCallback((下一个: 对局模式) => {
    设置模式(下一个)

    设置棋盘(创建棋盘())
    设置回合(黑子)
    设置获胜者(null)
    设置最后落子(null)
    设置获胜连线([])
    设置思考中(false)
  }, [])

  const 状态 = useMemo(() => {
    if (获胜者 === 黑子) return mode === 'pve' ? t('contact.gomoku.winBlack') : t('contact.gomoku.winBlackPvp')
    if (获胜者 === 白子) return mode === 'pve' ? t('contact.gomoku.winWhitePve') : t('contact.gomoku.winWhitePvp')
    if (mode === 'pve') return 思考中 ? t('contact.gomoku.aiThinking') : t('contact.gomoku.yourTurn')
    return 回合 === 黑子 ? t('contact.gomoku.blackTurn') : t('contact.gomoku.whiteTurn')
  }, [获胜者, 回合, mode, 思考中])

  const 获胜 = (r: number, c: number) => 获胜连线.some(([wr, wc]) => wr === r && wc === c)

  return (
    <div className="flex w-full max-w-[340px] flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text font-mono text-sm font-bold text-transparent">
          {t('contact.gomoku.title')}
        </span>
        <div
          className="flex items-center gap-0.5 rounded-full border border-border p-0.5"
          role="group"
          aria-label={t('contact.gomoku.modeGroup')}
        >
          <button
            type="button"
            onClick={() => 切换模式('pve')}
            aria-pressed={mode === 'pve'}
            className={合并类名(
              'rounded-full px-2.5 py-1 text-xs transition-colors',
              mode === 'pve'
                ? 'bg-gradient-to-r from-[#d97757] to-[#fb7185] text-white shadow-[0_2px_10px_rgba(217,119,87,0.5)]'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t('contact.gomoku.modePve')}
          </button>
          <button
            type="button"
            onClick={() => 切换模式('pvp')}
            aria-pressed={mode === 'pvp'}
            className={合并类名(
              'rounded-full px-2.5 py-1 text-xs transition-colors',
              mode === 'pvp'
                ? 'bg-gradient-to-r from-[#d97757] to-[#fb7185] text-white shadow-[0_2px_10px_rgba(217,119,87,0.5)]'
                : 'text-text-secondary hover:text-text-primary'
            )}
          >
            {t('contact.gomoku.modePvp')}
          </button>
        </div>
        <button
          type="button"
          onClick={重置}
          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs text-text-primary transition-colors hover:border-[#d97757] hover:text-text-primary"
          aria-label={t('contact.gomoku.reset')}
        >
          <RotateCcw size={12} />
          {t('contact.gomoku.flipTable')}
        </button>
      </div>

      <span className="font-mono text-xs text-text-secondary">{状态}</span>

      <div
        className="relative w-full max-w-[320px] rounded-3xl bg-gradient-to-br from-[#d97757] via-[#f0abfc] to-[#38bdf8] p-[2px] shadow-[0_12px_44px_var(--color-panel-shadow)]"
        style={{ perspective: '900px' }}
      >
        {}
        <div
          className={合并类名('gomoku-flip', 翻转中 && 'is-flipping')}
          onAnimationEnd={(事件) => {
            if (翻转中 && 事件.target === 事件.currentTarget) {
              设置翻转中(false)
            }
          }}
        >
          {}
          <div className="gomoku-flip__face gomoku-flip__face--front">
            <div className="relative h-full w-full">
              <QiPanWangGe />

              {}
              {棋盘.map((行, r) =>
                行.map((格, c) => {
                  const 是最后 = 最后落子?.[0] === r && 最后落子?.[1] === c
                  const 是否获胜 = 获胜(r, c)
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      onClick={() => 处理落子(r, c)}
                      disabled={获胜者 !== null}
                      aria-label={填充(t('contact.gomoku.cell'), {
                        行: r + 1,
                        列: c + 1,
                        棋子:
                          格 === 黑子
                            ? t('contact.gomoku.cellBlack')
                            : 格 === 白子
                              ? t('contact.gomoku.cellWhite')
                              : t('contact.gomoku.cellEmpty'),
                      })}
                      className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full hover:bg-surface/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50"
                      style={{
                        left: `${(c / 14) * 100}%`,
                        top: `${(r / 14) * 100}%`,
                        width: `${100 / 15}%`,
                        height: `${100 / 15}%`,
                      }}
                    >
                      {格 !== 空位 && (
                        <span
                          className={合并类名(
                            'gomoku-stone',
                            格 === 黑子 ? 'gomoku-stone--black' : 'gomoku-stone--white',
                            是最后 && 'gomoku-stone--last',
                            是否获胜 && 'gomoku-stone--win'
                          )}
                        />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </div>
          {}
          <div className="gomoku-flip__face gomoku-flip__face--back" aria-hidden="true">
            <div className="relative h-full w-full">
              <QiPanWangGe />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
