import { useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTaskLists } from '../../hooks/useTaskLists'
import { createTaskList } from '../../api/task-lists'
import useAppStore from '../../store/useAppStore'
import { useAllTags } from '../../hooks/useAllTags'

function NavItem({
  to,
  label,
  count,
}: {
  to: string
  label: string
  count?: number
}) {
  return (
    <NavLink
      to={to}
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

function Sidebar() {
  const { taskLists } = useTaskLists()
  const tasks = useAppStore((s) => s.tasks)
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

  return (
    <aside
      className="w-64 h-full bg-gray-900 text-white flex flex-col shrink-0"
      data-testid="sidebar"
    >
      {/* App name */}
      <div className="px-6 py-5 border-b border-gray-700">
        <span className="text-lg font-semibold tracking-wide">Artha</span>
      </div>

      {/* Smart lists */}
      <nav className="px-3 pt-4 space-y-1" data-testid="smart-lists">
        <NavItem to="/inbox" label="Inbox" />
        <NavItem to="/today" label="Today" />
        <NavItem to="/upcoming" label="Upcoming" />
        <NavItem to="/calendar" label="Calendar" />
        <NavItem to="/priority" label="High Priority" />
        <NavItem to="/pomodoro" label="Pomodoro" />
        <NavItem to="/matrix" label="Matrix" />
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
  )
}

export default Sidebar
