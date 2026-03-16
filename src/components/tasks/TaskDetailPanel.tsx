import useAppStore from '../../store/useAppStore'

function TaskDetailPanel() {
  const selectedTask = useAppStore((s) => s.selectedTask)
  const clearSelectedTask = useAppStore((s) => s.clearSelectedTask)
  const task = useAppStore((s) =>
    selectedTask
      ? s.tasks[selectedTask.listId]?.find((t) => t.id === selectedTask.taskId) ?? null
      : null,
  )

  const isOpen = !!selectedTask

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
            <p className="text-sm text-gray-800 font-medium">{task.title}</p>
          ) : (
            <p className="text-sm text-gray-400">Task not found.</p>
          )}
        </div>
      </div>
    </>
  )
}

export default TaskDetailPanel
