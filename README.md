# 玄锐暮个人简历 · XuanRuiMuGeRenJianLi

> AI-Native 开发者的 3D 星际档案馆在线简历 —— 沉浸式 3D 场景 + Cmd+K 命令面板 + AI 问答 + 技能雷达图 + PWA 安装，把「简历」做成一款浏览体验。

[![Stars](https://img.shields.io/github/stars/XuanRuiMu/XuanRuiMuGeRenJianLi?style=flat&logo=github)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/stargazers)
[![Forks](https://img.shields.io/github/forks/XuanRuiMu/XuanRuiMuGeRenJianLi?style=flat&logo=github)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/forks)
[![License: MIT](https://img.shields.io/github/license/XuanRuiMu/XuanRuiMuGeRenJianLi)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/commits/main)
[![Issues](https://img.shields.io/github/issues/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/issues)
[![Repo Size](https://img.shields.io/github/repo-size/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)
[![CI](https://img.shields.io/github/actions/workflow/status/XuanRuiMu/XuanRuiMuGeRenJianLi/ci.yml?label=CI)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/actions)
[![Stack](https://img.shields.io/badge/stack-React19%20%2B%20Three.js%20%2B%20Tailwind4-blueviolet)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)

> 🌐 简体中文 ｜ [English](README_EN.md)（英文版仅项目说明文档，站内界面为单语中文）

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
- 📡 **技能雷达图**：自研 SVG 可视化展示技能熟练度分布；
- 🌐 **单语中文**：界面文案统一简体中文（`src/国际化/zh-CN.json` 单一语言包）；
- 📱 **PWA 离线**：可安装到桌面 / 手机，离线可看；
- ♿ **无障碍友好**：字体排版测试、可访问性优化。

## 板块一览

| 板块                  | 内容                                                            |
| --------------------- | --------------------------------------------------------------- |
| 👋 关于我（About）    | 个人介绍与价值观                                                |
| 🛠️ 技能（Skills）     | 技能雷达图 / 技术栈矩阵                                         |
| 🎨 作品集（Showcase） | 学历、课程、设计、媒体、项目作品陈列                            |
| 📂 项目（Projects）   | 开源项目：循环工程 / 和我恋爱吧 / 恋爱吧管理中心 / 玄锐暮插件等 |
| 💼 经历（Experience） | 履历时间线                                                      |
| ✉️ 联系（Contact）    | 联系方式与二维码                                                |

**作品集走廊陈列**（部分）：[循环工程](https://github.com/XuanRuiMu/loop-engineering)、[和我恋爱吧](https://github.com/XuanRuiMu/HeWoLianAiBa)、[恋爱吧管理中心](https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin)、[羊来直播间](https://xuanruimu.github.io/YangLai/)、B站系列课程（Python 编程题精讲 / 计算机网络 / MySQL 数据库精讲 / 汇编语言程序设计 / 计算机组成原理 / 马克思主义原理精讲 / 毕业论文全流程指导）、原创相声、暮澜纪元小说与 UI 设计、爵士乐作品等。

---

## 技术栈

| 层   | 技术                                                                                  |
| ---- | ------------------------------------------------------------------------------------- |
| 框架 | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) + TypeScript             |
| 3D   | [Three.js](https://threejs.org/) + @react-three/fiber + @react-three/drei + matter-js |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) + framer-motion + lenis 平滑滚动           |
| 数据 | zustand + TanStack Query                                                              |
| AI   | 自研 DeepSeek 流式客户端（零密钥，同源反代注入凭据）                                  |
| PWA  | vite-plugin-pwa + Workbox（离线 / 安装）                                              |
| 性能 | 字体子集化（subset-font）、资源优化、web-vitals 观测                                  |
| 质量 | ESLint + Prettier + oxlint + Vitest + Playwright E2E + CI                             |

---

## 快速开始

```bash
# 前置：PATH 中需有 Python 3（npm run dev / build / test 会调 python 重建 佐证材料.zip）
# 克隆
git clone https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi.git
cd XuanRuiMuGeRenJianLi

# 安装依赖
npm install

# 本地开发（自动做佐证材料打包 + 字体子集化，端口 5180）
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
│   ├── 应用/                # 应用入口（YingYong / BuJu / TiGongQi / PingHuaGunDong）
│   ├── 组件/                # 各板块组件（AI聊天 / 命令面板 / 星空背景 / 主题切换 / 基础组件…）
│   ├── 数据/                # 展示数据（展示.ts 等，改数据刷新即生效）
│   ├── 国际化/              # 界面翻译（zh-CN.json 单一语言包）
│   ├── 工具/                # 设备能力 / 视图过渡 / 注册服务工作线程…
│   └── 类型/                # TypeScript 类型
├── public/                  # 全站唯一静态资源目录（直接编辑，改完刷新即生效）
│   ├── showcase/            # 作品集配图（文件名 = 卡片项目名，一字不差）
│   ├── logos/               # 技术栈 logo
│   ├── images/              # 头像 / 签名 / 二维码
│   ├── videos/ og-image.png # OG 图 / 背景视频
│   ├── fonts/               # ZiTiJianZiJi.js 产出的字体子集（构建产物，不入库）
│   └── 佐证材料.zip         # 打包佐证材料.py --仅打包 产出的下载包（构建产物，不入库）
├── scripts/                 # ZiTiJianZiJi 字体子集化、KaiFaShuJuJieKouCaJian 等
├── 端到端测试/              # Playwright E2E 与 Vitest 测试
└── .github/workflows/ci.yml # CI
```

---

## 内容更新（换图不用改代码）

作品集配图**文件名 = 卡片项目名一字不差**（项目名即 `src/国际化/zh-CN.json` 中 `showcase.cards.<id>.title` 的字面值，含空格、间隔号「·」、书名号《》、全角括号（））。配图路径由项目名自动派生，代码里不写死路径，换图三步：

1. 把新图**重命名为项目名**（如 `羊来.png`），放进 `public/showcase/`；
2. 刷新页面。

线上生效需重新构建并部署。项目名里的空格只在 URL 中编码成 `%20`，磁盘文件名照旧是带空格的项目名。增删卡片改 `src/数据/展示.ts`；`public/showcase/` 下每个图片文件必须恰好被一张卡片引用，漏放图、多放图、项目名含非法文件名字符都会被 `src/数据/展示.test.ts` 拦下。

---

## 许可证

本仓库仅作个人项目开源展示。**Made with ❤️ —— 简历，不止是一页纸。**
