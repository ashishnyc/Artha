import { useState, useRef, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { Task, TaskMetadata } from '../../types'
import { createTask } from '../../api/tasks'
import { serializeNotes, defaultMetadata } from '../../lib/task-metadata'
import useAppStore from '../../store/useAppStore'

interface QuickAddTaskProps {
  listId: string
}

const PRIORITY_COLORS: Record<TaskMetadata['priority'], string> = {
  none: 'text-gray-400',
  low: 'text-blue-400',
  medium: 'text-yellow-500',
  high: 'text-red-500',
}

const PRIORITY_LABELS: Record<TaskMetadata['priority'], string> = {
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}

function QuickAddTask({ listId }: QuickAddTaskProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<string>('')
  const [priority, setPriority] = useState<TaskMetadata['priority']>('none')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const priorityPickerRef = useRef<HTMLDivElement>(null)

  const tasks = useAppStore((s) => s.tasks[listId] ?? [])
  const setTasks = useAppStore((s) => s.setTasks)

  // Ctrl+N / Cmd+N shortcut to focus input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

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

  const handleSubmit = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed || isSubmitting) return

    const metadata = { ...defaultMetadata(), priority }
    const notes = serializeNotes('', metadata)

    // Optimistic task (temp ID)
    const tempId = `temp-${Date.now()}`
    const optimisticTask: Task = {
      id: tempId,
      title: trimmed,
      notes,
      status: 'needsAction',
      due: dueDate ? new Date(dueDate).toISOString() : null,
      parent: null,
      position: '00000000000000000000',
      metadata,
    }

    setTasks(listId, [...tasks, optimisticTask])
    setTitle('')
    setDueDate('')
    setPriority('none')
    setIsSubmitting(true)

    try {
      const created = await createTask(listId, {
        title: trimmed,
        notes,
        due: dueDate ? new Date(dueDate).toISOString() : undefined,
      })
      // Replace optimistic entry with real task
      setTasks(
        listId,
        useAppStore.getState().tasks[listId].map((t) => (t.id === tempId ? { ...created, metadata } : t)),
      )
    } catch {
      // Revert optimistic add
      setTasks(
        listId,
        useAppStore.getState().tasks[listId].filter((t) => t.id !== tempId),
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [title, dueDate, priority, isSubmitting, listId, tasks, setTasks])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  const dueDateLabel = dueDate ? format(new Date(dueDate + 'T00:00:00'), 'MMM d') : null

  return (
    <div
      className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3"
      data-testid="quick-add-task"
    >
      <div className="flex items-center gap-2 max-w-2xl mx-auto bg-white border border-gray-200 rounded-lg px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
        {/* Plus icon */}
        <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>

        {/* Title input */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task… (Ctrl+N)"
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
          data-testid="quick-add-input"
          aria-label="New task title"
        />

        {/* Date picker button */}
        <div className="relative" ref={datePickerRef}>
          <button
            type="button"
            onClick={() => {
              setShowDatePicker((v) => !v)
              setShowPriorityPicker(false)
            }}
            className={`flex items-center gap-1 text-xs px-2 py-1 rounded hover:bg-gray-100 transition-colors ${
              dueDateLabel ? 'text-indigo-600' : 'text-gray-400'
            }`}
            data-testid="date-picker-button"
            aria-label="Set due date"
          >
            <CalendarIcon className="w-4 h-4" />
            {dueDateLabel && <span>{dueDateLabel}</span>}
          </button>

          {showDatePicker && (
            <div
              className="absolute bottom-full mb-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-10"
              data-testid="date-picker-popover"
            >
              <input
                type="date"
                value={dueDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  setDueDate(e.target.value)
                  setShowDatePicker(false)
                }}
                className="text-sm border border-gray-200 rounded px-2 py-1 outline-none focus:border-indigo-400"
                data-testid="date-input"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => {
                    setDueDate('')
                    setShowDatePicker(false)
                  }}
                  className="mt-1 w-full text-xs text-gray-400 hover:text-red-400 text-center"
                  data-testid="clear-date-button"
                >
                  Clear date
                </button>
              )}
            </div>
          )}
        </div>

        {/* Priority picker button */}
        <div className="relative" ref={priorityPickerRef}>
          <button
            type="button"
            onClick={() => {
              setShowPriorityPicker((v) => !v)
              setShowDatePicker(false)
            }}
            className={`flex items-center p-1 rounded hover:bg-gray-100 transition-colors ${PRIORITY_COLORS[priority]}`}
            data-testid="priority-button"
            aria-label="Set priority"
          >
            <FlagIcon className="w-4 h-4" />
          </button>

          {showPriorityPicker && (
            <div
              className="absolute bottom-full mb-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 min-w-32"
              data-testid="priority-popover"
            >
              {(['none', 'low', 'medium', 'high'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPriority(p)
                    setShowPriorityPicker(false)
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 ${
                    priority === p ? 'font-medium' : ''
                  }`}
                  data-testid={`priority-option-${p}`}
                >
                  <FlagIcon className={`w-3.5 h-3.5 ${PRIORITY_COLORS[p]}`} />
                  {PRIORITY_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!title.trim() || isSubmitting}
          className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          data-testid="quick-add-submit"
        >
          Add
        </button>
      </div>
    </div>
  )
}

export default QuickAddTask
