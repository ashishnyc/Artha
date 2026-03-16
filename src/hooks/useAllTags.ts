import useAppStore from '../store/useAppStore'

export function useAllTags(): string[] {
  const tasks = useAppStore((s) => s.tasks)
  const allTags = new Set<string>()

  for (const listTasks of Object.values(tasks)) {
    for (const task of listTasks) {
      for (const tag of task.metadata?.tags ?? []) {
        allTags.add(tag)
      }
    }
  }

  return Array.from(allTags).sort()
}
