import { TaskMetadata } from '../types'

// Delimiter separating user-visible notes from the hidden JSON metadata block
const METADATA_DELIMITER = '\n---artha---\n'

const makeDefaultMetadata = (): TaskMetadata => ({
  tags: [],
  priority: 'none',
  estimatedPomos: 0,
  completedPomos: 0,
  description: '',
})

/**
 * Parses the JSON metadata block embedded at the end of a task's notes field.
 * Returns default metadata if no block is found or the JSON is malformed.
 */
export function parseNotes(notes: string): { userNotes: string; metadata: TaskMetadata } {
  const delimiterIndex = notes.indexOf(METADATA_DELIMITER)

  if (delimiterIndex === -1) {
    return { userNotes: notes, metadata: makeDefaultMetadata() }
  }

  const userNotes = notes.slice(0, delimiterIndex)
  const jsonPart = notes.slice(delimiterIndex + METADATA_DELIMITER.length)

  try {
    const parsed = JSON.parse(jsonPart) as Partial<TaskMetadata>
    const metadata: TaskMetadata = {
      ...makeDefaultMetadata(),
      ...parsed,
    }
    return { userNotes, metadata }
  } catch {
    return { userNotes, metadata: makeDefaultMetadata() }
  }
}

/**
 * Combines user-visible notes with a JSON metadata block into a single string
 * suitable for storing in a task's notes field.
 */
export function serializeNotes(userNotes: string, metadata: TaskMetadata): string {
  const jsonBlock = JSON.stringify(metadata)
  return `${userNotes}${METADATA_DELIMITER}${jsonBlock}`
}

/**
 * Returns the default empty metadata shape.
 */
export function defaultMetadata(): TaskMetadata {
  return makeDefaultMetadata()
}
