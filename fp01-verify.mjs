import { chromium } from 'file:///D:/xuanr/Desktop/燃烧之陨我的世界服务端/个人简历/node_modules/playwright/index.mjs'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const 根 = dirname(fileURLToPath(import.meta.url))
const 证据目录 = resolve(根, '.agents/evidence/traces')
mkdirSync(证据目录, { recursive: true })

const 错误 = []
const 浏览器 = await chromium.launch()
const 页 = await 浏览器.newPage({ viewport: { width: 1440, height: 900 } })
页.on('console', (消息) => { if (消息.type() === 'error') 错误.push(消息.text()) })
页.on('pageerror', (异常) => { 错误.push(String(异常)) })
await 页.goto('http://localhost:5180/', { waitUntil: 'load', timeout: 60000 })
await 页.waitForTimeout(9000)

async function 拍节(主关键, 次关键, 图名, 文名, 锚描述) {
  const 顶部 = await 页.evaluate(([主, 次]) => {
    const 节点 = Array.from(document.querySelectorAll('section')).find((n) => (n.textContent || '').includes(主) && (n.textContent || '').includes(次))
    if (!节点) return null
    const 矩 = 节点.getBoundingClientRect()
    return 矩.top + window.scrollY
  }, [主关键, 次关键])
  if (顶部 === null) throw new Error(`找不到节${锚描述}`)
  await 页.evaluate((t) => window.scrollTo(0, Math.max(0, t - 70)), 顶部)
  await 页.waitForTimeout(2500)
  const 信息 = await 页.evaluate(([主, 次]) => {
    const 节点 = Array.from(document.querySelectorAll('section')).find((n) => (n.textContent || '').includes(主) && (n.textContent || '').includes(次))
    const 矩 = 节点.getBoundingClientRect()
    return {
      矩形: { x: Math.round(矩.x), y: Math.round(矩.y), width: Math.round(矩.width), height: Math.round(矩.height) },
      横向溢出: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      视口: { width: window.innerWidth, height: window.innerHeight },
      卷轴: Math.round(window.scrollY),
      文本: (节点.innerText || '').slice(0, 2000),
    }
  }, [主关键, 次关键])
  await 页.screenshot({ path: resolve(证据目录, 图名), fullPage: false })
  const 指定词 = ['3100', '5175', 'HikariCP', 'Guice']
  const 残留 = 指定词.filter((词) => 信息.文本.includes(词))
  const 报告 = [
    '# FP-01截图证据',
    '',
    `- URL：http://localhost:5180/（开发服务器）`,
    `- 锚描述：${锚描述}`,
    `- 视口：${信息.视口.width}x${信息.视口.height}`,
    `- 卷轴Y：${信息.卷轴}`,
    `- 区域矩形：x=${信息.矩形.x} y=${信息.矩形.y} w=${信息.矩形.width} h=${信息.矩形.height}`,
    `- 横向溢出：${信息.横向溢出}`,
    `- 过滤后控制台error计数：${错误.length}`,
    `- 指定token残留：${残留.length === 0 ? '零残留' : 残留.join(',')}`,
    `- 文本片段：${信息.文本.slice(0, 380).replaceAll('\n', ' | ')}`,
    ...(错误.length > 0 ? ['', '## 控制台error', ...错误.slice(0, 20).map((e) => `- ${e}`)] : []),
  ].join('\n')
  writeFileSync(resolve(证据目录, 文名), 报告, 'utf8')
  console.warn(`${图名} 卷轴=${信息.卷轴} 矩y=${信息.矩形.y} 残留=${残留.join(',') || '无'}`)
  return 残留
}

const r1 = await 拍节('项目作品', '暮澜纪元', 'FP-01-项目作品-20260916.png', 'FP-01-项目作品-20260916.md', '含项目作品+暮澜纪元的SECTION（作品便签区）')
const r2 = await 拍节('持续探索', '恋爱吧管理中心', 'FP-01-持续探索开源卡-20260916.png', 'FP-01-持续探索开源卡-20260916.md', '含持续探索+恋爱吧管理中心的SECTION（开源卡）')
console.warn(`error=${错误.length}`)
await 浏览器.close()
if (r1.length + r2.length > 0) process.exit(2)
if (错误.length > 0) process.exit(3)
