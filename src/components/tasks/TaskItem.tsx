import { useState } from 'react'
import { format, isPast, parseISO } from 'date-fns'
import { Task } from '../../types'
import { completeTask, uncompleteTask, deleteTask } from '../../api/tasks'
import useAppStore from '../../store/useAppStore'

interface TaskItemProps {
  task: Task
  listId: string
}

function TaskItem({ task, listId }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const setTasks = useAppStore((s) => s.setTasks)
  const tasks = useAppStore((s) => s.tasks[listId] ?? [])

  const isCompleted = task.status === 'completed'

  async function handleToggle() {
    // Optimistic update
    const updated = tasks.map((t) =>
      t.id === task.id
        ? { ...t, status: isCompleted ? ('needsAction' as const) : ('completed' as const) }
        : t,
    )
    setTasks(listId, updated)

    try {
      if (isCompleted) {
        await uncompleteTask(listId, task.id)
      } else {
        await completeTask(listId, task.id)
      }
    } catch {
      // Revert on failure
      setTasks(listId, tasks)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    // Optimistic remove
    setTasks(listId, tasks.filter((t) => t.id !== task.id))
    try {
      await deleteTask(listId, task.id)
    } catch {
      // Revert on failure
      setTasks(listId, tasks)
      setIsDeleting(false)
    }
  }

  const dueBadge = () => {
    if (!task.due) return null
    const date = parseISO(task.due)
    const overdue = isPast(date) && !isCompleted
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${
          overdue ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
        }`}
        data-testid="due-badge"
      >
        {format(date, 'MMM d')}
      </span>
    )
  }

  return (
    <li
      className="group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-colors"
      data-testid="task-item"
    >
      {/* Checkbox */}
      <button
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
        onClick={handleToggle}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          isCompleted
            ? 'bg-indigo-500 border-indigo-500 text-white'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
        data-testid="task-checkbox"
      >
        {isCompleted && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      {/* Title */}
      <span
        className={`flex-1 text-sm ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}
        data-testid="task-title"
      >
        {task.title}
      </span>

      {/* Due badge */}
      {dueBadge()}

      {/* Delete button — visible on hover */}
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label="Delete task"
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all ml-1"
        data-testid="delete-button"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </li>
  )
}

export default TaskItem
