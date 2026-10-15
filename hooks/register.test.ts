import { expect, test } from 'claude-code/testing'

import { colorAt, filledSegments, toFill } from './register'

test('stays blue up to 50% and reaches red at 100%', () => {
  expect(colorAt(10)).toBe('#3b82f6')
  expect(colorAt(50)).toBe('#3b82f6')
  expect(colorAt(65)).toBe('#eab308')
  expect(colorAt(100)).toBe('#dc2626')
})

test('fills segments in proportion to the percentage', () => {
  expect(filledSegments(0)).toBe(0)
  expect(filledSegments(16)).toBe(2)
  expect(filledSegments(100)).toBe(10)
})

test('uses the per-category estimate against the model window', () => {
  const fill = toFill({
    tokens: 600_000,
    window: 1_000_000,
    percent: 60,
    breakdown: { totalTokens: 635_843 } as never,
  })

  expect(fill).toEqual({ tokens: 635_843, window: 1_000_000, percent: 64 })
})

test('falls back to the last response without an estimate', () => {
  expect(toFill({ tokens: 88_529, window: 1_000_000, percent: 9 })?.percent).toBe(9)
  expect(toFill({ window: 1_000_000 })).toBeNull()
})
