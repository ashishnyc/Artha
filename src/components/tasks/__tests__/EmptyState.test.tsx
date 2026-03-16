import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import EmptyState from '../EmptyState'

describe('EmptyState', () => {
  it('renders the empty state container', () => {
    render(<EmptyState />)
    expect(screen.getByTestId('empty-state')).toBeInTheDocument()
  })

  it('shows "No tasks yet" heading', () => {
    render(<EmptyState />)
    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
  })

  it('shows the add task prompt', () => {
    render(<EmptyState />)
    expect(screen.getByText('Add a task below to get started')).toBeInTheDocument()
  })
})
