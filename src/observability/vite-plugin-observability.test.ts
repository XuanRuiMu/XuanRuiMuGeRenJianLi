import { describe, it, expect } from 'vitest'

describe('vite-plugin-observability', () => {
  it('exports observabilityPlugin function', async () => {
    const mod = await import('./vite-plugin-observability')
    expect(typeof mod.observabilityPlugin).toBe('function')
  })

  it('returns a Plugin with correct name', async () => {
    const mod = await import('./vite-plugin-observability')
    const plugin = mod.observabilityPlugin()
    expect(plugin.name).toBe('vite-plugin-observability')
    expect(typeof plugin.configureServer).toBe('function')
  })
})
