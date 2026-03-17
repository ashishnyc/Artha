const SHORTCUTS = [
  { combo: '⌘K', description: 'Open search' },
  { combo: '⌘N', description: 'New task (quick add)' },
  { combo: 'T', description: 'Go to Today' },
  { combo: 'U', description: 'Go to Upcoming' },
  { combo: '1', description: 'Set priority: None' },
  { combo: '2', description: 'Set priority: Low' },
  { combo: '3', description: 'Set priority: Medium' },
  { combo: '4', description: 'Set priority: High' },
  { combo: 'Esc', description: 'Close panel / modal' },
  { combo: '?', description: 'Show keyboard shortcuts' },
]

export default function ShortcutsHelp({
  isOpen,
  onClose,
}: {
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      data-testid="shortcuts-overlay"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        data-testid="shortcuts-dialog"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2.5">
          {SHORTCUTS.map(({ combo, description }) => (
            <>
              <kbd
                key={`kbd-${combo}`}
                className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded text-center whitespace-nowrap self-center"
              >
                {combo}
              </kbd>
              <span key={`desc-${combo}`} className="text-sm text-gray-600 self-center">
                {description}
              </span>
            </>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400">Shortcuts are disabled when typing in an input field.</p>
        </div>
      </div>
    </div>
  )
}
