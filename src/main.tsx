import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { parseHashToken } from './lib/google-auth'
import useAppStore from './store/useAppStore'

const parsed = parseHashToken()
if (parsed) {
  useAppStore.getState().setToken(parsed.accessToken)
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
