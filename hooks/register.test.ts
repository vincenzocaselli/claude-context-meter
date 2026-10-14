import { expect, test } from 'claude-code/testing'

import { colorAt, filledSegments } from './register'

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
