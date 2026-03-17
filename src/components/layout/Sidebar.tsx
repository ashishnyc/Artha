import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTaskLists } from '../../hooks/useTaskLists'
import { createTaskList } from '../../api/task-lists'
import useAppStore from '../../store/useAppStore'
import { useAllTags } from '../../hooks/useAllTags'
import { useTheme, type Theme } from '../../hooks/useTheme'

function NavItem({
  to,
  label,
  count,
  onClick,
}: {
  to: string
  label: string
  count?: number
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center justify-between px-4 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? 'bg-indigo-600 text-white'
            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
        }`
      }
    >
      <span>{label}</span>
      {count !== undefined && count > 0 && (
        <span className="text-xs bg-gray-600 text-gray-200 rounded-full px-2 py-0.5">
          {count}
        </span>
      )}
    </NavLink>
  )
}

const THEME_ICONS: Record<Theme, string> = {
  light: '☀️',
  dark: '🌙',
  system: '💻',
}

const THEMES: Theme[] = ['light', 'dark', 'system']

function Sidebar({ isOpen = false, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const { taskLists } = useTaskLists()
  const tasks = useAppStore((s) => s.tasks)
  const { theme, setTheme } = useTheme()
  const setTaskLists = useAppStore((s) => s.setTaskLists)
  const user = useAppStore((s) => s.auth.user)
  const logout = useAppStore((s) => s.logout)
  const navigate = useNavigate()
  const allTags = useAllTags()

  // Count tasks per tag across all lists
  const tagCounts: Record<string, number> = {}
  for (const listTasks of Object.values(tasks)) {
    for (const task of listTasks) {
      if (task.status === 'completed') continue
      for (const tag of task.metadata?.tags ?? []) {
        tagCounts[tag] = (tagCounts[tag] ?? 0) + 1
      }
    }
  }

  const [isAddingList, setIsAddingList] = useState(false)
  const [newListTitle, setNewListTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAddingList) inputRef.current?.focus()
  }, [isAddingList])

  const taskCount = (listId: string) => tasks[listId]?.filter(t => t.status === 'needsAction').length

  async function handleCreateList() {
    const title = newListTitle.trim()
    if (!title) {
      setIsAddingList(false)
      return
    }
    try {
      const created = await createTaskList(title)
      setTaskLists([...taskLists, created])
    } finally {
      setNewListTitle('')
      setIsAddingList(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleCreateList()
    if (e.key === 'Escape') {
      setNewListTitle('')
      setIsAddingList(false)
    }
  }

  const close = onClose ?? (() => {})

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={close}
          data-testid="sidebar-backdrop"
        />
      )}

      <aside
        className={`
          fixed md:relative top-0 left-0 z-50 md:z-auto
          w-64 h-full bg-gray-900 text-white flex flex-col shrink-0
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        data-testid="sidebar"
      >
      {/* App name */}
      <div className="px-6 py-5 border-b border-gray-700 flex items-center justify-between">
        <span className="text-lg font-semibold tracking-wide">Artha</span>
        <button
          onClick={close}
          className="md:hidden text-gray-400 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Smart lists */}
      <nav className="px-3 pt-4 space-y-1" data-testid="smart-lists">
        <NavItem to="/inbox" label="Inbox" onClick={close} />
        <NavItem to="/today" label="Today" onClick={close} />
        <NavItem to="/upcoming" label="Upcoming" onClick={close} />
        <NavItem to="/calendar" label="Calendar" onClick={close} />
        <NavItem to="/priority" label="High Priority" onClick={close} />
        <NavItem to="/pomodoro" label="Pomodoro" onClick={close} />
        <NavItem to="/matrix" label="Matrix" onClick={close} />
      </nav>

      {/* User task lists */}
      {taskLists.length > 0 && (
        <nav className="px-3 pt-4 space-y-1 flex-1 overflow-y-auto" data-testid="task-lists-nav">
          <p className="px-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Lists
          </p>
          {taskLists.map((list) => (
            <NavItem
              key={list.id}
              to={`/list/${list.id}`}
              label={list.title}
              count={taskCount(list.id)}
              onClick={close}
            />
          ))}
        </nav>
      )}

      {/* Tags */}
      {allTags.length > 0 && (
        <nav className="px-3 pt-4 space-y-1" data-testid="tags-nav">
          <p className="px-4 pb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Tags
          </p>
          {allTags.map((tag) => (
            <NavItem
              key={tag}
              to={`/tag/${encodeURIComponent(tag)}`}
              label={`#${tag}`}
              count={tagCounts[tag]}
              onClick={close}
            />
          ))}
        </nav>
      )}

      {/* User info */}
      {user && (
        <div className="px-4 py-3 border-t border-gray-700 flex items-center gap-3 mt-auto" data-testid="user-info">
          <img
            src={user.picture}
            alt={user.name}
            className="w-8 h-8 rounded-full shrink-0"
            data-testid="user-avatar"
          />
          <span className="text-sm text-gray-300 truncate flex-1" data-testid="user-name">{user.name}</span>
          <button
            type="button"
            onClick={() => { logout(); navigate('/login') }}
            className="text-xs text-gray-500 hover:text-white transition-colors shrink-0"
            data-testid="logout-button"
          >
            Sign out
          </button>
        </div>
      )}

      {/* Bottom section */}
      <div className={`px-3 pb-4 space-y-1${user ? '' : ' mt-auto'}`}>
        <NavItem to="/completed" label="Completed" />

        {/* Theme toggle */}
        <div className="flex items-center gap-1 px-4 py-1.5" data-testid="theme-toggle">
          {THEMES.map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              title={`${t} mode`}
              className={`flex-1 text-xs py-1 rounded-md transition-colors ${
                theme === t
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              data-testid={`theme-${t}`}
            >
              {THEME_ICONS[t]}
            </button>
          ))}
        </div>

        {/* New List */}
        {isAddingList ? (
          <input
            ref={inputRef}
            data-testid="new-list-input"
            className="w-full px-4 py-2 rounded-lg text-sm bg-gray-700 text-white placeholder-gray-400 outline-none"
            placeholder="List name…"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleCreateList}
          />
        ) : (
          <button
            data-testid="new-list-button"
            onClick={() => setIsAddingList(true)}
            className="w-full flex items-center px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <span className="mr-2 text-lg leading-none">+</span>
            New List
          </button>
        )}
      </div>
    </aside>
    </>
  )
}

export default Sidebar
