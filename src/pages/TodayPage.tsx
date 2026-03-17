import { useState } from 'react'
import { isToday, isPast, parseISO, format } from 'date-fns'
import { useAllListsTasks } from '../hooks/useAllListsTasks'
import type { TaskWithList } from '../hooks/useAllListsTasks'
import TaskItem from '../components/tasks/TaskItem'
import DailyPlannerDialog from '../components/AI/DailyPlannerDialog'

function isOverdue(task: TaskWithList): boolean {
  if (!task.due || task.status === 'completed') return false
  const date = parseISO(task.due)
  return isPast(date) && !isToday(date)
}

function isDueToday(task: TaskWithList): boolean {
  if (!task.due || task.status === 'completed') return false
  return isToday(parseISO(task.due))
}

function TodayPage() {
  const { tasks, loading } = useAllListsTasks()
  const [plannerOpen, setPlannerOpen] = useState(false)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  const overdue = tasks.filter(isOverdue)
  const todayTasks = tasks.filter(isDueToday)

  // Group today's tasks by list
  const todayByList = todayTasks.reduce<Record<string, TaskWithList[]>>((acc, task) => {
    if (!acc[task.listId]) acc[task.listId] = []
    acc[task.listId].push(task)
    return acc
  }, {})

  const hasAnything = overdue.length > 0 || todayTasks.length > 0

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-testid="today-page">
      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">Today</h1>
          {(overdue.length > 0 || todayTasks.length > 0) && (
            <button
              onClick={() => setPlannerOpen(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              data-testid="plan-my-day-button"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              Plan my day
            </button>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-6">{format(new Date(), 'EEEE, MMMM d')}</p>

        {!hasAnything && (
          <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-state">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">All caught up!</h2>
            <p className="text-gray-400 text-sm">No tasks due today</p>
          </div>
        )}

        {/* Overdue section */}
        {overdue.length > 0 && (
          <section
            className="mb-6 bg-red-50 border border-red-100 rounded-lg p-4"
            data-testid="overdue-section"
          >
            <h2 className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Overdue ({overdue.length})
            </h2>
            <ul className="space-y-0.5" data-testid="overdue-tasks">
              {overdue.map((task) => (
                <TaskItem key={`${task.listId}-${task.id}`} task={task} listId={task.listId} />
              ))}
            </ul>
          </section>
        )}

        {/* Today's tasks grouped by list */}
        {Object.entries(todayByList).map(([listId, listTasks]) => (
          <section key={listId} className="mb-6" data-testid={`list-section-${listId}`}>
            <h2
              className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2"
              data-testid="list-section-header"
            >
              {listTasks[0].listTitle}
            </h2>
            <ul className="space-y-0.5" data-testid="today-tasks">
              {listTasks.map((task) => (
                <TaskItem key={`${task.listId}-${task.id}`} task={task} listId={task.listId} />
              ))}
            </ul>
          </section>
        ))}
      </div>

      <DailyPlannerDialog
        isOpen={plannerOpen}
        onClose={() => setPlannerOpen(false)}
        tasks={[...overdue, ...todayTasks]}
      />
    </div>
  )
}

export default TodayPage
