import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { createMockTaskList } from '../../test/mocks/data'
import { useTaskLists } from '../useTaskLists'
import useAppStore from '../../store/useAppStore'

const BASE = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists'

beforeEach(() => {
  useAppStore.setState({
    taskLists: [],
    tasks: {},
    auth: { token: 'test-token', user: null },
    loading: { taskLists: false, tasks: {} },
  })
})

describe('useTaskLists', () => {
  it('fetches and stores task lists on mount', async () => {
    const lists = [
      createMockTaskList({ id: 'l1', title: 'Inbox' }),
      createMockTaskList({ id: 'l2', title: 'Work' }),
    ]
    server.use(
      http.get(BASE, () => HttpResponse.json({ kind: 'tasks#taskLists', items: lists })),
    )

    const { result } = renderHook(() => useTaskLists())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.taskLists).toHaveLength(2)
    expect(result.current.taskLists[0].title).toBe('Inbox')
    expect(result.current.taskLists[1].title).toBe('Work')
    expect(useAppStore.getState().taskLists).toHaveLength(2)
  })

  it('sets loading to true while fetching, false after', async () => {
    server.use(
      http.get(BASE, async () => {
        await new Promise((r) => setTimeout(r, 10))
        return HttpResponse.json({ kind: 'tasks#taskLists', items: [] })
      }),
    )

    const { result } = renderHook(() => useTaskLists())

    // Loading should start true immediately after mount
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it('returns empty array when API returns no items', async () => {
    server.use(
      http.get(BASE, () => HttpResponse.json({ kind: 'tasks#taskLists' })),
    )

    const { result } = renderHook(() => useTaskLists())

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.taskLists).toEqual([])
  })
})
