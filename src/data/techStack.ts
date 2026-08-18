/**
 * 我的技术栈数据 · 1:1 移植 12-next-spline-3d 的 techstackV2 + companies 结构。
 * 技术卡用工作区真实栈 + 有效 logo（public/logos 已存在）；公司条用 docker/cloudinary 等真实 svg（含 nameImg）。
 */

export interface TechCard {
  quote: string
  name: string
  title: string
  icon: string
}

export interface Company {
  id: number
  name: string
  img: string
  nameImg: string
}

/** 技术卡：声明式组件框架 / 运行时 / 3D / 动画 / 运维 —— 均带有效 logo */
export const techstackV2: TechCard[] = [
  {
    name: 'React',
    title: '声明式组件框架',
    quote:
      '用组件化思维与虚拟 DOM 构建可维护的复杂单页应用；Hooks 让状态管理清晰直观，生态庞大，是本项目前端的中枢。',
    icon: '/logos/react.svg',
  },
  {
    name: 'Next.js',
    title: '生产级 React 框架',
    quote: '提供 SSR/SSG、文件路由与 API 路由，内建优化让大型应用兼具性能与开发体验。',
    icon: '/logos/next.svg',
  },
  {
    name: 'TypeScript',
    title: '静态类型 JavaScript',
    quote: '在编译期捕获错误、提升重构安全感，强类型让团队协作的大项目稳如磐石。',
    icon: '/logos/ts.svg',
  },
  {
    name: 'Tailwind CSS',
    title: '原子化 CSS 框架',
    quote: '用工具类在标记中直接拼装界面，设计系统一致、产物极小，迭代速度飞快。',
    icon: '/logos/tailwind.svg',
  },
  {
    name: 'Three.js',
    title: 'WebGL 3D 图形',
    quote: '在浏览器里用 WebGL 驾驭场景、相机与光照，把复杂的 3D 与沉浸体验搬到网页。',
    icon: '/logos/threejs.svg',
  },
  {
    name: 'GSAP',
    title: '高性能动画库',
    quote: '精细可控的时序动画引擎，复杂序列与丝滑过渡都游刃有余，是动效的工业级方案。',
    icon: '/logos/gsap.svg',
  },
  {
    name: 'Framer Motion',
    title: 'React 动画库',
    quote: '用声明式 API 把物理感交互与布局过渡写进 JSX，复杂动效也能优雅落地。',
    icon: '/logos/framer-motion.svg',
  },
  {
    name: 'Docker',
    title: '应用容器化',
    quote: '把应用与依赖打包成可移植的容器，开发、测试、生产环境从此完全一致。',
    icon: '/logos/dock.svg',
  },
  {
    name: 'GitHub',
    title: '协作代码平台',
    quote: '版本控制与协作的中枢；PR 评审、Actions 与议题让团队交付有迹可循。',
    icon: '/logos/github.svg',
  },
  {
    name: 'NPM',
    title: 'JavaScript 包管理器',
    quote: '庞大的开源生态一键接入，依赖管理与脚本编排是前端工程的基石。',
    icon: '/logos/npm.svg',
  },
  {
    name: 'Webpack',
    title: '静态模块打包器',
    quote: '把分散的模块、资源与样式打包优化，是工程化构建的坚实后盾。',
    icon: '/logos/webpack.svg',
  },
  {
    name: 'Cloudinary',
    title: '媒体云处理',
    quote: '图片与视频的上传、转码、优化与分发一站式托管，让富媒体的性能不再是负担。',
    icon: '/logos/cloud.svg',
  },
]

/** 公司 / 服务条：docker、cloudinary、appwrite、hostinger、stream（含 nameImg） */
export const companies: Company[] = [
  { id: 1, name: 'cloudinary', img: '/cloud.svg', nameImg: '/cloudName.svg' },
  { id: 2, name: 'appwrite', img: '/app.svg', nameImg: '/appName.svg' },
  { id: 3, name: 'HOSTINGER', img: '/host.svg', nameImg: '/hostName.svg' },
  { id: 4, name: 'stream', img: '/s.svg', nameImg: '/streamName.svg' },
  { id: 5, name: 'docker.', img: '/dock.svg', nameImg: '/dockerName.svg' },
]
