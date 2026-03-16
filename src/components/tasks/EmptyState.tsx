function EmptyState() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full text-center py-24"
      data-testid="empty-state"
    >
      <div className="text-5xl mb-4">✓</div>
      <h2 className="text-xl font-semibold text-gray-700 mb-2">No tasks yet</h2>
      <p className="text-gray-400 text-sm">Add a task below to get started</p>
    </div>
  )
}

export default EmptyState
