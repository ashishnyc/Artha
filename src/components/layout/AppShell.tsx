import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import MainContent from './MainContent'
import TaskDetailPanel from '../tasks/TaskDetailPanel'
import AIChatDialog from '../AI/AIChatDialog'
import SearchBar from '../Search/SearchBar'
import ShortcutsHelp from '../ShortcutsHelp'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'
import { updateTask } from '../../api/tasks'
import { parseNotes, serializeNotes } from '../../lib/task-metadata'
import useAppStore from '../../store/useAppStore'
import type { TaskMetadata } from '../../types'

const PRIORITY_MAP: Record<string, TaskMetadata['priority']> = {
  '1': 'none',
  '2': 'low',
  '3': 'medium',
  '4': 'high',
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function AppShell() {
  const [aiOpen, setAiOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const navigate = useNavigate()
  const selectedTask = useAppStore((s) => s.selectedTask)
  const clearSelectedTask = useAppStore((s) => s.clearSelectedTask)
  const setTasks = useAppStore((s) => s.setTasks)

  const shortcuts = useCallback(
    () => ({
      'cmd+k': () => setSearchOpen(true),
      'cmd+n': () => window.dispatchEvent(new CustomEvent('artha:quickadd')),
      't': () => navigate('/today'),
      'u': () => navigate('/upcoming'),
      'escape': () => {
        if (searchOpen) { setSearchOpen(false); return }
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (aiOpen) { setAiOpen(false); return }
        clearSelectedTask()
      },
      '?': () => setShortcutsOpen(true),
      '1': () => setPriorityShortcut('1'),
      '2': () => setPriorityShortcut('2'),
      '3': () => setPriorityShortcut('3'),
      '4': () => setPriorityShortcut('4'),
    }),
    [navigate, searchOpen, shortcutsOpen, aiOpen, clearSelectedTask], // eslint-disable-line react-hooks/exhaustive-deps
  )

  async function setPriorityShortcut(key: string) {
    if (!selectedTask) return
    const priority = PRIORITY_MAP[key]
    const storeTasks = useAppStore.getState().tasks[selectedTask.listId] ?? []
    const task = storeTasks.find((t) => t.id === selectedTask.taskId)
    if (!task || task.metadata.priority === priority) return

    const { userNotes, metadata } = parseNotes(task.notes ?? '')
    const newMetadata = { ...metadata, priority }
    const newNotes = serializeNotes(userNotes, newMetadata)

    setTasks(selectedTask.listId, storeTasks.map((t) =>
      t.id === selectedTask.taskId ? { ...t, notes: newNotes, metadata: newMetadata } : t
    ))
    try {
      await updateTask(selectedTask.listId, selectedTask.taskId, { notes: newNotes })
    } catch {
      setTasks(selectedTask.listId, storeTasks)
    }
  }

  useKeyboardShortcuts(shortcuts())

  return (
    <div className="flex h-screen w-screen overflow-hidden" data-testid="app-shell">
      <Sidebar />
      <MainContent />
      <TaskDetailPanel />

      {/* AI Chat FAB */}
      <button
        onClick={() => setAiOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
        data-testid="ai-chat-fab"
        aria-label="Open AI assistant"
      >
        <SparkleIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Ask AI</span>
      </button>

      <AIChatDialog isOpen={aiOpen} onClose={() => setAiOpen(false)} />
      <SearchBar isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <ShortcutsHelp isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </div>
  )
}

export default AppShell
