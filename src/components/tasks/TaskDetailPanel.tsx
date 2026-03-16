import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
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
  const [dueDateValue, setDueDateValue] = useState('')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Sync local fields when task changes
  useEffect(() => {
    setTitleValue(task?.title ?? '')
    const { metadata } = parseNotes(task?.notes ?? '')
    setDescValue(metadata.description)
    setDueDateValue(task?.due ? format(parseISO(task.due), 'yyyy-MM-dd') : '')
    setShowDatePicker(false)
  }, [task?.id])

  // Close date picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  async function handleDueDateSave(newDate: string) {
    if (!task || !selectedTask) return
    const newDue = newDate ? new Date(newDate + 'T00:00:00').toISOString() : null
    if (newDue === task.due) return

    const tasks = useAppStore.getState().tasks[selectedTask.listId] ?? []
    useAppStore.getState().setTasks(
      selectedTask.listId,
      tasks.map((t) => (t.id === task.id ? { ...t, due: newDue } : t)),
    )

    try {
      await updateTask(selectedTask.listId, task.id, { due: newDue ?? undefined })
    } catch {
      useAppStore.getState().setTasks(selectedTask.listId, tasks)
      setDueDateValue(task.due ? format(parseISO(task.due), 'yyyy-MM-dd') : '')
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

              {/* Due date */}
              <div ref={datePickerRef} className="relative">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-20 shrink-0">Due date</span>
                  <button
                    type="button"
                    onClick={() => setShowDatePicker((v) => !v)}
                    className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md border transition-colors ${
                      dueDateValue
                        ? 'border-indigo-200 text-indigo-600 bg-indigo-50 hover:bg-indigo-100'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}
                    data-testid="due-date-button"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {dueDateValue ? format(parseISO(dueDateValue), 'MMM d, yyyy') : 'Set date'}
                  </button>
                  {dueDateValue && (
                    <button
                      type="button"
                      onClick={() => { setDueDateValue(''); handleDueDateSave('') }}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="Clear due date"
                      data-testid="clear-due-date"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                {showDatePicker && (
                  <div className="absolute top-full mt-1 left-20 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10" data-testid="due-date-popover">
                    <input
                      type="date"
                      value={dueDateValue}
                      onChange={(e) => {
                        setDueDateValue(e.target.value)
                        handleDueDateSave(e.target.value)
                        setShowDatePicker(false)
                      }}
                      className="text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                      data-testid="due-date-input"
                    />
                  </div>
                )}
              </div>
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
