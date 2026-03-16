import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import AppShell from '../AppShell'

describe('AppShell', () => {
  it('renders the shell container', () => {
    render(<AppShell />)
    expect(screen.getByTestId('app-shell')).toBeInTheDocument()
  })

  it('renders the sidebar', () => {
    render(<AppShell />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  it('renders the main content area', () => {
    render(<AppShell />)
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
  })

  it('sidebar appears before main content in the DOM', () => {
    render(<AppShell />)
    const shell = screen.getByTestId('app-shell')
    const children = Array.from(shell.children)
    const sidebarIndex = children.findIndex(el => el.getAttribute('data-testid') === 'sidebar')
    const mainIndex = children.findIndex(el => el.getAttribute('data-testid') === 'main-content')
    expect(sidebarIndex).toBeLessThan(mainIndex)
  })
})
