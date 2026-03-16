import { useEffect } from 'react'
import useAppStore from '../store/useAppStore'

async function fetchGoogleUser(token: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  return res.json()
}

export function useAuthInit() {
  const token = useAppStore((s) => s.auth.token)
  const setUser = useAppStore((s) => s.setUser)

  useEffect(() => {
    if (!token) return
    fetchGoogleUser(token).then((user) => {
      if (user) setUser(user)
    })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps
}
