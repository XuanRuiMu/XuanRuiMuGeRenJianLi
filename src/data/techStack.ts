/**
 * 我的技术栈数据 · 全栈均衡技术卡（后端 / 数据库 / 前端 / 工程化）。
 * 技术卡全部对应工作区真实使用的技术栈，logo 位于 public/logos。
 */

export interface TechCard {
  name: string
  icon: string
  url: string
  /** 该技术栈实际在用的项目归属，已按本地源码逐条核实 */
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
    项目: ['暮澜纪元'],
  },
  {
    name: 'Guice',
    icon: '/logos/guice.svg',
    url: 'https://github.com/google/guice',
    项目: ['暮澜纪元'],
  },
  {
    name: 'Node.js',
    icon: '/logos/nodejs.svg',
    url: 'https://nodejs.org',
    项目: ['和我恋爱吧', '恋爱吧管理中心'],
  },
  {
    name: 'Express',
    icon: '/logos/express.svg',
    url: 'https://expressjs.com',
    项目: ['和我恋爱吧', '恋爱吧管理中心'],
  },
  {
    name: 'MySQL',
    icon: '/logos/mysql.svg',
    url: 'https://www.mysql.com',
    项目: ['暮澜纪元'],
  },
  {
    name: 'Redis',
    icon: '/logos/redis.svg',
    url: 'https://redis.io',
    项目: ['和我恋爱吧', '恋爱吧管理中心'],
  },
  {
    name: 'PostgreSQL',
    icon: '/logos/postgresql.svg',
    url: 'https://www.postgresql.org',
    项目: ['和我恋爱吧', '恋爱吧管理中心'],
  },
  {
    name: 'Docker',
    icon: '/logos/dock.svg',
    url: 'https://www.docker.com',
    项目: ['和我恋爱吧', '恋爱吧管理中心'],
  },
  {
    name: 'Python',
    icon: '/logos/python.svg',
    url: 'https://www.python.org',
    项目: ['本站', '循环工程skill', '恋爱吧管理中心'],
  },
  {
    name: 'TypeScript',
    icon: '/logos/ts.svg',
    url: 'https://www.typescriptlang.org',
    项目: ['本站', '和我恋爱吧', '恋爱吧管理中心'],
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
    项目: ['本站', '羊来', '和我恋爱吧'],
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
    项目: ['本站', '羊来', '和我恋爱吧', '恋爱吧管理中心'],
  },
]
