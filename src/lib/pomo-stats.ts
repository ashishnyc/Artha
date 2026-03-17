import { format, subDays } from 'date-fns'

const LS_KEY = 'pomodoro-stats'

type StatsMap = Record<string, number> // "2026-03-17": 4

function load(): StatsMap {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? '{}') as StatsMap
  } catch {
    return {}
  }
}

function save(stats: StatsMap) {
  localStorage.setItem(LS_KEY, JSON.stringify(stats))
}

function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function incrementToday(): void {
  const stats = load()
  const key = todayKey()
  stats[key] = (stats[key] ?? 0) + 1
  save(stats)
}

export function getToday(): number {
  return load()[todayKey()] ?? 0
}

export interface DayStat {
  date: string   // "yyyy-MM-dd"
  label: string  // "Mon"
  count: number
}

export function getWeekly(): DayStat[] {
  const stats = load()
  return Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i)
    const key = format(date, 'yyyy-MM-dd')
    return {
      date: key,
      label: format(date, 'EEE'),
      count: stats[key] ?? 0,
    }
  })
}

export function getStreak(): number {
  const stats = load()
  let streak = 0
  let day = new Date()
  // If today has no pomos yet, start checking from yesterday
  if (!stats[format(day, 'yyyy-MM-dd')]) {
    day = subDays(day, 1)
  }
  while (true) {
    const key = format(day, 'yyyy-MM-dd')
    if ((stats[key] ?? 0) === 0) break
    streak++
    day = subDays(day, 1)
  }
  return streak
}
