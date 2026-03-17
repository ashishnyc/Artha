import { useState, useRef, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import type { Task, TaskMetadata } from '../../types'
import { createTask } from '../../api/tasks'
import { serializeNotes, defaultMetadata } from '../../lib/task-metadata'
import useAppStore from '../../store/useAppStore'
import { callClaude } from '../../lib/claude-client'
import { NATURAL_LANGUAGE_TASK_SYSTEM_PROMPT } from '../../lib/ai-prompts'
import { parseAISingleTask, type AITaskSuggestion } from '../../lib/ai-types'

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

const PRIORITY_MAP: Record<number, TaskMetadata['priority']> = {
  0: 'none',
  1: 'low',
  2: 'medium',
  3: 'high',
}

function QuickAddTask({ listId }: QuickAddTaskProps) {
  const [title, setTitle] = useState('')
  const [dueDate, setDueDate] = useState<string>('')
  const [priority, setPriority] = useState<TaskMetadata['priority']>('none')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showPriorityPicker, setShowPriorityPicker] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // AI mode
  const [aiMode, setAiMode] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [preview, setPreview] = useState<AITaskSuggestion | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)
  const priorityPickerRef = useRef<HTMLDivElement>(null)

  const tasks = useAppStore((s) => s.tasks[listId] ?? [])
  const setTasks = useAppStore((s) => s.setTasks)

  // Cmd+N shortcut — listen for custom event dispatched by AppShell
  useEffect(() => {
    function handleQuickAdd() { inputRef.current?.focus() }
    window.addEventListener('artha:quickadd', handleQuickAdd)
    return () => window.removeEventListener('artha:quickadd', handleQuickAdd)
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

  const handleAIParse = useCallback(async () => {
    const trimmed = title.trim()
    if (!trimmed || isParsing) return
    setIsParsing(true)
    setParseError(null)
    setPreview(null)
    try {
      const text = await callClaude(
        [{ role: 'user', content: trimmed }],
        NATURAL_LANGUAGE_TASK_SYSTEM_PROMPT,
      )
      const parsed = parseAISingleTask(text)
      setPreview(parsed)
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse')
    } finally {
      setIsParsing(false)
    }
  }, [title, isParsing])

  const handleConfirmPreview = useCallback(async () => {
    if (!preview || isSubmitting) return
    const resolvedPriority = PRIORITY_MAP[preview.priority ?? 0] ?? 'none'
    const metadata = {
      ...defaultMetadata(),
      priority: resolvedPriority,
      tags: preview.tags ?? [],
    }
    const notes = serializeNotes('', metadata)
    const tempId = `temp-${Date.now()}`
    const optimisticTask: Task = {
      id: tempId,
      title: preview.title,
      notes,
      status: 'needsAction',
      due: preview.due ? new Date(preview.due).toISOString() : null,
      parent: null,
      position: '00000000000000000000',
      metadata,
    }
    const currentTasks = useAppStore.getState().tasks[listId] ?? []
    setTasks(listId, [...currentTasks, optimisticTask])
    setTitle('')
    setPreview(null)
    setIsSubmitting(true)
    try {
      const created = await createTask(listId, {
        title: preview.title,
        notes,
        due: preview.due ? new Date(preview.due).toISOString() : undefined,
      })
      setTasks(
        listId,
        useAppStore.getState().tasks[listId].map((t) =>
          t.id === tempId ? { ...created, metadata } : t,
        ),
      )
    } catch {
      setTasks(
        listId,
        useAppStore.getState().tasks[listId].filter((t) => t.id !== tempId),
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [preview, isSubmitting, listId, setTasks])

  const handleSubmit = useCallback(async () => {
    if (aiMode) {
      await handleAIParse()
      return
    }
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

  const previewPriority = preview ? (PRIORITY_MAP[preview.priority ?? 0] ?? 'none') : 'none'

  return (
    <div
      className="sticky bottom-0 bg-white border-t border-gray-100 px-4 py-3"
      data-testid="quick-add-task"
    >
      {/* AI preview card */}
      {preview && (
        <div
          className="max-w-2xl mx-auto mb-2 border border-indigo-200 rounded-lg bg-indigo-50 px-4 py-3"
          data-testid="ai-preview-card"
        >
          <p className="text-xs text-indigo-500 font-medium mb-1.5">AI parsed</p>
          <p className="text-sm font-semibold text-gray-800 mb-1">{preview.title}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {preview.due && (
              <span className="text-xs text-gray-500">
                {new Date(preview.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
            {previewPriority !== 'none' && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[previewPriority]}`}>
                {previewPriority}
              </span>
            )}
            {preview.tags?.map((tag) => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-white border border-gray-200 text-gray-500 rounded-full">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-2.5">
            <button
              type="button"
              onClick={handleConfirmPreview}
              disabled={isSubmitting}
              className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              data-testid="confirm-ai-task"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={() => setPreview(null)}
              className="text-xs px-3 py-1 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
              data-testid="dismiss-ai-preview"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {parseError && (
        <p className="max-w-2xl mx-auto mb-1 text-xs text-red-500" data-testid="ai-parse-error">{parseError}</p>
      )}

      <div className={`flex items-center gap-2 max-w-2xl mx-auto bg-white border rounded-lg px-3 py-2 transition-all ${
        aiMode
          ? 'border-indigo-400 ring-1 ring-indigo-400'
          : 'border-gray-200 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400'
      }`}>
        {/* AI toggle */}
        <button
          type="button"
          onClick={() => { setAiMode((v) => !v); setPreview(null); setParseError(null) }}
          className={`shrink-0 transition-colors ${aiMode ? 'text-indigo-500' : 'text-gray-300 hover:text-indigo-400'}`}
          data-testid="ai-mode-toggle"
          aria-label="Toggle AI mode"
          title={aiMode ? 'AI mode on' : 'AI mode off'}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
          </svg>
        </button>

        {/* Title input */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={aiMode ? 'Describe a task in natural language… (Enter to parse)' : 'Add a task… (Ctrl+N)'}
          className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent"
          data-testid="quick-add-input"
          aria-label="New task title"
          disabled={isParsing}
        />

        {/* Date/priority pickers — hidden in AI mode */}
        {/* Date picker button */}
        <div className="relative" ref={datePickerRef} style={{ display: aiMode ? 'none' : undefined }}>
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
        <div className="relative" ref={priorityPickerRef} style={{ display: aiMode ? 'none' : undefined }}>
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
          disabled={!title.trim() || isSubmitting || isParsing}
          className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          data-testid="quick-add-submit"
        >
          {isParsing ? '…' : aiMode ? 'Parse' : 'Add'}
        </button>
      </div>
    </div>
  )
}

export default QuickAddTask
