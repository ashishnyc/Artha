import { http, HttpResponse } from 'msw'
import { createMockTask, createMockTaskList } from './data'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

export const handlers = [
  // Task Lists
  http.get(`${TASKS_API}/users/@me/lists`, () => {
    return HttpResponse.json({
      kind: 'tasks#taskLists',
      items: [createMockTaskList(), createMockTaskList({ id: 'list-2', title: 'Work' })],
    })
  }),

  http.post(`${TASKS_API}/users/@me/lists`, async ({ request }) => {
    const body = await request.json() as { title: string }
    return HttpResponse.json(createMockTaskList({ title: body.title }), { status: 200 })
  }),

  http.patch(`${TASKS_API}/users/@me/lists/:listId`, async ({ params, request }) => {
    const body = await request.json() as { title: string }
    return HttpResponse.json(createMockTaskList({ id: params.listId as string, title: body.title }))
  }),

  http.delete(`${TASKS_API}/users/@me/lists/:listId`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Tasks
  http.get(`${TASKS_API}/lists/:listId/tasks`, ({ params }) => {
    return HttpResponse.json({
      kind: 'tasks#tasks',
      items: [
        createMockTask({ listId: params.listId as string }),
        createMockTask({ id: 'task-2', title: 'Second task', listId: params.listId as string }),
      ],
    })
  }),

  http.post(`${TASKS_API}/lists/:listId/tasks`, async ({ params, request }) => {
    const body = await request.json() as Partial<{ title: string }>
    return HttpResponse.json(
      createMockTask({ listId: params.listId as string, title: body.title }),
      { status: 200 }
    )
  }),

  http.patch(`${TASKS_API}/lists/:listId/tasks/:taskId`, async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json(
      createMockTask({ id: params.taskId as string, listId: params.listId as string, ...body })
    )
  }),

  http.delete(`${TASKS_API}/lists/:listId/tasks/:taskId`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${TASKS_API}/lists/:listId/tasks/:taskId/move`, ({ params }) => {
    return HttpResponse.json(createMockTask({ id: params.taskId as string }))
  }),

  http.post(`${TASKS_API}/lists/:listId/clear`, () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Google user info
  http.get('https://www.googleapis.com/oauth2/v2/userinfo', () => {
    return HttpResponse.json({
      id: 'user-1',
      name: 'Test User',
      email: 'test@example.com',
      picture: 'https://example.com/avatar.jpg',
    })
  }),
]
