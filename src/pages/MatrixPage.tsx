import { useState } from 'react'
import { useAllListsTasks } from '../hooks/useAllListsTasks'
import type { TaskWithList } from '../hooks/useAllListsTasks'
import { completeTask, uncompleteTask, updateTask, createTask } from '../api/tasks'
import { parseNotes, serializeNotes, defaultMetadata } from '../lib/task-metadata'
import useAppStore from '../store/useAppStore'
import type { TaskMetadata } from '../types'

type Priority = TaskMetadata['priority']

interface Quadrant {
  id: Priority
  label: string
  subtitle: string
  bg: string
  border: string
  headerBg: string
  labelColor: string
}

const QUADRANTS: Quadrant[] = [
  {
    id: 'high',
    label: 'Q1 — Do First',
    subtitle: 'Urgent + Important',
    bg: 'bg-red-50',
    border: 'border-red-200',
    headerBg: 'bg-red-100',
    labelColor: 'text-red-700',
  },
  {
    id: 'medium',
    label: 'Q2 — Schedule',
    subtitle: 'Important, Not Urgent',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    headerBg: 'bg-blue-100',
    labelColor: 'text-blue-700',
  },
  {
    id: 'low',
    label: 'Q3 — Delegate',
    subtitle: 'Urgent, Not Important',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    headerBg: 'bg-yellow-100',
    labelColor: 'text-yellow-700',
  },
  {
    id: 'none',
    label: 'Q4 — Eliminate',
    subtitle: 'Neither Urgent nor Important',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    headerBg: 'bg-gray-100',
    labelColor: 'text-gray-500',
  },
]

interface DragData {
  taskId: string
  listId: string
}

function MatrixCard({
  task,
  onDragStart,
}: {
  task: TaskWithList
  onDragStart: (e: React.DragEvent, data: DragData) => void
}) {
  const setTasks = useAppStore((s) => s.setTasks)
  const setSelectedTask = useAppStore((s) => s.setSelectedTask)
  const storeTasks = useAppStore((s) => s.tasks[task.listId] ?? [])
  const isCompleted = task.status === 'completed'

  async function handleToggle(e: React.MouseEvent) {
    e.stopPropagation()
    const updated = storeTasks.map((t) =>
      t.id === task.id
        ? { ...t, status: isCompleted ? ('needsAction' as const) : ('completed' as const) }
        : t,
    )
    setTasks(task.listId, updated)
    try {
      if (isCompleted) await uncompleteTask(task.listId, task.id)
      else await completeTask(task.listId, task.id)
    } catch {
      setTasks(task.listId, storeTasks)
    }
  }

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, { taskId: task.id, listId: task.listId })}
      onClick={() => setSelectedTask({ taskId: task.id, listId: task.listId })}
      className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-gray-100 shadow-sm cursor-pointer hover:shadow-md hover:border-gray-200 transition-all group"
      data-testid="matrix-card"
    >
      <button
        role="checkbox"
        aria-checked={isCompleted}
        onClick={handleToggle}
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          isCompleted
            ? 'bg-indigo-500 border-indigo-500 text-white'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
        data-testid="matrix-card-checkbox"
      >
        {isCompleted && (
          <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span
        className={`text-sm flex-1 min-w-0 truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}
      >
        {task.title}
      </span>
      <span className="text-xs text-gray-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        ⠿
      </span>
    </div>
  )
}

function QuadrantQuickAdd({ priority, quadrant }: { priority: Priority; quadrant: Quadrant }) {
  const [title, setTitle] = useState('')
  const taskLists = useAppStore((s) => s.taskLists)
  const setTasks = useAppStore((s) => s.setTasks)

  async function handleSubmit() {
    const trimmed = title.trim()
    if (!trimmed || taskLists.length === 0) return
    const listId = taskLists[0].id
    const metadata = { ...defaultMetadata(), priority }
    const notes = serializeNotes('', metadata)
    setTitle('')
    try {
      const created = await createTask(listId, { title: trimmed, notes })
      const stored = useAppStore.getState().tasks[listId] ?? []
      setTasks(listId, [...stored, { ...created, metadata }])
    } catch {
      // silently fail — task list will resync on next load
    }
  }

  return (
    <div className={`px-3 py-2 shrink-0 border-t ${quadrant.border}`}>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') setTitle('')
        }}
        placeholder="+ Add task…"
        className={`w-full text-xs px-2 py-1.5 rounded-lg bg-white border ${quadrant.border} placeholder-gray-300 text-gray-700 outline-none focus:border-indigo-300`}
        data-testid={`quickadd-${priority}`}
      />
    </div>
  )
}

function MatrixPage() {
  const { tasks, loading } = useAllListsTasks()
  const setTasks = useAppStore((s) => s.setTasks)
  const [dragOverQuadrant, setDragOverQuadrant] = useState<Priority | null>(null)

  const activeTasks = tasks.filter((t) => t.status !== 'completed')

  function getQuadrantTasks(priority: Priority): TaskWithList[] {
    return activeTasks.filter((t) => t.metadata.priority === priority)
  }

  function handleDragStart(e: React.DragEvent, data: DragData) {
    e.dataTransfer.setData('application/json', JSON.stringify(data))
    e.dataTransfer.effectAllowed = 'move'
  }

  async function handleDrop(targetPriority: Priority, e: React.DragEvent) {
    e.preventDefault()
    setDragOverQuadrant(null)
    let data: DragData
    try {
      data = JSON.parse(e.dataTransfer.getData('application/json')) as DragData
    } catch {
      return
    }

    const storeTasks = useAppStore.getState().tasks[data.listId] ?? []
    const task = storeTasks.find((t) => t.id === data.taskId)
    if (!task || task.metadata.priority === targetPriority) return

    const { userNotes, metadata } = parseNotes(task.notes ?? '')
    const newMetadata = { ...metadata, priority: targetPriority }
    const newNotes = serializeNotes(userNotes, newMetadata)

    // Optimistic update
    setTasks(data.listId, storeTasks.map((t) =>
      t.id === data.taskId ? { ...t, notes: newNotes, metadata: newMetadata } : t
    ))

    try {
      await updateTask(data.listId, data.taskId, { notes: newNotes })
    } catch {
      setTasks(data.listId, storeTasks)
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
    <div className="flex flex-col h-full overflow-hidden" data-testid="matrix-page">
      <div className="max-w-5xl mx-auto w-full px-4 py-6 flex flex-col h-full">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Eisenhower Matrix</h1>
        <p className="text-sm text-gray-400 mb-4">Drag tasks between quadrants to reprioritize</p>

        <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 min-h-0">
          {QUADRANTS.map((quadrant) => {
            const qTasks = getQuadrantTasks(quadrant.id)
            const isDragOver = dragOverQuadrant === quadrant.id

            return (
              <div
                key={quadrant.id}
                className={`flex flex-col rounded-xl border-2 overflow-hidden transition-colors ${quadrant.bg} ${
                  isDragOver ? 'border-indigo-400 ring-2 ring-indigo-200' : quadrant.border
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOverQuadrant(quadrant.id) }}
                onDragLeave={() => setDragOverQuadrant(null)}
                onDrop={(e) => handleDrop(quadrant.id, e)}
                data-testid={`quadrant-${quadrant.id}`}
              >
                {/* Quadrant header */}
                <div className={`px-4 py-2.5 shrink-0 ${quadrant.headerBg}`}>
                  <p className={`text-sm font-semibold ${quadrant.labelColor}`}>{quadrant.label}</p>
                  <p className="text-xs text-gray-400">{quadrant.subtitle}</p>
                </div>

                {/* Task cards */}
                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
                  {qTasks.length === 0 ? (
                    <p className="text-xs text-gray-300 text-center py-4">Drop tasks here</p>
                  ) : (
                    qTasks.map((task) => (
                      <MatrixCard
                        key={`${task.listId}-${task.id}`}
                        task={task}
                        onDragStart={handleDragStart}
                      />
                    ))
                  )}
                </div>

                {/* Quick add */}
                <QuadrantQuickAdd priority={quadrant.id} quadrant={quadrant} />

                {/* Task count */}
                <div className={`px-4 py-1.5 shrink-0 ${quadrant.headerBg} border-t ${quadrant.border}`}>
                  <span className={`text-xs font-medium ${quadrant.labelColor}`}>
                    {qTasks.length} task{qTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MatrixPage
