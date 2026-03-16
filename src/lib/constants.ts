export const GOOGLE_TASKS_API_BASE = 'https://tasks.googleapis.com/tasks/v1'

export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

export const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/tasks',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
]

export const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

export const VITE_CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY as string

export const OAUTH_REDIRECT_URI = typeof window !== 'undefined'
  ? window.location.origin
  : ''

export const TASK_STATUS = {
  NEEDS_ACTION: 'needsAction',
  COMPLETED: 'completed',
} as const

export const PRIORITY_LEVELS = ['none', 'low', 'medium', 'high'] as const
