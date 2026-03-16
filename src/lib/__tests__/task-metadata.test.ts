import { describe, it, expect } from 'vitest'
import { parseNotes, serializeNotes, defaultMetadata } from '../task-metadata'
import type { TaskMetadata } from '../../types'

const DELIMITER = '\n---artha---\n'

const fullMetadata: TaskMetadata = {
  tags: ['work', 'urgent'],
  priority: 'high',
  estimatedPomos: 4,
  completedPomos: 2,
  description: 'Some description',
}

describe('parseNotes', () => {
  it('returns default metadata and full string as userNotes when no delimiter', () => {
    const { userNotes, metadata } = parseNotes('Just a plain note')
    expect(userNotes).toBe('Just a plain note')
    expect(metadata.tags).toEqual([])
    expect(metadata.priority).toBe('none')
    expect(metadata.estimatedPomos).toBe(0)
    expect(metadata.completedPomos).toBe(0)
    expect(metadata.description).toBe('')
  })

  it('parses user notes and metadata correctly', () => {
    const notes = `My note${DELIMITER}${JSON.stringify(fullMetadata)}`
    const { userNotes, metadata } = parseNotes(notes)
    expect(userNotes).toBe('My note')
    expect(metadata.tags).toEqual(['work', 'urgent'])
    expect(metadata.priority).toBe('high')
    expect(metadata.estimatedPomos).toBe(4)
    expect(metadata.completedPomos).toBe(2)
    expect(metadata.description).toBe('Some description')
  })

  it('handles empty user notes with metadata', () => {
    const notes = `${DELIMITER}${JSON.stringify(fullMetadata)}`
    const { userNotes, metadata } = parseNotes(notes)
    expect(userNotes).toBe('')
    expect(metadata.priority).toBe('high')
  })

  it('returns default metadata when JSON is malformed', () => {
    const notes = `My note${DELIMITER}not-valid-json`
    const { userNotes, metadata } = parseNotes(notes)
    expect(userNotes).toBe('My note')
    expect(metadata).toEqual(defaultMetadata())
  })

  it('merges partial metadata with defaults', () => {
    const partial = { priority: 'low', tags: ['home'] }
    const notes = `Note${DELIMITER}${JSON.stringify(partial)}`
    const { metadata } = parseNotes(notes)
    expect(metadata.priority).toBe('low')
    expect(metadata.tags).toEqual(['home'])
    expect(metadata.estimatedPomos).toBe(0) // default filled in
    expect(metadata.completedPomos).toBe(0)
  })

  it('handles empty string input', () => {
    const { userNotes, metadata } = parseNotes('')
    expect(userNotes).toBe('')
    expect(metadata).toEqual(defaultMetadata())
  })

  it('returns independent copies of default metadata on each call', () => {
    const { metadata: m1 } = parseNotes('no delimiter')
    const { metadata: m2 } = parseNotes('no delimiter')
    m1.tags.push('mutated')
    expect(m2.tags).toEqual([])
  })
})

describe('serializeNotes', () => {
  it('combines user notes and metadata with the delimiter', () => {
    const result = serializeNotes('My note', fullMetadata)
    expect(result).toBe(`My note${DELIMITER}${JSON.stringify(fullMetadata)}`)
  })

  it('handles empty user notes', () => {
    const result = serializeNotes('', fullMetadata)
    expect(result.startsWith(DELIMITER)).toBe(true)
    expect(result).toContain(JSON.stringify(fullMetadata))
  })

  it('round-trips correctly with parseNotes', () => {
    const serialized = serializeNotes('Round trip note', fullMetadata)
    const { userNotes, metadata } = parseNotes(serialized)
    expect(userNotes).toBe('Round trip note')
    expect(metadata).toEqual(fullMetadata)
  })

  it('serializes all priority levels correctly', () => {
    const priorities = ['none', 'low', 'medium', 'high'] as const
    for (const priority of priorities) {
      const meta = { ...fullMetadata, priority }
      const { metadata } = parseNotes(serializeNotes('note', meta))
      expect(metadata.priority).toBe(priority)
    }
  })
})

describe('defaultMetadata', () => {
  it('returns the correct default shape', () => {
    expect(defaultMetadata()).toEqual({
      tags: [],
      priority: 'none',
      estimatedPomos: 0,
      completedPomos: 0,
      description: '',
    })
  })

  it('returns independent copies on each call', () => {
    const m1 = defaultMetadata()
    const m2 = defaultMetadata()
    m1.tags.push('mutated')
    expect(m2.tags).toEqual([])
  })
})
