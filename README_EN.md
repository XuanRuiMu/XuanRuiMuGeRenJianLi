# XuanRuiMuGeRenJianLi · 玄锐暮个人简历

> An AI-native developer résumé as a 3D interstellar archive — immersive Three.js scenes + a Cmd+K command palette + AI Q&A + skill radar chart + PWA install. A résumé you _browse_.

[![Stars](https://img.shields.io/github/stars/XuanRuiMu/XuanRuiMuGeRenJianLi?style=flat&logo=github)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/stargazers)
[![Forks](https://img.shields.io/github/forks/XuanRuiMu/XuanRuiMuGeRenJianLi?style=flat&logo=github)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/forks)
[![License: MIT](https://img.shields.io/github/license/XuanRuiMu/XuanRuiMuGeRenJianLi)](LICENSE)
[![Last Commit](https://img.shields.io/github/last-commit/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/commits/main)
[![Issues](https://img.shields.io/github/issues/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/issues)
[![Repo Size](https://img.shields.io/github/repo-size/XuanRuiMu/XuanRuiMuGeRenJianLi)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)
[![CI](https://img.shields.io/github/actions/workflow/status/XuanRuiMu/XuanRuiMuGeRenJianLi/ci.yml?label=CI)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi/actions)
[![Stack](https://img.shields.io/badge/stack-React19%20%2B%20Three.js%20%2B%20Tailwind4-blueviolet)](https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi)

> 🌐 [中文](README.md) ｜ English (docs only; site UI is single-locale Chinese)

---

## What is this?

A **content-first, tech-showcase** online résumé website that turns a job résumé into an _immersive piece of work_:

- 🪐 **3D interstellar archive UI**: an immersive Three.js scene where works are exhibited like artifacts;
- ⌘ **Cmd+K command palette**: jump to any section like an IDE, press `Cmd+K`;
- 🤖 **AI Q&A**: ask the résumé questions and let AI answer from site content;
- 📡 **Skill radar chart**: bespoke SVG visualization of proficiency distribution;
- 🌐 **Single-locale Chinese UI**: interface copy lives in one `zh-CN` bundle (docs are bilingual);
- 📱 **PWA offline**: install to desktop / mobile, browsable offline;
- ♿ **Accessibility-minded**: typography tests, a11y optimizations.

## Sections

| Section       | Content                                                                         |
| ------------- | ------------------------------------------------------------------------------- |
| 👋 About      | personal intro & values                                                         |
| 🛠️ Skills     | skill radar / tech matrix                                                       |
| 🎨 Showcase   | education, courses, design, media, project exhibits                             |
| 📂 Projects   | open-source: loop-engineering / HeWoLianAiBa / 恋爱吧管理中心 / 玄锐暮插件 etc. |
| 💼 Experience | career timeline                                                                 |
| ✉️ Contact    | contact info & QR codes                                                         |

**Showcase corridor** (partial): [loop-engineering](https://github.com/XuanRuiMu/loop-engineering), [HeWoLianAiBa](https://github.com/XuanRuiMu/HeWoLianAiBa), [恋爱吧管理中心](https://github.com/XuanRuiMu/LianAiBaGuanLiZhongXin), the [YangLai livestream](https://xuanruimu.github.io/YangLai/), Bilibili course series (Python, Computer Networks, MySQL, Assembly, Computer Organization, Marxist Principles, Thesis Writing Guide), original crosstalk, the 暮澜纪元 novel & UI design, jazz works, etc.

---

## Tech stack

| Layer       | Technology                                                                                      |
| ----------- | ----------------------------------------------------------------------------------------------- |
| Framework   | [React 19](https://react.dev/) + [Vite 8](https://vite.dev/) + TypeScript                       |
| 3D          | [Three.js](https://threejs.org/) + @react-three/fiber + @react-three/drei + matter-js           |
| Styling     | [Tailwind CSS 4](https://tailwindcss.com/) + framer-motion + lenis smooth scroll                |
| Data        | zustand + TanStack Query                                                                        |
| AI          | In-house DeepSeek streaming client (zero-secret, credentials injected by the same-origin proxy) |
| PWA         | vite-plugin-pwa + Workbox (offline / install)                                                   |
| Performance | font subsetting (subset-font), asset optimization, web-vitals                                   |
| Quality     | ESLint + Prettier + oxlint + Vitest + Playwright E2E + CI                                       |

---

## Quick start

```bash
# Prerequisite: Python 3 on PATH (npm run dev / build / test shell out to python to rebuild 佐证材料.zip)
git clone https://github.com/XuanRuiMu/XuanRuiMuGeRenJianLi.git
cd XuanRuiMuGeRenJianLi

npm install

# Dev (auto asset sync + evidence-bundle packaging + font subsetting, port 5180)
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
├── public/                  # static assets (synced from 素材/ by scripts/同步素材.js — do not edit directly)
│   ├── showcase/            # showcase images
│   ├── logos/               # tech-stack logos
│   ├── images/              # avatar / signature / QR codes
│   ├── videos/ og-image.png # OG image / background video
│   ├── fonts/               # font subsets produced by subset-fonts.js
│   └── 佐证材料.zip         # download bundle produced by 打包佐证材料.py --仅打包
├── 素材/                    # single source of truth for assets (images / showcase / videos / logos / icons)
│   └── 签字.png              # original signature art (source of images/签字-alpha.png, not synced)
├── scripts/                 # asset sync, font subsetting, dev-api-plugin, etc.
├── e2e/ tests/              # Playwright E2E & Vitest
└── .github/workflows/ci.yml # CI
```

> ⚠️ Limitation: `npm run dev` does not watch `素材/` for changes. After editing `素材/`, re-run `node scripts/同步素材.js` (or restart `npm run dev`) to sync into `public/`.

---

## Content updates (swapping images needs no code change)

Showcase images are named **exactly after the card's project name** — the literal value of `showcase.cards.<id>.title` in `src/i18n/zh-CN.json`, spaces, the middle dot `·`, book-title marks 《》 and full-width parentheses （） included. Image paths are derived from that project name, so no path is hardcoded in code. Swapping an image takes three steps:

1. **Rename the new file to the project name** (e.g. `羊来.png`) and drop it into `素材/showcase/`;
2. Run `node scripts/同步素材.js` (or restart `npm run dev`) to mirror `素材/` into `public/`;
3. Refresh the page.

`public/` is a build artifact, so going live requires a fresh build and redeploy. Spaces inside a project name are only percent-encoded as `%20` in the URL — the file on disk keeps the real space. Add or remove cards in `src/data/showcase.ts`; every file under `素材/showcase/` must be referenced by exactly one card — a missing image, an orphan image, or a project name containing characters illegal in file names is rejected by `src/data/showcase.test.ts`.

---

## License

[MIT](LICENSE) — personal open-source showcase. **Made with ❤️ — a résumé is more than one page.**
