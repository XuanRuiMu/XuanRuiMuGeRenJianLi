# 玄锐暮个人简历 · XuanRuiMuGeRenJianLi

> AI-Native 开发者的 3D 星际档案馆在线简历 —— 沉浸式 3D 场景 + Cmd+K 命令面板 + AI 问答 + 技能雷达图 + PWA 安装，把「简历」做成一款浏览体验。

[![Stars](https://img.shields.io/github/stars/XuanRuiMu/XuanRuiMuGeRenJianLi?style=flat&logo=github)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/stargazers)
[![Forks](https://img.shields.io/github/forks/XuanRuiMu/XuanRuiMuGeRenJianLi?style=flat&logo=github)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/forks)
[![Last Commit](https://img.shields.io/github/last-commit/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/commits/main)
[![Issues](https://img.shields.io/github/issues/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/issues)
[![Repo Size](https://img.shields.io/github/repo-size/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)
[![CI](https://img.shields.io/github/actions/workflow/status/XuanRuiMu/XuanRuiMuGeRenJianLi/ci.yml?label=CI)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/actions)
[![Stack](https://img.shields.io/badge/stack-React19%20%2B%20Three.js%20%2B%20Tailwind4-blueviolet)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)

---

## 在线预览

🚀 **[玄锐暮的 3D 简历档案馆 → https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)**

![简历档案馆](public/og-image.png)

---

## 这是什么？

一个**内容优先、技术炫技**的在线个人简历网站，把求职简历做成了「可浏览的沉浸式作品」：

- 🪐 **3D 星际档案馆界面**：Three.js 打造的沉浸 3D 场景，作品如展品般陈列；
- ⌘ **Cmd+K 命令面板**：像 IDE 一样，按 `Cmd+K` 快速跳转任意板块；
- 🤖 **AI 问答**：直接向「简历」提问，AI 结合站内内容回答；
- 📡 **技能雷达图**：可视化展示技能熟练度分布；
- 🌐 **双语 i18n**：中 / 英文一键切换；
- 📱 **PWA 离线**：可安装到桌面 / 手机，离线可看；
- ♿ **无障碍友好**：字体排版测试、可访问性优化。

## 板块一览

| 板块 | 内容 |
| --- | --- |
| 👋 关于我（About）| 个人介绍与价值观 |
| 🛠️ 技能（Skills）| 技能雷达图 / 技术栈矩阵 |
| 🎨 作品集（Showcase）| 学历、课程、设计、媒体、项目作品陈列 |
| 📂 项目（Projects）| 开源项目：循环工程 / 和我恋爱吧 / 恋爱吧管理中心 / 玄锐暮插件等 |
| 💼 经历（Experience）| 履历时间线 |
| ✉️ 联系（Contact）| 联系方式与二维码 |

**作品集走廊陈列**（部分）：[循环工程](https://github.com/XuanRuiMu/loop-engineering)、[和我恋爱吧](https://github.com/XuanRuiMu/HeWoLianAiBa)、[恋爱吧管理中心](https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin)、蜂来直播间、B站系列课程（Python 编程题精讲 / 计算机网络 / MySQL 数据库精讲 / 汇编语言程序设计 / 计算机组成原理 / 马克思主义原理精讲 / 毕业论文全流程指导）、原创相声、暮澜纪元小说与 UI 设计、爵士乐作品等。

---

## 技术栈

| 层 | 技术 |
| --- | --- |
| 框架 | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) + TypeScript |
| 3D | [Three.js](https://threejs.org/) + @react-three/fiber + @react-three/drei + matter-js |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) + framer-motion + lenis 平滑滚动 |
| 数据 | zustand + TanStack Query + zod |
| AI | Vercel AI SDK（`ai` 包）接入问答 |
| PWA | vite-plugin-pwa + Workbox（离线 / 安装）|
| 性能 | 字体子集化（subset-font）、资源优化、web-vitals 观测 |
| 质量 | ESLint + Prettier + oxlint + Vitest + Playwright E2E + CI |

---

## 快速开始

```bash
# 克隆
git clone https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi.git
cd XuanRuiMuGeRenJianLi

# 安装依赖
npm install

# 本地开发（自动做字体子集化，端口 5180）
npm run dev

# 类型检查 + 生产构建
npm run build

# 预览产物
npm run preview

# 质量检查
npm run lint        # oxlint + eslint
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright 端到端
```

---

## 项目结构

```text
XuanRuiMuGeRenJianLi/
├── src/
│   ├── app/                 # 应用入口（App / layout / providers / SmoothScroll）
│   ├── components/          # 各板块组件（About / Skills / Showcase / Projects / Experience / Contact…）
│   ├── data/                # 展示数据（showcase.ts 等，改数据刷新即生效）
│   ├── i18n/                # 中英文翻译（zh-CN / en 等）
│   ├── utils/               # deviceCapabilities / viewTransition / format / swRegister…
│   └── types/               # TypeScript 类型
├── public/                  # 静态资源
│   ├── showcase/            # 作品集配图
│   ├── logos/               # 技术栈 logo
│   ├── images/              # 头像 / 签名 / 二维码
│   └── videos/ og-image.png # OG 图 / 背景视频
├── scripts/                 # subset-fonts 字体子集化、dev-api-plugin 等
├── e2e/ tests/              # Playwright E2E 与 Vitest 测试
├── functions/               # 无服务器函数（AI 问答接口）
└── .github/workflows/ci.yml # CI
```

---

## 内容更新（无需重新构建）

作品集板块的数据集中在 `src/data/showcase.ts`，**替换同名图片后刷新即可生效**，无需重新构建部署，适合长期维护。

---

## 许可证

本仓库仅作个人项目开源展示。**Made with ❤️ —— 简历，不止是一页纸。**