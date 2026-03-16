import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { createMockTask, createMockTaskList } from '../../test/mocks/data'
import TodayPage from '../TodayPage'
import useAppStore from '../../store/useAppStore'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

// Build dates that reliably pass date-fns isToday/isPast checks in any local timezone
function laterToday(): string {
  const d = new Date()
  d.setHours(23, 55, 0, 0)
  return d.toISOString()
}
function yesterdayNoon(): string {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}
function tomorrowNoon(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(12, 0, 0, 0)
  return d.toISOString()
}

const todayISO = laterToday()
const yesterdayISO = yesterdayNoon()
const tomorrowISO = tomorrowNoon()

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/today']}>
      <Routes>
        <Route path="/today" element={<TodayPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  useAppStore.setState({
    taskLists: [],
    tasks: {},
    auth: { token: 'test-token', user: null },
    loading: { taskLists: false, tasks: {} },
  })
})

describe('TodayPage', () => {
  it('renders the page heading', async () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Today')
  })

  it('shows empty state when no tasks due today', async () => {
    const list = createMockTaskList({ id: 'l1', title: 'Work' })
    useAppStore.setState({ taskLists: [list] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      ),
    )

    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    expect(screen.getByText('No tasks due today')).toBeInTheDocument()
  })

  it('shows loading while fetching', () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, async () => {
        await new Promise((r) => setTimeout(r, 100))
        return HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      }),
    )

    renderPage()
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('shows today tasks grouped by list', async () => {
    const list1 = createMockTaskList({ id: 'l1', title: 'Work' })
    const list2 = createMockTaskList({ id: 'l2', title: 'Personal' })
    useAppStore.setState({ taskLists: [list1, list2] })

    const task1 = createMockTask({ id: 't1', title: 'Work task today', due: todayISO })
    const task2 = createMockTask({ id: 't2', title: 'Personal task today', due: todayISO })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [task1] })
      ),
      http.get(`${TASKS_API}/lists/l2/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [task2] })
      ),
    )

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Work task today')).toBeInTheDocument()
      expect(screen.getByText('Personal task today')).toBeInTheDocument()
      const headers = screen.getAllByTestId('list-section-header')
      expect(headers.map((h) => h.textContent)).toContain('Work')
      expect(headers.map((h) => h.textContent)).toContain('Personal')
    })
  })

  it('shows overdue section with red styling', async () => {
    const list = createMockTaskList({ id: 'l1', title: 'Work' })
    useAppStore.setState({ taskLists: [list] })

    const overdueTask = createMockTask({
      id: 'ot1',
      title: 'Overdue task',
      due: yesterdayISO,
      status: 'needsAction',
    })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [overdueTask] })
      ),
    )

    renderPage()
    await waitFor(() => expect(screen.getByTestId('overdue-section')).toBeInTheDocument())
    expect(screen.getByText('Overdue task')).toBeInTheDocument()
    expect(screen.getByTestId('overdue-section')).toHaveClass('bg-red-50')
  })

  it('overdue count is shown in section heading', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    const overdue1 = createMockTask({ due: yesterdayISO, status: 'needsAction' })
    const overdue2 = createMockTask({ due: yesterdayISO, status: 'needsAction' })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [overdue1, overdue2] })
      ),
    )

    renderPage()
    await waitFor(() => expect(screen.getByTestId('overdue-section')).toBeInTheDocument())
    expect(screen.getByTestId('overdue-section')).toHaveTextContent('Overdue (2)')
  })

  it('does not show overdue section for completed tasks', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    const completedOld = createMockTask({ due: yesterdayISO, status: 'completed' })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [completedOld] })
      ),
    )

    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    expect(screen.queryByTestId('overdue-section')).not.toBeInTheDocument()
  })

  it('does not show future tasks in today or overdue', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    const futureTask = createMockTask({ due: tomorrowISO, status: 'needsAction' })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [futureTask] })
      ),
    )

    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
  })

  it('overdue appears before today tasks', async () => {
    const list = createMockTaskList({ id: 'l1', title: 'Work' })
    useAppStore.setState({ taskLists: [list] })

    const overdueTask = createMockTask({ id: 'ot1', title: 'Overdue', due: yesterdayISO })
    const todayTask = createMockTask({ id: 'tt1', title: 'Today task', due: todayISO })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [overdueTask, todayTask] })
      ),
    )

    renderPage()
    await waitFor(() => expect(screen.getByTestId('overdue-section')).toBeInTheDocument())
    expect(screen.getByTestId('overdue-tasks')).toBeInTheDocument()
    expect(screen.getByTestId('today-tasks')).toBeInTheDocument()

    const page = screen.getByTestId('today-page')
    const overdueSection = screen.getByTestId('overdue-section')
    const todaySection = screen.getByTestId('today-tasks').closest('section')!
    expect(page.compareDocumentPosition(overdueSection) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(overdueSection.compareDocumentPosition(todaySection!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
