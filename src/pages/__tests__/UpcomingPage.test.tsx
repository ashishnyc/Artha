import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { addDays, format, startOfDay } from 'date-fns'
import { server } from '../../test/mocks/server'
import { createMockTask, createMockTaskList } from '../../test/mocks/data'
import UpcomingPage from '../UpcomingPage'
import useAppStore from '../../store/useAppStore'

const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

// Build ISO dates relative to today in local time to avoid UTC-offset issues
function tomorrowISO(): string {
  const d = addDays(startOfDay(new Date()), 1)
  return d.toISOString()
}

function inNDaysISO(n: number): string {
  const d = addDays(startOfDay(new Date()), n)
  return d.toISOString()
}

function tomorrowDateStr(): string {
  return format(addDays(startOfDay(new Date()), 1), 'yyyy-MM-dd')
}

function inNDaysDateStr(n: number): string {
  return format(addDays(startOfDay(new Date()), n), 'yyyy-MM-dd')
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/upcoming']}>
      <Routes>
        <Route path="/upcoming" element={<UpcomingPage />} />
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

describe('UpcomingPage', () => {
  it('renders the page heading', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Upcoming')
  })

  it('shows empty state when no tasks in next 7 days', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      ),
    )

    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    expect(screen.getByText('No tasks scheduled for the next 7 days')).toBeInTheDocument()
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

  it('renders 7 day sections', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      ),
    )

    renderPage()
    await waitFor(() => {
      const sections = screen.getAllByTestId(/^day-section-/)
      expect(sections).toHaveLength(7)
    })
  })

  it('labels first day as "Tomorrow"', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      ),
    )

    renderPage()
    await waitFor(() => {
      const headers = screen.getAllByTestId('day-header')
      expect(headers[0]).toHaveTextContent('Tomorrow')
    })
  })

  it('shows a task in the correct day section', async () => {
    const list = createMockTaskList({ id: 'l1', title: 'Work' })
    useAppStore.setState({ taskLists: [list] })

    const task = createMockTask({ id: 't1', title: 'Future task', due: tomorrowISO() })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [task] })
      ),
    )

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Future task')).toBeInTheDocument()
    })

    const dayKey = tomorrowDateStr()
    const section = screen.getByTestId(`day-section-${dayKey}`)
    expect(section).toHaveTextContent('Future task')
  })

  it('shows task count in day header', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    const task1 = createMockTask({ due: tomorrowISO() })
    const task2 = createMockTask({ due: tomorrowISO() })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [task1, task2] })
      ),
    )

    renderPage()
    await waitFor(() => {
      const counts = screen.getAllByTestId('day-task-count')
      expect(counts[0]).toHaveTextContent('2 tasks')
    })
  })

  it('shows "1 task" (singular) when only one task', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    const task = createMockTask({ due: tomorrowISO() })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [task] })
      ),
    )

    renderPage()
    await waitFor(() => {
      const counts = screen.getAllByTestId('day-task-count')
      expect(counts[0]).toHaveTextContent('1 task')
    })
  })

  it('does not show completed tasks', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    const completed = createMockTask({ due: tomorrowISO(), status: 'completed', title: 'Done task' })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [completed] })
      ),
    )

    renderPage()
    await waitFor(() => expect(screen.getByTestId('empty-state')).toBeInTheDocument())
    expect(screen.queryByText('Done task')).not.toBeInTheDocument()
  })

  it('tasks in multiple days appear in correct sections', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    const task1 = createMockTask({ id: 't1', title: 'Day 1 task', due: tomorrowISO() })
    const task3 = createMockTask({ id: 't3', title: 'Day 3 task', due: inNDaysISO(3) })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [task1, task3] })
      ),
    )

    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Day 1 task')).toBeInTheDocument()
      expect(screen.getByText('Day 3 task')).toBeInTheDocument()
    })

    const section1 = screen.getByTestId(`day-section-${tomorrowDateStr()}`)
    expect(section1).toHaveTextContent('Day 1 task')
    expect(section1).not.toHaveTextContent('Day 3 task')

    const section3 = screen.getByTestId(`day-section-${inNDaysDateStr(3)}`)
    expect(section3).toHaveTextContent('Day 3 task')
    expect(section3).not.toHaveTextContent('Day 1 task')
  })

  it('shows inline add form for each day', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      ),
    )

    renderPage()
    await waitFor(() => {
      const dayKey = tomorrowDateStr()
      expect(screen.getByTestId(`day-add-form-${dayKey}`)).toBeInTheDocument()
      expect(screen.getByTestId(`day-add-input-${dayKey}`)).toBeInTheDocument()
    })
  })

  it('can add a task to a specific day', async () => {
    const list = createMockTaskList({ id: 'l1' })
    useAppStore.setState({ taskLists: [list] })

    const createdTask = createMockTask({ id: 'new-t1', title: 'New upcoming task', due: tomorrowISO() })

    server.use(
      http.get(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json({ kind: 'tasks#tasks', items: [] })
      ),
      http.post(`${TASKS_API}/lists/l1/tasks`, () =>
        HttpResponse.json(createdTask)
      ),
    )

    renderPage()
    const dayKey = tomorrowDateStr()

    await waitFor(() => expect(screen.getByTestId(`day-add-input-${dayKey}`)).toBeInTheDocument())

    const input = screen.getByTestId(`day-add-input-${dayKey}`)
    fireEvent.change(input, { target: { value: 'New upcoming task' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => expect(screen.getByText('New upcoming task')).toBeInTheDocument())
  })
})
