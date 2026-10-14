import { defineConfig } from '@playwright/test'
import { 开发地址 } from './scripts/端口配置.js'

export default defineConfig({
  testDir: './端到端测试',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 开发地址(),
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'zh-CN',
  },
  webServer: {
    // 端口统一由 scripts/端口配置.js → vite.config.js 下发，此处不重复写死
    command: 'npm exec -- vite --host',
    url: 开发地址(),
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
