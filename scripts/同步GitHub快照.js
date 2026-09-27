/**
 * 构建期 GitHub 仓库快照：把本人公开仓库的元信息与 README 摘录落成
 * `src/data/githubSnapshot.ts`，供询问 AI 的知识库检索使用。
 *
 * 为什么走构建期快照而不是运行时拉取：GitHub 未鉴权 REST 限额是 60 次/小时且按访客出口 IP 计，
 * 多访客会打满；构建期跑一次（CI 里可用 GITHUB_TOKEN，1000 次/小时/仓库）零运行时代价、离线也可用。
 *
 * 用法：
 *   npm run sync:github                    # 本地刷新（可匿名）
 *   GITHUB_TOKEN=xxx npm run sync:github   # 提高限额（CI 自动提供）
 *
 * 失败策略：网络或限额失败时若已有快照文件则保留旧快照并以 0 退出（不阻断构建）；无快照才非零退出。
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

/** GitHub 账号（本人公开仓库的归属者） */
const 账号 = process.env.GITHUB_SYNC_OWNER || 'XuanRuiMu'
const 令牌 = process.env.GITHUB_TOKEN || ''
/** 单个仓库 README 摘录的字符上限 */
const README摘录上限 = Number(process.env.GITHUB_README_LIMIT || 1200)

const 输出路径 = path.resolve('src/data/githubSnapshot.ts')
/** 不纳入简历知识库的仓库（仓库名或「owner/name」），见同目录 同步GitHub快照.排除清单.json */
const 排除清单路径 = path.resolve('scripts/同步GitHub快照.排除清单.json')

function 读排除配置() {
  if (!fs.existsSync(排除清单路径)) return { 仓库集: new Set(), 屏蔽词: [] }
  const 配置 = JSON.parse(fs.readFileSync(排除清单路径, 'utf-8'))
  const 仓库集 = new Set(
    (配置.排除仓库 ?? [])
      .map((项) => String(项.仓库 ?? ''))
      .filter((名) => 名.length > 0)
      .flatMap((名) => [名, 名.split('/').pop()])
      .filter((名) => 名.length > 0)
  )
  const 屏蔽词 = (配置.README屏蔽词 ?? []).map((项) => String(项.词 ?? '')).filter((词) => 词.length > 0)
  return { 仓库集, 屏蔽词 }
}

/** README 摘录截到第一个屏蔽词之前：知识库有硬断言的词不得借 README 回流 */
export function 按屏蔽词截断(文本, 屏蔽词) {
  let 截点 = 文本.length
  for (const 词 of 屏蔽词) {
    const 位置 = 文本.indexOf(词)
    if (位置 >= 0) 截点 = Math.min(截点, 位置)
  }
  return 文本.slice(0, 截点).trim()
}

function 请求头(接受类型) {
  const 头 = {
    'User-Agent': 'xuanruimu-resume-github-sync',
    Accept: 接受类型,
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (令牌) 头.Authorization = `Bearer ${令牌}`
  return 头
}

async function 取JSON(地址) {
  const 响应 = await fetch(地址, { headers: 请求头('application/vnd.github+json') })
  if (!响应.ok) throw new Error(`${地址} → ${响应.status} ${响应.statusText}`)
  return 响应.json()
}

async function 取文本(地址) {
  const 响应 = await fetch(地址, { headers: 请求头('application/vnd.github.raw') })
  if (!响应.ok) return ''
  return 响应.text()
}

/** README 去噪：代码块、图片、HTML 注释、徽章链接一律丢掉，只留可读正文 */
export function 清洗README(原文) {
  return 原文
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`"|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * 中英/中数相邻零空格（与 src/typography.test.ts 同源）：GitHub 的简介与 README 自带空格，
 * 直接进知识库会触发排版回归，故在此统一收紧。英文内部、· 分隔符两侧保留空格。
 */
export function 去除中英间空格(文本) {
  const 中文 = '\\u4e00-\\u9fff\\u3400-\\u4dbf\\uf900-\\ufaff'
  const 字母数字 = 'A-Za-z0-9'
  return 文本
    .replace(new RegExp(`([${中文}]) +([${字母数字}])`, 'g'), '$1$2')
    .replace(new RegExp(`([${字母数字}]) +([${中文}])`, 'g'), '$1$2')
    .replace(new RegExp(`([${字母数字}${中文}]) +([+/]) +([${字母数字}${中文}])`, 'g'), '$1$2$3')
    .replace(new RegExp(`([+/]) +([${字母数字}${中文}])`, 'g'), '$1$2')
    .replace(new RegExp(`([${字母数字}${中文}]) +([+/])`, 'g'), '$1$2')
}

export function 取语言分布(语言字节表) {
  return Object.entries(语言字节表 ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([语言, 字节]) => ({ 语言, 字节 }))
}

async function 抓仓库快照(仓库, 屏蔽词 = []) {
  // 语言分布与 README 都是"有则更好"：任一被限流或 404 都不拖垮整个仓库（未鉴权限额仅 60 次/小时）
  const [语言字节表, README原文] = await Promise.all([
    取JSON(`https://api.github.com/repos/${仓库.full_name}/languages`).catch(() => null),
    取文本(`https://api.github.com/repos/${仓库.full_name}/readme`).catch(() => ''),
  ])
  return {
    全名: 仓库.full_name,
    名称: 仓库.name,
    简介: 去除中英间空格((仓库.description ?? '').trim()),
    主语言: 仓库.language ?? '',
    语言分布: 取语言分布(语言字节表),
    星标数: 仓库.stargazers_count ?? 0,
    分叉数: 仓库.forks_count ?? 0,
    默认分支: 仓库.default_branch ?? '',
    最近推送时间: 仓库.pushed_at ?? '',
    开源许可证: 仓库.license?.spdx_id ?? '',
    主题: 仓库.topics ?? [],
    地址: 仓库.html_url,
    README摘录: 按屏蔽词截断(
      去除中英间空格(清洗README(README原文 ?? '').slice(0, README摘录上限)),
      屏蔽词
    ),
  }
}

function 渲染快照文件(快照表, 生成时间, 元信息) {
  const 表 = JSON.stringify(快照表, null, 2)
  const 元 = JSON.stringify(元信息, null, 2)
  return `/**
 * GitHub 公开仓库快照 · 由 scripts/同步GitHub快照.js 自动生成，请勿手改。
 * 生成时间：${生成时间}
 * 数据来源：GitHub REST API（仓库列表 + 语言分布 + README）
 */
export interface GitHub快照元信息类型 {
  账号: string
  公开仓库总数: number
  纳入仓库数: number
  生成时间: string
}

export interface GitHub仓库快照条目 {
  全名: string
  名称: string
  简介: string
  主语言: string
  语言分布: Array<{ 语言: string; 字节: number }>
  星标数: number
  分叉数: number
  默认分支: string
  最近推送时间: string
  开源许可证: string
  主题: string[]
  地址: string
  README摘录: string
}

export const GitHub快照元信息: GitHub快照元信息类型 = ${元}

export const GitHub快照生成时间 = '${生成时间}'

export const GitHub仓库快照: GitHub仓库快照条目[] = ${表}
`
}

async function 主流程() {
  const 仓库列表 = await 取JSON(
    `https://api.github.com/users/${账号}/repos?per_page=100&sort=pushed&type=owner`
  )
  const { 仓库集, 屏蔽词 } = 读排除配置()
  const 本人仓库 = 仓库列表.filter(
    (仓库) => !仓库.fork && !仓库.archived && !仓库集.has(仓库.full_name) && !仓库集.has(仓库.name)
  )
  const 快照表 = []
  for (const 仓库 of 本人仓库) {
    try {
      快照表.push(await 抓仓库快照(仓库, 屏蔽词))
    } catch (错误) {
      console.warn(`跳过 ${仓库.full_name}：${错误.message}`)
    }
  }
  const 生成时间 = new Date().toISOString()
  const 元信息 = {
    账号,
    公开仓库总数: 仓库列表.filter((仓库) => !仓库.fork && !仓库.archived).length,
    纳入仓库数: 快照表.length,
    生成时间,
  }
  fs.writeFileSync(输出路径, 渲染快照文件(快照表, 生成时间, 元信息), 'utf-8')
  console.log(
    `已写入 ${快照表.length}/${元信息.公开仓库总数} 个仓库快照 → src/data/githubSnapshot.ts（${生成时间}）`
  )
}

// 仅在被直接执行时联网同步（被测试导入时不发请求）
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  主流程().catch((错误) => {
    if (fs.existsSync(输出路径)) {
      console.warn(`GitHub 快照同步失败，保留已有快照：${错误.message}`)
      return
    }
    console.error(`GitHub 快照同步失败且无已有快照：${错误.message}`)
    process.exitCode = 1
  })
}
