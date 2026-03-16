import { useEffect } from 'react'
import type { Task } from '../types'
import { getTasks } from '../api/tasks'
import useAppStore from '../store/useAppStore'

const EMPTY_TASKS: Task[] = []

export function useTasks(listId: string | null) {
  const tasksForList = useAppStore((s) => (listId ? s.tasks[listId] : undefined))
  const tasks = tasksForList ?? EMPTY_TASKS
  const loading = useAppStore((s) => (listId ? (s.loading.tasks[listId] ?? false) : false))
  const setTasks = useAppStore((s) => s.setTasks)
  const setTasksLoading = useAppStore((s) => s.setTasksLoading)

  useEffect(() => {
    if (!listId) return
    let cancelled = false

    async function fetchTasks() {
      setTasksLoading(listId!, true)
      try {
        const data = await getTasks(listId!)
        if (!cancelled) setTasks(listId!, data)
      } catch {
        // No-op: auth not set up yet — will retry once auth is in place
      } finally {
        if (!cancelled) setTasksLoading(listId!, false)
      }
    }

    fetchTasks()
    return () => { cancelled = true }
  }, [listId, setTasks, setTasksLoading])

  return { tasks, loading }
}
