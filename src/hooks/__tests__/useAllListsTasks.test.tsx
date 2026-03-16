import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { createMockTask, createMockTaskList } from '../../test/mocks/data'
import { useAllListsTasks } from '../useAllListsTasks'
import useAppStore from '../../store/useAppStore'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

beforeEach(() => {
  useAppStore.setState({
    taskLists: [],
    tasks: {},
    auth: { token: 'test-token', user: null },
    loading: { taskLists: false, tasks: {} },
  })
})

describe('useAllListsTasks', () => {
  it('returns empty arrays when no task lists', () => {
    const { result } = renderHook(() => useAllListsTasks())
    expect(result.current.tasks).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('fetches tasks for all lists and returns them enriched with listId and listTitle', async () => {
    const list1 = createMockTaskList({ id: 'l1', title: 'Work' })
    const list2 = createMockTaskList({ id: 'l2', title: 'Personal' })
    const task1 = createMockTask({ id: 't1', title: 'Work task' })
    const task2 = createMockTask({ id: 't2', title: 'Personal task' })

    useAppStore.setState({ taskLists: [list1, list2] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [task1] })
      ),
      http.get(`${TASKS_API}/lists/l2/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [task2] })
      ),
    )

    const { result } = renderHook(() => useAllListsTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.tasks).toHaveLength(2)
    const work = result.current.tasks.find((t) => t.id === 't1')
    expect(work?.listId).toBe('l1')
    expect(work?.listTitle).toBe('Work')
    const personal = result.current.tasks.find((t) => t.id === 't2')
    expect(personal?.listId).toBe('l2')
    expect(personal?.listTitle).toBe('Personal')
  })

  it('is loading while any list tasks are being fetched', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, async () => {
        await new Promise((r) => setTimeout(r, 20))
        return HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      }),
    )

    const { result } = renderHook(() => useAllListsTasks())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('skips lists whose tasks are already in the store', async () => {
    const list = createMockTaskList({ id: 'l1' })
    const existingTask = createMockTask({ id: 'existing' })
    useAppStore.setState({ taskLists: [list], tasks: { l1: [existingTask] } })

    let fetchCount = 0
    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () => {
        fetchCount++
        return HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      }),
    )

    const { result } = renderHook(() => useAllListsTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchCount).toBe(0)
    expect(result.current.tasks[0].id).toBe('existing')
  })

  it('returns empty array for a list with no items', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks' })
      ),
    )

    const { result } = renderHook(() => useAllListsTasks())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual([])
  })
})
