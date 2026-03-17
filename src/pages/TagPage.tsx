import { useParams } from 'react-router-dom'
import { useAllListsTasks } from '../hooks/useAllListsTasks'
import TaskItem from '../components/tasks/TaskItem'

function TagPage() {
  const { tag } = useParams<{ tag: string }>()
  const { tasks, loading } = useAllListsTasks()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full" data-testid="loading">
        <div className="text-gray-400 text-sm">Loading…</div>
      </div>
    )
  }

  const taggedTasks = tasks.filter((t) => t.metadata?.tags?.includes(tag ?? ''))

  return (
    <div className="flex flex-col h-full overflow-y-auto" data-testid="tag-page">
      <div className="w-full px-4 md:px-6 py-6">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full border border-indigo-200 font-medium">
            #{tag}
          </span>
          <span className="text-sm text-gray-400">{taggedTasks.length} task{taggedTasks.length !== 1 ? 's' : ''}</span>
        </div>

        {taggedTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center" data-testid="empty-state">
            <div className="text-5xl mb-4">🏷️</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No tasks</h2>
            <p className="text-gray-400 text-sm">No tasks tagged with #{tag}</p>
          </div>
        ) : (
          <ul className="space-y-0.5" data-testid="tag-tasks">
            {taggedTasks.map((task) => (
              <TaskItem key={`${task.listId}-${task.id}`} task={task} listId={task.listId} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default TagPage
