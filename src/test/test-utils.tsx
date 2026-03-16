import { render, RenderOptions } from '@testing-library/react'
import { ReactElement } from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import useAppStore from '../store/useAppStore'

interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string
}

export function renderWithProviders(
  ui: ReactElement,
  { initialRoute = '/', ...renderOptions }: RenderWithProvidersOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="*" element={children} />
        </Routes>
      </MemoryRouter>
    )
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export function resetStore() {
  useAppStore.setState({ taskLists: [], tasks: {}, auth: { token: null, user: null } })
}

export * from '@testing-library/react'
export { renderWithProviders as render }
