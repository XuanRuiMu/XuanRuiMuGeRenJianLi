import type { AiMessage } from '../store/useAppStore'
import { ta } from '../i18n/translations'
import { 命中共享意图, 检测项目卡片, 是否纯问候, 是否感谢, 是否告别 } from './intentTable'

function 取组(键: string): string[] {
  return ta(`ai.followUps.${键}` as never)
}

function 取回退(): string[] {
  const 回退 = 取组('fallback')
  return 回退.length >= 3 ? 回退.slice(0, 3) : [...回退, ...取组('greeting')].slice(0, 3)
}

function 规范化三元(候选: string[]): string[] {
  const 去重 = Array.from(new Set(候选.filter((项) => typeof 项 === 'string' && 项.trim().length > 0)))
  if (去重.length >= 3) return 去重.slice(0, 3)
  return [...去重, ...取回退()].slice(0, 3)
}

export function 生成追问建议(用户问题: string, 助手消息?: AiMessage): string[] {
  const 输入 = (用户问题 ?? '').trim()
  if (输入.length === 0) return 取回退()
  if (是否纯问候(输入) || 是否感谢(输入) || 是否告别(输入)) {
    return 规范化三元(取组('greeting'))
  }

  const 组件 = 助手消息?.component
  if (组件?.type === 'ProjectCard') {
    if (组件.projectId === 'xrm') return 规范化三元(取组('projectsXrm'))
    if (组件.projectId === 'fengLai') return 规范化三元(取组('projectsFengLai'))
    return 规范化三元(取组('projectsLove'))
  }
  if (组件?.type === 'Timeline') {
    if (组件.scope === 'experience') return 规范化三元(取组('experience'))
    if (组件.scope === 'education') return 规范化三元(取组('education'))
    return 规范化三元(取组('fallback'))
  }
  if (组件?.type === 'ContactLinks') return 规范化三元(取组('fallback'))

  const 文本 = 输入.toLowerCase()
  if (命中共享意图('tech', 文本)) return 规范化三元(取组('tech'))
  const 项目卡片 = 检测项目卡片(输入)
  if (项目卡片 === 'xrm') return 规范化三元(取组('projectsXrm'))
  if (项目卡片 === 'fengLai') return 规范化三元(取组('projectsFengLai'))
  if (项目卡片 === 'lovewithme' || 项目卡片 === 'aiConsole') return 规范化三元(取组('projectsLove'))
  if (命中共享意图('projects-xrm', 文本)) return 规范化三元(取组('projectsXrm'))
  if (命中共享意图('projects-蜂来', 文本)) return 规范化三元(取组('projectsFengLai'))
  if (命中共享意图('projects-爱与循环', 文本) || 命中共享意图('projects-通用', 文本)) {
    return 规范化三元(取组('projectsLove'))
  }
  if (命中共享意图('experience', 文本)) return 规范化三元(取组('experience'))
  if (命中共享意图('education', 文本)) return 规范化三元(取组('education'))
  return 规范化三元(取组('fallback'))
}
