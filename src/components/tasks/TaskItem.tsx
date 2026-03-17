import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, isPast, parseISO } from 'date-fns'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Task } from '../../types'
import { completeTask, uncompleteTask, deleteTask } from '../../api/tasks'
import useAppStore from '../../store/useAppStore'

interface TaskItemProps {
  task: Task
  listId: string
  sortable?: boolean
}

function TaskItem({ task, listId, sortable = false }: TaskItemProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const navigate = useNavigate()
  const setTasks = useAppStore((s) => s.setTasks)
  const tasks = useAppStore((s) => s.tasks[listId] ?? [])
  const setSelectedTask = useAppStore((s) => s.setSelectedTask)
  const setCurrentFocusTask = useAppStore((s) => s.setCurrentFocusTask)
  const addToast = useAppStore((s) => s.addToast)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !sortable,
  })

  const style = sortable
    ? { transform: CSS.Transform.toString(transform), transition }
    : undefined

  const isCompleted = task.status === 'completed'

  async function handleToggle() {
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
      setTasks(listId, tasks)
      addToast('Failed to update task', 'error')
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setTasks(listId, tasks.filter((t) => t.id !== task.id))
    try {
      await deleteTask(listId, task.id)
    } catch {
      setTasks(listId, tasks)
      setIsDeleting(false)
      addToast('Failed to delete task', 'error')
    }
  }

  const dueBadge = () => {
    if (!task.due) return null
    const date = parseISO(task.due)
    const overdue = isPast(date) && !isCompleted
    return (
      <span
        className={`text-xs px-2 py-0.5 rounded-full ${
          overdue ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
        }`}
        data-testid="due-badge"
      >
        {format(date, 'MMM d')}
      </span>
    )
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors ${
        isDragging ? 'opacity-50 bg-gray-50 dark:bg-gray-800 shadow-md z-10' : ''
      }`}
      data-testid="task-item"
    >
      {/* Drag handle — only shown in default sort mode */}
      {sortable && (
        <button
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0 transition-opacity -ml-1"
          data-testid="drag-handle"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="9" cy="7" r="1.5" />
            <circle cx="15" cy="7" r="1.5" />
            <circle cx="9" cy="12" r="1.5" />
            <circle cx="15" cy="12" r="1.5" />
            <circle cx="9" cy="17" r="1.5" />
            <circle cx="15" cy="17" r="1.5" />
          </svg>
        </button>
      )}

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
        className={`flex-1 text-sm cursor-pointer ${isCompleted ? 'line-through text-gray-400 dark:text-gray-600' : 'text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400'}`}
        onClick={() => setSelectedTask({ taskId: task.id, listId })}
        data-testid="task-title"
      >
        {task.title}
      </span>

      {/* Due badge */}
      {dueBadge()}

      {/* Start focus button — visible on hover, only for incomplete tasks */}
      {!isCompleted && (
        <button
          onClick={() => {
            setCurrentFocusTask({ taskId: task.id, listId, title: task.title })
            navigate('/pomodoro')
          }}
          aria-label="Start focus"
          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-indigo-500 transition-all"
          data-testid="start-focus-button"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

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
