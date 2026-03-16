import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { createMockTask } from '../../test/mocks/data'
import { useTasks } from '../useTasks'
import useAppStore from '../../store/useAppStore'

const LIST_ID = 'list-1'
const BASE = `https://tasks.googleapis.com/tasks/v1/lists/${LIST_ID}/tasks`

beforeEach(() => {
  useAppStore.setState({
    taskLists: [],
    tasks: {},
    auth: { token: 'test-token', user: null },
    loading: { taskLists: false, tasks: {} },
  })
})

describe('useTasks', () => {
  it('fetches and stores tasks for a list on mount', async () => {
    const tasks = [
      createMockTask({ id: 't1', title: 'Buy milk' }),
      createMockTask({ id: 't2', title: 'Buy eggs' }),
    ]
    server.use(
      http.get(BASE, () => HttpResponse.json({ kind: 'tasks#tasks', items: tasks })),
    )

    const { result } = renderHook(() => useTasks(LIST_ID))

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasks[0].title).toBe('Buy milk')
    expect(useAppStore.getState().tasks[LIST_ID]).toHaveLength(2)
  })

  it('returns empty arrays when listId is null', () => {
    const { result } = renderHook(() => useTasks(null))
    expect(result.current.tasks).toEqual([])
    expect(result.current.loading).toBe(false)
  })

  it('sets loading true while fetching, false after', async () => {
    server.use(
      http.get(BASE, async () => {
        await new Promise((r) => setTimeout(r, 10))
        return HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      }),
    )

    const { result } = renderHook(() => useTasks(LIST_ID))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(useAppStore.getState().loading.tasks[LIST_ID]).toBe(false)
  })

  it('re-fetches when listId changes', async () => {
    const list2Base = 'https://tasks.googleapis.com/tasks/v1/lists/list-2/tasks'
    server.use(
      http.get(BASE, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [createMockTask({ title: 'List 1 task' })] }),
      ),
      http.get(list2Base, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [createMockTask({ title: 'List 2 task' }), createMockTask({ title: 'List 2 task 2' })] }),
      ),
    )

    const { result, rerender } = renderHook(({ id }) => useTasks(id), {
      initialProps: { id: LIST_ID as string | null },
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toHaveLength(1)

    rerender({ id: 'list-2' })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasks[0].title).toBe('List 2 task')
  })

  it('returns empty array when API returns no items', async () => {
    server.use(
      http.get(BASE, () => HttpResponse.json({ kind: 'tasks#tasks' })),
    )

    const { result } = renderHook(() => useTasks(LIST_ID))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.tasks).toEqual([])
  })
})
