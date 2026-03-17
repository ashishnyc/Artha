import { useAllListsTasks } from '../hooks/useAllListsTasks'
import TaskItem from '../components/tasks/TaskItem'

function PriorityPage() {
  const { tasks, loading } = useAllListsTasks()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  const highPriority = tasks.filter(
    (t) => t.status === 'needsAction' && t.metadata?.priority === 'high',
  )

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-testid="priority-page">
      <div className="max-w-2xl mx-auto w-full px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5 3v18M5 3h11.5a1 1 0 0 1 .8 1.6L14 9l3.3 4.4a1 1 0 0 1-.8 1.6H5" />
          </svg>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">High Priority</h1>
          <span className="text-sm text-gray-400 ml-1">{highPriority.length} task{highPriority.length !== 1 ? 's' : ''}</span>
        </div>

        {highPriority.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-state">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">All clear!</h2>
            <p className="text-gray-400 text-sm">No high priority tasks</p>
          </div>
        ) : (
          <ul className="space-y-0.5" data-testid="priority-tasks">
            {highPriority.map((task) => (
              <TaskItem key={`${task.listId}-${task.id}`} task={task} listId={task.listId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default PriorityPage
