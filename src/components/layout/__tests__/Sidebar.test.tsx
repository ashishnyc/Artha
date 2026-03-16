import { describe, it, expect, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../../test/mocks/server'
import { createMockTaskList, createMockTask } from '../../../test/mocks/data'
import { render, resetStore } from '../../../test/test-utils'
import Sidebar from '../Sidebar'
import useAppStore from '../../../store/useAppStore'

const LISTS_URL = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists'

beforeEach(() => {
  resetStore()
  useAppStore.setState({ auth: { token: 'test-token', user: null } })
})

describe('Sidebar — static elements', () => {
  it('renders the app name', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))
    render(<Sidebar />)
    expect(screen.getByText('Artha')).toBeInTheDocument()
  })

  it('renders Inbox smart list link', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /inbox/i })).toHaveAttribute('href', '/inbox')
  })

  it('renders Today smart list link', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /today/i })).toHaveAttribute('href', '/today')
  })

  it('renders Upcoming smart list link', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /upcoming/i })).toHaveAttribute('href', '/upcoming')
  })

  it('renders Completed link at the bottom', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))
    render(<Sidebar />)
    expect(screen.getByRole('link', { name: /completed/i })).toHaveAttribute('href', '/completed')
  })
})

describe('Sidebar — task list nav links (AR-68)', () => {
  it('renders task list names as nav links after fetch', async () => {
    const lists = [
      createMockTaskList({ id: 'l1', title: 'Shopping' }),
      createMockTaskList({ id: 'l2', title: 'Work' }),
    ]
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: lists })))

    render(<Sidebar />)

    await waitFor(() => expect(screen.getByRole('link', { name: /shopping/i })).toBeInTheDocument())
    expect(screen.getByRole('link', { name: /work/i })).toHaveAttribute('href', '/list/l2')
  })

  it('shows count badge for lists with pending tasks', async () => {
    const list = createMockTaskList({ id: 'l1', title: 'Shopping' })
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [list] })))

    useAppStore.setState({
      tasks: {
        l1: [
          createMockTask({ status: 'needsAction' }),
          createMockTask({ status: 'needsAction' }),
          createMockTask({ status: 'completed' }),
        ],
      },
    })

    render(<Sidebar />)

    await waitFor(() => expect(screen.getByRole('link', { name: /shopping/i })).toBeInTheDocument())
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not show count badge when all tasks are completed', async () => {
    const list = createMockTaskList({ id: 'l1', title: 'Shopping' })
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [list] })))

    useAppStore.setState({
      tasks: { l1: [createMockTask({ status: 'completed' })] },
    })

    render(<Sidebar />)

    await waitFor(() => expect(screen.getByRole('link', { name: /shopping/i })).toBeInTheDocument())
    expect(screen.queryByText('1')).not.toBeInTheDocument()
  })
})

describe('Sidebar — active link highlighting (AR-73)', () => {
  it('highlights the active route link', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))

    render(<Sidebar />, { initialRoute: '/today' })

    const todayLink = screen.getByRole('link', { name: /today/i })
    expect(todayLink.className).toContain('bg-indigo-600')
  })

  it('does not highlight inactive links', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))

    render(<Sidebar />, { initialRoute: '/today' })

    const inboxLink = screen.getByRole('link', { name: /inbox/i })
    expect(inboxLink.className).not.toContain('bg-indigo-600')
  })
})

describe('Sidebar — New List button (AR-72)', () => {
  it('shows New List button by default', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))
    render(<Sidebar />)
    expect(screen.getByTestId('new-list-button')).toBeInTheDocument()
  })

  it('shows input when New List button is clicked', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))
    render(<Sidebar />)

    await userEvent.click(screen.getByTestId('new-list-button'))

    expect(screen.getByTestId('new-list-input')).toBeInTheDocument()
    expect(screen.queryByTestId('new-list-button')).not.toBeInTheDocument()
  })

  it('creates a list and adds it to sidebar on Enter', async () => {
    const lists = [createMockTaskList({ id: 'l1', title: 'Shopping' })]
    server.use(
      http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })),
      http.post(LISTS_URL, async ({ request }) => {
        const body = await request.json() as { title: string }
        return HttpResponse.json(createMockTaskList({ id: 'new-1', title: body.title }))
      }),
    )
    // Seed existing lists
    useAppStore.setState({ taskLists: lists })

    render(<Sidebar />)

    await userEvent.click(screen.getByTestId('new-list-button'))
    await userEvent.type(screen.getByTestId('new-list-input'), 'Groceries')
    await userEvent.keyboard('{Enter}')

    await waitFor(() =>
      expect(useAppStore.getState().taskLists.some(l => l.title === 'Groceries')).toBe(true)
    )
  })

  it('dismisses input on Escape without creating a list', async () => {
    server.use(http.get(LISTS_URL, () => HttpResponse.json({ kind: 'tasks#taskLists', items: [] })))
    render(<Sidebar />)

    await userEvent.click(screen.getByTestId('new-list-button'))
    await userEvent.keyboard('{Escape}')

    expect(screen.getByTestId('new-list-button')).toBeInTheDocument()
    expect(screen.queryByTestId('new-list-input')).not.toBeInTheDocument()
  })
})
