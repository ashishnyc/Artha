import { useEffect } from 'react'
import type { Task } from '../types'
import { getTasks } from '../api/tasks'
import useAppStore from '../store/useAppStore'

export interface TaskWithList extends Task {
  listId: string
  listTitle: string
}

export function useAllListsTasks(): { tasks: TaskWithList[]; loading: boolean } {
  const taskLists = useAppStore((s) => s.taskLists)
  const tasksMap = useAppStore((s) => s.tasks)
  const loadingMap = useAppStore((s) => s.loading.tasks)
  const setTasks = useAppStore((s) => s.setTasks)
  const setTasksLoading = useAppStore((s) => s.setTasksLoading)

  useEffect(() => {
    taskLists.forEach((list) => {
      // Skip if already fetched or currently loading
      if (tasksMap[list.id] !== undefined || loadingMap[list.id]) return

      let cancelled = false
      setTasksLoading(list.id, true)
      getTasks(list.id)
        .then((data) => { if (!cancelled) setTasks(list.id, data) })
        .catch(() => {})
        .finally(() => { if (!cancelled) setTasksLoading(list.id, false) })

      return () => { cancelled = true }
    })
  }, [taskLists, tasksMap, loadingMap, setTasks, setTasksLoading])

  const isLoading =
    taskLists.length > 0 &&
    taskLists.some((l) => tasksMap[l.id] === undefined || loadingMap[l.id] === true)

  const tasks: TaskWithList[] = taskLists.flatMap((list) =>
    (tasksMap[list.id] ?? []).map((task) => ({
      ...task,
      listId: list.id,
      listTitle: list.title,
    })),
  )

  return { tasks, loading: isLoading }
}
