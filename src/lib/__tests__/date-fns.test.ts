import { describe, it, expect } from 'vitest'
import { format, isToday, isTomorrow, isPast, parseISO, addDays } from 'date-fns'

describe('date-fns', () => {
  it('formats a date correctly', () => {
    const date = new Date(2026, 2, 16) // March 16, 2026
    expect(format(date, 'yyyy-MM-dd')).toBe('2026-03-16')
  })

  it('recognises today', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('recognises tomorrow', () => {
    expect(isTomorrow(addDays(new Date(), 1))).toBe(true)
  })

  it('recognises a past date', () => {
    expect(isPast(new Date(2000, 0, 1))).toBe(true)
  })

  it('parses an ISO string', () => {
    const parsed = parseISO('2026-03-16T00:00:00.000Z')
    expect(format(parsed, 'yyyy-MM-dd')).toBe('2026-03-16')
  })
})
