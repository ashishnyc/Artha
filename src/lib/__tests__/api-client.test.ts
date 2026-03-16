import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/mocks/server'
import { fetchWithAuth, ApiError } from '../api-client'
import useAppStore from '../../store/useAppStore'

const TEST_URL = 'https://tasks.googleapis.com/tasks/v1/users/@me/lists'

beforeEach(() => {
  useAppStore.setState({ auth: { token: null, user: null } })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('fetchWithAuth', () => {
  describe('Authorization header', () => {
    it('attaches Bearer token when store has a token', async () => {
      useAppStore.setState({ auth: { token: 'my-token', user: null } })

      let capturedAuth = ''
      server.use(
        http.get(TEST_URL, ({ request }) => {
          capturedAuth = request.headers.get('Authorization') ?? ''
          return HttpResponse.json({ items: [] })
        }),
      )

      await fetchWithAuth(TEST_URL)
      expect(capturedAuth).toBe('Bearer my-token')
    })

    it('sends no Authorization header when token is null', async () => {
      let capturedAuth: string | null = 'present'
      server.use(
        http.get(TEST_URL, ({ request }) => {
          capturedAuth = request.headers.get('Authorization')
          return HttpResponse.json({ items: [] })
        }),
      )

      await fetchWithAuth(TEST_URL)
      expect(capturedAuth).toBeNull()
    })

    it('sets Content-Type to application/json', async () => {
      let capturedContentType = ''
      server.use(
        http.get(TEST_URL, ({ request }) => {
          capturedContentType = request.headers.get('Content-Type') ?? ''
          return HttpResponse.json({ items: [] })
        }),
      )

      await fetchWithAuth(TEST_URL)
      expect(capturedContentType).toBe('application/json')
    })
  })

  describe('successful responses', () => {
    it('returns the response on 200', async () => {
      server.use(
        http.get(TEST_URL, () => HttpResponse.json({ items: ['a'] })),
      )

      const res = await fetchWithAuth(TEST_URL)
      expect(res.ok).toBe(true)
      const body = await res.json()
      expect(body.items).toEqual(['a'])
    })

    it('returns 204 responses without throwing', async () => {
      server.use(
        http.delete(TEST_URL, () => new HttpResponse(null, { status: 204 })),
      )

      const res = await fetchWithAuth(TEST_URL, { method: 'DELETE' })
      expect(res.status).toBe(204)
    })
  })

  describe('error handling', () => {
    it('throws ApiError on 401', async () => {
      server.use(
        http.get(TEST_URL, () =>
          HttpResponse.json(
            { error: { code: 401, message: 'Unauthorized', status: 'UNAUTHENTICATED' } },
            { status: 401 },
          ),
        ),
      )

      await expect(fetchWithAuth(TEST_URL)).rejects.toThrow(ApiError)
    })

    it('populates ApiError with status, code, and message', async () => {
      server.use(
        http.get(TEST_URL, () =>
          HttpResponse.json(
            { error: { code: 403, message: 'Forbidden', status: 'PERMISSION_DENIED' } },
            { status: 403 },
          ),
        ),
      )

      try {
        await fetchWithAuth(TEST_URL)
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError)
        const apiErr = err as ApiError
        expect(apiErr.status).toBe(403)
        expect(apiErr.code).toBe('PERMISSION_DENIED')
        expect(apiErr.message).toBe('Forbidden')
      }
    })

    it('handles non-JSON error bodies gracefully', async () => {
      server.use(
        http.get(TEST_URL, () => new HttpResponse('Bad Request', { status: 400 })),
      )

      await expect(fetchWithAuth(TEST_URL)).rejects.toBeInstanceOf(ApiError)
    })

    it('throws ApiError on 404', async () => {
      server.use(
        http.get(TEST_URL, () =>
          HttpResponse.json(
            { error: { code: 404, message: 'Not found', status: 'NOT_FOUND' } },
            { status: 404 },
          ),
        ),
      )

      try {
        await fetchWithAuth(TEST_URL)
      } catch (err) {
        const apiErr = err as ApiError
        expect(apiErr.status).toBe(404)
        expect(apiErr.code).toBe('NOT_FOUND')
      }
    })
  })

  describe('retry logic', () => {
    it('retries once on 500 and succeeds on second attempt', async () => {
      vi.useFakeTimers()
      let callCount = 0

      server.use(
        http.get(TEST_URL, () => {
          callCount++
          if (callCount === 1) {
            return HttpResponse.json(
              { error: { code: 500, message: 'Server error', status: 'INTERNAL' } },
              { status: 500 },
            )
          }
          return HttpResponse.json({ items: [] })
        }),
      )

      const promise = fetchWithAuth(TEST_URL)
      await vi.advanceTimersByTimeAsync(1000)
      const res = await promise

      expect(callCount).toBe(2)
      expect(res.ok).toBe(true)
    })

    it('throws ApiError after retry still fails on 500', async () => {
      vi.useFakeTimers()
      let callCount = 0

      server.use(
        http.get(TEST_URL, () => {
          callCount++
          return HttpResponse.json(
            { error: { code: 500, message: 'Server error', status: 'INTERNAL' } },
            { status: 500 },
          )
        }),
      )

      const promise = fetchWithAuth(TEST_URL)
      // Attach handler before advancing timers to prevent unhandled rejection
      const assertion = expect(promise).rejects.toBeInstanceOf(ApiError)
      await vi.advanceTimersByTimeAsync(1000)
      await assertion

      expect(callCount).toBe(2)
    })

    it('does not retry on 4xx errors', async () => {
      let callCount = 0

      server.use(
        http.get(TEST_URL, () => {
          callCount++
          return HttpResponse.json(
            { error: { code: 401, message: 'Unauthorized', status: 'UNAUTHENTICATED' } },
            { status: 401 },
          )
        }),
      )

      await expect(fetchWithAuth(TEST_URL)).rejects.toBeInstanceOf(ApiError)
      expect(callCount).toBe(1)
    })
  })
})

describe('ApiError', () => {
  it('has correct name, status, code, and message', () => {
    const err = new ApiError(404, 'NOT_FOUND', 'Resource not found')
    expect(err.name).toBe('ApiError')
    expect(err.status).toBe(404)
    expect(err.code).toBe('NOT_FOUND')
    expect(err.message).toBe('Resource not found')
    expect(err).toBeInstanceOf(Error)
  })
})
