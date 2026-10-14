import { describe, it, expect } from 'vitest'

describe('vite-plugin-observability', () => {
  it('exports observabilityPlugin function', async () => {
    const mod = await import('./可观测性Vite插件')
    expect(typeof mod.可观测性插件).toBe('function')
  })

  it('returns a Plugin with correct name', async () => {
    const mod = await import('./可观测性Vite插件')
    const plugin = mod.可观测性插件()
    expect(plugin.name).toBe('vite-plugin-observability')
    expect(typeof plugin.configureServer).toBe('function')
  })
})
