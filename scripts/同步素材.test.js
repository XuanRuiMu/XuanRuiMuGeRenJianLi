import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { 同步 } from './同步素材.js'

const 仓库根 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const 来源骨架 = {
  'images/骨架图.png': '骨架图内容',
  'showcase/骨架作品.png': '骨架作品内容',
  'videos/骨架视频.mp4': '骨架视频内容',
  'logos/骨架标志.svg': '<svg id="g"/>',
  'icons/骨架图标.svg': '<svg id="i"/>',
}

let 工作区
let 素材根
let public根
let 清单路径

function 写文件(绝对路径, 内容) {
  fs.mkdirSync(path.dirname(绝对路径), { recursive: true })
  fs.writeFileSync(绝对路径, 内容)
}

function 建素材(相对路径, 内容) {
  写文件(path.join(素材根, 相对路径), 内容)
}

function 建来源骨架() {
  for (const [相对路径, 内容] of Object.entries(来源骨架)) {
    写文件(path.join(素材根, 相对路径), 内容)
  }
}

function 建链接(链接路径, 目标绝对路径) {
  fs.symlinkSync(目标绝对路径, 链接路径, 'junction')
}

beforeEach(() => {
  工作区 = fs.mkdtempSync(path.join(os.tmpdir(), '素材同步-'))
  素材根 = path.join(工作区, '素材')
  public根 = path.join(工作区, 'public')
  清单路径 = path.join(工作区, '.素材同步清单.json')
  fs.mkdirSync(素材根, { recursive: true })
  建来源骨架()
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(工作区, { recursive: true, force: true })
})

describe('素材同步：正常镜像', () => {
  it('目录映射进同名子目录，icons 平铺到 public 根，并写出清单', () => {
    建素材('images/头像.png', '头像内容')
    建素材('logos/react.svg', '<svg/>')
    建素材('showcase/作品.png', '作品内容')
    建素材('videos/循环.mp4', '视频内容')
    建素材('icons/favicon.svg', '<svg id="f"/>')
    建素材('icons/icon-192.png', '图标内容')

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 11, 跳过数: 0, 删除数: 0, 目标数: 11 })
    expect(fs.readFileSync(path.join(public根, 'images', '头像.png'), 'utf-8')).toBe('头像内容')
    expect(fs.readFileSync(path.join(public根, 'logos', 'react.svg'), 'utf-8')).toBe('<svg/>')
    expect(fs.readFileSync(path.join(public根, 'showcase', '作品.png'), 'utf-8')).toBe('作品内容')
    expect(fs.readFileSync(path.join(public根, 'videos', '循环.mp4'), 'utf-8')).toBe('视频内容')
    expect(fs.readFileSync(path.join(public根, 'favicon.svg'), 'utf-8')).toBe('<svg id="f"/>')
    expect(fs.readFileSync(path.join(public根, 'icon-192.png'), 'utf-8')).toBe('图标内容')
    expect(fs.existsSync(path.join(public根, 'icons'))).toBe(false)
    expect(JSON.parse(fs.readFileSync(清单路径, 'utf-8'))).toEqual([
      'public/favicon.svg',
      'public/icon-192.png',
      'public/images/头像.png',
      'public/images/骨架图.png',
      'public/logos/react.svg',
      'public/logos/骨架标志.svg',
      'public/showcase/作品.png',
      'public/showcase/骨架作品.png',
      'public/videos/循环.mp4',
      'public/videos/骨架视频.mp4',
      'public/骨架图标.svg',
    ])
  })

  it('二次同步幂等：全部跳过、零删除', () => {
    建素材('images/头像.png', '头像内容')
    建素材('icons/favicon.svg', '<svg id="f"/>')
    同步(素材根, public根, 清单路径)

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 0, 跳过数: 7, 删除数: 0 })
  })

  it('源文件内容变化时覆盖目标文件', () => {
    建素材('images/头像.png', '旧内容')
    同步(素材根, public根, 清单路径)
    建素材('images/头像.png', '新内容')

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果.复制数).toBe(1)
    expect(fs.readFileSync(path.join(public根, 'images', '头像.png'), 'utf-8')).toBe('新内容')
  })

  it('删除源文件后按旧清单精确删除孤儿目标并逐条打印相对路径', () => {
    建素材('images/保留.png', '保留内容')
    建素材('images/将删除.png', '将删除内容')
    建素材('icons/favicon.svg', '<svg id="f"/>')
    同步(素材根, public根, 清单路径)
    expect(fs.existsSync(path.join(public根, 'images', '将删除.png'))).toBe(true)
    fs.rmSync(path.join(素材根, 'images', '将删除.png'))
    const 日志 = vi.spyOn(console, 'log').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 0, 跳过数: 7, 删除数: 1 })
    expect(fs.existsSync(path.join(public根, 'images', '将删除.png'))).toBe(false)
    expect(fs.existsSync(path.join(public根, 'images', '保留.png'))).toBe(true)
    expect(日志.mock.calls.flat().join('\n')).toContain('public/images/将删除.png')
  })

  it('只删清单内的孤儿，不动 public 下的无关文件', () => {
    建素材('images/保留.png', '保留内容')
    同步(素材根, public根, 清单路径)
    写文件(path.join(public根, 'manifest.json'), '{}')
    写文件(path.join(public根, 'images', '手写残留.png'), '手写残留')

    同步(素材根, public根, 清单路径)

    expect(fs.existsSync(path.join(public根, 'manifest.json'))).toBe(true)
    expect(fs.existsSync(path.join(public根, 'images', '手写残留.png'))).toBe(true)
  })

  it('首次无清单时只复制不删除', () => {
    建素材('images/头像.png', '头像内容')
    写文件(path.join(public根, 'images', '来路不明.png'), '来路不明')

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 6, 删除数: 0 })
    expect(fs.existsSync(path.join(public根, 'images', '来路不明.png'))).toBe(true)
  })
})

describe('素材同步：逐来源目录闸门', () => {
  it('缺少某个来源目录时报错中止：不删任何文件、不覆盖清单、提示补回目录', () => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    fs.rmSync(path.join(素材根, 'logos'), { recursive: true, force: true })
    写文件(path.join(public根, 'images', '应存活.png'), '应存活')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/来源目录闸门|素材\/logos/)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误输出).toHaveBeenCalled()
    expect(错误文本).toContain('素材源目录缺失')
    expect(错误文本).toContain('素材/logos 目录不存在')
    expect(错误文本).toContain('补回')
    expect(错误文本).not.toContain('.素材同步清单.json')
    expect(fs.existsSync(path.join(public根, 'images', '头像.png'))).toBe(true)
    expect(fs.existsSync(path.join(public根, 'images', '应存活.png'))).toBe(true)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })

  it('来源目录存在但为空且旧清单有该目录产物、不带 --允许空目录 时中止：不删任何文件、清单不变', () => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    fs.rmSync(path.join(素材根, 'videos'), { recursive: true, force: true })
    fs.mkdirSync(path.join(素材根, 'videos'), { recursive: true })
    写文件(path.join(public根, 'videos', '手写残留.mp4'), '手写残留')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/素材\/videos/)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误输出).toHaveBeenCalled()
    expect(错误文本).toContain('素材/videos')
    expect(错误文本).toContain('存在但为空（0 个文件）')
    expect(错误文本).toContain('旧清单里仍有这些目录的产物')
    expect(错误文本).toContain('--允许空目录')
    expect(错误文本).toContain('不删除任何文件、不更新清单')
    expect(fs.existsSync(path.join(public根, 'videos', '骨架视频.mp4'))).toBe(true)
    expect(fs.existsSync(path.join(public根, 'videos', '手写残留.mp4'))).toBe(true)
    expect(fs.readFileSync(path.join(public根, 'images', '头像.png'), 'utf-8')).toBe('头像内容')
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })

  it('带 --允许空目录 时才警告并只清该目录旧产物：其余目录照常同步、不抛错', () => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    fs.rmSync(path.join(素材根, 'videos'), { recursive: true, force: true })
    fs.mkdirSync(path.join(素材根, 'videos'), { recursive: true })
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径, { 允许空目录: true })

    expect(结果).toMatchObject({ 复制数: 0, 跳过数: 5, 删除数: 1, 目标数: 5 })
    const 警告文本 = 警告.mock.calls.flat().join('\n')
    expect(警告文本).toContain('素材/videos 目录存在但为空')
    expect(警告文本).toContain('已按 --允许空目录')
    expect(警告文本).not.toContain('素材/images')
    expect(fs.existsSync(path.join(public根, 'videos', '骨架视频.mp4'))).toBe(false)
    expect(fs.readFileSync(path.join(public根, 'images', '头像.png'), 'utf-8')).toBe('头像内容')
    expect(fs.readFileSync(path.join(public根, 'images', '骨架图.png'), 'utf-8')).toBe('骨架图内容')
    expect(fs.existsSync(path.join(public根, '骨架图标.svg'))).toBe(true)
    expect(JSON.parse(fs.readFileSync(清单路径, 'utf-8'))).toEqual([
      'public/images/头像.png',
      'public/images/骨架图.png',
      'public/logos/骨架标志.svg',
      'public/showcase/骨架作品.png',
      'public/骨架图标.svg',
    ])
  })

  it('旧清单里没有该目录条目时来源目录为空属无产物：静默继续、零删除、无需参数', () => {
    建素材('images/头像.png', '头像内容')
    写文件(清单路径, JSON.stringify(['public/robots.txt'], null, 2))
    fs.rmSync(path.join(素材根, 'videos'), { recursive: true, force: true })
    fs.mkdirSync(path.join(素材根, 'videos'), { recursive: true })
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 5, 跳过数: 0, 删除数: 0, 目标数: 5 })
    expect(警告).not.toHaveBeenCalled()
    expect(JSON.parse(fs.readFileSync(清单路径, 'utf-8'))).not.toContain('public/videos/骨架视频.mp4')
  })

  it('素材/icons 为空时只清 public 根级旧图标，不动 public 根下手写文件', () => {
    同步(素材根, public根, 清单路径)
    写文件(path.join(public根, 'robots.txt'), '手写 robots')
    fs.rmSync(path.join(素材根, 'icons'), { recursive: true, force: true })
    fs.mkdirSync(path.join(素材根, 'icons'), { recursive: true })
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径, { 允许空目录: true })

    expect(结果).toMatchObject({ 复制数: 0, 跳过数: 4, 删除数: 1, 目标数: 4 })
    expect(警告.mock.calls.flat().join('\n')).toContain('素材/icons 目录存在但为空')
    expect(fs.existsSync(path.join(public根, '骨架图标.svg'))).toBe(false)
    expect(fs.existsSync(path.join(public根, 'robots.txt'))).toBe(true)
    expect(fs.existsSync(path.join(public根, 'videos', '骨架视频.mp4'))).toBe(true)
  })

  it('素材/icons 为空且旧清单有根级图标条目时无参数中止：图标产物不删、清单不变', () => {
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    fs.rmSync(path.join(素材根, 'icons'), { recursive: true, force: true })
    fs.mkdirSync(path.join(素材根, 'icons'), { recursive: true })
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/素材\/icons/)

    expect(错误输出.mock.calls.flat().join('\n')).toContain('--允许空目录')
    expect(fs.existsSync(path.join(public根, '骨架图标.svg'))).toBe(true)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })

  it('素材根为空（5 个来源目录全缺）时报错中止、不删任何文件、不覆盖清单', () => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    fs.rmSync(素材根, { recursive: true, force: true })
    fs.mkdirSync(素材根, { recursive: true })
    写文件(path.join(public根, 'images', '应存活.png'), '应存活')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/来源目录闸门/)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误输出).toHaveBeenCalled()
    expect(错误文本).toContain('素材源目录缺失')
    expect(错误文本).toContain('素材/icons 目录不存在')
    expect(错误文本).not.toContain('.素材同步清单.json')
    expect(fs.existsSync(path.join(public根, 'images', '头像.png'))).toBe(true)
    expect(fs.existsSync(path.join(public根, 'images', '应存活.png'))).toBe(true)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })

  it('来源目录被同名文件占用时报错中止而非崩溃', () => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    fs.rmSync(path.join(素材根, 'logos'), { recursive: true, force: true })
    建素材('logos', '这不是目录')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/素材\/logos 不是目录/)

    expect(错误输出.mock.calls.flat().join('\n')).toContain('素材/logos 不是目录')
    expect(fs.existsSync(path.join(public根, 'logos', '骨架标志.svg'))).toBe(true)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })
})

describe('素材同步：递归与素材根边界', () => {
  it('来源目录下的嵌套子目录被同步且进入清单', () => {
    建素材('images/头像/正脸.png', '正脸内容')

    同步(素材根, public根, 清单路径)

    expect(fs.readFileSync(path.join(public根, 'images', '头像', '正脸.png'), 'utf-8')).toBe('正脸内容')
    expect(JSON.parse(fs.readFileSync(清单路径, 'utf-8'))).toContain('public/images/头像/正脸.png')
  })

  it('素材根下不参与映射的文件不同步到 public', () => {
    建素材('签字.png', '签字内容')

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果.目标数).toBe(5)
    expect(fs.existsSync(path.join(public根, '签字.png'))).toBe(false)
    expect(JSON.parse(fs.readFileSync(清单路径, 'utf-8'))).not.toContain('public/签字.png')
  })

  it('素材根下映射表之外的子目录被忽略时打印警告，根级普通文件不误报', () => {
    建素材('签字.png', '签字内容')
    建素材('草稿/待删.png', '草稿内容')
    建素材('旧备份/logo.png', '备份内容')
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果.目标数).toBe(5)
    expect(fs.existsSync(path.join(public根, '草稿'))).toBe(false)
    expect(fs.existsSync(path.join(public根, '旧备份'))).toBe(false)
    const 警告文本 = 警告.mock.calls.flat().join('\n')
    expect(警告文本).toContain('素材/草稿')
    expect(警告文本).toContain('素材/旧备份')
    expect(警告文本).not.toContain('素材/签字.png')
  })

  it('素材根下没有多余子目录时不打印忽略警告', () => {
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    同步(素材根, public根, 清单路径)

    expect(警告).not.toHaveBeenCalled()
  })
})

describe('素材同步：I/O 失败的中文中止包装', () => {
  it('收集文件时目录不可读（权限被拒）报中文中止：不删任何文件、不覆盖清单', () => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    写文件(path.join(public根, 'images', '应存活.png'), '应存活')
    const 不可读目录 = path.join(素材根, 'images')
    const 原读目录 = fs.readdirSync
    vi.spyOn(fs, 'readdirSync').mockImplementation((目录, 选项) => {
      if (String(目录) === 不可读目录) {
        const 错 = new Error(`EACCES: permission denied, scandir '${目录}'`)
        错.code = 'EACCES'
        throw 错
      }
      return 原读目录(目录, 选项)
    })
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/无法读取素材目录/)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误输出).toHaveBeenCalled()
    expect(错误文本).toContain('无法读取素材目录')
    expect(错误文本).toContain(不可读目录)
    expect(错误文本).toContain('不删除任何文件、不更新清单')
    expect(fs.existsSync(path.join(public根, 'images', '应存活.png'))).toBe(true)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })

  it('public 下同名目录占位时给中文可操作提示而非裸 EISDIR', () => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    fs.rmSync(path.join(public根, 'images', '骨架图.png'))
    fs.mkdirSync(path.join(public根, 'images', '骨架图.png'), { recursive: true })
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/同名目录占位/)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误文本).toContain('同名目录占位')
    expect(错误文本).toContain('public/images/骨架图.png')
    expect(错误文本).toContain('请先删除或改名该目录')
    expect(fs.existsSync(path.join(public根, 'images', '骨架图.png'))).toBe(true)
  })

  it('public 根级图标被同名目录占位时同样给中文提示', () => {
    同步(素材根, public根, 清单路径)
    fs.rmSync(path.join(public根, '骨架图标.svg'))
    fs.mkdirSync(path.join(public根, '骨架图标.svg'), { recursive: true })
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/同名目录占位/)

    expect(错误输出.mock.calls.flat().join('\n')).toContain('public/骨架图标.svg')
  })

  it('复制阶段 I/O 失败（目标被占用/只读、镜像目录被同名文件占用）时报中文中止：零删除、清单不变', () => {
    建素材('images/将删除.png', '将删除内容')
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    fs.rmSync(path.join(素材根, 'images', '将删除.png'))
    建素材('images/骨架图.png', '骨架图内容已改')
    const 受阻目标 = path.join(public根, 'images', '骨架图.png')
    const 原复制 = fs.copyFileSync
    vi.spyOn(fs, 'copyFileSync').mockImplementation((源, 目标) => {
      if (String(目标) === 受阻目标) {
        const 错 = new Error(`EPERM: operation not permitted, copyfile '${源}' -> '${目标}'`)
        错.code = 'EPERM'
        throw 错
      }
      return 原复制(源, 目标)
    })
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/无法写入产物/)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误输出).toHaveBeenCalled()
    expect(错误文本).toContain('无法写入产物')
    expect(错误文本).toContain('public/images/骨架图.png')
    expect(错误文本).toContain('素材/images/骨架图.png')
    expect(错误文本, '必须给出底层原始错误供定位').toContain('EPERM')
    expect(错误文本).toContain('不删除任何文件、不更新清单')
    expect(fs.existsSync(path.join(public根, 'images', '将删除.png')), '复制阶段中止必须零删除').toBe(true)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })

  it('复制阶段中止时真正零副作用：孤儿产物未被删、清单未变（删除排在复制全成之后）', () => {
    建素材('images/将删除.png', '将删除内容')
    同步(素材根, public根, 清单路径)
    fs.rmSync(path.join(素材根, 'images', '将删除.png'))
    建素材('images/骨架图.png', '骨架图内容已改')
    fs.rmSync(path.join(public根, 'showcase', '骨架作品.png'))
    fs.mkdirSync(path.join(public根, 'showcase', '骨架作品.png'), { recursive: true })
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/同名目录占位/)

    expect(错误输出.mock.calls.flat().join('\n')).toContain('不删除任何文件、不更新清单')
    expect(fs.readFileSync(path.join(public根, 'images', '骨架图.png'), 'utf-8')).toBe('骨架图内容已改')
    expect(fs.existsSync(path.join(public根, 'images', '将删除.png'))).toBe(true)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })
})

describe('素材同步：CLI 子进程入口（主模块判定）', () => {
  it('以脚本绝对路径调用、cwd 与脚本所在目录不同时正常同步并输出中文完成行', () => {
    const 最小项目根 = fs.mkdtempSync(path.join(os.tmpdir(), '素材同步CLI-'))
    const 另工作目录 = fs.mkdtempSync(path.join(os.tmpdir(), '素材同步CLI-cwd-'))
    try {
      写文件(path.join(最小项目根, 'package.json'), '{"type":"module"}')
      fs.mkdirSync(path.join(最小项目根, 'scripts'), { recursive: true })
      fs.copyFileSync(path.join(仓库根, 'scripts', '同步素材.js'), path.join(最小项目根, 'scripts', '同步素材.js'))
      for (const [相对路径, 内容] of Object.entries(来源骨架)) {
        写文件(path.join(最小项目根, '素材', 相对路径), 内容)
      }

      const 运行 = spawnSync(process.execPath, [path.join(最小项目根, 'scripts', '同步素材.js')], {
        cwd: 另工作目录,
        encoding: 'utf-8',
      })

      expect(运行.stderr).not.toMatch(/错误|失败/)
      expect(运行.status).toBe(0)
      expect(运行.stdout).toContain('素材同步完成')
      expect(fs.readFileSync(path.join(最小项目根, 'public', 'images', '骨架图.png'), 'utf-8')).toBe('骨架图内容')
      expect(fs.readFileSync(path.join(最小项目根, 'public', '骨架图标.svg'), 'utf-8')).toBe('<svg id="i"/>')
      expect(fs.existsSync(path.join(最小项目根, '.素材同步清单.json'))).toBe(true)
      expect(fs.existsSync(path.join(另工作目录, 'public'))).toBe(false)
    } finally {
      fs.rmSync(最小项目根, { recursive: true, force: true })
      fs.rmSync(另工作目录, { recursive: true, force: true })
    }
  })

  it.runIf(process.platform === 'win32')(
    '经 junction 别名且盘符大小写不同的路径调用 CLI 仍执行（真实归一路径判定）',
    () => {
      const 最小项目根 = fs.mkdtempSync(path.join(os.tmpdir(), '素材同步CLI-'))
      const 别名根 = fs.mkdtempSync(path.join(os.tmpdir(), '素材同步CLI-别名-'))
      try {
        写文件(path.join(最小项目根, 'package.json'), '{"type":"module"}')
        fs.mkdirSync(path.join(最小项目根, 'scripts'), { recursive: true })
        fs.copyFileSync(path.join(仓库根, 'scripts', '同步素材.js'), path.join(最小项目根, 'scripts', '同步素材.js'))
        for (const [相对路径, 内容] of Object.entries(来源骨架)) {
          写文件(path.join(最小项目根, '素材', 相对路径), 内容)
        }
        fs.symlinkSync(最小项目根, path.join(别名根, '别名'), 'junction')
        const 别名脚本 = path
          .join(别名根, '别名', 'scripts', '同步素材.js')
          .replace(/^([A-Z]):/, (_, 盘符) => `${盘符.toLowerCase()}:`)

        const 运行 = spawnSync(process.execPath, [别名脚本], { cwd: 别名根, encoding: 'utf-8' })

        expect(运行.stderr).not.toMatch(/错误|失败/)
        expect(运行.status).toBe(0)
        expect(运行.stdout).toContain('素材同步完成')
        expect(fs.readFileSync(path.join(最小项目根, 'public', 'images', '骨架图.png'), 'utf-8')).toBe('骨架图内容')
      } finally {
        fs.rmSync(别名根, { recursive: true, force: true })
        fs.rmSync(最小项目根, { recursive: true, force: true })
      }
    }
  )

  it('来源目录缺失时子进程退出码为 1 并输出中文错误（不静默空转）', () => {
    const 最小项目根 = fs.mkdtempSync(path.join(os.tmpdir(), '素材同步CLI-'))
    try {
      写文件(path.join(最小项目根, 'package.json'), '{"type":"module"}')
      fs.mkdirSync(path.join(最小项目根, 'scripts'), { recursive: true })
      fs.copyFileSync(path.join(仓库根, 'scripts', '同步素材.js'), path.join(最小项目根, 'scripts', '同步素材.js'))
      fs.mkdirSync(path.join(最小项目根, '素材'), { recursive: true })

      const 运行 = spawnSync(process.execPath, [path.join(最小项目根, 'scripts', '同步素材.js')], {
        cwd: 最小项目根,
        encoding: 'utf-8',
      })

      expect(运行.status).toBe(1)
      expect(运行.stdout).not.toContain('素材同步完成')
      expect(运行.stderr).toContain('素材/images 目录不存在')
      expect(运行.stderr).toContain('素材同步失败')
      expect(fs.existsSync(path.join(最小项目根, 'public'))).toBe(false)
      expect(fs.existsSync(path.join(最小项目根, '.素材同步清单.json'))).toBe(false)
    } finally {
      fs.rmSync(最小项目根, { recursive: true, force: true })
    }
  })

  it('5 个来源目录全被清空：无参数退出码 1 且产物零删除，带 --允许空目录 退出码 0 且清空产物', () => {
    const 最小项目根 = fs.mkdtempSync(path.join(os.tmpdir(), '素材同步CLI-'))
    const 脚本路径 = path.join(最小项目根, 'scripts', '同步素材.js')
    try {
      写文件(path.join(最小项目根, 'package.json'), '{"type":"module"}')
      fs.mkdirSync(path.join(最小项目根, 'scripts'), { recursive: true })
      fs.copyFileSync(path.join(仓库根, 'scripts', '同步素材.js'), 脚本路径)
      for (const [相对路径, 内容] of Object.entries(来源骨架)) {
        写文件(path.join(最小项目根, '素材', 相对路径), 内容)
      }
      const 首跑 = spawnSync(process.execPath, [脚本路径], { cwd: 最小项目根, encoding: 'utf-8' })
      expect(首跑.status).toBe(0)
      const 清单原文 = fs.readFileSync(path.join(最小项目根, '.素材同步清单.json'), 'utf-8')

      for (const 名称 of ['images', 'showcase', 'videos', 'logos', 'icons']) {
        fs.rmSync(path.join(最小项目根, '素材', 名称), { recursive: true, force: true })
        fs.mkdirSync(path.join(最小项目根, '素材', 名称), { recursive: true })
      }

      const 无参数 = spawnSync(process.execPath, [脚本路径], { cwd: 最小项目根, encoding: 'utf-8' })

      expect(无参数.status).toBe(1)
      expect(无参数.stdout).not.toContain('素材同步完成')
      expect(无参数.stderr).toContain('存在但为空（0 个文件）')
      expect(无参数.stderr).toContain('素材/images、素材/showcase、素材/videos、素材/logos、素材/icons')
      expect(无参数.stderr).toContain('--允许空目录')
      expect(fs.existsSync(path.join(最小项目根, 'public', 'images', '骨架图.png'))).toBe(true)
      expect(fs.existsSync(path.join(最小项目根, 'public', '骨架图标.svg'))).toBe(true)
      expect(fs.readFileSync(path.join(最小项目根, '.素材同步清单.json'), 'utf-8')).toBe(清单原文)

      const 带参数 = spawnSync(process.execPath, [脚本路径, '--允许空目录'], {
        cwd: 最小项目根,
        encoding: 'utf-8',
      })

      expect(带参数.status).toBe(0)
      expect(带参数.stderr).not.toMatch(/错误|失败/)
      expect(带参数.stderr).toContain('已按 --允许空目录')
      expect(带参数.stdout).toContain('素材同步完成')
      expect(fs.existsSync(path.join(最小项目根, 'public', 'images', '骨架图.png'))).toBe(false)
      expect(fs.existsSync(path.join(最小项目根, 'public', '骨架图标.svg'))).toBe(false)
      expect(JSON.parse(fs.readFileSync(path.join(最小项目根, '.素材同步清单.json'), 'utf-8'))).toEqual([])
    } finally {
      fs.rmSync(最小项目根, { recursive: true, force: true })
    }
  })
})

describe('素材同步：图标同名冲突与软链越界', () => {
  it('icons 下同名 basename 冲突时报错中止：不复制、不写清单', () => {
    建素材('icons/favicon.svg', '<svg id="a"/>')
    建素材('icons/子目录/favicon.svg', '<svg id="b"/>')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/favicon\.svg/)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误文本).toContain('子目录')
    expect(错误文本).toContain('请改用子目录区分')
    expect(fs.existsSync(path.join(public根, 'favicon.svg'))).toBe(false)
    expect(fs.existsSync(清单路径)).toBe(false)
  })

  it('icons 下文件名与映射目录名冲突时报错中止而非中途崩溃', () => {
    建素材('icons/images', '这是个伪装成目录的图标')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/public\/images/)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误文本).toContain('文件与目录不能同名')
    expect(错误文本).toContain('移入子目录不改变落点')
    expect(错误文本).toContain('请把该图标重命名为非 images/showcase/videos/logos 的名字')
    expect(错误文本).not.toContain('把它移入')
    expect(fs.existsSync(path.join(public根, 'images'))).toBe(false)
    expect(fs.existsSync(清单路径)).toBe(false)
  })

  it('icons 下仅大小写不同的重名也判冲突（大小写不敏感文件系统同样成立）', () => {
    建素材('icons/甲/Favicon.svg', '<svg id="a"/>')
    建素材('icons/乙/favicon.svg', '<svg id="b"/>')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/favicon\.svg/i)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误文本).toContain('素材/icons')
    expect(错误文本).toContain('忽略大小写')
    expect(错误文本).toContain('请改用子目录区分')
    expect(fs.existsSync(path.join(public根, 'Favicon.svg'))).toBe(false)
    expect(fs.existsSync(path.join(public根, 'favicon.svg'))).toBe(false)
    expect(fs.existsSync(清单路径)).toBe(false)
  })

  it('icons 下文件名与映射目录名仅大小写不同时也判冲突', () => {
    建素材('icons/Images', '这是个伪装成目录的图标')
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/public\/images/i)

    const 错误文本 = 错误输出.mock.calls.flat().join('\n')
    expect(错误文本).toContain('与 素材/images 目录镜像到 public/images/ 的路径冲突')
    expect(错误文本).toContain('忽略大小写')
    expect(fs.existsSync(path.join(public根, 'Images'))).toBe(false)
    expect(fs.existsSync(清单路径)).toBe(false)
  })

  it('素材内 junction 指向素材根之外时报错中止且不删任何文件', (ctx) => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    const 仓外目录 = path.join(工作区, '仓外素材')
    写文件(path.join(仓外目录, '外部.png'), '外部内容')
    try {
      建链接(path.join(素材根, 'videos', '外链'), 仓外目录)
    } catch (错) {
      ctx.skip(`当前环境无法创建 junction，跳过：${错.message}`)
      return
    }
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/符号链接或 junction/)

    expect(错误输出.mock.calls.flat().join('\n')).toContain('有意阻断')
    expect(fs.existsSync(path.join(public根, 'videos', '骨架视频.mp4'))).toBe(true)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })

  it('来源目录本身是指向仓外的 junction 时报错中止且不删任何文件', (ctx) => {
    同步(素材根, public根, 清单路径)
    const 清单原文 = fs.readFileSync(清单路径, 'utf-8')
    const 仓外目录 = path.join(工作区, '仓外素材')
    写文件(path.join(仓外目录, '外部.mp4'), '外部内容')
    fs.rmSync(path.join(素材根, 'videos'), { recursive: true, force: true })
    try {
      建链接(path.join(素材根, 'videos'), 仓外目录)
    } catch (错) {
      ctx.skip(`当前环境无法创建 junction，跳过：${错.message}`)
      return
    }
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/指向素材目录之外的符号链接或 junction/)

    expect(错误输出.mock.calls.flat().join('\n')).toContain('有意阻断')
    expect(fs.existsSync(path.join(public根, 'videos', '骨架视频.mp4'))).toBe(true)
    expect(fs.existsSync(path.join(public根, 'videos', '外部.mp4'))).toBe(false)
    expect(fs.readFileSync(清单路径, 'utf-8')).toBe(清单原文)
  })

  it('素材目录内自引用软链（指向所在目录自身）时报循环符号链接中止', (ctx) => {
    try {
      建链接(path.join(素材根, 'videos', 'self'), path.join(素材根, 'videos'))
    } catch (错) {
      ctx.skip(`当前环境无法创建自引用链接，跳过：${错.message}`)
      return
    }
    const 错误输出 = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => 同步(素材根, public根, 清单路径)).toThrow(/循环符号链接/)

    expect(错误输出.mock.calls.flat().join('\n')).toContain('循环符号链接')
    expect(fs.existsSync(public根)).toBe(false)
    expect(fs.existsSync(清单路径)).toBe(false)
  })

  it('素材内 junction 指向素材根之内时正常同步', (ctx) => {
    try {
      建链接(path.join(素材根, 'videos', '内链'), path.join(素材根, 'images'))
    } catch (错) {
      ctx.skip(`当前环境无法创建 junction，跳过：${错.message}`)
      return
    }

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 6, 跳过数: 0, 删除数: 0 })
    expect(fs.readFileSync(path.join(public根, 'videos', '内链', '骨架图.png'), 'utf-8')).toBe('骨架图内容')
    expect(JSON.parse(fs.readFileSync(清单路径, 'utf-8'))).toContain('public/videos/内链/骨架图.png')
  })
})

describe('素材同步：旧清单容错与白名单', () => {
  it('旧清单 JSON 损坏时按无旧清单处理：只复制不删除且不抛错', () => {
    建素材('images/头像.png', '头像内容')
    写文件(path.join(public根, 'images', '来路不明.png'), '来路不明')
    写文件(清单路径, '{这不是合法 JSON')
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 6, 跳过数: 0, 删除数: 0 })
    expect(fs.existsSync(path.join(public根, 'images', '来路不明.png'))).toBe(true)
    expect(警告.mock.calls.flat().join('\n')).toContain('JSON 损坏')
    expect(JSON.parse(fs.readFileSync(清单路径, 'utf-8'))).toEqual([
      'public/images/头像.png',
      'public/images/骨架图.png',
      'public/logos/骨架标志.svg',
      'public/showcase/骨架作品.png',
      'public/videos/骨架视频.mp4',
      'public/骨架图标.svg',
    ])
  })

  it('旧清单不是数组时按无旧清单处理：只复制不删除', () => {
    建素材('images/头像.png', '头像内容')
    写文件(path.join(public根, 'images', '来路不明.png'), '来路不明')
    写文件(清单路径, '{"public/images/来路不明.png": true}')
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果.删除数).toBe(0)
    expect(fs.existsSync(path.join(public根, 'images', '来路不明.png'))).toBe(true)
    expect(警告.mock.calls.flat().join('\n')).toContain('不是数组')
  })

  it('旧清单含 ../ 与绝对路径项时跳过该两处删除，仓库外文件存活', () => {
    建素材('images/头像.png', '头像内容')
    同步(素材根, public根, 清单路径)
    写文件(path.join(工作区, '仓库外.txt'), '仓库外内容')
    写文件(path.join(public根, 'images', '旧产物.png'), '旧产物内容')
    const 越界项 = ['../仓库外.txt', path.join(工作区, '仓库外.txt'), 'public/images/旧产物.png']
    写文件(清单路径, JSON.stringify(越界项, null, 2))
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果.删除数).toBe(1)
    expect(fs.existsSync(path.join(工作区, '仓库外.txt'))).toBe(true)
    expect(fs.existsSync(path.join(public根, 'images', '旧产物.png'))).toBe(false)
    expect(警告.mock.calls.flat().join('\n')).toContain('白名单')
  })

  it('旧清单含重复项时同一孤儿只删一次、不抛裸 ENOENT，清单正常写（否则永久卡死）', () => {
    建素材('images/保留.png', '保留内容')
    同步(素材根, public根, 清单路径)
    const 上轮清单 = JSON.parse(fs.readFileSync(清单路径, 'utf-8'))
    写文件(path.join(public根, 'images', '重复孤儿.png'), '重复孤儿内容')
    写文件(清单路径, JSON.stringify([...上轮清单, 'public/images/重复孤儿.png', 'public/images/重复孤儿.png'], null, 2))
    const 日志 = vi.spyOn(console, 'log').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 0, 跳过数: 6, 删除数: 1 })
    expect(fs.existsSync(path.join(public根, 'images', '重复孤儿.png'))).toBe(false)
    expect(
      日志.mock.calls.flat().filter((行) => String(行).includes('重复孤儿')),
      '重复项只应产生一条删除日志'
    ).toHaveLength(1)
    expect(JSON.parse(fs.readFileSync(清单路径, 'utf-8'))).toEqual(上轮清单)
  })

  it('旧清单含 public 外前缀项时被跳过，public 根的手写文件存活', () => {
    建素材('icons/favicon.svg', '<svg id="f"/>')
    写文件(path.join(工作区, 'robots.txt'), '手写 robots')
    写文件(清单路径, JSON.stringify(['robots.txt', 'public/favicon.svg'], null, 2))
    const 警告 = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const 结果 = 同步(素材根, public根, 清单路径)

    expect(结果).toMatchObject({ 复制数: 6, 跳过数: 0, 删除数: 0 })
    expect(警告.mock.calls.flat().join('\n')).toContain('robots.txt')
    expect(fs.existsSync(path.join(工作区, 'robots.txt'))).toBe(true)
  })
})

describe('素材同步：真实仓库 public 根级图标约定（只读）', () => {
  it('public 根级 png/svg 均有 素材/icons 同名源文件', () => {
    const 真实public根 = path.join(仓库根, 'public')
    const 真实图标根 = path.join(仓库根, '素材', 'icons')
    const 根级图标 = fs
      .readdirSync(真实public根, { withFileTypes: true })
      .filter((条目) => 条目.isFile() && ['.png', '.svg'].includes(path.extname(条目.name).toLowerCase()))
      .map((条目) => 条目.name)
    expect(根级图标.length).toBeGreaterThan(0)
    const 源图标名 = new Set(
      fs
        .readdirSync(真实图标根, { withFileTypes: true })
        .filter((条目) => 条目.isFile())
        .map((条目) => 条目.name)
    )

    expect(根级图标.filter((名) => !源图标名.has(名))).toEqual([])
  })
})
