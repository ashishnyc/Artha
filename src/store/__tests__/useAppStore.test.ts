import { describe, it, expect, beforeEach } from 'vitest'
import { createMockTask, createMockTaskList } from '../../test/mocks/data'
import useAppStore from '../useAppStore'

beforeEach(() => {
  useAppStore.setState({
    taskLists: [],
    tasks: {},
    auth: { token: null, user: null },
    loading: { taskLists: false, tasks: {} },
  })
})

describe('task slice', () => {
  it('setTaskLists replaces the task lists', () => {
    const lists = [createMockTaskList({ id: 'l1' }), createMockTaskList({ id: 'l2' })]
    useAppStore.getState().setTaskLists(lists)
    expect(useAppStore.getState().taskLists).toHaveLength(2)
    expect(useAppStore.getState().taskLists[0].id).toBe('l1')
  })

  it('setTasks stores tasks under the correct listId', () => {
    const tasks = [createMockTask({ id: 't1' }), createMockTask({ id: 't2' })]
    useAppStore.getState().setTasks('list-1', tasks)
    expect(useAppStore.getState().tasks['list-1']).toHaveLength(2)
    expect(useAppStore.getState().tasks['list-2']).toBeUndefined()
  })

  it('setTasks does not overwrite other lists', () => {
    const tasksA = [createMockTask({ id: 'a1' })]
    const tasksB = [createMockTask({ id: 'b1' }), createMockTask({ id: 'b2' })]
    useAppStore.getState().setTasks('list-a', tasksA)
    useAppStore.getState().setTasks('list-b', tasksB)
    expect(useAppStore.getState().tasks['list-a']).toHaveLength(1)
    expect(useAppStore.getState().tasks['list-b']).toHaveLength(2)
  })

  it('setTaskListsLoading sets loading.taskLists', () => {
    useAppStore.getState().setTaskListsLoading(true)
    expect(useAppStore.getState().loading.taskLists).toBe(true)
    useAppStore.getState().setTaskListsLoading(false)
    expect(useAppStore.getState().loading.taskLists).toBe(false)
  })

  it('setTasksLoading sets loading.tasks per listId', () => {
    useAppStore.getState().setTasksLoading('list-1', true)
    expect(useAppStore.getState().loading.tasks['list-1']).toBe(true)
    expect(useAppStore.getState().loading.tasks['list-2']).toBeUndefined()
    useAppStore.getState().setTasksLoading('list-1', false)
    expect(useAppStore.getState().loading.tasks['list-1']).toBe(false)
  })

  it('setTasksLoading does not overwrite other list loading states', () => {
    useAppStore.getState().setTasksLoading('list-1', true)
    useAppStore.getState().setTasksLoading('list-2', true)
    useAppStore.getState().setTasksLoading('list-1', false)
    expect(useAppStore.getState().loading.tasks['list-2']).toBe(true)
  })
})
