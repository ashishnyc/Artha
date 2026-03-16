import { useEffect } from 'react'
import { getTaskLists } from '../api/task-lists'
import useAppStore from '../store/useAppStore'

export function useTaskLists() {
  const taskLists = useAppStore((s) => s.taskLists)
  const loading = useAppStore((s) => s.loading.taskLists)
  const setTaskLists = useAppStore((s) => s.setTaskLists)
  const setTaskListsLoading = useAppStore((s) => s.setTaskListsLoading)

  useEffect(() => {
    let cancelled = false

    async function fetchLists() {
      setTaskListsLoading(true)
      try {
        const lists = await getTaskLists()
        if (!cancelled) setTaskLists(lists)
      } finally {
        if (!cancelled) setTaskListsLoading(false)
      }
    }

    fetchLists()
    return () => { cancelled = true }
  }, [setTaskLists, setTaskListsLoading])

  return { taskLists, loading }
}
