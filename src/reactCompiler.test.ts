import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')

describe('React Compiler setup', () => {
  it('declares required dependencies in package.json', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.resolve(rootDir, 'package.json'), 'utf-8'))
    expect(packageJson.devDependencies).toHaveProperty('babel-plugin-react-compiler')
    expect(packageJson.devDependencies).toHaveProperty('@rolldown/plugin-babel')
    expect(packageJson.devDependencies).toHaveProperty('@babel/core')
  })

  it('configures React Compiler in Vite', () => {
    const viteConfig = fs.readFileSync(path.resolve(rootDir, 'vite.config.js'), 'utf-8')
    expect(viteConfig).toContain('reactCompilerPreset')
    expect(viteConfig).toContain('@rolldown/plugin-babel')
  })
})
