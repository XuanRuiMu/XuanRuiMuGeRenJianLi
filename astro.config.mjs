import { defineConfig, fontProviders } from "astro/config";
import sitemap from "@astrojs/sitemap";
import robotsTxt from "astro-robots-txt";
import UnoCSS from "@unocss/astro";
import icon from "astro-icon";

import react from "@astrojs/react";
import node from "@astrojs/node";

const envSiteUrl = process.env.SITE_URL ?? "https://yuxiangkun.dev/";
const site = envSiteUrl.endsWith("/") ? envSiteUrl : `${envSiteUrl}/`;
const siteNoTrailingSlash = site.endsWith("/") ? site.slice(0, -1) : site;

// https://astro.build/config
export default defineConfig({
  fonts: [
    {
      provider: fontProviders.local(),
      name: "CabinetGrotesk",
      cssVariable: "--font-cabinet-grotesk",
      display: "swap",
      fallbacks: ["system-ui", "sans-serif"],
      optimizedFallbacks: true,
      options: {
        variants: [
          {
            weight: "100 1000",
            style: "normal",
            src: ["./src/assets/fonts/CabinetGrotesk-Variable.woff2"],
          },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: "Satoshi",
      cssVariable: "--font-satoshi",
      display: "swap",
      fallbacks: ["system-ui", "sans-serif"],
      optimizedFallbacks: true,
      options: {
        variants: [
          {
            weight: "100 1000",
            style: "normal",
            src: ["./src/assets/fonts/Satoshi-Variable.woff2"],
          },
          {
            weight: "100 1000",
            style: "italic",
            src: ["./src/assets/fonts/Satoshi-VariableItalic.woff2"],
          },
        ],
      },
    },
  ],
  site,
  // 混合渲染：整站静态预渲染，仅标注 prerender=false 的 /api/* 走按需渲染，
  // 这样聊天接口能与站点共用同一个进程与端口，而页面本身仍是可托管到任意 CDN 的静态产物
  adapter: node({ mode: "standalone" }),
  // 关闭 Astro 内置开发工具栏（底部 menu / inspect / audit / settings 悬浮条）
  devToolbar: { enabled: false },
  integrations: [
    sitemap(),
    robotsTxt({
      sitemap: [
        `${siteNoTrailingSlash}/sitemap-index.xml`,
        `${siteNoTrailingSlash}/sitemap-0.xml`,
      ],
    }),
    // React 作为站点唯一 .tsx 渲染器（已移除 Solid：Tooltip 已改写为 React，避免多 JSX 框架互相误编译）
    react(),
    UnoCSS({ injectReset: true }),
    icon(),
  ],
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "hover",
  },
  output: "static",
  vite: {
    server: {
      watch: {
        // 改用轮询模式，规避 Windows 下递归监听扫描到系统盘根的临时文件导致崩溃
        usePolling: true,
        // 函数式忽略：对任意路径中的 DumpStack.log.tmp 都生效（glob 无法匹配 C:\ 绝对路径）
        ignored: [
          (p) => /DumpStack\.log\.tmp/i.test(p),
          "**/node_modules/**",
          "**/.git/**",
        ],
      },
    },
  },
});
