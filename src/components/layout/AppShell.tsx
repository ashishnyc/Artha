import { useState } from 'react'
import Sidebar from './Sidebar'
import MainContent from './MainContent'
import TaskDetailPanel from '../tasks/TaskDetailPanel'
import AIChatDialog from '../AI/AIChatDialog'

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  )
}

function AppShell() {
  const [aiOpen, setAiOpen] = useState(false)

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      data-testid="app-shell"
    >
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
    </div>
  )
}

export default AppShell
