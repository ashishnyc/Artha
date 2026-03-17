export interface AITaskSuggestion {
  title: string
  notes?: string
  due?: string
  priority?: number
  tags?: string[]
  subtasks?: string[]
}

export interface AIDailyPlanItem {
  taskId: string
  title: string
  suggestedTime: string
  reason?: string
}

export function parseAIResponse(text: string): AITaskSuggestion[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Claude returned invalid JSON')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Expected a JSON array from Claude')
  }

  return parsed.map((item, i) => {
    if (typeof item !== 'object' || item === null || !('title' in item)) {
      throw new Error(`Item ${i} is missing required field "title"`)
    }
    const s = item as Record<string, unknown>
    return {
      title: String(s.title),
      notes: s.notes != null ? String(s.notes) : undefined,
      due: s.due != null ? String(s.due) : undefined,
      priority: s.priority != null ? Number(s.priority) : undefined,
      tags: Array.isArray(s.tags) ? (s.tags as string[]) : undefined,
      subtasks: Array.isArray(s.subtasks)
        ? (s.subtasks as string[])
        : undefined,
    } satisfies AITaskSuggestion
  })
}

export function parseAISingleTask(text: string): AITaskSuggestion {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Claude returned invalid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null || !('title' in parsed)) {
    throw new Error('Expected a JSON object with "title" from Claude')
  }

  const s = parsed as Record<string, unknown>
  return {
    title: String(s.title),
    notes: s.notes != null ? String(s.notes) : undefined,
    due: s.due != null ? String(s.due) : undefined,
    priority: s.priority != null ? Number(s.priority) : undefined,
    tags: Array.isArray(s.tags) ? (s.tags as string[]) : undefined,
  }
}
