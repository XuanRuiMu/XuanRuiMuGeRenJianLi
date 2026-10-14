/**
 * 我的技术栈数据 · 全栈均衡技术卡（后端 / 数据库 / 前端 / 工程化）。
 * 技术卡全部对应工作区真实使用的技术栈，logo 位于 public/logos。
 */

import { t, type TranslationKey } from '../i18n/翻译'
import 中文包 from '../i18n/zh-CN.json'

function 键存在(节点: unknown, 路径: string): boolean {
  for (const 步 of 路径.split('.')) {
    if (节点 === null || typeof 节点 !== 'object' || !(步 in (节点 as object))) return false
    节点 = (节点 as Record<string, unknown>)[步]
  }
  return true
}

/**
 * 项目归属 id → 访客可见名称。id 与 zh-CN.json 的 data.projects / data.项目归属 键一一对应，
 * 名称不在代码里出现第二份，改翻译即改全站。解析不到时返回 null（调用方应跳过该归属）。
 */
export function 解析项目归属(归属id: string): string | null {
  if (键存在(中文包, `data.projects.${归属id}.name`)) {
    return t(`data.projects.${归属id}.name` as unknown as TranslationKey)
  }
  if (键存在(中文包, `data.项目归属.${归属id}`)) {
    return t(`data.项目归属.${归属id}` as unknown as TranslationKey)
  }
  return null
}

/** 取项目归属名：解析不到时回退为 id 本身（数据异常时的兜底，正常数据不会走到） */
export function 取项目归属名(归属id: string): string {
  return 解析项目归属(归属id) ?? 归属id
}

export interface TechCard {
  name: string
  icon: string
  url: string
  /** 该技术栈实际在用的项目归属 id，已按本地源码逐条核实；展示名经翻译文件下发 */
  项目: string[]
  /** 图标带整面底色时声明点阵提取模式：light 只取高亮字样（如蓝底白字），默认按透明度 */
  掩码模式?: 'light' | 'dark'
}

/** 技术卡：Java 后端 / Node.js 全栈 / 数据库 / 前端 3D —— 均带有效 logo、官网链接与已核实的项目归属 */
export const techstackV2: TechCard[] = [
  {
    name: 'Java',
    icon: '/logos/java.svg',
    url: 'https://dev.java',
    项目: ['xrm'],
  },
  {
    name: 'Guice',
    icon: '/logos/guice.svg',
    url: 'https://github.com/google/guice',
    项目: ['xrm'],
  },
  {
    name: 'Node.js',
    icon: '/logos/nodejs.svg',
    url: 'https://nodejs.org',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'Express',
    icon: '/logos/express.svg',
    url: 'https://expressjs.com',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'MySQL',
    icon: '/logos/mysql.svg',
    url: 'https://www.mysql.com',
    项目: ['xrm'],
  },
  {
    name: 'Redis',
    icon: '/logos/redis.svg',
    url: 'https://redis.io',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'PostgreSQL',
    icon: '/logos/postgresql.svg',
    url: 'https://www.postgresql.org',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'Docker',
    icon: '/logos/dock.svg',
    url: 'https://www.docker.com',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'Python',
    icon: '/logos/python.svg',
    url: 'https://www.python.org',
    项目: ['本站', 'aiConsole', '恋爱吧管理中心'],
  },
  {
    name: 'TypeScript',
    icon: '/logos/ts.svg',
    url: 'https://www.typescriptlang.org',
    项目: ['本站', 'lovewithme', '恋爱吧管理中心'],
    // 蓝底白字图标：alpha 掩码只能得到实心方块，须按亮度提取白色 TS 字样
    掩码模式: 'light',
  },
  {
    name: 'React',
    icon: '/logos/react.svg',
    url: 'https://react.dev',
    项目: ['本站'],
  },
  {
    name: 'Three.js',
    icon: '/logos/threejs.svg',
    url: 'https://threejs.org',
    项目: ['本站', 'yangLai', 'lovewithme'],
  },
  {
    name: 'Tailwind CSS',
    icon: '/logos/tailwind.svg',
    url: 'https://tailwindcss.com',
    项目: ['本站'],
  },
  {
    name: 'GitHub',
    icon: '/logos/github.svg',
    url: 'https://github.com/XuanRuiMu',
    项目: ['全部项目'],
  },
  {
    name: 'Vite',
    icon: '/logos/vite.svg',
    url: 'https://vite.dev',
    项目: ['本站', 'yangLai', 'lovewithme', '恋爱吧管理中心'],
  },
]
