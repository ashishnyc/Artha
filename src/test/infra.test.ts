import { describe, it, expect } from 'vitest'
import { createMockTask, createMockTaskList, createMockUser } from './mocks/data'

describe('Testing infrastructure', () => {
  describe('createMockTask', () => {
    it('returns a task with default values', () => {
      const task = createMockTask()
      expect(task.id).toBeDefined()
      expect(task.title).toBe('Test task')
      expect(task.status).toBe('needsAction')
      expect(task.due).toBeNull()
      expect(task.parent).toBeNull()
      expect(task.metadata.priority).toBe('none')
      expect(task.metadata.tags).toEqual([])
    })

    it('applies overrides', () => {
      const task = createMockTask({ title: 'Custom task', status: 'completed' })
      expect(task.title).toBe('Custom task')
      expect(task.status).toBe('completed')
    })

    it('generates unique ids', () => {
      const t1 = createMockTask()
      const t2 = createMockTask()
      expect(t1.id).not.toBe(t2.id)
    })
  })

  describe('createMockTaskList', () => {
    it('returns a task list with default values', () => {
      const list = createMockTaskList()
      expect(list.id).toBeDefined()
      expect(list.title).toBe('My Tasks')
    })

    it('applies overrides', () => {
      const list = createMockTaskList({ title: 'Work' })
      expect(list.title).toBe('Work')
    })
  })

  describe('createMockUser', () => {
    it('returns a user with default values', () => {
      const user = createMockUser()
      expect(user.id).toBeDefined()
      expect(user.name).toBe('Test User')
      expect(user.email).toBe('test@example.com')
      expect(user.picture).toContain('http')
    })

    it('applies overrides', () => {
      const user = createMockUser({ name: 'Jane Doe', email: 'jane@example.com' })
      expect(user.name).toBe('Jane Doe')
      expect(user.email).toBe('jane@example.com')
    })
  })
})
