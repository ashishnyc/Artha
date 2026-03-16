import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { createMockTask, createMockTaskList } from '../../test/mocks/data'
import TaskListPage from '../TaskListPage'
import useAppStore from '../../store/useAppStore'

const LIST_ID = 'list-abc'
const TASKS_API = `https://tasks.googleapis.com/tasks/v1/lists/${LIST_ID}/tasks`

function renderPage() {
  return render(
    <MemoryRouter initialEntries={[`/list/${LIST_ID}`]}>
      <Routes>
        <Route path="/list/:listId" element={<TaskListPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useAppStore.setState({
    taskLists: [createMockTaskList({ id: LIST_ID, title: 'My List' })],
    tasks: {},
    auth: { token: 'test-token', user: null },
    loading: { taskLists: false, tasks: {} },
  })
})

describe('TaskListPage', () => {
  it('shows loading state while fetching', () => {
    server.use(
      http.get(TASKS_API, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      }),
    )
    renderPage()
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('shows the list title from store', async () => {
    server.use(
      http.get(TASKS_API, () => HttpResponse.json({ kind: 'tasks#tasks', items: [] })),
    )
    renderPage()
    await waitFor(() => expect(screen.queryByTestId('loading')).not.toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('My List')
  })

  it('shows empty state when no tasks', async () => {
    server.use(
      http.get(TASKS_API, () => HttpResponse.json({ kind: 'tasks#tasks', items: [] })),
    )
    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
  })

  it('shows pending tasks list', async () => {
    const tasks = [
      createMockTask({ id: 't1', title: 'Task A', status: 'needsAction' }),
      createMockTask({ id: 't2', title: 'Task B', status: 'needsAction' }),
    ]
    server.use(
      http.get(TASKS_API, () => HttpResponse.json({ kind: 'tasks#tasks', items: tasks })),
    )
    renderPage()
    await waitFor(() => expect(screen.getByTestId('pending-tasks')).toBeInTheDocument())
    expect(screen.getAllByTestId('task-item')).toHaveLength(2)
    expect(screen.getByText('Task A')).toBeInTheDocument()
    expect(screen.getByText('Task B')).toBeInTheDocument()
  })

  it('does not show completed section when no completed tasks', async () => {
    const tasks = [createMockTask({ status: 'needsAction' })]
    server.use(
      http.get(TASKS_API, () => HttpResponse.json({ kind: 'tasks#tasks', items: tasks })),
    )
    renderPage()
    await waitFor(() => expect(screen.getByTestId('pending-tasks')).toBeInTheDocument())
    expect(screen.queryByTestId('completed-section')).not.toBeInTheDocument()
  })

  it('shows collapsed completed section when completed tasks exist', async () => {
    const tasks = [
      createMockTask({ id: 't1', status: 'needsAction', title: 'Pending' }),
      createMockTask({ id: 't2', status: 'completed', title: 'Done Task' }),
    ]
    server.use(
      http.get(TASKS_API, () => HttpResponse.json({ kind: 'tasks#tasks', items: tasks })),
    )
    renderPage()
    await waitFor(() => expect(screen.getByTestId('completed-section')).toBeInTheDocument())
    expect(screen.queryByTestId('completed-tasks')).not.toBeInTheDocument()
    expect(screen.getByTestId('completed-toggle')).toHaveTextContent('Completed (1)')
  })

  it('expands completed section on toggle click', async () => {
    const tasks = [
      createMockTask({ id: 't1', status: 'completed', title: 'Done Task' }),
    ]
    server.use(
      http.get(TASKS_API, () => HttpResponse.json({ kind: 'tasks#tasks', items: tasks })),
    )
    renderPage()
    await waitFor(() => expect(screen.getByTestId('completed-section')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('completed-toggle'))
    expect(screen.getByTestId('completed-tasks')).toBeInTheDocument()
    expect(screen.getByText('Done Task')).toBeInTheDocument()
  })

  it('collapses completed section on second toggle click', async () => {
    const tasks = [createMockTask({ id: 't1', status: 'completed', title: 'Done Task' })]
    server.use(
      http.get(TASKS_API, () => HttpResponse.json({ kind: 'tasks#tasks', items: tasks })),
    )
    renderPage()
    await waitFor(() => expect(screen.getByTestId('completed-section')).toBeInTheDocument())

    fireEvent.click(screen.getByTestId('completed-toggle'))
    expect(screen.getByTestId('completed-tasks')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('completed-toggle'))
    expect(screen.queryByTestId('completed-tasks')).not.toBeInTheDocument()
  })
})
