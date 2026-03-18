import { useState, useEffect, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import useAppStore from '../../store/useAppStore'
import { updateTask, createTask, deleteTask, completeTask, uncompleteTask } from '../../api/tasks'
import { parseNotes, serializeNotes } from '../../lib/task-metadata'
import type { TaskMetadata } from '../../types'
import TagInput from './TagInput'
import { callClaude } from '../../lib/claude-client'
import { TASK_BREAKDOWN_SYSTEM_PROMPT } from '../../lib/ai-prompts'
import { parseAIResponse } from '../../lib/ai-types'

type Priority = TaskMetadata['priority']

const PRIORITY_COLORS: Record<Priority, string> = {
  none: 'text-gray-400',
  low: 'text-blue-400',
  medium: 'text-yellow-500',
  high: 'text-red-500',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  none: 'No priority',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

function FlagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 3v18M5 3h11.5a1 1 0 0 1 .8 1.6L14 9l3.3 4.4a1 1 0 0 1-.8 1.6H5" />
    </svg>
  )
}

function MoveToListRow({ task, currentListId }: { task: import('../../types').Task; currentListId: string }) {
  const taskLists = useAppStore((s) => s.taskLists)
  const setTasks = useAppStore((s) => s.setTasks)
  const clearSelectedTask = useAppStore((s) => s.clearSelectedTask)
  const [isMoving, setIsMoving] = useState(false)

  async function handleMove(newListId: string) {
    if (newListId === currentListId || isMoving) return
    setIsMoving(true)

    const oldListTasks = useAppStore.getState().tasks[currentListId] ?? []
    const newListTasks = useAppStore.getState().tasks[newListId] ?? []

    // Optimistic: remove from old list, close panel
    setTasks(currentListId, oldListTasks.filter((t) => t.id !== task.id))
    clearSelectedTask()

    try {
      await deleteTask(currentListId, task.id)
      const created = await createTask(newListId, {
        title: task.title,
        notes: task.notes,
        due: task.due ?? undefined,
        status: task.status,
      })
      setTasks(newListId, [...(useAppStore.getState().tasks[newListId] ?? newListTasks), created])
    } catch {
      // Revert
      setTasks(currentListId, oldListTasks)
      setIsMoving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-gray-500 w-20 shrink-0">List</span>
      <select
        value={currentListId}
        onChange={(e) => handleMove(e.target.value)}
        disabled={isMoving}
        className="flex-1 text-xs border border-gray-200 rounded-md px-2 py-1 bg-gray-50 text-gray-700 outline-none focus:border-indigo-300 focus:bg-white transition-colors disabled:opacity-50"
        data-testid="move-to-list-select"
      >
        {taskLists.map((list) => (
          <option key={list.id} value={list.id}>
            {list.title}
          </option>
        ))}
      </select>
    </div>
  )
}

function SubtasksSection({
  taskId,
  listId,
  taskTitle,
  taskNotes,
}: {
  taskId: string
  listId: string
  taskTitle: string
  taskNotes: string
}) {
  const allTasks = useAppStore((s) => s.tasks[listId] ?? [])
  const setTasks = useAppStore((s) => s.setTasks)
  const subtasks = allTasks.filter((t) => t.parent === taskId)
  const [addingTitle, setAddingTitle] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // AI breakdown state
  const [isBreaking, setIsBreaking] = useState(false)
  const [breakError, setBreakError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<{ title: string; checked: boolean }[]>([])
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    if (isAdding) inputRef.current?.focus()
  }, [isAdding])

  const completedCount = subtasks.filter((t) => t.status === 'completed').length
  const totalCount = subtasks.length

  async function handleToggle(subtask: (typeof subtasks)[0]) {
    const isCompleted = subtask.status === 'completed'
    const updated = allTasks.map((t) =>
      t.id === subtask.id ? { ...t, status: isCompleted ? ('needsAction' as const) : ('completed' as const) } : t,
    )
    setTasks(listId, updated)
    try {
      if (isCompleted) {
        await uncompleteTask(listId, subtask.id)
      } else {
        await completeTask(listId, subtask.id)
      }
    } catch {
      setTasks(listId, allTasks)
    }
  }

  async function handleAddSubtask() {
    const title = addingTitle.trim()
    if (!title) { setIsAdding(false); return }
    setAddingTitle('')
    setIsAdding(false)
    try {
      const newTask = await createTask(listId, { title, parent: taskId })
      setTasks(listId, [...allTasks, newTask])
    } catch {
      // silently fail — user can retry
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleAddSubtask() }
    if (e.key === 'Escape') { setIsAdding(false); setAddingTitle('') }
  }

  async function handleBreakDown() {
    setIsBreaking(true)
    setBreakError(null)
    setSuggestions([])
    try {
      const { userNotes } = parseNotes(taskNotes)
      const userMessage = `Task: ${taskTitle}${userNotes ? `\nDetails: ${userNotes}` : ''}`
      const text = await callClaude([{ role: 'user', content: userMessage }], TASK_BREAKDOWN_SYSTEM_PROMPT)
      const parsed = parseAIResponse(text)
      setSuggestions(parsed.map((s) => ({ title: s.title, checked: true })))
    } catch (err) {
      setBreakError(err instanceof Error ? err.message : 'Failed to get suggestions')
    } finally {
      setIsBreaking(false)
    }
  }

  async function handleConfirm() {
    const selected = suggestions.filter((s) => s.checked)
    if (!selected.length) return
    setIsConfirming(true)
    try {
      const created = await Promise.all(
        selected.map((s) => createTask(listId, { title: s.title, parent: taskId }))
      )
      setTasks(listId, [...useAppStore.getState().tasks[listId] ?? [], ...created])
      setSuggestions([])
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Subtasks</span>
        {totalCount > 0 && (
          <span className="text-xs text-gray-400">{completedCount}/{totalCount} done</span>
        )}
      </div>

      {totalCount > 0 && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all"
            style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
          />
        </div>
      )}

      {subtasks.length > 0 && (
        <ul className="flex flex-col gap-1">
          {subtasks.map((sub) => {
            const isCompleted = sub.status === 'completed'
            return (
              <li key={sub.id} className="flex items-center gap-2 group">
                <button
                  type="button"
                  onClick={() => handleToggle(sub)}
                  aria-label={isCompleted ? 'Mark incomplete' : 'Mark complete'}
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isCompleted ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-300 hover:border-indigo-400'
                  }`}
                  data-testid={`subtask-checkbox-${sub.id}`}
                >
                  {isCompleted && (
                    <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span
                  className={`flex-1 text-xs ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}
                  data-testid={`subtask-title-${sub.id}`}
                >
                  {sub.title}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {isAdding ? (
        <input
          ref={inputRef}
          type="text"
          value={addingTitle}
          onChange={(e) => setAddingTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddSubtask}
          placeholder="Subtask title…"
          className="text-xs border border-indigo-300 rounded px-2 py-1 outline-none focus:border-indigo-400 bg-white"
          data-testid="subtask-input"
        />
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors"
            data-testid="add-subtask-button"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add subtask
          </button>

          <button
            type="button"
            onClick={handleBreakDown}
            disabled={isBreaking}
            className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-600 disabled:opacity-50 transition-colors"
            data-testid="break-down-ai-button"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
            </svg>
            {isBreaking ? 'Thinking…' : 'Break down with AI'}
          </button>
        </div>
      )}

      {breakError && (
        <p className="text-xs text-red-500" data-testid="break-down-error">{breakError}</p>
      )}

      {suggestions.length > 0 && (
        <div className="border border-indigo-100 rounded-lg overflow-hidden" data-testid="breakdown-suggestions">
          <div className="px-3 py-2 bg-indigo-50 border-b border-indigo-100">
            <span className="text-xs font-medium text-indigo-700">AI suggested subtasks</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {suggestions.map((s, i) => (
              <li key={i} className="flex items-center gap-2 px-3 py-2">
                <input
                  type="checkbox"
                  checked={s.checked}
                  onChange={(e) =>
                    setSuggestions((prev) =>
                      prev.map((item, idx) => (idx === i ? { ...item, checked: e.target.checked } : item))
                    )
                  }
                  className="w-3.5 h-3.5 accent-indigo-500"
                  data-testid={`suggestion-checkbox-${i}`}
                />
                <span className="flex-1 text-xs text-gray-700">{s.title}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-end gap-2 px-3 py-2 bg-gray-50 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setSuggestions([])}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="dismiss-suggestions"
            >
              Dismiss
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isConfirming || suggestions.every((s) => !s.checked)}
              className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              data-testid="confirm-subtasks"
            >
              {isConfirming ? 'Adding…' : `Add selected (${suggestions.filter((s) => s.checked).length})`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

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
  const [priority, setPriority] = useState<Priority>('none')
  const [tags, setTags] = useState<string[]>([])
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const priorityPickerRef = useRef<HTMLDivElement>(null)

  // Sync local fields when task changes
  useEffect(() => {
    setTitleValue(task?.title ?? '')
    const { metadata } = parseNotes(task?.notes ?? '')
    setDescValue(metadata.description)
    setPriority(metadata.priority)
    setTags(metadata.tags)
    setDueDateValue(task?.due ? format(parseISO(task.due), 'yyyy-MM-dd') : '')
    setShowDatePicker(false)
    setShowPriorityPicker(false)
  }, [task?.id])

  // Close pickers on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
      if (priorityPickerRef.current && !priorityPickerRef.current.contains(e.target as Node)) {
        setShowPriorityPicker(false)
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

  async function handlePrioritySave(newPriority: Priority) {
    if (!task || !selectedTask) return
    const { userNotes, metadata } = parseNotes(task.notes ?? '')
    if (newPriority === metadata.priority) return

    const updatedNotes = serializeNotes(userNotes, { ...metadata, priority: newPriority })
    const tasks = useAppStore.getState().tasks[selectedTask.listId] ?? []
    useAppStore.getState().setTasks(
      selectedTask.listId,
      tasks.map((t) =>
        t.id === task.id
          ? { ...t, notes: updatedNotes, metadata: { ...t.metadata, priority: newPriority } }
          : t,
      ),
    )

    try {
      await updateTask(selectedTask.listId, task.id, { notes: updatedNotes })
    } catch {
      useAppStore.getState().setTasks(selectedTask.listId, tasks)
      setPriority(metadata.priority)
    }
  }

  async function handleTagsChange(newTags: string[]) {
    if (!task || !selectedTask) return
    const { userNotes, metadata } = parseNotes(task.notes ?? '')
    const updatedNotes = serializeNotes(userNotes, { ...metadata, tags: newTags })

    const tasks = useAppStore.getState().tasks[selectedTask.listId] ?? []
    setTags(newTags)
    useAppStore.getState().setTasks(
      selectedTask.listId,
      tasks.map((t) =>
        t.id === task.id
          ? { ...t, notes: updatedNotes, metadata: { ...t.metadata, tags: newTags } }
          : t,
      ),
    )

    try {
      await updateTask(selectedTask.listId, task.id, { notes: updatedNotes })
    } catch {
      useAppStore.getState().setTasks(selectedTask.listId, tasks)
      setTags(metadata.tags)
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
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          onClick={clearSelectedTask}
          data-testid="task-detail-backdrop"
        />
      )}

      {/* Panel — push layout on desktop, overlay on mobile */}
      <div
        className={`fixed top-0 right-0 h-full w-full z-30 md:relative md:top-auto md:right-auto md:z-auto md:translate-x-0 bg-white dark:bg-gray-900 shadow-xl flex flex-col overflow-hidden transition-transform md:transition-[width] duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 md:w-96' : 'translate-x-full md:w-0'
        }`}
        data-testid="task-detail-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Task Detail</h2>
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
                className="w-full text-base font-semibold text-gray-800 dark:text-gray-100 outline-none border-b-2 border-transparent focus:border-indigo-400 pb-1 transition-colors bg-transparent"
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
                className="w-full text-sm text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 outline-none border border-transparent focus:border-indigo-300 rounded-md px-2 py-1.5 resize-none transition-colors bg-gray-50 dark:bg-gray-800 focus:bg-white dark:focus:bg-gray-750"
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
              {/* Tags */}
              <div className="flex items-start gap-2">
                <span className="text-xs font-medium text-gray-500 w-20 shrink-0 pt-1.5">Tags</span>
                <div className="flex-1">
                  <TagInput tags={tags} onChange={handleTagsChange} />
                </div>
              </div>

              {/* Move to list */}
              <MoveToListRow task={task} currentListId={selectedTask!.listId} />

              {/* Subtasks */}
              <SubtasksSection
                taskId={task.id}
                listId={selectedTask!.listId}
                taskTitle={task.title}
                taskNotes={task.notes ?? ''}
              />

              {/* Priority */}
              <div ref={priorityPickerRef} className="relative">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500 w-20 shrink-0">Priority</span>
                  <button
                    type="button"
                    onClick={() => { setShowPriorityPicker((v) => !v); setShowDatePicker(false) }}
                    className={`flex items-center gap-1.5 text-sm px-2 py-1 rounded-md border transition-colors ${
                      priority !== 'none'
                        ? 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                        : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                    }`}
                    data-testid="priority-button"
                  >
                    <FlagIcon className={`w-3.5 h-3.5 ${PRIORITY_COLORS[priority]}`} />
                    <span className={PRIORITY_COLORS[priority]}>{PRIORITY_LABELS[priority]}</span>
                  </button>
                </div>
                {showPriorityPicker && (
                  <div
                    className="absolute top-full mt-1 left-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-36"
                    data-testid="priority-popover"
                  >
                    {(['none', 'low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPriority(p)
                          handlePrioritySave(p)
                          setShowPriorityPicker(false)
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${priority === p ? 'font-medium' : ''}`}
                        data-testid={`priority-option-${p}`}
                      >
                        <FlagIcon className={`w-3.5 h-3.5 ${PRIORITY_COLORS[p]}`} />
                        <span className={PRIORITY_COLORS[p]}>{PRIORITY_LABELS[p]}</span>
                      </button>
                    ))}
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
