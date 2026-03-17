import { getToday, getStreak, getWeekly } from '../../lib/pomo-stats'

export default function FocusStats() {
  const today = getToday()
  const streak = getStreak()
  const weekly = getWeekly()
  const weeklyTotal = weekly.reduce((sum, d) => sum + d.count, 0)
  const maxCount = Math.max(...weekly.map((d) => d.count), 1)

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-5 shadow-sm" data-testid="focus-stats">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="text-center">
          <p className="text-2xl font-bold text-indigo-600" data-testid="today-count">{today}</p>
          <p className="text-xs text-gray-400 mt-0.5">Today</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-orange-500" data-testid="streak-count">
            {streak}
            <span className="text-base ml-0.5">🔥</span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Day streak</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600" data-testid="weekly-total">{weeklyTotal}</p>
          <p className="text-xs text-gray-400 mt-0.5">This week</p>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div data-testid="weekly-chart">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Last 7 days</p>
        <div className="flex items-end gap-1.5 h-20">
          {weekly.map((day) => {
            const heightPct = maxCount > 0 ? (day.count / maxCount) * 100 : 0
            const isToday = day.date === new Date().toISOString().slice(0, 10)
            return (
              <div key={day.date} className="flex flex-col items-center gap-1 flex-1" data-testid="bar-column">
                {day.count > 0 && (
                  <span className="text-xs text-gray-500 leading-none">{day.count}</span>
                )}
                <div className="w-full flex items-end" style={{ height: '52px' }}>
                  <div
                    className={`w-full rounded-t-md transition-all ${isToday ? 'bg-indigo-500' : 'bg-indigo-200'}`}
                    style={{ height: day.count > 0 ? `${Math.max(heightPct, 8)}%` : '4px', opacity: day.count === 0 ? 0.3 : 1 }}
                    data-testid="bar"
                  />
                </div>
                <span className="text-xs text-gray-400 leading-none">{day.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
