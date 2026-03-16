export interface TaskMetadata {
  tags: string[]
  priority: 'none' | 'low' | 'medium' | 'high'
  estimatedPomos: number
  completedPomos: number
  description: string
}

export interface Task {
  id: string
  title: string
  notes: string
  status: 'needsAction' | 'completed'
  due: string | null
  parent: string | null
  position: string
  metadata: TaskMetadata
}

export interface TaskList {
  id: string
  title: string
}

export interface AppState {
  taskLists: TaskList[]
  tasks: Record<string, Task[]>
  selectedListId: string | null
  isAuthenticated: boolean
  user: GoogleUser | null
}

export interface GoogleUser {
  id: string
  name: string
  email: string
  picture: string
}
