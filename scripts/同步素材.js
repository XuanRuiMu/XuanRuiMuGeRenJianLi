/**
 * 素材源同步：把唯一素材源 素材/ 镜像进 public/（public 素材由本脚本生成，勿直接编辑）。
 *
 * 映射：素材/images|showcase|videos|logos → public/ 同名目录（整目录镜像，含子目录）；
 *       素材/icons/* → public/ 根平铺（一律按文件名，移入子目录不改变落点；忽略大小写后不允许重名）。
 *
 * 前置闸门（素材/ 是全站唯一素材源，来源目录必须齐备）：
 *   1. 素材/images|showcase|videos|logos|icons 必须全部存在且确实是目录；
 *   2. 素材/ 内不得有指向素材根之外的符号链接/junction（阻断「软链大素材到其他盘」，防往仓外写或误删仓外文件）；
 *   3. 素材/icons 内不得有重名（忽略大小写）或与映射目录同名；
 *   4. 来源目录存在但为空（0 个文件）且旧清单里仍有该目录的产物 → 必须显式加 --允许空目录 才继续。
 *      （防「素材/ 整体被搬空」：5 个来源目录全空时若无此闸门，public 下的素材会被整体删光、清单被改写成 [],
 *        而 build 照常成功，整站从此缺图缺视频缺 logo 且不再有任何告警。）
 *   任一不满足 → 中文报错 + 抛错 + 退出码 1。
 *
 * 零副作用承诺：以上闸门全部在任何删除/复制之前完成，孤儿删除又排在复制循环全部成功之后，
 * 故复制阶段的中止（public 下出现同名目录占位，或 mkdir/copyFile 的 I/O 失败）也发生在零删除之后
 * —— 所有中止都真正不删除任何文件、不更新清单，与中止文案一致。
 *
 * 执行顺序：扫描来源目录 → 校验图标落点 → 读旧清单 → 空目录闸门 → 收集待删孤儿 → 复制全部目标文件 →
 *           删除待删孤儿（逐条打印）→ 写清单。
 *
 * 空目录的两种结局（判据与删除同源：只有会被删的旧清单条目才需要闸门）：
 *   - 加了 --允许空目录 → 中文警告点名该目录，只删除它在旧清单里登记的产物（等于放弃该目录的镜像），
 *     其余来源目录照常同步，退出码 0；
 *   - 旧清单里本来就没有该目录的条目（无旧清单、或条目未过白名单）→ 无产物会被删，静默继续，无需参数、无警告。
 *   素材根下有映射表之外的子目录 → 中文警告列出被忽略的目录（素材根下的普通文件如 签字.png 不警告）。
 *
 * 幂等：内容相同（sha256）则跳过；清单 .素材同步清单.json 记录本轮全部目标相对路径，
 * 下轮逐条删除「旧清单有而本轮没有」的目标文件（精确镜像删孤儿）。首次无清单只复制。
 *
 * 用法：node scripts/同步素材.js [--允许空目录]
 */

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const 仓库根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const 默认源根 = path.join(仓库根, '素材')
const 默认目标根 = path.join(仓库根, 'public')
const 默认清单路径 = path.join(仓库根, '.素材同步清单.json')

const 目录映射 = ['images', 'showcase', 'videos', 'logos']
const 来源目录名 = [...目录映射, 'icons']

const 中止模板 = '，已中止同步（不删除任何文件、不更新清单）'

function 文件哈希(文件路径) {
  return crypto.createHash('sha256').update(fs.readFileSync(文件路径)).digest('hex')
}

function 归一路径(值) {
  const 绝对 = path.resolve(值)
  return process.platform === 'win32' ? 绝对.toLowerCase() : 绝对
}

function 真实归一路径(值) {
  try {
    return 归一路径(fs.realpathSync(值))
  } catch {
    return 归一路径(值)
  }
}

function 中止抛错(说明, 抛错文案 = 说明) {
  console.error(`错误：${说明}${中止模板}`)
  throw new Error(抛错文案)
}

function 读目录条目(目录绝对路径) {
  try {
    return fs.readdirSync(目录绝对路径, { withFileTypes: true })
  } catch (错) {
    return 中止抛错(
      `无法读取素材目录（权限不足、目录被占用或路径不可访问）：${目录绝对路径}（原始错误：${错.message}）`
    )
  }
}

function 解析真实(条目路径) {
  try {
    return { 真实路径: fs.realpathSync(条目路径), 统计: fs.statSync(条目路径) }
  } catch {
    return 中止抛错(`素材目录内存在无法解析的符号链接、junction 或目录（目标不存在或无权限）：${条目路径}`)
  }
}

function 断言未越界(链接路径, 真实路径, 源根真实路径) {
  const 相对真实 = path.relative(归一路径(源根真实路径), 归一路径(真实路径))
  if (!相对真实.startsWith('..') && !path.isAbsolute(相对真实)) return
  中止抛错(
    `素材目录内存在指向素材目录之外的符号链接或 junction：${链接路径} → ${真实路径}。` +
      '为防往仓库外写文件或误删仓库外文件，本脚本有意阻断此情形；请把文件真实放进 素材/ 目录，或先删除该链接'
  )
}

function 收集文件(目录绝对路径, 源根真实路径, 祖先目录栈 = new Set()) {
  const 目录真实 = 真实归一路径(目录绝对路径)
  if (祖先目录栈.has(目录真实)) {
    中止抛错(`素材目录内存在循环符号链接（会无限递归）：${目录绝对路径}`)
  }
  祖先目录栈.add(目录真实)

  const 结果 = []
  for (const 条目 of 读目录条目(目录绝对路径)) {
    const 完整路径 = path.join(目录绝对路径, 条目.name)
    if (条目.isSymbolicLink()) {
      const { 真实路径, 统计 } = 解析真实(完整路径)
      断言未越界(完整路径, 真实路径, 源根真实路径)
      if (统计.isDirectory()) 结果.push(...收集文件(完整路径, 源根真实路径, 祖先目录栈))
      else if (统计.isFile()) 结果.push(完整路径)
      continue
    }
    if (条目.isDirectory()) 结果.push(...收集文件(完整路径, 源根真实路径, 祖先目录栈))
    else if (条目.isFile()) 结果.push(完整路径)
  }
  祖先目录栈.delete(目录真实)
  return 结果
}

function 警告未映射子目录(源根) {
  const 忽略 = 读目录条目(源根)
    .filter((条目) => 条目.isDirectory() && !来源目录名.includes(条目.name))
    .map((条目) => `素材/${条目.name}`)
  if (忽略.length === 0) return
  console.warn(
    `警告：素材/ 下有 ${忽略.length} 个不参与映射的子目录，本次不会同步：${忽略.join('、')}。` +
      '本脚本只同步 素材/images、素材/showcase、素材/videos、素材/logos（整目录镜像到 public 同名目录）' +
      '与 素材/icons（按文件名平铺到 public 根）；素材根下的普通文件（如 签字.png）同样不参与同步'
  )
}

function 扫描来源目录(源根) {
  const 源根真实路径 = fs.existsSync(源根) ? 真实归一路径(源根) : 归一路径(源根)
  const 问题 = []
  const 目录文件表 = new Map()
  for (const 名称 of 来源目录名) {
    const 源目录根 = path.join(源根, 名称)
    if (!fs.existsSync(源目录根)) {
      问题.push(`素材/${名称} 目录不存在`)
      continue
    }
    if (!fs.statSync(源目录根).isDirectory()) {
      问题.push(`素材/${名称} 不是目录`)
      continue
    }
    断言未越界(源目录根, 解析真实(源目录根).真实路径, 源根真实路径)
    目录文件表.set(名称, 收集文件(源目录根, 源根真实路径))
  }
  if (问题.length > 0) {
    const 说明 =
      `素材源目录缺失或结构异常：${问题.join('；')}。素材/ 是全站唯一素材源，` +
      `素材/${目录映射.join('、素材/')}、素材/icons 必须全部存在且确实是目录` +
      '（允许是空目录，但不能缺失或被同名文件占用）；请把缺失的目录补回后重跑'
    中止抛错(说明, `来源目录闸门触发：${说明}`)
  }
  警告未映射子目录(源根)
  return 目录文件表
}

function 清单项合法(项) {
  if (typeof 项 !== 'string' || 项.length === 0) return false
  const 规范 = 项.replace(/\\/g, '/')
  if (path.isAbsolute(项) || path.win32.isAbsolute(项)) return false
  if (!规范.startsWith('public/')) return false
  if (规范.split('/').includes('..')) return false
  return true
}

function 读旧清单(清单路径) {
  if (!fs.existsSync(清单路径)) return null
  try {
    const 解析结果 = JSON.parse(fs.readFileSync(清单路径, 'utf-8'))
    if (!Array.isArray(解析结果)) {
      console.warn('警告：旧清单不是数组，按无旧清单处理（只复制不删除）')
      return null
    }
    return 解析结果
  } catch {
    console.warn('警告：旧清单 JSON 损坏，按无旧清单处理（只复制不删除）')
    return null
  }
}

function 清单项归属目录(项) {
  const 段 = 项.replace(/\\/g, '/').split('/')
  if (段[1] && 目录映射.includes(段[1])) return 段[1]
  if (段.length === 2 && 段[1]) return 'icons'
  return null
}

function 校验空目录闸门(目录文件表, 旧清单, 允许空目录) {
  const 有旧产物的目录 = new Set()
  for (const 项 of 旧清单 || []) {
    const 归属 = 清单项归属目录(项)
    if (归属) 有旧产物的目录.add(归属)
  }
  const 空且有旧产物 = 来源目录名.filter((名称) => 目录文件表.get(名称).length === 0 && 有旧产物的目录.has(名称))
  if (空且有旧产物.length === 0) return
  const 点名 = 空且有旧产物.map((名称) => `素材/${名称}`).join('、')
  if (!允许空目录) {
    中止抛错(
      `素材来源目录存在但为空（0 个文件），而旧清单里仍有这些目录的产物：${点名}。` +
        '素材/ 是全站唯一素材源，来源目录被整体清空会让 public 下这些目录的产物被整体删除、整站缺图缺视频缺 logo；' +
        `若确认要放弃这些目录的镜像（只清它们在旧清单里登记的产物），请加 --允许空目录 重跑`
    )
  }
  for (const 名称 of 空且有旧产物) {
    console.warn(
      `警告：素材/${名称} 目录存在但为空（0 个文件）且旧清单里有该目录的产物；已按 --允许空目录 只删除该目录在旧清单里登记的产物` +
        '（等于放弃该目录的镜像），其余来源目录照常同步'
    )
  }
}

export function 同步(源根, 目标根, 清单路径, 选项 = {}) {
  const 根 = path.dirname(清单路径)
  const 相对路径 = (绝对路径) => path.relative(根, 绝对路径).split(path.sep).join('/')

  const 目录文件表 = 扫描来源目录(源根)

  const 本轮目标 = new Map()
  for (const 名称 of 目录映射) {
    const 源目录根 = path.join(源根, 名称)
    for (const 源文件 of 目录文件表.get(名称)) {
      本轮目标.set(path.join(目标根, 名称, path.relative(源目录根, 源文件)), 源文件)
    }
  }
  const 图标登记 = new Map()
  for (const 图标文件 of 目录文件表.get('icons')) {
    const 图标名 = path.basename(图标文件)
    const 冲突目录 = 目录映射.find((名称) => 名称.toLowerCase() === 图标名.toLowerCase())
    if (冲突目录) {
      中止抛错(
        `素材/icons 下的 ${相对路径(图标文件)} 会被平铺到 public/${图标名}，` +
          `与 素材/${冲突目录} 目录镜像到 public/${冲突目录}/ 的路径冲突（文件与目录不能同名；该判定忽略大小写，大小写不敏感文件系统上同样冲突）；` +
          `icons 一律按文件名平铺到 public 根，移入子目录不改变落点，请把该图标重命名为非 ${目录映射.join('/')} 的名字`
      )
    }
    const 目标绝对路径 = path.join(目标根, 图标名)
    const 图标键 = 图标名.toLowerCase()
    const 已登记源 = 图标登记.get(图标键)
    if (已登记源 && 已登记源 !== 图标文件) {
      中止抛错(
        `素材/icons 下存在同名文件：${相对路径(已登记源)} 与 ${相对路径(图标文件)} 都会平铺到 ${相对路径(目标绝对路径)}，` +
          '（该判定忽略大小写，大小写不敏感文件系统上同样冲突）public 根级图标文件名必须唯一，请改用子目录区分或重命名其中一个'
      )
    }
    图标登记.set(图标键, 图标文件)
    本轮目标.set(目标绝对路径, 图标文件)
  }

  const 旧清单原始 = 读旧清单(清单路径)
  const 旧清单过白名单 = Array.isArray(旧清单原始)
    ? 旧清单原始.filter((项) => {
        if (清单项合法(项)) return true
        console.warn(`警告：旧清单项 "${String(项)}" 未通过白名单校验，已跳过（不删除）`)
        return false
      })
    : null
  /**
   * 旧清单可能有重复项（手改、合并冲突、脚本改版）。必须去重：同一相对路径会被待删孤儿收两次，
   * 删除循环第二次 fs.rmSync 抛未包装的裸 ENOENT —— 此时前半批已删、清单未写，
   * 下轮重跑同样崩，必须手改 .素材同步清单.json 才能恢复（永久卡死）。
   */
  const 旧清单 = 旧清单过白名单 === null ? null : [...new Set(旧清单过白名单)]

  校验空目录闸门(目录文件表, 旧清单, 选项.允许空目录 === true)

  let 复制数 = 0
  let 跳过数 = 0
  let 删除数 = 0

  const 本轮路径集 = new Set([...本轮目标.keys()].map(相对路径))
  const 待删孤儿 = []
  if (旧清单) {
    for (const 旧目标 of 旧清单) {
      if (本轮路径集.has(旧目标)) continue
      const 删除路径 = path.join(根, 旧目标)
      if (fs.existsSync(删除路径) && fs.statSync(删除路径).isFile()) {
        待删孤儿.push({ 相对: 旧目标, 绝对: 删除路径 })
      }
    }
  }

  for (const [目标绝对路径, 源绝对路径] of 本轮目标) {
    if (fs.existsSync(目标绝对路径)) {
      if (!fs.statSync(目标绝对路径).isFile()) {
        中止抛错(
          `public 下有同名目录占位挡住了文件镜像：${相对路径(目标绝对路径)}（对应素材 ${相对路径(源绝对路径)}）。` +
            '文件与目录不能同名，请先删除或改名该目录后重跑'
        )
      }
      if (文件哈希(目标绝对路径) === 文件哈希(源绝对路径)) {
        跳过数++
        continue
      }
    }
    try {
      fs.mkdirSync(path.dirname(目标绝对路径), { recursive: true })
      fs.copyFileSync(源绝对路径, 目标绝对路径)
    } catch (错) {
      中止抛错(
        `无法写入产物（public 下的镜像目录被换成同名文件、目标被占用或只读、路径不是目录）：${相对路径(目标绝对路径)}` +
          `（对应素材 ${相对路径(源绝对路径)}，原始错误：${错.message}）`
      )
    }
    复制数++
  }

  for (const { 相对: 旧目标, 绝对: 删除路径 } of 待删孤儿) {
    fs.rmSync(删除路径)
    删除数++
    console.log(`删除孤儿产物：${旧目标}`)
  }

  fs.writeFileSync(清单路径, JSON.stringify([...本轮路径集].sort(), null, 2), 'utf-8')

  return { 复制数, 跳过数, 删除数, 目标数: 本轮目标.size }
}

function main() {
  const 允许空目录 = process.argv.slice(2).includes('--允许空目录')
  const { 复制数, 跳过数, 删除数, 目标数 } = 同步(默认源根, 默认目标根, 默认清单路径, {
    允许空目录,
  })
  console.log(`素材同步完成：复制 ${复制数}，跳过 ${跳过数}，删除 ${删除数}，目标 ${目标数} 个`)
}

const 是主模块 =
  Boolean(process.argv[1]) && 真实归一路径(process.argv[1]) === 真实归一路径(fileURLToPath(import.meta.url))
if (是主模块) {
  Promise.resolve()
    .then(main)
    .catch((错) => {
      console.error(`素材同步失败：${错.message}`)
      process.exit(1)
    })
}
