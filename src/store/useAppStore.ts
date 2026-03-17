import { create } from 'zustand'
import type { TaskList, Task, GoogleUser } from '../types'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error'
}

interface AuthState {
  token: string | null
  user: GoogleUser | null
}

interface LoadingState {
  taskLists: boolean
  tasks: Record<string, boolean>
}

interface SelectedTask {
  taskId: string
  listId: string
}

interface FocusTask {
  taskId: string
  listId: string
  title: string
}

interface AppStore {
  // Data
  taskLists: TaskList[]
  tasks: Record<string, Task[]>
  auth: AuthState
  loading: LoadingState
  selectedTask: SelectedTask | null
  currentFocusTask: FocusTask | null
  toasts: Toast[]

  // Auth slice actions
  setToken: (token: string) => void
  setUser: (user: GoogleUser) => void
  logout: () => void

  // Task slice actions
  setTaskLists: (taskLists: TaskList[]) => void
  setTasks: (listId: string, tasks: Task[]) => void
  setTaskListsLoading: (loading: boolean) => void
  setTasksLoading: (listId: string, loading: boolean) => void

  // Selection actions
  setSelectedTask: (selected: SelectedTask) => void
  clearSelectedTask: () => void

  // Focus actions
  setCurrentFocusTask: (task: FocusTask | null) => void

  // Toast actions
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

const useAppStore = create<AppStore>((set) => ({
  taskLists: [],
  tasks: {},
  auth: {
    token: null,
    user: null,
  },
  loading: {
    taskLists: false,
    tasks: {},
  },
  selectedTask: null,
  currentFocusTask: null,
  toasts: [],

  setToken: (token) => set((state) => ({ auth: { ...state.auth, token } })),

  setUser: (user) => set((state) => ({ auth: { ...state.auth, user } })),

  logout: () => set({ auth: { token: null, user: null } }),

  setTaskLists: (taskLists) => set({ taskLists }),

  setTasks: (listId, tasks) =>
    set((state) => ({ tasks: { ...state.tasks, [listId]: tasks } })),

  setTaskListsLoading: (loading) =>
    set((state) => ({ loading: { ...state.loading, taskLists: loading } })),

  setTasksLoading: (listId, loading) =>
    set((state) => ({
      loading: {
        ...state.loading,
        tasks: { ...state.loading.tasks, [listId]: loading },
      },
    })),

  setSelectedTask: (selected) => set({ selectedTask: selected }),
  clearSelectedTask: () => set({ selectedTask: null }),

  setCurrentFocusTask: (task) => set({ currentFocusTask: task }),

  addToast: (message, type) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      useAppStore.getState().removeToast(id)
    }, 3000)
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export default useAppStore
