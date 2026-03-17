import { useState, useRef, useEffect, useCallback } from 'react'
import { callClaude, type ClaudeMessage } from '../../lib/claude-client'
import { TASK_SUGGESTION_SYSTEM_PROMPT } from '../../lib/ai-prompts'
import { parseAIResponse, type AITaskSuggestion } from '../../lib/ai-types'
import { createTask } from '../../api/tasks'
import { serializeNotes, defaultMetadata } from '../../lib/task-metadata'
import type { TaskMetadata } from '../../types'
import useAppStore from '../../store/useAppStore'

interface AIChatDialogProps {
  isOpen: boolean
  onClose: () => void
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const PRIORITY_MAP: Record<number, TaskMetadata['priority']> = {
  0: 'none',
  1: 'low',
  2: 'medium',
  3: 'high',
}

const PRIORITY_BADGE: Record<TaskMetadata['priority'], string> = {
  none: 'bg-gray-100 text-gray-500',
  low: 'bg-blue-100 text-blue-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-red-100 text-red-600',
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
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
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
    </div>
  )
}

export default function AIChatDialog({ isOpen, onClose }: AIChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<AITaskSuggestion[]>([])
  const [addingIndex, setAddingIndex] = useState<Set<number>>(new Set())
  const [selectedListId, setSelectedListId] = useState<string>('')

  const taskLists = useAppStore((s) => s.taskLists)
  const tasks = useAppStore((s) => s.tasks)
  const setTasks = useAppStore((s) => s.setTasks)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Default to first list
  useEffect(() => {
    if (taskLists.length > 0 && !selectedListId) {
      setSelectedListId(taskLists[0].id)
    }
  }, [taskLists, selectedListId])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleSend = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    const userMsg: ChatMessage = { role: 'user', content: trimmed }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setError(null)
    setSuggestions([])
    setIsLoading(true)

    try {
      const claudeMessages: ClaudeMessage[] = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }))
      const responseText = await callClaude(claudeMessages, TASK_SUGGESTION_SYSTEM_PROMPT)

      const assistantMsg: ChatMessage = { role: 'assistant', content: responseText }
      setMessages((prev) => [...prev, assistantMsg])

      try {
        const parsed = parseAIResponse(responseText)
        setSuggestions(parsed)
      } catch {
        // Response wasn't JSON tasks — show as plain message, no preview
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, isLoading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  async function addSuggestion(suggestion: AITaskSuggestion, index: number) {
    if (!selectedListId || addingIndex.has(index)) return

    setAddingIndex((prev) => new Set(prev).add(index))
    try {
      const priority = PRIORITY_MAP[suggestion.priority ?? 0] ?? 'none'
      const metadata = {
        ...defaultMetadata(),
        priority,
        tags: suggestion.tags ?? [],
      }
      const notes = serializeNotes(suggestion.notes ?? '', metadata)
      const created = await createTask(selectedListId, {
        title: suggestion.title,
        notes,
        due: suggestion.due ? new Date(suggestion.due).toISOString() : undefined,
      })
      const existing = tasks[selectedListId] ?? []
      setTasks(selectedListId, [...existing, { ...created, metadata }])
      setSuggestions((prev) => prev.filter((_, i) => i !== index))
    } finally {
      setAddingIndex((prev) => {
        const next = new Set(prev)
        next.delete(index)
        return next
      })
    }
  }

  async function addAll() {
    for (let i = suggestions.length - 1; i >= 0; i--) {
      await addSuggestion(suggestions[i], i)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-testid="ai-chat-dialog-overlay"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh]"
        data-testid="ai-chat-dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <SparkleIcon className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-gray-800">AI Task Assistant</span>
          </div>
          <div className="flex items-center gap-3">
            {taskLists.length > 0 && (
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400 text-gray-700"
                data-testid="list-selector"
              >
                {taskLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="close-dialog"
              aria-label="Close"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <p className="text-sm text-gray-400 text-center mt-8">
              Describe what you need to do and I'll suggest tasks for you.
            </p>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <span className="italic text-gray-500 text-xs">
                    Tasks parsed below ↓
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl rounded-bl-sm">
                <LoadingDots />
              </div>
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5" data-testid="error-message">
              {error}
            </div>
          )}

          {/* Task suggestions preview */}
          {suggestions.length > 0 && (
            <div className="border border-indigo-100 rounded-xl overflow-hidden" data-testid="suggestions-preview">
              <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
                <span className="text-xs font-medium text-indigo-700">
                  {suggestions.length} task{suggestions.length !== 1 ? 's' : ''} suggested
                </span>
                <button
                  onClick={addAll}
                  disabled={!selectedListId}
                  className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  data-testid="add-all-button"
                >
                  Add all
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {suggestions.map((s, i) => {
                  const priority = PRIORITY_MAP[s.priority ?? 0] ?? 'none'
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-3 bg-white hover:bg-gray-50"
                      data-testid={`suggestion-card-${i}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{s.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {s.due && (
                            <span className="text-xs text-gray-400">
                              {new Date(s.due).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {priority !== 'none' && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_BADGE[priority]}`}>
                              {priority}
                            </span>
                          )}
                          {s.tags?.map((tag) => (
                            <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => addSuggestion(s, i)}
                        disabled={addingIndex.has(i) || !selectedListId}
                        className="shrink-0 text-xs px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-40 transition-colors"
                        data-testid={`add-suggestion-${i}`}
                      >
                        {addingIndex.has(i) ? '...' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="px-5 py-4 border-t border-gray-100">
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe tasks you need… (Enter to send)"
              rows={2}
              className="flex-1 text-sm text-gray-800 placeholder-gray-400 outline-none bg-transparent resize-none"
              disabled={isLoading}
              data-testid="chat-input"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="shrink-0 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              data-testid="send-button"
              aria-label="Send"
            >
              <SendIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
