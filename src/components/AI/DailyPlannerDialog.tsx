import { useState, useEffect } from 'react'
import { callClaude } from '../../lib/claude-client'
import { DAILY_PLANNER_SYSTEM_PROMPT } from '../../lib/ai-prompts'
import type { AIDailyPlanItem } from '../../lib/ai-types'
import type { TaskWithList } from '../../hooks/useAllListsTasks'

interface DailyPlannerDialogProps {
  isOpen: boolean
  onClose: () => void
  tasks: TaskWithList[]
}

const PRIORITY_LABELS: Record<string, string> = {
  none: '',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

const PRIORITY_COLORS: Record<string, string> = {
  none: '',
  low: 'text-blue-500',
  medium: 'text-yellow-600',
  high: 'text-red-500',
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
    </div>
  )
}

export default function DailyPlannerDialog({ isOpen, onClose, tasks }: DailyPlannerDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [schedule, setSchedule] = useState<AIDailyPlanItem[]>([])
  const [error, setError] = useState<string | null>(null)

  // Auto-generate when opened with tasks
  useEffect(() => {
    if (!isOpen || tasks.length === 0) return
    generateSchedule()
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  async function generateSchedule() {
    setIsLoading(true)
    setError(null)
    setSchedule([])
    try {
      const taskList = tasks.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.metadata.priority,
        due: t.due,
        tags: t.metadata.tags,
      }))
      const userMessage = `Here are my tasks for today:\n${JSON.stringify(taskList, null, 2)}\n\nPlease suggest an optimized schedule for my day.`
      const text = await callClaude([{ role: 'user', content: userMessage }], DAILY_PLANNER_SYSTEM_PROMPT)

      // Parse JSON schedule
      let parsed: AIDailyPlanItem[] = []
      try {
        parsed = JSON.parse(text) as AIDailyPlanItem[]
      } catch {
        // Claude may have returned plain text — wrap it as a single note item
        setError(text)
        return
      }
      setSchedule(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate schedule')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  const taskMap = new Map(tasks.map((t) => [t.id, t]))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" data-testid="daily-planner-overlay">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        data-testid="daily-planner-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SparkleIcon className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-gray-800">Plan my day</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            data-testid="close-planner"
            aria-label="Close"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {tasks.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No tasks due today to plan.</p>
          )}

          {isLoading && (
            <div className="flex flex-col items-center py-8 gap-2">
              <LoadingDots />
              <p className="text-sm text-gray-400">Generating your schedule…</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3" data-testid="planner-error">
              {error}
            </div>
          )}

          {schedule.length > 0 && !isLoading && (
            <div data-testid="schedule-list">
              <p className="text-xs text-gray-400 mb-4">Suggested schedule based on your priorities and due dates.</p>
              <ol className="flex flex-col gap-3">
                {schedule.map((item, i) => {
                  const task = taskMap.get(item.taskId)
                  const priority = task?.metadata.priority ?? 'none'
                  return (
                    <li
                      key={item.taskId}
                      className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                      data-testid={`schedule-item-${i}`}
                    >
                      {/* Time slot */}
                      <div className="shrink-0 w-14 text-center">
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                          {item.suggestedTime}
                        </span>
                      </div>
                      {/* Task info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {priority !== 'none' && (
                            <span className={`text-xs font-medium ${PRIORITY_COLORS[priority]}`}>
                              {PRIORITY_LABELS[priority]}
                            </span>
                          )}
                          {task?.metadata.tags?.map((tag) => (
                            <span key={tag} className="text-xs text-gray-400 bg-white border border-gray-200 px-1.5 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                          {item.reason && (
                            <span className="text-xs text-gray-400 italic">{item.reason}</span>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isLoading && tasks.length > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <button
              onClick={generateSchedule}
              className="text-sm text-indigo-500 hover:text-indigo-700 transition-colors"
              data-testid="regenerate-button"
            >
              Regenerate
            </button>
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
              data-testid="accept-schedule"
            >
              Accept
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
