import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { visualizer } from 'rollup-plugin-visualizer'
import path from 'node:path'
import fs from 'node:fs'
import { 可观测性插件 } from './src/可观测/可观测性Vite插件.ts'
import 开发数据接口插件 from './scripts/KaiFaShuJuJieKouCaJian.js'
import { 创建密钥注入钩子 } from './scripts/AIFanDai.js'
import { 开发端口, 预览端口 } from './scripts/端口配置.js'

const 是分析模式 = process.env.ANALYZE === 'true'

function 内联关键样式() {
  return {
    name: 'inline-critical-css',
    transformIndexHtml: {
      order: 'pre',
      handler(网页文本) {
        const 关键样式路径 = path.resolve(import.meta.dirname, './src/样式/关键样式.css')
        if (!fs.existsSync(关键样式路径)) {
          return 网页文本
        }
        const 样式文本 = fs.readFileSync(关键样式路径, 'utf-8')
        return 网页文本.replace(
          '<style data-critical-css></style>',
          `<style>${样式文本.replace(/\s+/g, ' ').trim()}</style>`
        )
      },
    },
  }
}

function 预加载样式插件() {
  return {
    name: 'preload-css',
    transformIndexHtml: {
      order: 'post',
      handler(网页文本) {
        const 样式匹配 = 网页文本.match(
          /<link[^>]+rel="stylesheet"[^>]+href="((?:\.\/|\/)?assets\/index-[^"]+\.css)"[^>]*>/
        )
        if (!样式匹配) {
          return 网页文本
        }
        const 样式地址 = 样式匹配[1]
        const 预加载链接 = `<link rel="preload" href="${样式地址}" as="style" crossorigin />`
        return 网页文本.replace(样式匹配[0], `${预加载链接}\n    ${样式匹配[0]}`)
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: process.env.VITE_BASE || '/',
    plugins: [
      可观测性插件(),

      开发数据接口插件({ dataDir: path.resolve(import.meta.dirname, 'data') }),

      {
        name: 'skill-test-spa',
        configureServer(服务器) {
          服务器.middlewares.use('/skill-test', async (请求, 响应, 下一个) => {
            const 入口文件路径 = path.resolve(import.meta.dirname, 'skill-test.html')
            if (fs.existsSync(入口文件路径)) {
              const 网页文本 = fs.readFileSync(入口文件路径, 'utf-8')
              const 已转换 = await 服务器.transformIndexHtml('/skill-test', 网页文本)
              响应.setHeader('Content-Type', 'text/html; charset=utf-8')
              响应.end(已转换)
              return
            }
            下一个()
          })
        },
      },
      内联关键样式(),
      预加载样式插件(),
      react(),
      babel({
        presets: [reactCompilerPreset()],
      }),
      tailwindcss(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: '服务工作线程.ts',

        injectRegister: false,

        manifest: false,
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,jpg,json,woff,woff2}'],
          globIgnores: ['**/*.map', '**/sw.js', '**/showcase/**', '**/videos/**', '**/og-image.png'],
        },

        devOptions: {
          enabled: false,
        },
      }),
      是分析模式 &&
        visualizer({
          open: false,
          gzipSize: true,
          brotliSize: true,
          filename: './dist/report.html',
        }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
    server: {
      host: true,
      port: 开发端口,

      strictPort: true,
      watch: {
        ignored: ['**/.agents/**', '**/test-results/**', '**/PROGRESS.md'],
      },
      proxy: {
        '/api/ai/deepseek': {
          target: 'https://api.deepseek.com',
          changeOrigin: true,
          secure: true,
          rewrite: (路径) => 路径.replace(/^\/api\/ai\/deepseek/, '/v1/chat/completions'),
          configure: 创建密钥注入钩子(env, 'DEEPSEEK_API_KEY', '/api/ai/deepseek'),
        },

        '/api/ai/glm': {
          target: env.GLM_BASE_URL || 'https://open.bigmodel.cn/api/anthropic',
          changeOrigin: true,
          secure: true,
          rewrite: (路径) => 路径.replace(/^\/api\/ai\/glm/, '/v1/messages'),
          configure: 创建密钥注入钩子(env, 'GLM_API_KEY', '/api/ai/glm'),
        },
      },
    },
    preview: {
      port: 预览端口,
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        input: {
          main: path.resolve(import.meta.dirname, 'index.html'),
          'skill-test': path.resolve(import.meta.dirname, 'skill-test.html'),
        },
        output: {
          手动分块(id) {
            if (!id.includes('node_modules')) return
            if (['/react/', '/react-dom/', '/scheduler/'].some((前缀) => id.includes(前缀))) {
              return 'react-vendor'
            }
            if (['/three/', '/@react-three/'].some((前缀) => id.includes(前缀))) {
              return 'three-vendor'
            }
            if (id.includes('/framer-motion/')) return 'animation-vendor'
            if (
              [
                '/lucide-react/',
                '/zustand/',
                '/cmdk/',
                '/@radix-ui/',
                '/react-dialog/',
                '/react-dismissable-layer/',
                '/tailwind-merge/',
              ].some((前缀) => id.includes(前缀))
            ) {
              return 'ui-vendor'
            }
          },
        },
      },
      chunkSizeWarningLimit: 1400,
    },
    optimizeDeps: {
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
      ],

      entries: ['index.html'],
    },
  }
})
