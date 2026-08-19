import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { cn } from '../../lib/utils'

const SIZE = 15
const EMPTY = 0
const BLACK = 1 // 玩家（黑，先手）
const WHITE = 2 // AI（白）或 多人模式的另一名玩家

type Cell = typeof EMPTY | typeof BLACK | typeof WHITE
type Board = Cell[][]
type Coord = [number, number]
type Mode = 'pve' | 'pvp'

const DIRECTIONS: Coord[] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
]

/** 标准 15 路棋盘星位：天元 (7,7) + 四角星 (3,3)(3,11)(11,3)(11,11)（0-indexed） */
const STAR_POINTS: Coord[] = [
  [7, 7],
  [3, 3],
  [3, 11],
  [11, 3],
  [11, 11],
]

function createBoard(): Board {
  return Array.from({ length: SIZE }, () => Array<Cell>(SIZE).fill(EMPTY))
}

/**
 * 落子音效：用 Web Audio 实时合成一记短促「咔嗒」，无需任何外部音频资源（零体积、零请求）。
 * AudioContext 惰性创建，并在用户手势上下文中 resume，规避浏览器自动播放限制。
 */
let stoneAudioCtx: AudioContext | null = null
function getStoneAudioCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!stoneAudioCtx) stoneAudioCtx = new Ctor()
  if (stoneAudioCtx.state === 'suspended') void stoneAudioCtx.resume()
  return stoneAudioCtx
}

function playStoneSound(color: Cell): void {
  const ctx = getStoneAudioCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const startFreq = color === WHITE ? 616 : 440
  const endFreq = color === WHITE ? 252 : 180
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'triangle'
  osc.frequency.setValueAtTime(startFreq, now)
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.09)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.exponentialRampToValueAtTime(0.22, now + 0.005)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12)
  osc.connect(gain).connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.13)
}

/** 评估在 (r,c) 落子 player 后，经过该点的最长连线（含两端延伸），返回启发式分数 */
function evaluatePoint(board: Board, r: number, c: number, player: Cell): number {
  let total = 0
  for (const [dr, dc] of DIRECTIONS) {
    let count = 1
    let openEnds = 0
    for (const sign of [1, -1]) {
      let rr = r + dr * sign
      let cc = c + dc * sign
      while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === player) {
        count++
        rr += dr * sign
        cc += dc * sign
      }
      if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === EMPTY) openEnds++
    }
    if (count >= 5) total += 1_000_000
    else if (count === 4) total += openEnds === 2 ? 50_000 : 8_000
    else if (count === 3) total += openEnds === 2 ? 2_000 : 400
    else if (count === 2) total += openEnds === 2 ? 120 : 30
    else total += 5
  }
  return total
}

function findBestMove(board: Board, ai: Cell, human: Cell): Coord {
  let best = -1
  let move: Coord = [Math.floor(SIZE / 2), Math.floor(SIZE / 2)]
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] !== EMPTY) continue
      let near = false
      for (let rr = Math.max(0, r - 2); rr <= Math.min(SIZE - 1, r + 2) && !near; rr++) {
        for (let cc = Math.max(0, c - 2); cc <= Math.min(SIZE - 1, c + 2); cc++) {
          if (board[rr][cc] !== EMPTY) {
            near = true
            break
          }
        }
      }
      if (!near) continue
      const score = evaluatePoint(board, r, c, ai) + evaluatePoint(board, r, c, human) * 1.15
      if (score > best) {
        best = score
        move = [r, c]
      }
    }
  }
  return move
}

/** 返回以 (r,c) 为终点、player 的连五（≥5）坐标序列；无则 null */
function getWinningLine(board: Board, r: number, c: number, player: Cell): Coord[] | null {
  for (const [dr, dc] of DIRECTIONS) {
    const line: Coord[] = [[r, c]]
    for (const sign of [1, -1]) {
      let rr = r + dr * sign
      let cc = c + dc * sign
      while (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE && board[rr][cc] === player) {
        line.push([rr, cc])
        rr += dr * sign
        cc += dc * sign
      }
    }
    if (line.length >= 5) return line
  }
  return null
}

/**
 * 五子棋（标准 15×15）：
 * - 人机模式（pve，默认）：玩家执黑先手，AI 执白基于攻防启发式落子。
 * - 双人模式（pvp）：黑白双方均为玩家，原地轮流派落，无 AI。
 * 高端暗色玻璃棋盘：棋线 + 星位、黑白分明立体棋子、落子缩放入场、最后一手青环高亮、连珠金色脉冲。
 */
export function Gomoku() {
  const [mode, setMode] = useState<Mode>('pve')
  const [board, setBoard] = useState<Board>(createBoard)
  const [turn, setTurn] = useState<Cell>(BLACK)
  const [winner, setWinner] = useState<Cell | null>(null)
  const [lastMove, setLastMove] = useState<Coord | null>(null)
  const [winning, setWinning] = useState<Coord[]>([])
  const [thinking, setThinking] = useState(false)
  const [flipping, setFlipping] = useState(false)
  const flipClearTimerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(flipClearTimerRef.current), [])

  const aiMove = useCallback((next: Board) => {
    const [r, c] = findBestMove(next, WHITE, BLACK)
    const after = next.map((row) => row.slice())
    after[r][c] = WHITE
    playStoneSound(WHITE)
    setBoard(after)
    setLastMove([r, c])
    const line = getWinningLine(after, r, c, WHITE)
    if (line) {
      setWinner(WHITE)
      setWinning(line)
    } else {
      setTurn(BLACK)
    }
    setThinking(false)
  }, [])

  const handleCell = useCallback(
    (r: number, c: number) => {
      if (winner || board[r][c] !== EMPTY) return
      // 人机模式：仅执黑的玩家可落子；双人模式：轮到谁谁落
      if (mode === 'pve' && turn !== BLACK) return
      const next = board.map((row) => row.slice())
      next[r][c] = turn
      playStoneSound(turn)
      setBoard(next)
      setLastMove([r, c])
      const line = getWinningLine(next, r, c, turn)
      if (line) {
        setWinner(turn)
        setWinning(line)
        setThinking(false)
        return
      }
      if (mode === 'pve') {
        setTurn(WHITE)
        setThinking(true)
        window.setTimeout(() => aiMove(next), 240)
      } else {
        setTurn(turn === BLACK ? WHITE : BLACK)
      }
    },
    [board, turn, winner, mode, aiMove]
  )

  const clearBoard = useCallback(() => {
    setBoard(createBoard())
    setTurn(BLACK)
    setWinner(null)
    setLastMove(null)
    setWinning([])
    setThinking(false)
  }, [])

  const reset = useCallback(() => {
    // 「掫桌」：绕垂直轴翻面 0.8s。清盘放在翻转中段（~90° 侧棱朝向观众、两面均不可见时），
    // 而非动画结束瞬间——否则 rotateY 从 180° 归零与清盘同帧发生，会闪回一帧满盘旧棋盘。
    if (flipping) return
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      clearBoard()
      return
    }
    setFlipping(true)
    window.clearTimeout(flipClearTimerRef.current)
    flipClearTimerRef.current = window.setTimeout(clearBoard, 400)
  }, [flipping, clearBoard])

  const switchMode = useCallback((next: Mode) => {
    setMode(next)
    // 切换模式即重开一局，避免上局残子影响新模式的先后手语义
    setBoard(createBoard())
    setTurn(BLACK)
    setWinner(null)
    setLastMove(null)
    setWinning([])
    setThinking(false)
  }, [])

  const status = useMemo(() => {
    if (winner === BLACK) return mode === 'pve' ? '🎉 你赢了！（黑棋）' : '⚫ 黑方胜利！'
    if (winner === WHITE) return mode === 'pve' ? 'AI 获胜（白棋），再来一局？' : '⚪ 白方胜利！'
    if (mode === 'pve') return thinking ? 'AI 思考中…' : '轮到你落子（黑棋）'
    return turn === BLACK ? '⚫ 黑方落子' : '⚪ 白方落子'
  }, [winner, turn, mode, thinking])

  const isWin = (r: number, c: number) => winning.some(([wr, wc]) => wr === r && wc === c)

  return (
    <div className="flex w-full max-w-[340px] flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="bg-gradient-to-r from-[#5eead4] via-[#818cf8] to-[#f0abfc] bg-clip-text font-mono text-sm font-bold text-transparent">
          五子棋
        </span>
        <div
          className="flex items-center gap-0.5 rounded-full border border-[#2a2a2a] p-0.5"
          role="group"
          aria-label="对战模式"
        >
          <button
            type="button"
            onClick={() => switchMode('pve')}
            aria-pressed={mode === 'pve'}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs transition-colors',
              mode === 'pve'
                ? 'bg-gradient-to-r from-[#d97757] to-[#fb7185] text-white shadow-[0_2px_10px_rgba(217,119,87,0.5)]'
                : 'text-[#9aa0aa] hover:text-[#e6e6e6]'
            )}
          >
            人机
          </button>
          <button
            type="button"
            onClick={() => switchMode('pvp')}
            aria-pressed={mode === 'pvp'}
            className={cn(
              'rounded-full px-2.5 py-1 text-xs transition-colors',
              mode === 'pvp'
                ? 'bg-gradient-to-r from-[#d97757] to-[#fb7185] text-white shadow-[0_2px_10px_rgba(217,119,87,0.5)]'
                : 'text-[#9aa0aa] hover:text-[#e6e6e6]'
            )}
          >
            双人
          </button>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 rounded-full border border-[#2a2a2a] px-2.5 py-1 text-xs text-[#cfcfcf] transition-colors hover:border-[#d97757] hover:text-[#f0f0f0]"
          aria-label="掫桌重开"
        >
          <RotateCcw size={12} />
          掫桌
        </button>
      </div>

      <span className="font-mono text-xs text-[#9aa0aa]">{status}</span>

      <div
        className="relative w-full max-w-[320px] rounded-3xl bg-gradient-to-br from-[#d97757] via-[#f0abfc] to-[#38bdf8] p-[2px] shadow-[0_12px_44px_rgba(0,0,0,0.55)]"
        style={{ perspective: '900px' }}
      >
        {/* 3D 翻转容器：绕垂直轴（Y）旋转 180°，正面棋盘转到背面（根因修复：单面 rotateY 仅镜像、无「背面」语义） */}
        <div
          className={cn('gomoku-flip', flipping && 'is-flipping')}
          onAnimationEnd={(event) => {
            // 只响应翻转容器自身的 animationend；棋子入场等子元素动画冒泡上来会误触清盘
            if (flipping && event.target === event.currentTarget) {
              setFlipping(false)
            }
          }}
        >
          {/* 正面：棋盘（格线/星位/落子/连线），翻转后转到背面不可见 */}
          <div className="gomoku-flip__face gomoku-flip__face--front">
            <div className="relative h-full w-full">
          {/* 棋盘格线 + 星位 */}
          <svg
            viewBox="0 0 14 14"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            {Array.from({ length: SIZE }).map((_, i) => (
              <line key={`v${i}`} x1={i} y1={0} x2={i} y2={14} stroke="rgba(255,255,255,0.16)" strokeWidth={0.03} />
            ))}
            {Array.from({ length: SIZE }).map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i} x2={14} y2={i} stroke="rgba(255,255,255,0.16)" strokeWidth={0.03} />
            ))}
            {STAR_POINTS.map(([r, c]) => (
              <circle key={`s${r}${c}`} cx={c} cy={r} r={0.13} fill="rgba(255,255,255,0.4)" />
            ))}
          </svg>

          {/* 交叉点（可点击落子） */}
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isLast = lastMove?.[0] === r && lastMove?.[1] === c
              const win = isWin(r, c)
              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCell(r, c)}
                  disabled={winner !== null}
                  aria-label={`第 ${r + 1} 行 第 ${c + 1} 列${
                    cell === BLACK ? ' 黑子' : cell === WHITE ? ' 白子' : ' 空'
                  }`}
                  className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full hover:bg-white/5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#38bdf8]/50"
                  style={{
                    left: `${(c / 14) * 100}%`,
                    top: `${(r / 14) * 100}%`,
                    width: `${100 / 15}%`,
                    height: `${100 / 15}%`,
                  }}
                >
                  {cell !== EMPTY && (
                    <span
                      className={cn(
                        'gomoku-stone',
                        cell === BLACK ? 'gomoku-stone--black' : 'gomoku-stone--white',
                        isLast && 'gomoku-stone--last',
                        win && 'gomoku-stone--win'
                      )}
                    />
                  )}
                </button>
              )
            })
          )}
            </div>
          </div>
          {/* 背面：干净渐变面板，翻面后呈现，直观表达「正面跑到背面」 */}
          <div className="gomoku-flip__face gomoku-flip__face--back" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
