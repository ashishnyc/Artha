export type EmptyStateView = 'list' | 'today' | 'upcoming' | 'inbox' | 'priority' | 'completed'

const CONFIGS: Record<EmptyStateView, { icon: string; title: string; subtitle: string }> = {
  list:      { icon: '📋', title: 'No tasks yet',           subtitle: 'Add a task below to get started' },
  today:     { icon: '☀️', title: 'All clear for today',    subtitle: 'Nothing due today — enjoy the calm' },
  upcoming:  { icon: '📅', title: 'Nothing upcoming',       subtitle: 'No tasks scheduled for the next 7 days' },
  inbox:     { icon: '📥', title: 'Inbox zero',             subtitle: 'All tasks are organised — great job!' },
  priority:  { icon: '🎯', title: 'No high-priority tasks', subtitle: 'Mark tasks as high priority to see them here' },
  completed: { icon: '🏆', title: 'Nothing completed yet',  subtitle: 'Completed tasks will appear here' },
}

export default function EmptyState({ view = 'list' }: { view?: EmptyStateView }) {
  const { icon, title, subtitle } = CONFIGS[view]
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-24"
      data-testid="empty-state"
    >
      <div className="text-5xl mb-4">{icon}</div>
      <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">{title}</h2>
      <p className="text-gray-400 dark:text-gray-500 text-sm">{subtitle}</p>
    </div>
  )
}
