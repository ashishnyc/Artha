import { useState, useEffect, useRef } from 'react'
import useAppStore from '../../store/useAppStore'
import { updateTask } from '../../api/tasks'
import { parseNotes, serializeNotes } from '../../lib/task-metadata'

function TaskDetailPanel() {
  const selectedTask = useAppStore((s) => s.selectedTask)
  const clearSelectedTask = useAppStore((s) => s.clearSelectedTask)
  const task = useAppStore((s) =>
    selectedTask
      ? s.tasks[selectedTask.listId]?.find((t) => t.id === selectedTask.taskId) ?? null
      : null,
  )
  const setTasks = useAppStore((s) => s.setTasks)

  const [titleValue, setTitleValue] = useState('')
  const [descValue, setDescValue] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  // Sync local fields when task changes
  useEffect(() => {
    setTitleValue(task?.title ?? '')
    const { metadata } = parseNotes(task?.notes ?? '')
    setDescValue(metadata.description)
  }, [task?.id])

  const isOpen = !!selectedTask

  async function handleTitleSave() {
    if (!task || !selectedTask) return
    const trimmed = titleValue.trim()
    if (!trimmed || trimmed === task.title) return

    // Optimistic update
    const tasks = useAppStore.getState().tasks[selectedTask.listId] ?? []
    useAppStore.getState().setTasks(
      selectedTask.listId,
      tasks.map((t) => (t.id === task.id ? { ...t, title: trimmed } : t)),
    )

    try {
      await updateTask(selectedTask.listId, task.id, { title: trimmed })
    } catch {
      // Revert
      useAppStore.getState().setTasks(selectedTask.listId, tasks)
      setTitleValue(task.title)
    }
  }

  async function handleDescSave() {
    if (!task || !selectedTask) return
    const { userNotes, metadata } = parseNotes(task.notes ?? '')
    if (descValue === metadata.description) return

    const updatedNotes = serializeNotes(userNotes, { ...metadata, description: descValue })

    // Optimistic update
    const tasks = useAppStore.getState().tasks[selectedTask.listId] ?? []
    useAppStore.getState().setTasks(
      selectedTask.listId,
      tasks.map((t) =>
        t.id === task.id
          ? { ...t, notes: updatedNotes, metadata: { ...t.metadata, description: descValue } }
          : t,
      ),
    )

    try {
      await updateTask(selectedTask.listId, task.id, { notes: updatedNotes })
    } catch {
      useAppStore.getState().setTasks(selectedTask.listId, tasks)
      setDescValue(metadata.description)
    }
  }

  function handleTitleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleTitleSave()
      titleRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setTitleValue(task?.title ?? '')
      titleRef.current?.blur()
    }
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20"
          onClick={clearSelectedTask}
          data-testid="task-detail-backdrop"
        />
      )}

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-96 bg-white shadow-xl z-30 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        data-testid="task-detail-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Task Detail</h2>
          <button
            onClick={clearSelectedTask}
            aria-label="Close task detail"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="task-detail-close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {task ? (
            <div className="flex flex-col gap-4">
              {/* Title */}
              <input
                ref={titleRef}
                type="text"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={handleTitleKeyDown}
                className="w-full text-base font-semibold text-gray-800 outline-none border-b-2 border-transparent focus:border-indigo-400 pb-1 transition-colors bg-transparent"
                data-testid="task-detail-title"
                aria-label="Task title"
              />

              {/* Description */}
              <textarea
                value={descValue}
                onChange={(e) => setDescValue(e.target.value)}
                onBlur={handleDescSave}
                placeholder="Add a description…"
                rows={4}
                className="w-full text-sm text-gray-700 placeholder-gray-400 outline-none border border-transparent focus:border-indigo-300 rounded-md px-2 py-1.5 resize-none transition-colors bg-gray-50 focus:bg-white"
                data-testid="task-detail-description"
                aria-label="Task description"
              />
            </div>
          ) : (
            <p className="text-sm text-gray-400">Task not found.</p>
          )}
        </div>
      </div>
    </>
  )
}

export default TaskDetailPanel
