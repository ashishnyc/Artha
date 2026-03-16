import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { createMockTaskList } from '../../test/mocks/data'
import { getTaskLists, createTaskList, updateTaskList, deleteTaskList } from '../task-lists'
import { ApiError } from '../../lib/api-client'
import useAppStore from '../../store/useAppStore'

const BASE = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists'

beforeEach(() => {
  useAppStore.setState({ auth: { token: 'test-token', user: null } })
})

describe('getTaskLists', () => {
  it('returns list of task lists', async () => {
    const lists = [createMockTaskList({ id: 'l1', title: 'Inbox' }), createMockTaskList({ id: 'l2', title: 'Work' })]
    server.use(
      http.get(BASE, () => HttpResponse.json({ kind: 'tasks#taskLists', items: lists })),
    )

    const result = await getTaskLists()
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Inbox')
    expect(result[1].title).toBe('Work')
  })

  it('returns empty array when items is absent', async () => {
    server.use(
      http.get(BASE, () => HttpResponse.json({ kind: 'tasks#taskLists' })),
    )

    const result = await getTaskLists()
    expect(result).toEqual([])
  })

  it('throws ApiError on 401', async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json(
          { error: { code: 401, message: 'Unauthorized', status: 'UNAUTHENTICATED' } },
          { status: 401 },
        ),
      ),
    )

    await expect(getTaskLists()).rejects.toBeInstanceOf(ApiError)
  })
})

describe('createTaskList', () => {
  it('posts the title and returns the created list', async () => {
    const created = createMockTaskList({ id: 'new-1', title: 'Shopping' })
    let body: unknown
    server.use(
      http.post(BASE, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json(created)
      }),
    )

    const result = await createTaskList('Shopping')
    expect(result.id).toBe('new-1')
    expect(result.title).toBe('Shopping')
    expect(body).toEqual({ title: 'Shopping' })
  })

  it('throws ApiError on failure', async () => {
    server.use(
      http.post(BASE, () =>
        HttpResponse.json(
          { error: { code: 403, message: 'Forbidden', status: 'PERMISSION_DENIED' } },
          { status: 403 },
        ),
      ),
    )

    await expect(createTaskList('Fail')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('updateTaskList', () => {
  it('patches the list title and returns the updated list', async () => {
    const updated = createMockTaskList({ id: 'l1', title: 'Renamed' })
    let capturedBody: unknown
    server.use(
      http.patch(`${BASE}/l1`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(updated)
      }),
    )

    const result = await updateTaskList('l1', 'Renamed')
    expect(result.title).toBe('Renamed')
    expect(capturedBody).toEqual({ title: 'Renamed' })
  })

  it('throws ApiError on failure', async () => {
    server.use(
      http.patch(`${BASE}/bad-id`, () =>
        HttpResponse.json(
          { error: { code: 404, message: 'Not found', status: 'NOT_FOUND' } },
          { status: 404 },
        ),
      ),
    )

    await expect(updateTaskList('bad-id', 'X')).rejects.toBeInstanceOf(ApiError)
  })
})

describe('deleteTaskList', () => {
  it('sends DELETE and resolves without a value', async () => {
    server.use(
      http.delete(`${BASE}/l1`, () => new HttpResponse(null, { status: 204 })),
    )

    await expect(deleteTaskList('l1')).resolves.toBeUndefined()
  })

  it('throws ApiError on failure', async () => {
    server.use(
      http.delete(`${BASE}/bad-id`, () =>
        HttpResponse.json(
          { error: { code: 404, message: 'Not found', status: 'NOT_FOUND' } },
          { status: 404 },
        ),
      ),
    )

    await expect(deleteTaskList('bad-id')).rejects.toBeInstanceOf(ApiError)
  })
})
