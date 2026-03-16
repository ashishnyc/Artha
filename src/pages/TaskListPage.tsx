import { useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import useAppStore from '../store/useAppStore'
import TaskItem from '../components/tasks/TaskItem'
import EmptyState from '../components/tasks/EmptyState'
import QuickAddTask from '../components/tasks/QuickAddTask'
import type { Task } from '../types'

type SortOption = 'default' | 'priority'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2, none: 3 }

function sortByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (a, b) =>
      (PRIORITY_ORDER[a.metadata?.priority ?? 'none'] ?? 3) -
      (PRIORITY_ORDER[b.metadata?.priority ?? 'none'] ?? 3),
  )
}

function TaskListPage() {
  const { listId } = useParams<{ listId: string }>()
  const { tasks, loading } = useTasks(listId ?? null)
  const taskLists = useAppStore((s) => s.taskLists)
  const [completedOpen, setCompletedOpen] = useState(false)
  const [sort, setSort] = useState<SortOption>('default')

  const listTitle = taskLists.find((l) => l.id === listId)?.title ?? 'List'
  const pending = useMemo(() => {
    const p = tasks.filter((t) => t.status === 'needsAction')
    return sort === 'priority' ? sortByPriority(p) : p
  }, [tasks, sort])
  const completed = tasks.filter((t) => t.status === 'completed')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-gray-400 text-sm">Loading tasks…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" data-testid="task-list-page">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">{listTitle}</h1>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-500 bg-gray-50 outline-none focus:border-indigo-300 transition-colors"
              data-testid="sort-select"
            >
              <option value="default">Default order</option>
              <option value="priority">Sort by priority</option>
            </select>
          </div>

          {tasks.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              {/* Pending tasks */}
              <ul className="space-y-0.5" data-testid="pending-tasks">
                {pending.map((task) => (
                  <TaskItem key={task.id} task={task} listId={listId!} />
                ))}
              </ul>

              {/* Completed tasks — collapsible */}
              {completed.length > 0 && (
                <div className="mt-6" data-testid="completed-section">
                  <button
                    onClick={() => setCompletedOpen((o) => !o)}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-2"
                    data-testid="completed-toggle"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${completedOpen ? 'rotate-90' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    Completed ({completed.length})
                  </button>

                  {completedOpen && (
                    <ul className="space-y-0.5" data-testid="completed-tasks">
                      {completed.map((task) => (
                        <TaskItem key={task.id} task={task} listId={listId!} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <QuickAddTask listId={listId!} />
    </div>
  )
}

export default TaskListPage
