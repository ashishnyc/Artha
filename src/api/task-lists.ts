import { fetchWithAuth } from '../lib/api-client'
import { GOOGLE_TASKS_API_BASE } from '../lib/constants'
import type { TaskList } from '../types'

const BASE = `${GOOGLE_TASKS_API_BASE}/users/@me/lists`

interface TaskListsResponse {
  kind: string
  items?: TaskList[]
}

export async function getTaskLists(): Promise<TaskList[]> {
  const res = await fetchWithAuth(BASE)
  const data: TaskListsResponse = await res.json()
  return data.items ?? []
}

export async function createTaskList(title: string): Promise<TaskList> {
  const res = await fetchWithAuth(BASE, {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
  return res.json()
}

export async function updateTaskList(id: string, title: string): Promise<TaskList> {
  const res = await fetchWithAuth(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title }),
  })
  return res.json()
}

export async function deleteTaskList(id: string): Promise<void> {
  await fetchWithAuth(`${BASE}/${id}`, { method: 'DELETE' })
}
