import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { execFileSync, spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const 项目根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist目录 = path.join(项目根, 'dist')
const 源目录 = path.join(项目根, '佐证材料')
const public目录 = path.join(项目根, 'public')
const 脚本路径 = path.join(项目根, 'scripts', '打包佐证材料.py')
const zip路径 = path.join(public目录, '佐证材料.zip')
const 规则路径 = path.join(源目录, '脱敏规则.json')
const 脱敏后目录 = path.join(源目录, '脱敏后')
const python = process.env.PYTHON || 'python'
const 有构建产物 = fs.existsSync(dist目录)

function 跑打包脚本(参数) {
  return execFileSync(python, [脚本路径, ...参数], {
    encoding: 'utf8',
    cwd: 项目根,
  })
}

function 文件哈希(文件) {
  return crypto.createHash('sha256').update(fs.readFileSync(文件)).digest('hex')
}

function 干净环境(附加) {
  const 环境 = {}
  for (const [键, 值] of Object.entries(process.env)) {
    if (键.toLowerCase() !== 'pythonpath') 环境[键] = 值
  }
  return { ...环境, ...附加 }
}

function 收集文件(目录) {
  const 结果 = []
  for (const 项 of fs.readdirSync(目录, { withFileTypes: true })) {
    const 全路径 = path.join(目录, 项.name)
    if (项.isDirectory()) 结果.push(...收集文件(全路径))
    else 结果.push(全路径)
  }
  return 结果
}

function 脱敏规则() {
  return JSON.parse(fs.readFileSync(规则路径, 'utf-8'))
}

function 泄漏基线名() {
  return 脱敏规则().文件.map((项) => 项.名称)
}

function 临时残留(目录) {
  if (!fs.existsSync(目录)) return []
  return 收集文件(目录)
    .filter((p) => path.extname(p) === '.tmp')
    .map((p) => path.relative(项目根, p))
    .sort()
}

function 检出佐证材料泄漏(文件路径列表, 基线) {
  const 命中 = []
  for (const 路径 of 文件路径列表) {
    const 名 = path.basename(路径)
    if (基线.includes(名)) {
      命中.push({ 路径, 原因: `与基线同名 ${名}` })
      continue
    }
    const 词干 = path.parse(名).name
    const 基 = 基线.find((b) => {
      const 基词干 = path.parse(b).name
      return 基词干 !== '' && 词干.startsWith(基词干)
    })
    if (基) 命中.push({ 路径, 原因: `词干以基线 ${基} 开头（构建哈希改名）` })
  }
  return 命中
}

function 建临时项目根(缺失名 = null) {
  const 根 = fs.mkdtempSync(path.join(os.tmpdir(), '佐证材料-临时根-'))
  const 临时脱敏后 = path.join(根, '佐证材料', '脱敏后')
  fs.mkdirSync(path.join(根, 'scripts'), { recursive: true })
  fs.mkdirSync(临时脱敏后, { recursive: true })
  fs.copyFileSync(规则路径, path.join(根, '佐证材料', '脱敏规则.json'))
  for (const 名 of 泄漏基线名()) {
    if (名 === 缺失名) continue
    fs.copyFileSync(path.join(脱敏后目录, 名), path.join(临时脱敏后, 名))
  }
  fs.copyFileSync(脚本路径, path.join(根, 'scripts', '打包佐证材料.py'))
  return 根
}

function 造产物临时残留(根, 名, 回溯秒) {
  const 根下public = path.join(根, 'public')
  fs.mkdirSync(根下public, { recursive: true })
  const 路径 = path.join(根下public, 名)
  fs.writeFileSync(路径, '残片', 'utf8')
  if (回溯秒 !== null) {
    const 时刻 = (Date.now() - 回溯秒 * 1000) / 1000
    fs.utimesSync(路径, 时刻, 时刻)
  }
  return 路径
}

function 临时项目根打包(根, 参数 = ['--仅打包']) {
  return spawnSync(python, [path.join(根, 'scripts', '打包佐证材料.py'), ...参数], {
    encoding: 'utf8',
    cwd: 根,
  })
}

function 并发打包(根, 数量) {
  return Promise.all(
    Array.from(
      { length: 数量 },
      () =>
        new Promise((resolve) => {
          const 子进程 = spawn(python, [path.join(根, 'scripts', '打包佐证材料.py'), '--仅打包'], {
            cwd: 根,
          })
          let 标准输出 = ''
          let 错误输出 = ''
          子进程.stdout.on('data', (块) => {
            标准输出 += 块
          })
          子进程.stderr.on('data', (块) => {
            错误输出 += 块
          })
          子进程.on('close', (码) => resolve({ 码, 标准输出, 错误输出 }))
        })
    )
  )
}

describe('佐证材料 dist 防回归守卫', () => {
  it('public/佐证材料.zip 存在且非空', () => {
    const zip = path.join(项目根, 'public', '佐证材料.zip')
    expect(fs.existsSync(zip), '缺少 public/佐证材料.zip，请运行 python scripts/打包佐证材料.py').toBe(true)
    expect(fs.statSync(zip).size).toBeGreaterThan(1_000_000)
  })

  it('打包脚本审计判定逻辑自检（python --selftest）', { timeout: 60_000 }, () => {
    const 输出 = 跑打包脚本(['--selftest'])
    expect(输出).toContain('自检通过')
  })

  it('public 与 dist 下不存在任何 .tmp 残留（打包原子写残片会被提交/上线/使守卫长红）', () => {
    expect(临时残留(public目录), 'public 下有 .tmp 残留：会被 git add -A 提交并被 vite 原样复制进 dist').toEqual([])
    if (有构建产物) {
      expect(临时残留(dist目录), 'dist 下有 .tmp 残留：会随部署上线').toEqual([])
    }
  })

  it.skipIf(!有构建产物)('dist 根目录含 佐证材料.zip', () => {
    expect(fs.existsSync(path.join(dist目录, '佐证材料.zip'))).toBe(true)
  })

  it.skipIf(!有构建产物)('dist 不含任何佐证材料脱敏产物同名或带构建哈希的同名文件', () => {
    const 基线 = 泄漏基线名()
    expect(基线.length, '脱敏规则.json 的 文件 清单为空会让本守卫恒真').toBeGreaterThan(0)
    expect(
      检出佐证材料泄漏(收集文件(dist目录), 基线),
      '佐证材料脱敏产物泄漏进 dist（含 vite 构建哈希改名，旧写法只比 basename 会假绿）'
    ).toEqual([])
    expect(fs.existsSync(path.join(dist目录, '佐证材料'))).toBe(false)
  })

  it('泄漏判定吃带构建哈希的基线同名，且不吃无关名', () => {
    const 基线 = 泄漏基线名()
    const 基线名 = 基线.find((名) => path.parse(名).ext !== '')
    expect(基线名, '脱敏规则.json 缺少带扩展名的基线名，本用例无效').toBeTruthy()
    const 解析 = path.parse(基线名)
    const 植入 = (名) => 检出佐证材料泄漏([path.join(dist目录, 名)], 基线)
    expect(植入(基线名), `完全同名的 ${基线名} 必须判红`).not.toEqual([])
    expect(
      植入(`${解析.name}-CxYz123${解析.ext}`),
      `带构建哈希的同名 ${解析.name}-CxYz123${解析.ext} 必须判红`
    ).not.toEqual([])
    expect(植入('index-CxYz123.js'), '与基线无关的构建产物不得误报').toEqual([])
  })

  it.skipIf(!有构建产物)('Workbox 预缓存清单（sw.js）不含 佐证材料.zip', () => {
    const sw文件 = 收集文件(dist目录).filter((p) => /sw\.js$/.test(p))
    expect(sw文件.length).toBeGreaterThan(0)
    for (const p of sw文件) {
      const 内容 = fs.readFileSync(p, 'utf8')
      expect(内容, `${p} 预缓存了 佐证材料.zip`).not.toContain(encodeURIComponent('佐证材料.zip'))
      expect(内容, `${p} 预缓存了 佐证材料.zip`).not.toContain('佐证材料.zip')
    }
  })
})

describe('佐证材料 --仅打包（不重新脱敏）', () => {
  it('删 zip 后重建，连跑两次都打包且产物字节一致', { timeout: 600_000 }, () => {
    const 备份 = path.join(os.tmpdir(), `佐证材料-备份-${process.pid}-${Date.now()}.zip`)
    fs.copyFileSync(zip路径, 备份)
    try {
      fs.rmSync(zip路径)
      expect(fs.existsSync(zip路径)).toBe(false)
      expect(跑打包脚本(['--仅打包']), '删掉 zip 后 --仅打包 应重建').toContain('打包')
      expect(fs.existsSync(zip路径), '删掉 zip 后 --仅打包 应重建').toBe(true)
      expect(fs.statSync(zip路径).size).toBeGreaterThan(1_000_000)
      const 首轮哈希 = 文件哈希(zip路径)
      expect(跑打包脚本(['--仅打包']), '第二轮 --仅打包 仍应打包而非跳过').toContain('打包')
      expect(文件哈希(zip路径), '同样输入两次打包应产出相同字节（可重现构建）').toBe(首轮哈希)
    } finally {
      if (!fs.existsSync(zip路径)) fs.copyFileSync(备份, zip路径)
      fs.rmSync(备份, { force: true })
    }
    expect(fs.existsSync(zip路径), '用例结束必须留下 public/佐证材料.zip').toBe(true)
    expect(fs.statSync(zip路径).size).toBeGreaterThan(1_000_000)
    expect(
      fs.readdirSync(public目录).filter((名) => 名.includes('测试备份')),
      '备份不得落在 public/ 内'
    ).toEqual([])
  })

  it('zip 比脱敏后/ 更新时仍无条件重建（无 mtime 快速路径）', { timeout: 120_000 }, () => {
    expect(fs.existsSync(zip路径), '缺少 public/佐证材料.zip').toBe(true)
    const 前哈希 = 文件哈希(zip路径)
    const 输出 = 跑打包脚本(['--仅打包'])
    expect(输出, 'zip 已存在且 mtime 更新时也必须重新打包，不得输出「跳过」').toContain('打包')
    expect(输出).not.toContain('跳过')
    expect(fs.existsSync(zip路径)).toBe(true)
    expect(fs.statSync(zip路径).size).toBeGreaterThan(1_000_000)
    expect(文件哈希(zip路径), '同样输入重建应字节一致').toBe(前哈希)
  })

  it('屏蔽 PIL 后 --仅打包 仍成功（行为断言，无需 Pillow）', { timeout: 120_000 }, () => {
    const 屏蔽目录 = fs.mkdtempSync(path.join(os.tmpdir(), 'pil-blocked-'))
    try {
      fs.writeFileSync(path.join(屏蔽目录, 'PIL.py'), 'raise ImportError("PIL 已被本用例屏蔽")\n', 'utf8')
      const 结果 = spawnSync(process.env.PYTHON || 'python', [脚本路径, '--仅打包'], {
        encoding: 'utf8',
        cwd: 项目根,
        env: 干净环境({
          PYTHONPATH: [屏蔽目录, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
        }),
      })
      const 详情 = `退出码=${结果.status}\nstdout:\n${结果.stdout}\nstderr:\n${结果.stderr}`
      expect(结果.status, `--仅打包 在无 PIL 环境下应成功\n${详情}`).toBe(0)
      expect(结果.stdout, `屏蔽 PIL 后仍应真实重建 zip\n${详情}`).toContain('打包')
      expect(fs.statSync(zip路径).size).toBeGreaterThan(1_000_000)
    } finally {
      fs.rmSync(屏蔽目录, { recursive: true, force: true })
    }
  })

  // 已知覆盖缺口：该路径依赖 Windows 文件占用语义（占用中的 zip 无法被 os.replace 替换），ubuntu CI 无此语义故本用例恒 skip（加 windows matrix 成本过高）
  it.skipIf(process.platform !== 'win32')(
    '目标 zip 被占用时退出码 1 且给中文指引，旧 zip 不受损、无临时文件残留',
    { timeout: 120_000 },
    () => {
      const 前哈希 = 文件哈希(zip路径)
      const 前残留 = new Set(临时残留(public目录))
      const 句柄 = fs.openSync(zip路径, 'r')
      let 结果
      try {
        结果 = spawnSync(python, [脚本路径, '--仅打包'], { encoding: 'utf8', cwd: 项目根 })
      } finally {
        fs.closeSync(句柄)
      }
      const 详情 = `退出码=${结果.status}\nstdout:\n${结果.stdout}\nstderr:\n${结果.stderr}`
      expect(结果.status, `zip 被占用时必须非 0 退出且给中文指引\n${详情}`).toBe(1)
      expect(结果.stderr, 详情).toContain('目标文件被占用或只读')
      expect(结果.stderr, 详情).toContain('请关闭占用它的程序')
      expect(结果.stderr, 详情).not.toContain('Traceback')
      expect(文件哈希(zip路径), '原子写失败时旧 zip 必须完好（不得半截覆盖）').toBe(前哈希)
      expect(
        临时残留(public目录).filter((名) => !前残留.has(名)),
        '本次调用失败后不得新增 .tmp 残留（别的进程崩溃留下的历史残片不归本用例判失败）'
      ).toEqual([])
    }
  )

  it('Pillow 只在使用它的函数内导入（源码层补充断言）', () => {
    const 源码 = fs.readFileSync(脚本路径, 'utf-8')
    expect(源码, '模块顶层不得出现 from PIL import').not.toMatch(/^from PIL import/m)
    expect(源码, '模块顶层不得出现 import PIL').not.toMatch(/^import PIL/m)
  })
})

describe('佐证材料 临时最小项目根（不触碰工作区 佐证材料/脱敏后/）', () => {
  it('脱敏产物齐全时 --仅打包 在临时根内成功并产出 zip', { timeout: 180_000 }, () => {
    const 根 = 建临时项目根()
    try {
      const 结果 = 临时项目根打包(根)
      const 详情 = `退出码=${结果.status}\nstdout:\n${结果.stdout}\nstderr:\n${结果.stderr}`
      expect(结果.status, `临时根内 --仅打包 应成功\n${详情}`).toBe(0)
      expect(结果.stdout, 详情).toContain('打包')
      const zip = path.join(根, 'public', '佐证材料.zip')
      expect(fs.existsSync(zip), 详情).toBe(true)
      expect(fs.statSync(zip).size).toBeGreaterThan(1_000_000)
    } finally {
      fs.rmSync(根, { recursive: true, force: true })
    }
  })

  it('超龄残片清理是「双条件」：非本进程 pid 且 mtime 超龄才删；新残片与非匹配名一律保留', { timeout: 180_000 }, () => {
    const 根 = 建临时项目根()
    try {
      /** 4294967 / 4294969 不可能是活进程 pid：Linux pid_max 上限为 4194304（2^22），Windows pid 恒为 4 的倍数（这两个是奇数） */
      const 老他进程 = '4294967'
      const 新他进程 = '4294969'
      const 超龄秒 = 2 * 60 * 60
      const 应删 = [
        造产物临时残留(根, '佐证材料.zip.tmp', 超龄秒),
        造产物临时残留(根, `佐证材料.zip.${老他进程}.tmp`, 超龄秒),
      ]
      const 应留 = [
        造产物临时残留(根, `佐证材料.zip.${新他进程}.tmp`, null),
        造产物临时残留(根, '佐证材料.zip.bak', 超龄秒),
      ]
      const 结果 = 临时项目根打包(根)
      const 详情 = `退出码=${结果.status}\nstdout:\n${结果.stdout}\nstderr:\n${结果.stderr}`

      expect(结果.status, `临时根内 --仅打包 应成功\n${详情}`).toBe(0)
      for (const 路径 of 应删) {
        expect(fs.existsSync(路径), `超龄且非本进程 pid 的残片应被清理：${path.basename(路径)}\n${详情}`).toBe(false)
      }
      for (const 路径 of 应留) {
        expect(fs.existsSync(路径), `不得清理：${path.basename(路径)}\n${详情}`).toBe(true)
      }
      expect(结果.stdout, 详情).toContain('清理超龄临时文件 佐证材料.zip.tmp')
      expect(结果.stdout, 详情).toContain(`清理超龄临时文件 佐证材料.zip.${老他进程}.tmp`)
      expect(结果.stdout, '非 .tmp 匹配名不是残片，不得清理').not.toContain('清理超龄临时文件 佐证材料.zip.bak')
      expect(结果.stdout, 'mtime 未超龄的残片不得清理').not.toContain(`清理超龄临时文件 佐证材料.zip.${新他进程}.tmp`)
    } finally {
      fs.rmSync(根, { recursive: true, force: true })
    }
  })

  it('缺少脱敏产物时退出码 1 且给出可执行指引（不抛裸 traceback）', { timeout: 180_000 }, () => {
    const 缺失名 = 泄漏基线名()[0]
    const 根 = 建临时项目根(缺失名)
    try {
      const 结果 = 临时项目根打包(根)
      const 详情 = `退出码=${结果.status}\nstdout:\n${结果.stdout}\nstderr:\n${结果.stderr}`
      expect(结果.status, `缺少脱敏产物时必须非 0 退出\n${详情}`).toBe(1)
      expect(结果.stderr, 详情).toContain(`缺少脱敏产物 ${path.join(根, '佐证材料', '脱敏后', 缺失名)}`)
      expect(结果.stderr, 详情).toContain('git checkout -- 佐证材料/脱敏后')
      expect(结果.stderr, 详情).not.toContain('Traceback')
    } finally {
      fs.rmSync(根, { recursive: true, force: true })
    }
  })

  it('两个 --仅打包 并发都应退出 0 且 zip 字节不损坏（原子替换）', { timeout: 300_000 }, async () => {
    const 根 = 建临时项目根()
    try {
      const 串行 = 临时项目根打包(根)
      expect(串行.status, `临时根串行 --仅打包 应成功\n${串行.stderr}`).toBe(0)
      const zip = path.join(根, 'public', '佐证材料.zip')
      const 基准哈希 = 文件哈希(zip)
      const 并发结果 = await 并发打包(根, 2)
      const 详情 = 并发结果
        .map((r, i) => `#${i} 退出码=${r.码}\nstdout:\n${r.标准输出}\nstderr:\n${r.错误输出}`)
        .join('\n----\n')
      for (const [i, r] of 并发结果.entries()) {
        expect(r.码, `并发 --仅打包 #${i} 应退出 0（旧的先删后写写法在此必失败）\n${详情}`).toBe(0)
        expect(r.错误输出, `并发 #${i} 不应报错\n${详情}`).toBe('')
      }
      expect(fs.statSync(zip).size, 详情).toBeGreaterThan(1_000_000)
      expect(文件哈希(zip), `并发打包后 zip 应与串行一致（未损坏）\n${详情}`).toBe(基准哈希)
      expect(
        fs.readdirSync(path.join(根, 'public')).filter((名) => 名.endsWith('.tmp')),
        '临时文件必须清理干净'
      ).toEqual([])
    } finally {
      fs.rmSync(根, { recursive: true, force: true })
    }
  })
})
