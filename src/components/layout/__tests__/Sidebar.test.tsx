import { describe, it, expect } from 'vitest'
import { render, screen } from '../../../test/test-utils'
import Sidebar from '../Sidebar'

describe('Sidebar', () => {
  it('renders the app name', () => {
    render(<Sidebar />)
    expect(screen.getByText('Artha')).toBeInTheDocument()
  })

  it('renders as an aside element', () => {
    render(<Sidebar />)
    expect(screen.getByTestId('sidebar').tagName).toBe('ASIDE')
  })
})
