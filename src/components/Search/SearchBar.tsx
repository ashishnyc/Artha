import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import useAppStore from '../../store/useAppStore'
import { parseNotes } from '../../lib/task-metadata'

interface SearchResult {
  taskId: string
  listId: string
  listTitle: string
  title: string
  due: string | null
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return debounced
}

export default function SearchBar({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 200)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const taskLists = useAppStore((s) => s.taskLists)
  const tasksMap = useAppStore((s) => s.tasks)
  const setSelectedTask = useAppStore((s) => s.setSelectedTask)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const results = useMemo<SearchResult[]>(() => {
    const q = debouncedQuery.trim().toLowerCase()
    if (!q) return []

    const matches: SearchResult[] = []
    for (const list of taskLists) {
      for (const task of tasksMap[list.id] ?? []) {
        if (task.status === 'completed') continue
        const { userNotes } = parseNotes(task.notes ?? '')
        if (
          task.title.toLowerCase().includes(q) ||
          userNotes.toLowerCase().includes(q)
        ) {
          matches.push({
            taskId: task.id,
            listId: list.id,
            listTitle: list.title,
            title: task.title,
            due: task.due,
          })
        }
      }
    }
    return matches.slice(0, 10)
  }, [debouncedQuery, taskLists, tasksMap])

  function handleSelect(result: SearchResult) {
    onClose()
    navigate(`/list/${result.listId}`)
    // Small delay to let the page render before opening the panel
    setTimeout(() => {
      setSelectedTask({ taskId: result.taskId, listId: result.listId })
    }, 100)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4"
      data-testid="search-overlay"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div
        className="relative z-10 w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
        data-testid="search-dialog"
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tasks…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && onClose()}
            className="flex-1 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 outline-none bg-transparent"
            data-testid="search-input"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-300 hover:text-gray-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <kbd className="text-xs text-gray-300 bg-gray-100 px-1.5 py-0.5 rounded font-mono">Esc</kbd>
        </div>

        {/* Results */}
        {debouncedQuery.trim() && (
          <div className="max-h-80 overflow-y-auto" data-testid="search-results">
            {results.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No tasks found</p>
            ) : (
              <ul className="py-1">
                {results.map((r) => (
                  <li key={`${r.listId}-${r.taskId}`}>
                    <button
                      onClick={() => handleSelect(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
                      data-testid="search-result"
                    >
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-200 truncate">{r.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400 truncate">{r.listTitle}</span>
                          {r.due && (
                            <span className="text-xs text-gray-400">
                              · {format(parseISO(r.due), 'MMM d')}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Empty state hint */}
        {!debouncedQuery.trim() && (
          <div className="px-4 py-4 text-xs text-gray-400 flex items-center gap-4">
            <span>Type to search all tasks</span>
            <span className="ml-auto flex items-center gap-1">
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">↑↓</kbd> navigate
              <kbd className="bg-gray-100 px-1.5 py-0.5 rounded font-mono ml-1">↵</kbd> open
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
