import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const 根目录 = path.resolve(__dirname, '..')

describe('React Compiler setup', () => {
  it('declares required dependencies in package.json', () => {
    const 包配置 = JSON.parse(fs.readFileSync(path.resolve(根目录, 'package.json'), 'utf-8'))
    expect(包配置.devDependencies).toHaveProperty('babel-plugin-react-compiler')
    expect(包配置.devDependencies).toHaveProperty('@rolldown/plugin-babel')
    expect(包配置.devDependencies).toHaveProperty('@babel/core')
  })

  it('configures React Compiler in Vite', () => {
    const Vite配置 = fs.readFileSync(path.resolve(根目录, 'vite.config.js'), 'utf-8')
    expect(Vite配置).toContain('reactCompilerPreset')
    expect(Vite配置).toContain('@rolldown/plugin-babel')
  })
})
