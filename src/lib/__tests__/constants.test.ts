import { describe, it, expect } from 'vitest'
import {
  GOOGLE_TASKS_API_BASE,
  GOOGLE_USERINFO_URL,
  GOOGLE_AUTH_URL,
  GOOGLE_OAUTH_SCOPES,
  TASK_STATUS,
  PRIORITY_LEVELS,
} from '../constants'

describe('constants', () => {
  it('GOOGLE_TASKS_API_BASE points to tasks API v1', () => {
    expect(GOOGLE_TASKS_API_BASE).toBe('https://tasks.googleapis.com/tasks/v1')
  })

  it('GOOGLE_USERINFO_URL points to userinfo endpoint', () => {
    expect(GOOGLE_USERINFO_URL).toBe('https://www.googleapis.com/oauth2/v2/userinfo')
  })

  it('GOOGLE_AUTH_URL points to OAuth endpoint', () => {
    expect(GOOGLE_AUTH_URL).toContain('accounts.google.com')
  })

  it('GOOGLE_OAUTH_SCOPES includes tasks and profile scopes', () => {
    expect(GOOGLE_OAUTH_SCOPES).toContain('https://www.googleapis.com/auth/tasks')
    expect(GOOGLE_OAUTH_SCOPES).toContain('https://www.googleapis.com/auth/userinfo.profile')
    expect(GOOGLE_OAUTH_SCOPES).toContain('https://www.googleapis.com/auth/userinfo.email')
    expect(GOOGLE_OAUTH_SCOPES.length).toBe(3)
  })

  it('TASK_STATUS has correct values', () => {
    expect(TASK_STATUS.NEEDS_ACTION).toBe('needsAction')
    expect(TASK_STATUS.COMPLETED).toBe('completed')
  })

  it('PRIORITY_LEVELS has all four levels in order', () => {
    expect(PRIORITY_LEVELS).toEqual(['none', 'low', 'medium', 'high'])
  })
})
