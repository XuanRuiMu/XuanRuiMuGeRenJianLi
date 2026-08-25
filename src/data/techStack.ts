/**
 * 我的技术栈数据 · 全栈均衡技术卡（后端 / 数据库 / 前端 / 工程化）。
 * 技术卡全部对应工作区真实使用的技术栈，logo 位于 public/logos。
 */

export interface TechCard {
  quote: string
  name: string
  title: string
  icon: string
  url: string
}

/** 技术卡：Java 后端 / Node.js 全栈 / 数据库 / 前端 3D —— 均带有效 logo 与官网链接 */
export const techstackV2: TechCard[] = [
  {
    name: 'Java',
    title: '主力后端语言 · GraalVM 25',
    quote:
      '用 Java 写了 400+ 类的 MMORPG 服务端插件：伤害管线、天赋树、任务系统；Gradle Kotlin DSL 构建，JUnit + Mockito 测试。',
    icon: '/logos/java.svg',
    url: 'https://dev.java',
  },
  {
    name: 'Spring Boot',
    title: 'Java Web 框架',
    quote: '依赖注入、配置外部化、RESTful 接口设计；在插件开发里用 Guice 和 HikariCP 对标 Spring 生态实践。',
    icon: '/logos/spring.svg',
    url: 'https://spring.io/projects/spring-boot',
  },
  {
    name: 'Node.js',
    title: '全栈运行时',
    quote: '用 Express + TypeScript 开发并上线 AI 聊天全栈应用：JWT 鉴权、短信验证码、限流、文件上传一条龙。',
    icon: '/logos/nodejs.svg',
    url: 'https://nodejs.org',
  },
  {
    name: 'Express',
    title: 'Node.js Web 框架',
    quote: '中间件分层：helmet 安全头、rate-limit 分布式限流、错误统一处理；Socket.io 撑起实时对话。',
    icon: '/logos/express.svg',
    url: 'https://expressjs.com',
  },
  {
    name: 'MySQL',
    title: '关系型数据库',
    quote: '从游戏数据持久化到线上业务表设计都靠它；连接池调优、批量写入策略、索引优化是日常。',
    icon: '/logos/mysql.svg',
    url: 'https://www.mysql.com',
  },
  {
    name: 'Redis',
    title: '内存数据库',
    quote: '会话缓存、分布式限流、排行榜计数；在容器里跑生产实例，ioredis 连接管理熟门熟路。',
    icon: '/logos/redis.svg',
    url: 'https://redis.io',
  },
  {
    name: 'PostgreSQL',
    title: '开源关系型数据库',
    quote: 'AI 聊天应用的线上主库：初始化脚本、健康检查、数据卷持久化，docker-compose 一键拉起。',
    icon: '/logos/postgresql.svg',
    url: 'https://www.postgresql.org',
  },
  {
    name: 'Docker',
    title: '应用容器化',
    quote: '用 docker-compose 编排过 6 服务上线：PostgreSQL + Redis + Nginx + Certbot HTTPS 自动续期。',
    icon: '/logos/dock.svg',
    url: 'https://www.docker.com',
  },
  {
    name: 'Python',
    title: '自动化与 AI 工具链',
    quote: '写了 2600+ 行的 AI 总控制台：多仓库 Git 管理、多家 API Key 统一调度、MCP 协议测试。',
    icon: '/logos/python.svg',
    url: 'https://www.python.org',
  },
  {
    name: 'TypeScript',
    title: '静态类型 JavaScript',
    quote: '前后端通吃：本简历站和 AI 聊天后端都是 TS；编译期捕获错误，重构才有安全感。',
    icon: '/logos/ts.svg',
    url: 'https://www.typescriptlang.org',
  },
  {
    name: 'React',
    title: '声明式组件框架',
    quote: '组件化思维构建复杂单页应用；Hooks 状态管理清晰直观，是本项目前端的中枢。',
    icon: '/logos/react.svg',
    url: 'https://react.dev',
  },
  {
    name: 'Three.js',
    title: 'WebGL 3D 图形',
    quote: '在浏览器里用 WebGL 驾驭场景、相机与光照——你看到的星系背景和技术球就是这么来的。',
    icon: '/logos/threejs.svg',
    url: 'https://threejs.org',
  },
  {
    name: 'Tailwind CSS',
    title: '原子化 CSS 框架',
    quote: '工具类直接拼装界面，设计系统一致、产物极小，配合深浅色主题切换毫无压力。',
    icon: '/logos/tailwind.svg',
    url: 'https://tailwindcss.com',
  },
  {
    name: 'GitHub',
    title: '协作代码平台',
    quote: '版本控制与协作的中枢；自研 Git 批量推送器管理多个仓库，提交规范走 commitlint + husky。',
    icon: '/logos/github.svg',
    url: 'https://github.com/XuanRuiMu',
  },
  {
    name: 'Vite',
    title: '前端构建工具',
    quote: '秒级冷启动和热更新，PWA、可观测性插件链一套配齐，是现代前端的工程化底座。',
    icon: '/logos/vite.svg',
    url: 'https://vite.dev',
  },
]
