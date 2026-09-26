import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'node:path'
import fs from 'node:fs'
import { observabilityPlugin } from './src/observability/vite-plugin-observability'
import 开发数据接口插件 from './scripts/dev-api-plugin.js'

const isAnalyze = process.env.ANALYZE === 'true'

function inlineCriticalCSS() {
  return {
    name: 'inline-critical-css',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const criticalPath = path.resolve(__dirname, './src/styles/critical.css')
        if (!fs.existsSync(criticalPath)) {
          return html
        }
        const css = fs.readFileSync(criticalPath, 'utf-8')
        return html.replace('<!-- CRITICAL_CSS -->', `<style>${css.replace(/\s+/g, ' ').trim()}</style>`)
      },
    },
  }
}

function preloadCSSPlugin() {
  return {
    name: 'preload-css',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const stylesheetMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="(\/assets\/index-[^"]+\.css)"[^>]*>/)
        if (!stylesheetMatch) {
          return html
        }
        const cssHref = stylesheetMatch[1]
        const preloadLink = `<link rel="preload" href="${cssHref}" as="style" crossorigin />`
        return html.replace(stylesheetMatch[0], `${preloadLink}\n    ${stylesheetMatch[0]}`)
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
  plugins: [
    observabilityPlugin(),
    // dev 环境本地数据接口：/api/analytics 落盘到 data/（生产走 functions/）
    开发数据接口插件({ dataDir: path.resolve(__dirname, 'data') }),
    // Serve /test-starry/ 目录索引
    {
      name: 'test-starry-index',
      configureServer(server) {
        server.middlewares.use('/test-starry', (req, res, next) => {
          if (req.url === '/' || req.url === '') {
            const indexPath = path.resolve(__dirname, 'public/test-starry/index.html')
            if (fs.existsSync(indexPath)) {
              res.setHeader('Content-Type', 'text/html; charset=utf-8')
              res.end(fs.readFileSync(indexPath, 'utf-8'))
              return
            }
          }
          next()
        })
      },
    },
    // Serve /skill-test/ 单页应用
    {
      name: 'skill-test-spa',
      configureServer(server) {
        server.middlewares.use('/skill-test', async (req, res, next) => {
          const indexPath = path.resolve(__dirname, 'skill-test.html')
          if (fs.existsSync(indexPath)) {
            const html = fs.readFileSync(indexPath, 'utf-8')
            const transformed = await server.transformIndexHtml('/skill-test', html)
            res.setHeader('Content-Type', 'text/html; charset=utf-8')
            res.end(transformed)
            return
          }
          next()
        })
      },
    },
    inlineCriticalCSS(),
    preloadCSSPlugin(),
    react(),
    babel({
      presets: [reactCompilerPreset()],
    }),
    tailwindcss(),
    VitePWA({
      // 仅负责构建生产 SW 产物（src/sw.ts → dist/sw.js）；注册由 src/utils/swRegister.ts
      // 用原生 navigator.serviceWorker 完成，业务代码不再依赖 virtual:pwa-register。
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      // 业务侧自注册，禁止插件再向 HTML 注入注册脚本（否则与原生注册双轨）
      injectRegister: false,
      // 手写 manifest.json 由 index.html 引用，插件不再生成
      manifest: false,
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,json,woff,woff2}'],
        globIgnores: ['**/*.map', '**/sw.js'],
      },
      // 开发模式禁用 Service Worker：dev SW 会缓存旧页面外壳，源码热更新后旧外壳
      // 请求过期模块地址，导致 "Failed to fetch dynamically imported module" 反复出现。
      // 需要验证 PWA 时用 npm run build && npm run preview（生产 SW 不受影响）。
      devOptions: {
        enabled: false,
      },
    }),
    isAnalyze &&
      visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: './dist/report.html',
      }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true,
    port: 5180,
    // 端口被占用时直接失败，禁止静默换端口（否则用户仍连旧僵尸进程上的 5180）
    strictPort: true,
    watch: {
      ignored: ['**/.agents/**', '**/test-results/**', '**/PROGRESS.md'],
    },
    proxy: {
      // 开发环境与生产 nginx 同契约：前端只打同源 /api/ai/*，密钥由本代理注入，绝不进前端产物。
      '/api/ai/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai\/deepseek/, '/v1/chat/completions'),
        configure: (proxy) => {
          const 密钥 = env.DEEPSEEK_API_KEY || ''
          if (密钥) {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${密钥}`)
            })
          }
        },
      },
      // GLM（Anthropic 兼容端点）预留通道：模型列表接入后把 endpoint 指到 /api/ai/glm。
      '/api/ai/glm': {
        target: env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/anthropic',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/ai\/glm/, '/v1/messages'),
        configure: (proxy) => {
          const 密钥 = env.GLM_API_KEY || ''
          if (密钥) {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', `Bearer ${密钥}`)
            })
          }
        },
      },
    },
  },
  preview: {
    port: 4173,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'skill-test': path.resolve(__dirname, 'skill-test.html'),
      },
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (['/react/', '/react-dom/', '/scheduler/'].some((prefix) => id.includes(prefix))) {
            return 'react-vendor'
          }
          if (['/three/', '/@react-three/'].some((prefix) => id.includes(prefix))) {
            return 'three-vendor'
          }
          if (id.includes('/framer-motion/')) return 'animation-vendor'
          if (id.includes('/recharts/')) return 'charts-vendor'
          if (
            [
              '/lucide-react/',
              '/zustand/',
              '/cmdk/',
              '/@radix-ui/',
              '/react-dialog/',
              '/react-dismissable-layer/',
              '/tailwind-merge/',
            ].some((prefix) => id.includes(prefix))
          ) {
            return 'ui-vendor'
          }
          if (['/ai/', '/zod/', '/to-json-schema/'].some((prefix) => id.includes(prefix))) {
            return 'ai-vendor'
          }
        },
      },
    },
    chunkSizeWarningLimit: 1400,
  },
  optimizeDeps: {
    // 显式预构建懒加载 chunk 依赖，确保冷启动首次预构建一次性完成、确定性强，
    // 避免首请求后才发现新依赖触发重优化 + 整页 reload，从而消除
    // “Failed to fetch dynamically imported module” 这类懒加载竞态。
    include: [
      'react',
      'react-dom',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'framer-motion',
      'matter-js',
      'lenis',
      '@tanstack/react-query',
      'lucide-react',
      'clsx',
      'tailwind-merge',
      'cmdk',
      'zustand',
      '@msgpack/msgpack',
      'zod',
    ],
    // 仅扫描真实入口，避免预打包扫描器误解析 public/ 下走 CDN importmap 的测试页（如 S2-effects.html）
    entries: ['index.html'],
  },
  }
})
