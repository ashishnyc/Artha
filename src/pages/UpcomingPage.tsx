import { useState, useCallback } from 'react'
import { addDays, format, parseISO, startOfDay, isSameDay } from 'date-fns'
import { useAllListsTasks } from '../hooks/useAllListsTasks'
import type { TaskWithList } from '../hooks/useAllListsTasks'
import TaskItem from '../components/tasks/TaskItem'
import { createTask } from '../api/tasks'
import { serializeNotes, defaultMetadata } from '../lib/task-metadata'
import useAppStore from '../store/useAppStore'
import type { Task } from '../types'

function getDayLabel(date: Date): string {
  const tomorrow = addDays(startOfDay(new Date()), 1)
  if (isSameDay(date, tomorrow)) return 'Tomorrow'
  return format(date, 'EEEE')
}

function getUpcomingDays(): Date[] {
  const today = startOfDay(new Date())
  return Array.from({ length: 7 }, (_, i) => addDays(today, i + 1))
}

interface DayAddFormProps {
  dateStr: string
  listId: string
}

function DayAddForm({ dateStr, listId }: DayAddFormProps) {
  const [title, setTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const tasks = useAppStore((s) => s.tasks[listId] ?? [])
  const setTasks = useAppStore((s) => s.setTasks)

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return

    const metadata = defaultMetadata()
    const notes = serializeNotes('', metadata)
    const dueISO = new Date(dateStr).toISOString()

    const tempId = `temp-${Date.now()}`
    const optimisticTask: Task = {
      id: tempId,
      title: trimmed,
      notes,
      status: 'needsAction',
      due: dueISO,
      parent: null,
      position: '00000000000000000000',
      metadata,
    }

    setTasks(listId, [...tasks, optimisticTask])
    setTitle('')
    setIsSubmitting(true)

    try {
      const created = await createTask(listId, { title: trimmed, notes, due: dueISO })
      setTasks(
        listId,
        useAppStore.getState().tasks[listId].map((t) => (t.id === tempId ? { ...created, metadata } : t)),
      )
    } catch {
      setTasks(
        listId,
        useAppStore.getState().tasks[listId].filter((t) => t.id !== tempId),
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [title, isSubmitting, listId, dateStr, tasks, setTasks])

  return (
    <div className="mt-1 flex items-center gap-2" data-testid={`day-add-form-${dateStr}`}>
      <svg
        className="w-3.5 h-3.5 text-gray-300 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
        }}
        placeholder="Add task…"
        className="flex-1 text-sm text-gray-700 placeholder-gray-300 outline-none bg-transparent"
        data-testid={`day-add-input-${dateStr}`}
        aria-label={`Add task for ${dateStr}`}
      />
      {title.trim() && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="text-xs px-2 py-0.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40"
          data-testid={`day-add-submit-${dateStr}`}
        >
          Add
        </button>
      )}
    </div>
  )
}

function UpcomingPage() {
  const { tasks, loading } = useAllListsTasks()
  const taskLists = useAppStore((s) => s.taskLists)
  const defaultListId = taskLists[0]?.id

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  const upcomingDays = getUpcomingDays()

  // Group non-completed tasks by yyyy-MM-dd (local date)
  const tasksByDay = tasks.reduce<Record<string, TaskWithList[]>>((acc, task) => {
    if (!task.due || task.status === 'completed') return acc
    const dayKey = format(parseISO(task.due), 'yyyy-MM-dd')
    if (!acc[dayKey]) acc[dayKey] = []
    acc[dayKey].push(task)
    return acc
  }, {})

  const hasAnything = upcomingDays.some((d) => (tasksByDay[format(d, 'yyyy-MM-dd')]?.length ?? 0) > 0)

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-testid="upcoming-page">
      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Upcoming</h1>

        {!hasAnything && (
          <div
            className="flex flex-col items-center justify-center py-24 text-center"
            data-testid="empty-state"
          >
            <div className="text-5xl mb-4">📅</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">Nothing upcoming</h2>
            <p className="text-gray-400 text-sm">No tasks scheduled for the next 7 days</p>
          </div>
        )}

        {upcomingDays.map((day) => {
          const dayKey = format(day, 'yyyy-MM-dd')
          const dayTasks = tasksByDay[dayKey] ?? []
          const dayLabel = getDayLabel(day)
          const dateLabel = format(day, 'MMM d')

          return (
            <section key={dayKey} className="mb-6" data-testid={`day-section-${dayKey}`}>
              <div className="flex items-baseline gap-2 mb-2">
                <h2
                  className="text-sm font-semibold text-gray-700"
                  data-testid="day-header"
                >
                  {dayLabel}
                </h2>
                <span className="text-xs text-gray-400">{dateLabel}</span>
                {dayTasks.length > 0 && (
                  <span
                    className="text-xs text-gray-400 ml-auto"
                    data-testid="day-task-count"
                  >
                    {dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="bg-white border border-gray-100 rounded-lg px-4 py-2">
                {dayTasks.length > 0 && (
                  <ul className="space-y-0.5 mb-1" data-testid={`day-tasks-${dayKey}`}>
                    {dayTasks.map((task) => (
                      <TaskItem
                        key={`${task.listId}-${task.id}`}
                        task={task}
                        listId={task.listId}
                      />
                    ))}
                  </ul>
                )}
                {defaultListId && <DayAddForm dateStr={dayKey} listId={defaultListId} />}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default UpcomingPage
