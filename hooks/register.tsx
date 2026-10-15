import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionContextUsage } from 'claude-code'

import type { Fill } from '../types'

const fill = atom({ plugin: 'context-meter', key: 'fill' } as const, null)

const SEGMENTS = 10

// Blue up to 50%, then yellow, orange and red at 100%.
const STOPS: ReadonlyArray<readonly [number, [number, number, number]]> = [
  [0, [59, 130, 246]],
  [50, [59, 130, 246]],
  [65, [234, 179, 8]],
  [82, [249, 115, 22]],
  [100, [220, 38, 38]],
]

// The desktop's own context indicator sums the per-category estimate that
// /context shows, against the model's window. The meter uses the same figure,
// so the two always agree; it falls back to the last response's input tokens
// where no estimate is available.
export function toFill(context: SessionContextUsage): Fill | null {
  const tokens = context.breakdown?.totalTokens ?? context.tokens

  if (tokens === undefined || context.window <= 0) {
    return null
  }

  return { tokens, window: context.window, percent: Math.round((tokens / context.window) * 100) }
}

async function refresh($: EngineInterface): Promise<void> {
  const { context } = await $.session.usage({ breakdown: 'summary' })
  await update($, fill, () => toFill(context))
}

function toHex([r, g, b]: readonly number[]): string {
  return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('')
}

export function colorAt(percent: number): string {
  const p = Math.max(0, Math.min(100, percent))

  for (let i = 1; i < STOPS.length; i++) {
    const [p0, c0] = STOPS[i - 1]
    const [p1, c1] = STOPS[i]

    if (p <= p1) {
      const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0)

      return toHex(c0.map((c, j) => c + (c1[j] - c) * t))
    }
  }

  return toHex(STOPS[STOPS.length - 1][1])
}

export function filledSegments(percent: number): number {
  return Math.min(SEGMENTS, Math.round((percent / 100) * SEGMENTS))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  on('session.measure', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  // A tool result grows the context before the next response reports it.
  on('tool.call', async ($, e, next) => {
    const result = await next(e)
    await refresh($)

    return result
  })

  // Drawn in the slot of the mode labels, under the model name.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const current = await read($, fill)

    if (current === null) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const full = filledSegments(current.percent)
    const segments = Array.from({ length: SEGMENTS }, (_, i) =>
      i < full ? (
        <Text key={`s${i}`} color={colorAt(((i + 1) / SEGMENTS) * 100)}>
          ▰
        </Text>
      ) : (
        <Text key={`s${i}`} dimColor>
          ▱
        </Text>
      ),
    )
    const modes = e.props.modes.length > 0 ? `${e.props.modes.join(' & ')}  ` : ''

    return (
      <Box flexDirection="row">
        {modes !== '' && <Text dimColor>{modes}</Text>}
        {segments}
        <Text color={colorAt(current.percent)} bold={current.percent > 50}>
          {` ${current.percent}%`}
        </Text>
      </Box>
    )
  })
}
