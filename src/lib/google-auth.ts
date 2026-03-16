const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
]

export function getAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID as string,
    redirect_uri: window.location.origin,
    response_type: 'token',
    scope: SCOPES.join(' '),
  })
  return `${GOOGLE_AUTH_URL}?${params.toString()}`
}

export interface HashToken {
  accessToken: string
  expiresIn: number
}

export function parseHashToken(hash: string = window.location.hash): HashToken | null {
  if (!hash) return null
  const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash)
  const accessToken = params.get('access_token')
  const expiresIn = params.get('expires_in')
  if (!accessToken) return null
  return { accessToken, expiresIn: expiresIn ? parseInt(expiresIn, 10) : 3600 }
}
