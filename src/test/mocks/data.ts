import type { Task, TaskList, GoogleUser, TaskMetadata } from '../../types'

let idCounter = 1
const nextId = () => `mock-${idCounter++}`

export function createMockTaskMetadata(overrides: Partial<TaskMetadata> = {}): TaskMetadata {
  return {
    tags: [],
    priority: 'none',
    estimatedPomos: 0,
    completedPomos: 0,
    description: '',
    ...overrides,
  }
}

export function createMockTask(
  overrides: Partial<Task> & { listId?: string } = {}
): Task {
  const { listId: _listId, ...taskOverrides } = overrides
  return {
    id: nextId(),
    title: 'Test task',
    notes: '',
    status: 'needsAction',
    due: null,
    parent: null,
    position: '00000000000000000000',
    metadata: createMockTaskMetadata(),
    ...taskOverrides,
  }
}

export function createMockTaskList(overrides: Partial<TaskList> = {}): TaskList {
  return {
    id: nextId(),
    title: 'My Tasks',
    ...overrides,
  }
}

export function createMockUser(overrides: Partial<GoogleUser> = {}): GoogleUser {
  return {
    id: nextId(),
    name: 'Test User',
    email: 'test@example.com',
    picture: 'https://example.com/avatar.jpg',
    ...overrides,
  }
}
