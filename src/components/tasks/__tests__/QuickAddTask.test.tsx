import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '../../../test/test-utils'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createMockTask } from '../../../test/mocks/data'
import QuickAddTask from '../QuickAddTask'
import useAppStore from '../../../store/useAppStore'

const LIST_ID = 'list-1'
const TASKS_API = `https://tasks.googleapis.com/tasks/v1/lists/${LIST_ID}/tasks`

beforeEach(() => {
  useAppStore.setState({
    taskLists: [],
    tasks: { [LIST_ID]: [] },
    auth: { token: 'test-token', user: null },
    loading: { taskLists: false, tasks: {} },
  })
})

describe('QuickAddTask', () => {
  it('renders the input bar', () => {
    render(<QuickAddTask listId={LIST_ID} />)
    expect(screen.getByTestId('quick-add-task')).toBeInTheDocument()
    expect(screen.getByTestId('quick-add-input')).toBeInTheDocument()
  })

  it('shows placeholder text', () => {
    render(<QuickAddTask listId={LIST_ID} />)
    expect(screen.getByPlaceholderText(/Add a task/i)).toBeInTheDocument()
  })

  it('Add button is disabled when input is empty', () => {
    render(<QuickAddTask listId={LIST_ID} />)
    expect(screen.getByTestId('quick-add-submit')).toBeDisabled()
  })

  it('Add button is enabled when input has text', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    await userEvent.type(screen.getByTestId('quick-add-input'), 'Buy milk')
    expect(screen.getByTestId('quick-add-submit')).not.toBeDisabled()
  })

  it('optimistically adds task on Enter', async () => {
    const newTask = createMockTask({ id: 'new-1', title: 'Buy milk' })
    server.use(
      http.post(TASKS_API, () => HttpResponse.json(newTask)),
    )

    render(<QuickAddTask listId={LIST_ID} />)
    await userEvent.type(screen.getByTestId('quick-add-input'), 'Buy milk{Enter}')

    await waitFor(() =>
      expect(useAppStore.getState().tasks[LIST_ID].some((t) => t.title === 'Buy milk')).toBe(true)
    )
  })

  it('clears input after submitting', async () => {
    const newTask = createMockTask({ id: 'new-1', title: 'Buy milk' })
    server.use(
      http.post(TASKS_API, () => HttpResponse.json(newTask)),
    )

    render(<QuickAddTask listId={LIST_ID} />)
    const input = screen.getByTestId('quick-add-input')
    await userEvent.type(input, 'Buy milk{Enter}')

    await waitFor(() => expect(input).toHaveValue(''))
  })

  it('submits on Add button click', async () => {
    const newTask = createMockTask({ id: 'new-1', title: 'Task via button' })
    server.use(
      http.post(TASKS_API, () => HttpResponse.json(newTask)),
    )

    render(<QuickAddTask listId={LIST_ID} />)
    await userEvent.type(screen.getByTestId('quick-add-input'), 'Task via button')
    fireEvent.click(screen.getByTestId('quick-add-submit'))

    await waitFor(() =>
      expect(useAppStore.getState().tasks[LIST_ID].some((t) => t.title === 'Task via button')).toBe(true)
    )
  })

  it('reverts optimistic add on API failure', async () => {
    server.use(
      http.post(TASKS_API, () => HttpResponse.json({ error: 'fail' }, { status: 500 })),
    )

    render(<QuickAddTask listId={LIST_ID} />)
    await userEvent.type(screen.getByTestId('quick-add-input'), 'Fail task{Enter}')

    await waitFor(
      () => expect(useAppStore.getState().tasks[LIST_ID]).toHaveLength(0),
      { timeout: 4000 }
    )
  })

  it('shows date picker button', () => {
    render(<QuickAddTask listId={LIST_ID} />)
    expect(screen.getByTestId('date-picker-button')).toBeInTheDocument()
  })

  it('opens date picker popover on button click', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    fireEvent.click(screen.getByTestId('date-picker-button'))
    expect(screen.getByTestId('date-picker-popover')).toBeInTheDocument()
  })

  it('closes date picker and shows selected date label', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    fireEvent.click(screen.getByTestId('date-picker-button'))
    fireEvent.change(screen.getByTestId('date-input'), { target: { value: '2030-06-15' } })
    expect(screen.queryByTestId('date-picker-popover')).not.toBeInTheDocument()
    expect(screen.getByTestId('date-picker-button')).toHaveTextContent('Jun 15')
  })

  it('shows priority button', () => {
    render(<QuickAddTask listId={LIST_ID} />)
    expect(screen.getByTestId('priority-button')).toBeInTheDocument()
  })

  it('opens priority popover on button click', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    fireEvent.click(screen.getByTestId('priority-button'))
    expect(screen.getByTestId('priority-popover')).toBeInTheDocument()
  })

  it('selects priority and closes popover', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    fireEvent.click(screen.getByTestId('priority-button'))
    fireEvent.click(screen.getByTestId('priority-option-high'))
    expect(screen.queryByTestId('priority-popover')).not.toBeInTheDocument()
  })

  it('only one picker open at a time', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    fireEvent.click(screen.getByTestId('date-picker-button'))
    expect(screen.getByTestId('date-picker-popover')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('priority-button'))
    expect(screen.queryByTestId('date-picker-popover')).not.toBeInTheDocument()
    expect(screen.getByTestId('priority-popover')).toBeInTheDocument()
  })

  it('focuses input on Ctrl+N', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    const input = screen.getByTestId('quick-add-input')
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true })
    expect(document.activeElement).toBe(input)
  })

  it('focuses input on Cmd+N', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    const input = screen.getByTestId('quick-add-input')
    fireEvent.keyDown(window, { key: 'n', metaKey: true })
    expect(document.activeElement).toBe(input)
  })

  it('does not submit when title is whitespace only', async () => {
    render(<QuickAddTask listId={LIST_ID} />)
    await userEvent.type(screen.getByTestId('quick-add-input'), '   {Enter}')
    expect(useAppStore.getState().tasks[LIST_ID]).toHaveLength(0)
  })
})
