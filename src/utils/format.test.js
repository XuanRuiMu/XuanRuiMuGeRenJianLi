import { describe, it, expect } from 'vitest'
import { formatPhone, formatDuration } from './format'

describe('format utils', () => {
  it('formats phone number', () => {
    expect(formatPhone('16622370059')).toBe('166 2237 0059')
  })

  it('returns original if not 11 digits', () => {
    expect(formatPhone('123')).toBe('123')
  })

  it('formats duration in seconds', () => {
    expect(formatDuration(125)).toBe('02:05')
    expect(formatDuration(3661)).toBe('61:01')
  })
})
