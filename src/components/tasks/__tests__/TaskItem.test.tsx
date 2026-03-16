import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createMockTask } from '../../../test/mocks/data'
import TaskItem from '../TaskItem'
import useAppStore from '../../../store/useAppStore'

const LIST_ID = 'list-1'
const TASKS_API = 'https://tasks.googleapis.com/tasks/v1'

beforeEach(() => {
  useAppStore.setState({
    taskLists: [],
    tasks: { [LIST_ID]: [] },
    auth: { token: 'test-token', user: null },
    loading: { taskLists: false, tasks: {} },
  })
})

describe('TaskItem', () => {
  it('renders task title', () => {
    const task = createMockTask({ title: 'Buy milk' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.getByTestId('task-title')).toHaveTextContent('Buy milk')
  })

  it('renders checkbox unchecked for pending task', () => {
    const task = createMockTask({ status: 'needsAction' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'false')
  })

  it('renders checkbox checked for completed task', () => {
    const task = createMockTask({ status: 'completed' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('applies line-through style for completed task title', () => {
    const task = createMockTask({ status: 'completed' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.getByTestId('task-title')).toHaveClass('line-through')
  })

  it('does not show due badge when task has no due date', () => {
    const task = createMockTask({ due: null })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.queryByTestId('due-badge')).not.toBeInTheDocument()
  })

  it('shows due badge when task has a due date', () => {
    const task = createMockTask({ due: '2030-06-15T00:00:00.000Z' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.getByTestId('due-badge')).toBeInTheDocument()
    expect(screen.getByTestId('due-badge')).toHaveTextContent('Jun 15')
  })

  it('shows overdue badge in red for past due pending task', () => {
    const task = createMockTask({ due: '2020-01-01T00:00:00.000Z', status: 'needsAction' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.getByTestId('due-badge')).toHaveClass('bg-red-100')
  })

  it('does not show overdue badge for completed task with past due date', () => {
    const task = createMockTask({ due: '2020-01-01T00:00:00.000Z', status: 'completed' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.getByTestId('due-badge')).not.toHaveClass('bg-red-100')
  })

  it('renders delete button', () => {
    const task = createMockTask()
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })
    render(<TaskItem task={task} listId={LIST_ID} />)
    expect(screen.getByRole('button', { name: 'Delete task' })).toBeInTheDocument()
  })

  it('optimistically marks task complete on checkbox click', async () => {
    const task = createMockTask({ id: 'task-1', status: 'needsAction' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })

    server.use(
      http.patch(`${TASKS_API}/lists/${LIST_ID}/tasks/${task.id}`, () =>
        HttpResponse.json({ ...task, status: 'completed' })
      ),
    )

    render(<TaskItem task={task} listId={LIST_ID} />)
    fireEvent.click(screen.getByRole('checkbox'))

    await waitFor(() =>
      expect(useAppStore.getState().tasks[LIST_ID][0].status).toBe('completed')
    )
  })

  it('reverts optimistic complete on API failure', async () => {
    const task = createMockTask({ id: 'task-1', status: 'needsAction' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })

    server.use(
      http.patch(`${TASKS_API}/lists/${LIST_ID}/tasks/${task.id}`, () =>
        HttpResponse.json({ error: 'fail' }, { status: 500 })
      ),
    )

    render(<TaskItem task={task} listId={LIST_ID} />)
    fireEvent.click(screen.getByRole('checkbox'))

    await waitFor(() =>
      expect(useAppStore.getState().tasks[LIST_ID][0].status).toBe('needsAction'),
      { timeout: 4000 }
    )
  })

  it('optimistically removes task on delete click', async () => {
    const task = createMockTask({ id: 'task-1' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })

    server.use(
      http.delete(`${TASKS_API}/lists/${LIST_ID}/tasks/${task.id}`, () =>
        new HttpResponse(null, { status: 204 })
      ),
    )

    render(<TaskItem task={task} listId={LIST_ID} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() =>
      expect(useAppStore.getState().tasks[LIST_ID]).toHaveLength(0)
    )
  })

  it('reverts optimistic delete on API failure', async () => {
    const task = createMockTask({ id: 'task-1' })
    useAppStore.setState({ tasks: { [LIST_ID]: [task] } })

    server.use(
      http.delete(`${TASKS_API}/lists/${LIST_ID}/tasks/${task.id}`, () =>
        HttpResponse.json({ error: 'fail' }, { status: 500 })
      ),
    )

    render(<TaskItem task={task} listId={LIST_ID} />)
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }))

    await waitFor(() =>
      expect(useAppStore.getState().tasks[LIST_ID]).toHaveLength(1),
      { timeout: 4000 }
    )
  })
})
