import { useEffect } from 'react'
import { getTasks } from '../api/tasks'
import useAppStore from '../store/useAppStore'

const EMPTY_TASKS: import('../types').Task[] = []

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
      } finally {
        if (!cancelled) setTasksLoading(listId!, false)
      }
    }

    fetchTasks()
    return () => { cancelled = true }
  }, [listId, setTasks, setTasksLoading])

  return { tasks, loading }
}
