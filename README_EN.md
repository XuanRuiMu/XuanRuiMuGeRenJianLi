# XuanRuiMuGeRenJianLi · 玄锐暮个人简历

> An AI-native developer résumé as a 3D interstellar archive — immersive Three.js scenes + a Cmd+K command palette + AI Q&A + skill radar chart + PWA install. A résumé you *browse*.

[![Stars](https://img.shields.io/github/stars/XuanRuiMu/XuanRuiMuGeRenJianLi?style=flat&logo=github)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/stargazers)
[![Forks](https://img.shields.io/github/forks/XuanRuiMu/XuanRuiMuGeRenJianLi?style=flat&logo=github)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/forks)
[![Last Commit](https://img.shields.io/github/last-commit/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/commits/main)
[![Issues](https://img.shields.io/github/issues/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/issues)
[![Repo Size](https://img.shields.io/github/repo-size/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)
[![CI](https://img.shields.io/github/actions/workflow/status/XuanRuiMu/XuanRuiMuGeRenJianLi/ci.yml?label=CI)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/actions)
[![Stack](https://img.shields.io/badge/stack-React19%20%2B%20Three.js%20%2B%20Tailwind4-blueviolet)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)

> 🌐 [中文](README.md) ｜ English

---

## What is this?

A **content-first, tech-showcase** online résumé website that turns a job résumé into an *immersive piece of work*:

- 🪐 **3D interstellar archive UI**: an immersive Three.js scene where works are exhibited like artifacts;
- ⌘ **Cmd+K command palette**: jump to any section like an IDE, press `Cmd+K`;
- 🤖 **AI Q&A**: ask the résumé questions and let AI answer from site content;
- 📡 **Skill radar chart**: visualize proficiency distribution;
- 🌐 **Bilingual i18n**: one-click Chinese / English switch;
- 📱 **PWA offline**: install to desktop / mobile, browsable offline;
- ♿ **Accessibility-minded**: typography tests, a11y optimizations.

## Sections

| Section | Content |
| --- | --- |
| 👋 About | personal intro & values |
| 🛠️ Skills | skill radar / tech matrix |
| 🎨 Showcase | education, courses, design, media, project exhibits |
| 📂 Projects | open-source: loop-engineering / HeWoLianAiBa / 恋爱吧管理中心 / 玄锐暮插件 etc. |
| 💼 Experience | career timeline |
| ✉️ Contact | contact info & QR codes |

**Showcase corridor** (partial): [loop-engineering](https://github.com/XuanRuiMu/loop-engineering), [HeWoLianAiBa](https://github.com/XuanRuiMu/HeWoLianAiBa), [恋爱吧管理中心](https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin), the FengLai livestream, Bilibili course series (Python, Computer Networks, MySQL, Assembly, Computer Organization, Marxist Principles, Thesis Writing Guide), original crosstalk, the 暮澜纪元 novel & UI design, jazz works, etc.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) + TypeScript |
| 3D | [Three.js](https://threejs.org/) + @react-three/fiber + @react-three/drei + matter-js |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + framer-motion + lenis smooth scroll |
| Data | zustand + TanStack Query + zod |
| AI | Vercel AI SDK (`ai`) for Q&A |
| PWA | vite-plugin-pwa + Workbox (offline / install) |
| Performance | font subsetting (subset-font), asset optimization, web-vitals |
| Quality | ESLint + Prettier + oxlint + Vitest + Playwright E2E + CI |

---

## Quick start

```bash
git clone https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi.git
cd XuanRuiMuGeRenJianLi

npm install

# Dev (auto font-subsetting, port 5180)
npm run dev

# Type-check + production build
npm run build

# Preview
npm run preview

# Quality gates
npm run lint        # oxlint + eslint
npm run typecheck   # tsc --noEmit
npm run test:e2e    # Playwright E2E
```

---

## Project structure

```text
XuanRuiMuGeRenJianLi/
├── src/
│   ├── app/                 # app entry (App / layout / providers / SmoothScroll)
│   ├── components/          # section components (About / Skills / Showcase / Projects / Experience / Contact…)
│   ├── data/                # showcase data (showcase.ts — hot-reloadable)
│   ├── i18n/                # zh-CN / en translations
│   ├── utils/               # deviceCapabilities / viewTransition / format / swRegister…
│   └── types/               # TypeScript types
├── public/                  # static assets
│   ├── showcase/            # showcase images
│   ├── logos/               # tech-stack logos
│   ├── images/              # avatar / signature / QR codes
│   └── videos/ og-image.png # OG image / background video
├── scripts/                 # font subsetting, dev-api-plugin, etc.
├── e2e/ tests/              # Playwright E2E & Vitest
├── functions/               # serverless functions (AI Q&A)
└── .github/workflows/ci.yml # CI
```

---

## Content updates (no rebuild needed)

Showcase data is centralized in `src/data/showcase.ts` — **swap an image with the same filename and refresh**: no rebuild or redeploy required.

---

## License

Personal open-source showcase. **Made with ❤️ — a résumé is more than one page.**