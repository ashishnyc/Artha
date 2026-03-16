import { fetchWithAuth } from '../lib/api-client'
import { GOOGLE_TASKS_API_BASE } from '../lib/constants'
import type { Task } from '../types'

const listBase = (listId: string) => `${GOOGLE_TASKS_API_BASE}/lists/${listId}/tasks`
const taskBase = (listId: string, taskId: string) => `${listBase(listId)}/${taskId}`

interface TasksResponse {
  kind: string
  items?: Task[]
}

export async function getTasks(listId: string): Promise<Task[]> {
  const res = await fetchWithAuth(listBase(listId))
  const data: TasksResponse = await res.json()
  return data.items ?? []
}

export async function createTask(listId: string, task: Partial<Task>): Promise<Task> {
  const res = await fetchWithAuth(listBase(listId), {
    method: 'POST',
    body: JSON.stringify(task),
  })
  return res.json()
}

export async function updateTask(
  listId: string,
  taskId: string,
  updates: Partial<Task>,
): Promise<Task> {
  const res = await fetchWithAuth(taskBase(listId, taskId), {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
  return res.json()
}

export async function deleteTask(listId: string, taskId: string): Promise<void> {
  await fetchWithAuth(taskBase(listId, taskId), { method: 'DELETE' })
}

export async function moveTask(
  listId: string,
  taskId: string,
  parentId?: string,
  previousId?: string,
): Promise<Task> {
  const params = new URLSearchParams()
  if (parentId) params.set('parent', parentId)
  if (previousId) params.set('previous', previousId)
  const query = params.toString() ? `?${params.toString()}` : ''

  const res = await fetchWithAuth(`${taskBase(listId, taskId)}/move${query}`, {
    method: 'POST',
  })
  return res.json()
}

export async function completeTask(listId: string, taskId: string): Promise<Task> {
  return updateTask(listId, taskId, { status: 'completed' })
}

export async function uncompleteTask(listId: string, taskId: string): Promise<Task> {
  return updateTask(listId, taskId, { status: 'needsAction' })
}

export async function clearCompleted(listId: string): Promise<void> {
  await fetchWithAuth(`${listBase(listId)}/clear`, { method: 'POST' })
}
