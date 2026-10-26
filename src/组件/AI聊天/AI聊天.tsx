import { AILiaoTianJieMian } from './AILiaoTianJieMian'
import { useAILiaoTianZhuangTai } from './useAILiaoTianZhuangTai'

interface AI聊天属性 {
  className?: string
}

export function AILiaoTian({ className }: AI聊天属性) {
  const 状态 = useAILiaoTianZhuangTai()
  return <AILiaoTianJieMian 状态={状态} className={className} />
}
