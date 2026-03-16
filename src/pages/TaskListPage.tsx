import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTasks } from '../hooks/useTasks'
import useAppStore from '../store/useAppStore'
import TaskItem from '../components/tasks/TaskItem'
import EmptyState from '../components/tasks/EmptyState'

function TaskListPage() {
  const { listId } = useParams<{ listId: string }>()
  const { tasks, loading } = useTasks(listId ?? null)
  const taskLists = useAppStore((s) => s.taskLists)
  const [completedOpen, setCompletedOpen] = useState(false)

  const listTitle = taskLists.find((l) => l.id === listId)?.title ?? 'List'
  const pending = tasks.filter((t) => t.status === 'needsAction')
  const completed = tasks.filter((t) => t.status === 'completed')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-gray-400 text-sm">Loading tasks…</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto" data-testid="task-list-page">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{listTitle}</h1>

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
  )
}

export default TaskListPage
