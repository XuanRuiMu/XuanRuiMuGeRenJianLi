import { t, type 翻译键 } from '../国际化/翻译'
import { 资源路径 } from '../库/资源路径'
import 中文包 from '../国际化/zh-CN.json'

function 键存在(节点: unknown, 路径: string): boolean {
  for (const 步 of 路径.split('.')) {
    if (节点 === null || typeof 节点 !== 'object' || !(步 in (节点 as object))) return false
    节点 = (节点 as Record<string, unknown>)[步]
  }
  return true
}

export function 解析项目归属(归属id: string): string | null {
  if (键存在(中文包, `data.projects.${归属id}.name`)) {
    return t(`data.projects.${归属id}.name` as unknown as 翻译键)
  }
  if (键存在(中文包, `data.项目归属.${归属id}`)) {
    return t(`data.项目归属.${归属id}` as unknown as 翻译键)
  }
  return null
}

export function 取项目归属名(归属id: string): string {
  return 解析项目归属(归属id) ?? 归属id
}

export interface 技术卡 {
  name: string
  图标: string
  url: string

  项目: string[]

  掩码模式?: 'light' | 'dark'
}

export const 技术卡表: 技术卡[] = [
  {
    name: 'Java',
    图标: 资源路径('/logos/java.svg'),
    url: 'https://dev.java',
    项目: ['xrm'],
  },
  {
    name: 'Guice',
    图标: 资源路径('/logos/guice.svg'),
    url: 'https://github.com/google/guice',
    项目: ['xrm'],
  },
  {
    name: 'Node.js',
    图标: 资源路径('/logos/nodejs.svg'),
    url: 'https://nodejs.org',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'Express',
    图标: 资源路径('/logos/express.svg'),
    url: 'https://expressjs.com',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'MySQL',
    图标: 资源路径('/logos/mysql.svg'),
    url: 'https://www.mysql.com',
    项目: ['xrm'],
  },
  {
    name: 'Redis',
    图标: 资源路径('/logos/redis.svg'),
    url: 'https://redis.io',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'PostgreSQL',
    图标: 资源路径('/logos/postgresql.svg'),
    url: 'https://www.postgresql.org',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'Docker',
    图标: 资源路径('/logos/dock.svg'),
    url: 'https://www.docker.com',
    项目: ['lovewithme', '恋爱吧管理中心'],
  },
  {
    name: 'Python',
    图标: 资源路径('/logos/python.svg'),
    url: 'https://www.python.org',
    项目: ['本站', 'aiConsole', '恋爱吧管理中心'],
  },
  {
    name: 'TypeScript',
    图标: 资源路径('/logos/ts.svg'),
    url: 'https://www.typescriptlang.org',
    项目: ['本站', 'lovewithme', '恋爱吧管理中心'],

    掩码模式: 'light',
  },
  {
    name: 'React',
    图标: 资源路径('/logos/react.svg'),
    url: 'https://react.dev',
    项目: ['本站'],
  },
  {
    name: 'Three.js',
    图标: 资源路径('/logos/threejs.svg'),
    url: 'https://threejs.org',
    项目: ['本站', 'yangLai', 'lovewithme'],
  },
  {
    name: 'Tailwind CSS',
    图标: 资源路径('/logos/tailwind.svg'),
    url: 'https://tailwindcss.com',
    项目: ['本站'],
  },
  {
    name: 'GitHub',
    图标: 资源路径('/logos/github.svg'),
    url: 'https://github.com/XuanRuiMu',
    项目: ['全部项目'],
  },
  {
    name: 'Vite',
    图标: 资源路径('/logos/vite.svg'),
    url: 'https://vite.dev',
    项目: ['本站', 'yangLai', 'lovewithme', '恋爱吧管理中心'],
  },
]
