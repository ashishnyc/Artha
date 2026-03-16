import { create } from 'zustand'
import { TaskList, Task, GoogleUser } from '../types'

interface AuthState {
  token: string | null
  user: GoogleUser | null
}

interface AppStore {
  taskLists: TaskList[]
  tasks: Record<string, Task[]>
  auth: AuthState
}

const useAppStore = create<AppStore>(() => ({
  taskLists: [],
  tasks: {},
  auth: {
    token: null,
    user: null,
  },
}))

export default useAppStore
