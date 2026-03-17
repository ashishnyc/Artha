import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { parseHashToken } from './lib/google-auth'
import useAppStore from './store/useAppStore'

// Apply saved theme before first render to avoid flash
;(function () {
  const t = localStorage.getItem('artha-theme') ?? 'system'
  const dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  if (dark) document.documentElement.classList.add('dark')
})()

const parsed = parseHashToken()
if (parsed) {
  useAppStore.getState().setToken(parsed.accessToken)
  window.history.replaceState(null, '', window.location.pathname + window.location.search)
} else {
  const saved = localStorage.getItem('artha-token')
  if (saved) useAppStore.getState().setToken(saved)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
