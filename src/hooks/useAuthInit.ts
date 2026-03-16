import { useEffect } from 'react'
import { parseHashToken } from '../lib/google-auth'
import useAppStore from '../store/useAppStore'

async function fetchGoogleUser(token: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export function useAuthInit() {
  const setToken = useAppStore((s) => s.setToken)
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    const parsed = parseHashToken()
    if (!parsed) return

    setToken(parsed.accessToken)
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    fetchGoogleUser(parsed.accessToken).then((user) => {
      if (user) setUser(user)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
}
