import { create } from 'zustand'
import { TaskList, Task, GoogleUser } from '../types'

interface AuthState {
  token: string | null
  user: GoogleUser | null
}

interface LoadingState {
  taskLists: boolean
  tasks: Record<string, boolean>
}

interface AppStore {
  // Data
  taskLists: TaskList[]
  tasks: Record<string, Task[]>
  auth: AuthState
  loading: LoadingState

  // Task slice actions
  setTaskLists: (taskLists: TaskList[]) => void
  setTasks: (listId: string, tasks: Task[]) => void
  setTaskListsLoading: (loading: boolean) => void
  setTasksLoading: (listId: string, loading: boolean) => void
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
}))

export default useAppStore
