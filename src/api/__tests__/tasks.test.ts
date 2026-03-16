import { describe, it, expect, beforeEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { createMockTask } from '../../test/mocks/data'
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  moveTask,
  completeTask,
  uncompleteTask,
  clearCompleted,
} from '../tasks'
import { ApiError } from '../../lib/api-client'
import useAppStore from '../../store/useAppStore'

const LIST_ID = 'list-1'
const TASK_ID = 'task-1'
const BASE = `https://tasks.googleapis.com/tasks/v1/lists/${LIST_ID}/tasks`

beforeEach(() => {
  useAppStore.setState({ auth: { token: 'test-token', user: null } })
})

describe('getTasks', () => {
  it('returns tasks for a list', async () => {
    const tasks = [
      createMockTask({ id: 't1', title: 'Buy milk' }),
      createMockTask({ id: 't2', title: 'Buy eggs' }),
    ]
    server.use(
      http.get(BASE, () => HttpResponse.json({ kind: 'tasks#tasks', items: tasks })),
    )

    const result = await getTasks(LIST_ID)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Buy milk')
    expect(result[1].title).toBe('Buy eggs')
  })

  it('returns empty array when items is absent', async () => {
    server.use(
      http.get(BASE, () => HttpResponse.json({ kind: 'tasks#tasks' })),
    )

    const result = await getTasks(LIST_ID)
    expect(result).toEqual([])
  })

  it('throws ApiError on failure', async () => {
    server.use(
      http.get(BASE, () =>
        HttpResponse.json(
          { error: { code: 401, message: 'Unauthorized', status: 'UNAUTHENTICATED' } },
          { status: 401 },
        ),
      ),
    )

    await expect(getTasks(LIST_ID)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('createTask', () => {
  it('posts the task and returns the created task', async () => {
    const created = createMockTask({ id: TASK_ID, title: 'New task' })
    let capturedBody: unknown
    server.use(
      http.post(BASE, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(created)
      }),
    )

    const result = await createTask(LIST_ID, { title: 'New task' })
    expect(result.id).toBe(TASK_ID)
    expect(result.title).toBe('New task')
    expect(capturedBody).toMatchObject({ title: 'New task' })
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

    await expect(createTask(LIST_ID, { title: 'Fail' })).rejects.toBeInstanceOf(ApiError)
  })
})

describe('updateTask', () => {
  it('patches the task and returns updated task', async () => {
    const updated = createMockTask({ id: TASK_ID, title: 'Updated title' })
    let capturedBody: unknown
    server.use(
      http.patch(`${BASE}/${TASK_ID}`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(updated)
      }),
    )

    const result = await updateTask(LIST_ID, TASK_ID, { title: 'Updated title' })
    expect(result.title).toBe('Updated title')
    expect(capturedBody).toMatchObject({ title: 'Updated title' })
  })

  it('throws ApiError on failure', async () => {
    server.use(
      http.patch(`${BASE}/${TASK_ID}`, () =>
        HttpResponse.json(
          { error: { code: 404, message: 'Not found', status: 'NOT_FOUND' } },
          { status: 404 },
        ),
      ),
    )

    await expect(updateTask(LIST_ID, TASK_ID, { title: 'X' })).rejects.toBeInstanceOf(ApiError)
  })
})

describe('deleteTask', () => {
  it('sends DELETE and resolves without a value', async () => {
    server.use(
      http.delete(`${BASE}/${TASK_ID}`, () => new HttpResponse(null, { status: 204 })),
    )

    await expect(deleteTask(LIST_ID, TASK_ID)).resolves.toBeUndefined()
  })

  it('throws ApiError on failure', async () => {
    server.use(
      http.delete(`${BASE}/${TASK_ID}`, () =>
        HttpResponse.json(
          { error: { code: 404, message: 'Not found', status: 'NOT_FOUND' } },
          { status: 404 },
        ),
      ),
    )

    await expect(deleteTask(LIST_ID, TASK_ID)).rejects.toBeInstanceOf(ApiError)
  })
})

describe('moveTask', () => {
  it('posts to move endpoint with no params', async () => {
    let capturedUrl = ''
    const moved = createMockTask({ id: TASK_ID })
    server.use(
      http.post(`${BASE}/${TASK_ID}/move`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(moved)
      }),
    )

    const result = await moveTask(LIST_ID, TASK_ID)
    expect(result.id).toBe(TASK_ID)
    expect(capturedUrl).not.toContain('?')
  })

  it('includes parent and previous query params when provided', async () => {
    let capturedUrl = ''
    server.use(
      http.post(`${BASE}/${TASK_ID}/move`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(createMockTask({ id: TASK_ID }))
      }),
    )

    await moveTask(LIST_ID, TASK_ID, 'parent-1', 'prev-1')
    expect(capturedUrl).toContain('parent=parent-1')
    expect(capturedUrl).toContain('previous=prev-1')
  })

  it('includes only parent when previousId is omitted', async () => {
    let capturedUrl = ''
    server.use(
      http.post(`${BASE}/${TASK_ID}/move`, ({ request }) => {
        capturedUrl = request.url
        return HttpResponse.json(createMockTask({ id: TASK_ID }))
      }),
    )

    await moveTask(LIST_ID, TASK_ID, 'parent-1')
    expect(capturedUrl).toContain('parent=parent-1')
    expect(capturedUrl).not.toContain('previous=')
  })
})

describe('completeTask', () => {
  it('patches status to completed', async () => {
    let capturedBody: unknown
    server.use(
      http.patch(`${BASE}/${TASK_ID}`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(createMockTask({ id: TASK_ID, status: 'completed' }))
      }),
    )

    const result = await completeTask(LIST_ID, TASK_ID)
    expect(result.status).toBe('completed')
    expect(capturedBody).toEqual({ status: 'completed' })
  })
})

describe('uncompleteTask', () => {
  it('patches status to needsAction', async () => {
    let capturedBody: unknown
    server.use(
      http.patch(`${BASE}/${TASK_ID}`, async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(createMockTask({ id: TASK_ID, status: 'needsAction' }))
      }),
    )

    const result = await uncompleteTask(LIST_ID, TASK_ID)
    expect(result.status).toBe('needsAction')
    expect(capturedBody).toEqual({ status: 'needsAction' })
  })
})

describe('clearCompleted', () => {
  it('posts to clear endpoint and resolves without a value', async () => {
    server.use(
      http.post(`${BASE}/clear`, () => new HttpResponse(null, { status: 204 })),
    )

    await expect(clearCompleted(LIST_ID)).resolves.toBeUndefined()
  })

  it('throws ApiError on failure', async () => {
    server.use(
      http.post(`${BASE}/clear`, () =>
        HttpResponse.json(
          { error: { code: 403, message: 'Forbidden', status: 'PERMISSION_DENIED' } },
          { status: 403 },
        ),
      ),
    )

    await expect(clearCompleted(LIST_ID)).rejects.toBeInstanceOf(ApiError)
  })
})
