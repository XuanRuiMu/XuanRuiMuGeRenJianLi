import { defineConfig } from '@playwright/test'
import { 开发地址 } from './scripts/端口配置.js'

export default defineConfig({
  testDir: './端到端测试',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 开发地址(),
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'zh-CN',
  },
  webServer: {
    command: 'npm exec -- vite --host',
    url: 开发地址(),
    reuseExistingServer: true,
    timeout: 180_000,
  },
})
