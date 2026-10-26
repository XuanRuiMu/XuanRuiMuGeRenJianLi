import { useRef, useState, useEffect, useCallback, useMemo, startTransition } from 'react'
import { useYingYongZhuangTai } from '../../状态/应用状态仓库'
import type { AI消息 } from '../../状态/应用状态仓库'
import { t, 翻译数组 } from '../../国际化/翻译'
import { useLiaoTianFuWu, 压缩对话, 是否中断错误 } from '../../智能/聊天服务'
import { 模型列表, 循环思考强度, 步进思考强度, 思考强度顺序 } from '../../智能/模型'
import { 生成追问建议 } from '../../智能/追问建议'
import {
  每条消息图片上限,
  默认面板宽,
  默认面板高,
  最小面板宽,
  最小面板高,
  type 排队项,
  type 待发图片,
  是合法图片,
  读取为DataUrl,
  走历史可行,
  最接近指令,
} from './AI聊天工具'

export function useAILiaoTianZhuangTai() {
  const 聊天打开 = useYingYongZhuangTai((状态) => 状态.聊天打开)
  const 设置聊天打开 = useYingYongZhuangTai((状态) => 状态.设置聊天打开)
  const AI消息表 = useYingYongZhuangTai((状态) => 状态.AI消息表)
  const 添加AI消息 = useYingYongZhuangTai((状态) => 状态.添加AI消息)
  const 更新AI消息 = useYingYongZhuangTai((状态) => 状态.更新AI消息)
  const 清空AI消息 = useYingYongZhuangTai((状态) => 状态.清空AI消息)
  const AI模型 = useYingYongZhuangTai((状态) => 状态.AI模型)
  const 设置AI模型 = useYingYongZhuangTai((状态) => 状态.设置AI模型)
  const 暂存的会话 = useYingYongZhuangTai((状态) => 状态.暂存的会话)
  const 暂存会话 = useYingYongZhuangTai((状态) => 状态.暂存会话)
  const 恢复会话 = useYingYongZhuangTai((状态) => 状态.恢复会话)

  const [输入, 设置输入] = useState('')
  const [发送错误, 设置发送错误] = useState<string | null>(null)
  const 消息末尾引用 = useRef<HTMLDivElement>(null)
  const 输入引用 = useRef<HTMLTextAreaElement>(null)
  const 文件输入引用 = useRef<HTMLInputElement>(null)

  const 生成编号引用 = useRef(0)
  const 聊天变更 = useLiaoTianFuWu()
  const 进行中 = 聊天变更.isPending

  const AI思考 = useYingYongZhuangTai((状态) => 状态.AI思考强度)
  const 设置AI思考 = useYingYongZhuangTai((状态) => 状态.设置AI思考)

  const [系统行表, 设置系统行表] = useState<string[]>([])

  const [排队中, 设置排队] = useState<排队项[]>([])
  const [压缩中, 设置压缩中] = useState(false)

  const [待处理图片, 设置待处理图片] = useState<待发图片[]>([])
  const [灯箱地址, 设置灯箱地址] = useState<string | null>(null)

  const 待处理图片引用 = useRef(待处理图片)
  useEffect(() => {
    待处理图片引用.current = 待处理图片
  }, [待处理图片])
  const 图片序号Ref = useRef(0)
  const 中止引用 = useRef<AbortController | null>(null)

  const 发送中引用 = useRef(false)

  const AI消息引用 = useRef(AI消息表)
  useEffect(() => {
    AI消息引用.current = AI消息表
  }, [AI消息表])

  const AI模型引用 = useRef(AI模型)
  useEffect(() => {
    AI模型引用.current = AI模型
  }, [AI模型])
  const 暂存会话引用 = useRef(暂存的会话)
  useEffect(() => {
    暂存会话引用.current = 暂存的会话
  }, [暂存的会话])

  const 可见消息 = AI消息表

  const [输入历史, 设置输入历史] = useState<string[]>([])
  const 历史下标Ref = useRef(-1)
  const 重置输入历史下标 = useCallback(() => {
    历史下标Ref.current = -1
  }, [])
  const 草稿Ref = useRef('')
  const 记录输入历史 = useCallback((内容: string) => {
    设置输入历史((上一个) => (上一个[上一个.length - 1] === 内容 ? 上一个 : [...上一个.slice(-49), 内容]))
    历史下标Ref.current = -1
  }, [])

  const 走输入历史 = useCallback(
    (方向: 1 | -1) => {
      if (输入历史.length === 0) return
      if (历史下标Ref.current === -1) {
        if (方向 === -1) return
        草稿Ref.current = 输入
      }
      const 下一个 = 历史下标Ref.current + 方向
      if (下一个 < -1 || 下一个 >= 输入历史.length) return
      历史下标Ref.current = 下一个
      设置输入(下一个 === -1 ? 草稿Ref.current : 输入历史[输入历史.length - 1 - 下一个])
    },
    [输入, 输入历史]
  )

  const 计时键 = `${进行中}|${压缩中}`
  const [思考秒数, 设置思考秒数] = useState(0)
  const [已见计时键, 设已见计时键] = useState(计时键)
  if (已见计时键 !== 计时键) {
    设已见计时键(计时键)
    设置思考秒数(0)
  }
  useEffect(() => {
    if (!进行中 && !压缩中) return
    const 计时器 = window.setInterval(() => 设置思考秒数((秒) => 秒 + 1), 1000)
    return () => window.clearInterval(计时器)
  }, [计时键, 进行中, 压缩中])

  const 指令表 = useMemo(
    () => [
      { 指令: '/help', 描述: t('ai.cmdDesc.help') },
      { 指令: '/clear', 描述: t('ai.cmdDesc.clear') },
      { 指令: '/new', 描述: t('ai.cmdDesc.news') },
      { 指令: '/resume', 描述: t('ai.cmdDesc.resume') },
      { 指令: '/model', 描述: t('ai.cmdDesc.model') },
      { 指令: '/compact', 描述: t('ai.cmdDesc.compact') },
      { 指令: '/think', 描述: t('ai.cmdDesc.think') },
      { 指令: '/status', 描述: t('ai.cmdDesc.status') },
    ],
    []
  )
  const 斜杠首词 = 输入.startsWith('/') && !输入.includes('\n') ? 输入.split(/\s+/)[0].toLowerCase() : ''
  const 补全候选 = useMemo(
    () => (斜杠首词 ? 指令表.filter((项) => 项.指令.startsWith(斜杠首词)) : []),
    [指令表, 斜杠首词]
  )

  const [补全下标, 设置补全下标] = useState(0)
  const [已见输入, 设已见输入] = useState(输入)
  if (已见输入 !== 输入) {
    设已见输入(输入)
    设置补全下标(0)
  }

  const [模型选择下标, 设置模型选择下标] = useState<number | null>(null)
  const 模型选择中 = 模型选择下标 !== null
  const [会话模型, 设置会话模型] = useState<string | null>(null)
  const 会话模型Ref = useRef<string | null>(null)
  useEffect(() => {
    会话模型Ref.current = 会话模型
  }, [会话模型])
  const [面板尺寸, 设置面板尺寸] = useState({ 宽: 默认面板宽, 高: 默认面板高 })
  const 面板尺寸Ref = useRef(面板尺寸)
  useEffect(() => {
    面板尺寸Ref.current = 面板尺寸
  }, [面板尺寸])
  const 有效模型 = 会话模型 ?? AI模型
  const 努力名表 = 翻译数组('ai.modelPicker.effortNames')
  const 努力标签 = `${努力名表[思考强度顺序.indexOf(AI思考)] ?? AI思考} ${t('ai.modelPicker.effortUnit')}`

  const 选择器接管 = 模型选择中 && 输入.trim() === ''
  const 补全打开 = 斜杠首词 !== '' && 补全候选.length > 0 && !进行中 && !压缩中
  const 补全可见数 = 5
  const 补全起始 =
    补全候选.length <= 补全可见数
      ? 0
      : Math.min(Math.max(补全下标 - Math.floor(补全可见数 / 2), 0), 补全候选.length - 补全可见数)
  const 确认补全 = useCallback(() => {
    const 选中 = 补全候选[补全下标] ?? 补全候选[0]
    if (!选中) return
    const 首词长 = 输入.split(/\s+/)[0].length
    const 后缀 = 输入.slice(首词长)
    设置输入(选中.指令 + (后缀.startsWith(' ') ? 后缀 : ''))
    输入引用.current?.focus()
  }, [补全候选, 补全下标, 输入])

  const [拖拽中, 设置拖拽中] = useState(false)

  const 发送消息 = useCallback(
    async (用户消息: AI消息) => {
      const 生成器 = 生成编号引用.current
      设置发送错误(null)
      const 控制器 = new AbortController()
      中止引用.current = 控制器
      const 变更输入: {
        消息表: AI消息[]
        signal: AbortSignal
        模型?: string
        进度回调?: (增量: { 思考内容: string; content: string }) => void
      } = {
        消息表: [...AI消息引用.current, 用户消息],
        signal: 控制器.signal,
        ...(会话模型Ref.current ? { 模型: 会话模型Ref.current } : {}),
      }

      添加AI消息(用户消息)
      const 占位下标 = AI消息引用.current.length + 1
      添加AI消息({ role: 'assistant', content: '' })

      变更输入.进度回调 = (增量: { 思考内容: string; content: string }) => {
        if (生成编号引用.current !== 生成器 || 占位下标 < 0) return
        更新AI消息(占位下标, { 思考内容: 增量.思考内容, content: 增量.content })
      }
      try {
        const 结果 = await 聊天变更.mutateAsync(变更输入)

        if (生成编号引用.current !== 生成器) return
        更新AI消息(占位下标, 结果.meta ? { ...结果.message, meta: 结果.meta } : 结果.message)
      } catch (错误) {
        if (生成编号引用.current !== 生成器) return
        if (是否中断错误(错误)) {
          设置系统行表([t('ai.commands.interrupted')])
        } else {
          设置发送错误(t('ai.error'))
        }
      } finally {
        中止引用.current = null
      }
    },
    [聊天变更, 添加AI消息, 更新AI消息]
  )

  useEffect(() => {
    if (发送中引用.current || 进行中 || 压缩中 || 排队中.length === 0) return
    发送中引用.current = true
    const [下一个, ...剩余] = 排队中
    设置排队(剩余)
    const 用户消息: AI消息 = {
      role: 'user',
      content: 下一个.content,
      ...(下一个.图片表 && 下一个.图片表.length > 0 ? { 图片表: 下一个.图片表 } : {}),
    }
    startTransition(async () => {
      try {
        await 发送消息(用户消息)
      } finally {
        发送中引用.current = false
      }
    })
  }, [进行中, 压缩中, 排队中, 发送消息])

  const 打开模型选择 = useCallback((选中: number) => {
    const 列表 = 模型列表()
    if (列表.length === 0) return
    const 安全选中 = ((选中 % 列表.length) + 列表.length) % 列表.length
    设置模型选择下标(安全选中)
  }, [])

  const 切换思考 = useCallback(() => {
    const 下一个 = 循环思考强度(AI思考)
    设置AI思考(下一个)
    if (模型选择下标 === null) {
      设置系统行表([t('ai.thinkLevel').replace('{level}', 下一个)])
    }
  }, [AI思考, 设置AI思考, 模型选择下标])

  const 切换到下一个模型 = useCallback(() => {
    const 列表 = 模型列表()
    const 当前 = 列表.findIndex((模型) => 模型.id === (会话模型Ref.current ?? AI模型引用.current))
    const 下一个 = 列表[(当前 + 1) % 列表.length] ?? 列表[0]
    if (!下一个) return
    设置AI模型(下一个.id)
    设置会话模型(null)
    设置模型选择下标(null)
    设置系统行表([`${t('ai.commands.modelSwitchedPrefix')}${下一个.id}`])
  }, [设置AI模型])

  const 运行命令 = useCallback(
    async (原始: string) => {
      const 分片 = 原始.split(/\s+/)
      const 命令 = 分片[0].toLowerCase()
      const 参数 = 分片.slice(1).join(' ').trim().toLowerCase()

      if (!(命令 === '/model' && !参数)) 设置模型选择下标(null)
      const 暂存当前会话 = () => {
        if (AI消息引用.current.length > 0) {
          暂存会话([...AI消息引用.current])
        }
      }
      switch (命令) {
        case '/help':
          设置系统行表([...t('ai.commands.help').split('\n'), ...t('ai.shortcuts').split('\n')])
          break
        case '/clear':
        case '/new': {
          生成编号引用.current += 1
          中止引用.current?.abort()
          暂存当前会话()
          清空AI消息()
          聊天变更.reset()
          设置排队([])
          设置系统行表([])
          设置模型选择下标(null)
          设置会话模型(null)
          设置发送错误(null)
          设置压缩中(false)

          for (const 图片 of 待处理图片引用.current) URL.revokeObjectURL(图片.预览地址)
          设置待处理图片([])
          break
        }
        case '/status': {
          const 历史数 = AI消息引用.current.length
          const 生效模型 = 会话模型Ref.current ?? AI模型引用.current
          const 当前模型 = 模型列表().find((模型) => 模型.id === 生效模型)?.id ?? 生效模型
          设置系统行表([
            `${t('ai.commands.statusModel')}：${当前模型}${会话模型Ref.current ? ` · ${t('ai.modelPicker.sessionBadge')}` : ''}`,
            `${t('ai.commands.statusThinking')}：${AI思考}`,
            `${t('ai.commands.statusMessages')}：${历史数}`,
            `${t('ai.commands.statusQueued')}：${排队中.length}`,
            `${t('ai.commands.statusContext')}：${模型列表().find((模型) => 模型.id === 生效模型)?.上下文标签 ?? '—'}`,
          ])
          break
        }
        case '/model': {
          const 列表 = 模型列表()
          if (!参数) {
            const 当前 = 列表.findIndex((模型) => 模型.id === (会话模型Ref.current ?? AI模型引用.current))
            打开模型选择(当前 === -1 ? 0 : 当前)
            break
          }
          const 目标 = 列表.find((模型, 下标) => 模型.id.toLowerCase() === 参数 || String(下标 + 1) === 参数)
          if (!目标) {
            设置系统行表([`${t('ai.commands.modelUnknownPrefix')}${参数}${t('ai.commands.unknownSuffix')}`])
            break
          }
          设置AI模型(目标.id)
          设置会话模型(null)
          设置系统行表([`${t('ai.commands.modelSwitchedPrefix')}${目标.id}`])
          break
        }
        case '/resume': {
          if (暂存会话引用.current.length === 0) {
            设置系统行表([t('ai.commands.resumeEmpty')])
            break
          }
          生成编号引用.current += 1
          中止引用.current?.abort()
          恢复会话([...暂存会话引用.current])
          聊天变更.reset()
          设置排队([])
          设置系统行表([t('ai.commands.resumeRestored')])
          break
        }
        case '/think': {
          切换思考()
          break
        }
        case '/compact': {
          if (进行中 || 发送中引用.current || 压缩中) {
            设置系统行表([t('ai.commands.compactBusy')])
            break
          }
          if (AI消息引用.current.length === 0) {
            设置系统行表([t('ai.commands.compactEmpty')])
            break
          }
          const 生成器 = 生成编号引用.current
          const 控制器 = new AbortController()
          中止引用.current = 控制器
          设置压缩中(true)
          设置系统行表([t('ai.commands.compacting')])
          try {
            const 聚焦 = 原始.slice('/compact'.length).trim()
            const 摘要 = await 压缩对话(AI消息引用.current, {
              signal: 控制器.signal,
              ...(会话模型Ref.current ? { 模型: 会话模型Ref.current } : {}),
              ...(聚焦 ? { focus: 聚焦 } : {}),
            })

            if (生成编号引用.current !== 生成器) break
            清空AI消息()
            添加AI消息({ role: 'user', content: `[${t('ai.commands.compactSummaryPrefix')}] ${摘要}` })
            设置系统行表([t('ai.commands.compacted')])
          } catch (错误) {
            if (生成编号引用.current === 生成器) {
              设置系统行表([t(是否中断错误(错误) ? 'ai.commands.compactInterrupted' : 'ai.commands.compactFailed')])
            }
          } finally {
            中止引用.current = null
            设置压缩中(false)
          }
          break
        }
        default: {
          const 行 = [`${t('ai.commands.unknownPrefix')}${命令}${t('ai.commands.unknownSuffix')}`]
          const 联想 = 最接近指令(命令)
          if (联想 && 联想 !== 命令) 行.push(`${t('ai.commands.didYouMean')} ${联想}`)
          设置系统行表(行)
        }
      }
    },
    [
      AI思考,
      进行中,
      压缩中,
      排队中,
      清空AI消息,
      添加AI消息,
      聊天变更,
      切换思考,
      设置AI模型,
      暂存会话,
      恢复会话,
      打开模型选择,
    ]
  )

  const 提交输入 = useCallback(
    (原始: string) => {
      const content = 原始.trim()
      if (!content) return
      设置输入('')
      记录输入历史(content)
      if (content === '?') {
        设置系统行表([...t('ai.commands.help').split('\n'), ...t('ai.shortcuts').split('\n')])
        return
      }
      if (content.startsWith('!')) {
        设置系统行表([t('ai.shellUnsupported')])
        return
      }
      if (content.startsWith('/')) {
        void 运行命令(content)
        return
      }
      const 图片表 = 待处理图片
        .filter((图片) => 图片.ok && typeof 图片.数据地址 === 'string')
        .map((图片) => 图片.数据地址 as string)

      for (const 图片 of 待处理图片) URL.revokeObjectURL(图片.预览地址)
      设置待处理图片([])
      if (进行中 || 发送中引用.current || 压缩中) {
        设置排队((上一个) => [...上一个, { content, 图片表: 图片表.length > 0 ? 图片表 : undefined }])
        return
      }

      设置系统行表([])
      设置模型选择下标(null)
      const 用户消息: AI消息 = {
        role: 'user',
        content,
        ...(图片表.length > 0 ? { 图片表 } : {}),
      }
      发送中引用.current = true
      startTransition(async () => {
        try {
          await 发送消息(用户消息)
        } finally {
          发送中引用.current = false
        }
      })
    },
    [进行中, 压缩中, 运行命令, 发送消息, 待处理图片, 记录输入历史]
  )

  const 接收图片文件 = useCallback(async (文件表: FileList | File[] | null) => {
    const 文件数组 = Array.from(文件表 ?? [])
    if (文件数组.length === 0) return
    let 已拒绝 = false
    const 新增: 待发图片[] = []
    for (const 文件 of 文件数组) {
      if (待处理图片引用.current.length + 新增.length >= 每条消息图片上限) {
        已拒绝 = true
        continue
      }

      const 图片key = `pending-img-${(图片序号Ref.current += 1)}`
      if (!是合法图片(文件)) {
        if (文件.type === '' || 文件.type.startsWith('image/')) {
          新增.push({ key: 图片key, 预览地址: URL.createObjectURL(文件), ok: false })
        } else {
          已拒绝 = true
        }
        continue
      }
      try {
        const 数据地址 = await 读取为DataUrl(文件)
        新增.push({
          key: 图片key,
          预览地址: URL.createObjectURL(文件),
          数据地址,
          ok: true,
        })
      } catch {
        已拒绝 = true
      }
    }
    if (新增.length > 0) {
      设置待处理图片((上一个) => [...上一个, ...新增])
    }
    if (已拒绝) {
      设置系统行表([t('ai.imageUploadFailed')])
    }
  }, [])

  const 移除待发图片 = useCallback((key: string) => {
    const 目标 = 待处理图片引用.current.find((图片) => 图片.key === key)
    if (目标) URL.revokeObjectURL(目标.预览地址)
    设置待处理图片((上一个) => 上一个.filter((图片) => 图片.key !== key))
  }, [])

  const 滚动到底部 = useCallback((平滑: boolean) => {
    消息末尾引用.current?.scrollIntoView({ behavior: 平滑 ? 'smooth' : 'auto' })
  }, [])

  const 开始调整尺寸 = useCallback(
    (方向: '宽' | '高' | '双向') => (事件: React.PointerEvent<HTMLDivElement>) => {
      事件.preventDefault()
      if (!Number.isFinite(事件.clientX) || !Number.isFinite(事件.clientY)) return
      const 起点X = 事件.clientX
      const 起点Y = 事件.clientY
      const 起点宽 = 面板尺寸Ref.current.宽
      const 起点高 = 面板尺寸Ref.current.高
      const 移动 = (e: PointerEvent) => {
        if (!Number.isFinite(e.clientX) || !Number.isFinite(e.clientY)) return
        const 宽上限 = Math.max(最小面板宽, window.innerWidth - 32)
        const 高上限 = Math.max(最小面板高, window.innerHeight - 32)
        设置面板尺寸({
          宽: 方向 === '高' ? 起点宽 : Math.min(Math.max(起点宽 + 起点X - e.clientX, 最小面板宽), 宽上限),
          高: 方向 === '宽' ? 起点高 : Math.min(Math.max(起点高 + 起点Y - e.clientY, 最小面板高), 高上限),
        })
      }
      const 结束 = () => {
        window.removeEventListener('pointermove', 移动)
        window.removeEventListener('pointerup', 结束)
        window.removeEventListener('pointercancel', 结束)
      }
      window.addEventListener('pointermove', 移动)
      window.addEventListener('pointerup', 结束)
      window.addEventListener('pointercancel', 结束)
    },
    []
  )

  const 末条 = 可见消息[可见消息.length - 1]
  const 末条指纹 = 末条 ? `${末条.role}:${末条.content.length}:${(末条.思考内容 ?? '').length}` : ''
  const [思考展开次数, 设置思考展开次数] = useState(0)
  useEffect(() => {
    if (!聊天打开) return
    输入引用.current?.focus()
  }, [聊天打开])
  useEffect(() => {
    if (!聊天打开) return
    const 帧 = window.requestAnimationFrame(() => 滚动到底部(!进行中))
    return () => window.cancelAnimationFrame(帧)
  }, [聊天打开, 末条指纹, 思考展开次数, 进行中, 滚动到底部])
  const 处理快捷问题 = useCallback(
    (问题: string) => {
      if (进行中) return
      提交输入(问题)
    },
    [提交输入, 进行中]
  )

  const 追问建议 = useMemo(() => {
    let 最后用户问题 = ''
    let 最后助手消息: AI消息 | undefined
    for (const 消息 of 可见消息) {
      if (消息.role === 'user') 最后用户问题 = 消息.content
      if (消息.role === 'assistant') 最后助手消息 = 消息
    }
    if (!最后助手消息) return []
    return 生成追问建议(最后用户问题, 最后助手消息)
  }, [可见消息])

  const 处理重置 = useCallback(() => {
    生成编号引用.current += 1
    中止引用.current?.abort()
    if (AI消息引用.current.length > 0) {
      暂存会话([...AI消息引用.current])
    }
    清空AI消息()
    聊天变更.reset()
    设置输入('')
    设置排队([])
    设置系统行表([])
    设置模型选择下标(null)
    设置会话模型(null)
    设置发送错误(null)
    设置压缩中(false)
    for (const 图片 of 待处理图片引用.current) URL.revokeObjectURL(图片.预览地址)
    设置待处理图片([])
    设置灯箱地址(null)
  }, [清空AI消息, 聊天变更, 暂存会话])

  useEffect(() => {
    return () => {
      for (const 图片 of 待处理图片引用.current) URL.revokeObjectURL(图片.预览地址)
    }
  }, [])

  useEffect(() => {
    if (!灯箱地址) return
    const 关闭灯箱 = (事件: KeyboardEvent) => {
      if (事件.key === 'Escape') {
        事件.preventDefault()
        事件.stopImmediatePropagation()
        设置灯箱地址(null)
      }
    }
    window.addEventListener('keydown', 关闭灯箱, true)
    return () => window.removeEventListener('keydown', 关闭灯箱, true)
  }, [灯箱地址])

  useEffect(() => {
    if (!聊天打开 || 灯箱地址) return
    const 全局快捷 = (事件: KeyboardEvent) => {
      if (!事件.altKey || 事件.ctrlKey || 事件.metaKey) return
      const 目标 = 事件.target
      if (目标 instanceof HTMLElement && 目标.tagName !== 'BODY' && !目标.closest('[role="dialog"]')) return
      const 键 = 事件.key.toLowerCase()
      if (键 === 't') {
        事件.preventDefault()
        切换思考()
      } else if (键 === 'p') {
        事件.preventDefault()
        切换到下一个模型()
      }
    }
    window.addEventListener('keydown', 全局快捷)
    return () => window.removeEventListener('keydown', 全局快捷)
  }, [聊天打开, 灯箱地址, 切换思考, 切换到下一个模型])

  useEffect(() => {
    const 输入框 = 输入引用.current
    if (!输入框) return
    const 自适应 = () => {
      输入框.style.height = 'auto'
      输入框.style.height = `${Math.min(输入框.scrollHeight, 160)}px`
    }
    自适应()
    window.addEventListener('resize', 自适应)
    return () => window.removeEventListener('resize', 自适应)
  }, [输入, 聊天打开])

  const 处理按键 = useCallback(
    (事件: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (事件.key === 'Tab' && 事件.shiftKey && !事件.ctrlKey && !事件.metaKey && !事件.altKey) {
        事件.preventDefault()
        切换到下一个模型()
        return
      }
      if (选择器接管 && !事件.nativeEvent.isComposing && !事件.ctrlKey && !事件.metaKey && !事件.altKey) {
        if (事件.key === 's' || 事件.key === 'S') {
          事件.preventDefault()
          const 目标 = 模型列表()[模型选择下标 ?? 0]
          if (目标) {
            设置会话模型(目标.id)
            设置系统行表([
              `${t('ai.modelPicker.sessionOnlyPrefix')} ${目标.id} ${t('ai.modelPicker.sessionOnlySuffix')}`,
            ])
          }
          设置模型选择下标(null)
          return
        }
        if (/^[1-9]$/.test(事件.key)) {
          事件.preventDefault()
          const 目标 = 模型列表()[Number(事件.key) - 1]
          if (目标) {
            设置AI模型(目标.id)
            设置会话模型(null)
            设置系统行表([`${t('ai.commands.modelSwitchedPrefix')}${目标.id}`])
          }
          设置模型选择下标(null)
          return
        }
      }
      if (事件.key === 'Enter' && !事件.shiftKey && !事件.nativeEvent.isComposing) {
        if (选择器接管) {
          事件.preventDefault()
          const 目标 = 模型列表()[模型选择下标 ?? 0]
          if (目标) {
            设置AI模型(目标.id)
            设置会话模型(null)
            设置系统行表([`${t('ai.commands.modelSwitchedPrefix')}${目标.id}`])
          }
          设置模型选择下标(null)
          return
        }
        事件.preventDefault()
        提交输入(输入)
        return
      }
      if (事件.key === 'Tab' && 补全打开) {
        事件.preventDefault()
        确认补全()
        return
      }
      if (事件.key === 'ArrowUp' || 事件.key === 'ArrowDown') {
        if (事件.nativeEvent.isComposing) return
        if (选择器接管) {
          事件.preventDefault()
          if (模型列表().length > 0) {
            打开模型选择((模型选择下标 ?? 0) + (事件.key === 'ArrowUp' ? -1 : 1))
          }
          return
        }
        if (补全打开) {
          事件.preventDefault()
          设置补全下标((下标) =>
            事件.key === 'ArrowUp' ? (下标 - 1 + 补全候选.length) % 补全候选.length : (下标 + 1) % 补全候选.length
          )
          return
        }
        if (走历史可行(事件.currentTarget, 事件.key === 'ArrowUp' ? 'up' : 'down')) {
          事件.preventDefault()
          走输入历史(事件.key === 'ArrowUp' ? 1 : -1)
        }
        return
      }
      if ((事件.key === 'ArrowLeft' || 事件.key === 'ArrowRight') && 选择器接管) {
        if (事件.nativeEvent.isComposing) return
        事件.preventDefault()
        const 下一个 = 步进思考强度(AI思考, 事件.key === 'ArrowRight' ? 1 : -1)
        if (下一个 !== AI思考) {
          设置AI思考(下一个)
        }
        return
      }
      if (事件.key.toLowerCase() === 'j' && 事件.ctrlKey && !事件.altKey && !事件.metaKey) {
        事件.preventDefault()
        const 输入框 = 事件.currentTarget
        const 起点 = 输入框.selectionStart ?? 输入.length
        const 终点 = 输入框.selectionEnd ?? 输入.length
        const 下一个 = `${输入.slice(0, 起点)}\n${输入.slice(终点)}`
        设置输入(下一个)
        requestAnimationFrame(() => {
          输入框.selectionStart = 起点 + 1
          输入框.selectionEnd = 起点 + 1
        })
        return
      }
      if (事件.key === 'Escape') {
        if (模型选择中) {
          事件.preventDefault()
          设置模型选择下标(null)
          设置系统行表([])
          return
        }

        if (进行中 || 压缩中) {
          事件.preventDefault()
          中止引用.current?.abort()
        } else {
          设置聊天打开(false)
        }
      }
    },
    [
      设置聊天打开,
      进行中,
      压缩中,
      补全打开,
      补全候选,
      输入,
      提交输入,
      确认补全,
      走输入历史,
      模型选择下标,
      模型选择中,
      选择器接管,
      打开模型选择,
      AI思考,
      设置AI思考,
      设置AI模型,
      设置会话模型,
      切换到下一个模型,
    ]
  )

  const 有会话 = 可见消息.length > 0 || 系统行表.length > 0 || 排队中.length > 0 || 进行中 || 压缩中 || 模型选择中
  const 显示全局思考行 = (进行中 || 压缩中) && 可见消息.every((消息) => 消息.role !== 'assistant')

  const 在途 = 进行中 || 压缩中

  return {
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
  }
}

export type AILiaoTianZhuangTai = ReturnType<typeof useAILiaoTianZhuangTai>
