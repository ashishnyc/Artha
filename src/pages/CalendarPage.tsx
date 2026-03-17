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
  addWeeks,
  subWeeks,
} from 'date-fns'
import { useAllListsTasks } from '../hooks/useAllListsTasks'
import type { TaskWithList } from '../hooks/useAllListsTasks'
import TaskItem from '../components/tasks/TaskItem'
import { updateTask } from '../api/tasks'
import useAppStore from '../store/useAppStore'

const DOT_COLORS: Record<string, string> = {
  high: 'bg-red-400',
  medium: 'bg-yellow-400',
  low: 'bg-blue-400',
  none: 'bg-gray-300',
}

const BLOCK_COLORS: Record<string, string> = {
  high: 'bg-red-100 border-red-300 text-red-800',
  medium: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  low: 'bg-blue-100 border-blue-300 text-blue-800',
  none: 'bg-gray-100 border-gray-200 text-gray-600',
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8) // 8am–10pm

type CalendarView = 'month' | 'week'

interface DragData {
  taskId: string
  listId: string
}

function getTasksForDay(tasks: TaskWithList[], day: Date): TaskWithList[] {
  return tasks.filter((t) => {
    if (!t.due || t.status === 'completed') return false
    return isSameDay(parseISO(t.due), day)
  })
}

function formatHour(hour: number): string {
  if (hour === 12) return '12pm'
  return hour < 12 ? `${hour}am` : `${hour - 12}pm`
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
      className="absolute top-full left-0 mt-1 z-30 w-72 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 overflow-hidden"
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

function WeekView({
  tasks,
  weekStart,
  onDragStart,
  onDropOnDay,
}: {
  tasks: TaskWithList[]
  weekStart: Date
  onDragStart: (e: React.DragEvent, data: DragData) => void
  onDropOnDay: (day: Date, e: React.DragEvent) => void
}) {
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden border border-gray-200 rounded-xl overflow-x-auto"
      data-testid="week-view"
    >
    <div className="min-w-[600px] flex flex-col flex-1 overflow-hidden">
      {/* Day column headers */}
      <div
        className="grid border-b border-gray-200 shrink-0"
        style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}
      >
        {/* Time gutter header */}
        <div className="border-r border-gray-200" />
        {weekDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayTasks = getTasksForDay(tasks, day)
          const isDragOver = dragOverDay === dayKey

          return (
            <div
              key={day.toISOString()}
              className={`border-r border-gray-200 last:border-r-0 transition-colors ${
                isDragOver ? 'bg-indigo-100' : isToday(day) ? 'bg-indigo-50' : ''
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOverDay(dayKey) }}
              onDragLeave={() => setDragOverDay(null)}
              onDrop={(e) => { setDragOverDay(null); onDropOnDay(day, e) }}
              data-testid={`week-day-${dayKey}`}
            >
              <div className="text-center pt-2 pb-1">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {format(day, 'EEE')}
                </div>
                <span
                  className={`text-sm font-bold inline-flex items-center justify-center w-7 h-7 rounded-full mx-auto mt-0.5 ${
                    isToday(day) ? 'bg-indigo-600 text-white' : 'text-gray-700'
                  }`}
                >
                  {format(day, 'd')}
                </span>
              </div>
              {/* Draggable task blocks */}
              {dayTasks.length > 0 && (
                <div className="px-1 pb-2 space-y-0.5">
                  {dayTasks.map((task) => (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, { taskId: task.id, listId: task.listId })}
                      className={`text-xs px-1.5 py-0.5 rounded border truncate cursor-grab active:cursor-grabbing ${BLOCK_COLORS[task.metadata.priority]}`}
                      title={task.title}
                      data-testid="week-task-block"
                    >
                      {task.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Hour rows */}
      <div className="flex-1 overflow-y-auto">
        {HOURS.map((hour) => (
          <div
            key={hour}
            className="grid border-b border-gray-100 last:border-b-0"
            style={{ gridTemplateColumns: '56px repeat(7, 1fr)', minHeight: '48px' }}
          >
            <div className="text-xs text-gray-400 text-right pr-2 pt-1 leading-none select-none border-r border-gray-200 shrink-0">
              {formatHour(hour)}
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`border-r border-gray-100 last:border-r-0 ${isToday(day) ? 'bg-indigo-50/20' : ''}`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
    </div>
  )
}

function CalendarPage() {
  const [view, setView] = useState<CalendarView>('month')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [dragOverDay, setDragOverDay] = useState<string | null>(null)
  const { tasks, loading } = useAllListsTasks()
  const setTasks = useAppStore((s) => s.setTasks)

  // Month view derived values
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  // Week view derived values
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })

  function handlePrev() {
    setSelectedDay(null)
    if (view === 'month') {
      setCurrentDate((d) => subMonths(d, 1))
    } else {
      setCurrentDate((d) => subWeeks(d, 1))
    }
  }

  function handleNext() {
    setSelectedDay(null)
    if (view === 'month') {
      setCurrentDate((d) => addMonths(d, 1))
    } else {
      setCurrentDate((d) => addWeeks(d, 1))
    }
  }

  function handleDayClick(day: Date) {
    setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))
  }

  function handleViewChange(newView: CalendarView) {
    setView(newView)
    setSelectedDay(null)
  }

  function handleDragStart(e: React.DragEvent, data: DragData) {
    e.dataTransfer.setData('application/json', JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDropOnDay(day: Date, e: React.DragEvent) {
    e.preventDefault()
    let data: DragData
    try {
      data = JSON.parse(e.dataTransfer.getData('application/json')) as DragData
    } catch {
      return
    }

    const newDue = new Date(format(day, 'yyyy-MM-dd') + 'T00:00:00').toISOString()
    const currentTasks = useAppStore.getState().tasks[data.listId] ?? []
    const task = currentTasks.find((t) => t.id === data.taskId)
    if (!task || task.due === newDue) return

    // Optimistic update
    setTasks(data.listId, currentTasks.map((t) => t.id === data.taskId ? { ...t, due: newDue } : t))

    try {
      await updateTask(data.listId, data.taskId, { due: newDue })
    } catch {
      // Revert on error
      setTasks(data.listId, currentTasks)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="calendar-page">
      <div
        className={`max-w-5xl mx-auto w-full px-4 py-6 flex flex-col ${view === 'week' ? 'h-full' : ''}`}
      >
        {/* Header: navigation + title + view toggle */}
        <div className="flex items-center justify-between mb-6" data-testid="calendar-header">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
              aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
              data-testid="prev-period"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <h1 className="text-xl font-bold text-gray-900 min-w-[180px] text-center" data-testid="period-label">
              {view === 'month'
                ? format(currentDate, 'MMMM yyyy')
                : `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`}
            </h1>

            <button
              onClick={handleNext}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors"
              aria-label={view === 'month' ? 'Next month' : 'Next week'}
              data-testid="next-period"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1" data-testid="view-toggle">
            <button
              onClick={() => handleViewChange('month')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'month' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="month-view-btn"
            >
              Month
            </button>
            <button
              onClick={() => handleViewChange('week')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                view === 'week' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="week-view-btn"
            >
              Week
            </button>
          </div>
        </div>

        {/* Month view */}
        {view === 'month' && (
          <div className="overflow-x-auto" data-testid="month-view">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1 min-w-[400px]" data-testid="weekday-headers">
              {WEEKDAYS.map((wd) => (
                <div key={wd} className="text-center text-xs font-semibold text-gray-400 uppercase tracking-wide py-2">
                  {wd}
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 border-l border-t border-gray-100 min-w-[400px]" data-testid="calendar-grid">
              {days.map((day) => {
                const dayKey = format(day, 'yyyy-MM-dd')
                const dayTasks = getTasksForDay(tasks, day)
                const isCurrentMonth = isSameMonth(day, currentDate)
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
                const isCurrentDay = isToday(day)
                const isDragOver = dragOverDay === dayKey
                const dots = dayTasks.slice(0, 3)

                return (
                  <div
                    key={day.toISOString()}
                    className={`relative border-r border-b border-gray-100 min-h-[80px] p-2 cursor-pointer transition-colors ${
                      isDragOver
                        ? 'bg-indigo-100'
                        : isSelected
                          ? 'bg-indigo-50'
                          : isCurrentMonth
                            ? 'bg-white hover:bg-gray-50'
                            : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                    onClick={() => handleDayClick(day)}
                    onDragOver={(e) => { e.preventDefault(); setDragOverDay(dayKey) }}
                    onDragLeave={() => setDragOverDay(null)}
                    onDrop={(e) => { setDragOverDay(null); handleDropOnDay(day, e) }}
                    data-testid={`day-cell-${dayKey}`}
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

                    {/* Draggable priority dots */}
                    {dots.length > 0 && (
                      <div className="flex items-center gap-0.5 mt-1 flex-wrap">
                        {dots.map((task, i) => (
                          <span
                            key={i}
                            draggable
                            onDragStart={(e) => {
                              e.stopPropagation()
                              handleDragStart(e, { taskId: task.id, listId: task.listId })
                            }}
                            className={`w-1.5 h-1.5 rounded-full cursor-grab active:cursor-grabbing ${DOT_COLORS[task.metadata.priority]}`}
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
        )}

        {/* Week view */}
        {view === 'week' && (
          <WeekView
            tasks={tasks}
            weekStart={weekStart}
            onDragStart={handleDragStart}
            onDropOnDay={handleDropOnDay}
          />
        )}
      </div>
    </div>
  )
}

export default CalendarPage
