import { useState, useEffect, useRef } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  addMonths,
  subMonths,
} from 'date-fns'
import { useAllListsTasks } from '../hooks/useAllListsTasks'
import type { TaskWithList } from '../hooks/useAllListsTasks'
import TaskItem from '../components/tasks/TaskItem'

const DOT_COLORS: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
  none: 'bg-gray-300',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getTasksForDay(tasks: TaskWithList[], day: Date): TaskWithList[] {
  return tasks.filter((t) => {
    if (!t.due || t.status === 'completed') return false
    return isSameDay(parseISO(t.due), day)
  })
}

function DayPopover({
  day,
  tasks,
  onClose,
}: {
  day: Date
  tasks: TaskWithList[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-1 z-30 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden"
      data-testid="day-popover"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">
          {format(day, 'EEEE, MMMM d')}
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-400 px-4 py-3">No tasks due this day.</p>
        ) : (
          <ul className="py-1">
            {tasks.map((task) => (
              <TaskItem key={`${task.listId}-${task.id}`} task={task} listId={task.listId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const { tasks, loading } = useAllListsTasks()

  // Build grid: start on Monday of the week containing the first day of the month
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  function handleDayClick(day: Date) {
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-testid="calendar-page">
      <div className="max-w-3xl mx-auto w-full px-4 py-6">

        {/* Header: month navigation */}
        <div className="flex items-center justify-between mb-6" data-testid="calendar-header">
          <button
            onClick={() => { setCurrentMonth((m) => subMonths(m, 1)); setSelectedDay(null) }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Previous month"
            data-testid="prev-month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <h1 className="text-xl font-bold text-gray-900" data-testid="month-year-label">
            {format(currentMonth, 'MMMM yyyy')}
          </h1>

          <button
            onClick={() => { setCurrentMonth((m) => addMonths(m, 1)); setSelectedDay(null) }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Next month"
            data-testid="next-month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1" data-testid="weekday-headers">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide py-2">
              {wd}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 border-l border-t border-gray-100" data-testid="calendar-grid">
          {days.map((day) => {
            const dayTasks = getTasksForDay(tasks, day)
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
            const isCurrentDay = isToday(day)

            // Up to 3 priority dots
            const dots = dayTasks.slice(0, 3)

            return (
              <div
                key={day.toISOString()}
                className={`relative border-r border-b border-gray-100 min-h-[80px] p-2 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-indigo-50'
                    : isCurrentMonth
                      ? 'bg-white hover:bg-gray-50'
                      : 'bg-gray-50 hover:bg-gray-100'
                }`}
                onClick={() => handleDayClick(day)}
                data-testid={`day-cell-${format(day, 'yyyy-MM-dd')}`}
              >
                {/* Date number */}
                <span
                  className={`text-sm font-medium inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors ${
                    isCurrentDay
                      ? 'bg-indigo-600 text-white'
                      : isCurrentMonth
                        ? 'text-gray-800'
                        : 'text-gray-300'
                  }`}
                >
                  {format(day, 'd')}
                </span>

                {/* Priority dots */}
                {dots.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-1 flex-wrap">
                    {dots.map((task, i) => (
                      <span
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${DOT_COLORS[task.metadata.priority]}`}
                        title={task.title}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-xs text-gray-400 leading-none">+{dayTasks.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Day popover */}
                {isSelected && (
                  <DayPopover
                    day={day}
                    tasks={dayTasks}
                    onClose={() => setSelectedDay(null)}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CalendarPage
