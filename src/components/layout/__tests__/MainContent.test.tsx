import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { render } from '../../../test/test-utils'
import MainContent from '../MainContent'

describe('MainContent', () => {
  it('renders the main content area', () => {
    render(<MainContent />)
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
  })

  it('renders as a main element', () => {
    render(<MainContent />)
    expect(screen.getByTestId('main-content').tagName).toBe('MAIN')
  })

  it('renders outlet content', () => {
    render(<MainContent />, { initialRoute: '/inbox' })
    expect(screen.getByTestId('main-content')).toBeInTheDocument()
  })
})
