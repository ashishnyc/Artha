import useAppStore from '../store/useAppStore'

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface GoogleErrorBody {
  error?: {
    code?: number
    message?: string
    status?: string
    errors?: Array<{ message?: string; reason?: string }>
  }
}

async function parseGoogleError(response: Response): Promise<ApiError> {
  let body: GoogleErrorBody = {}
  try {
    body = await response.json()
  } catch {
    // ignore parse failure — fall through to generic error
  }

  const err = body.error
  const status = err?.code ?? response.status
  const code = err?.status ?? String(response.status)
  const message = err?.message ?? response.statusText ?? 'Unknown error'

  return new ApiError(status, code, message)
}

const RETRY_DELAY_MS = 1000

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = useAppStore.getState().auth.token

  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  headers.set('Content-Type', 'application/json')

  const requestOptions: RequestInit = { ...options, headers }

  let response = await fetch(url, requestOptions)

  // Retry once on 5xx
  if (response.status >= 500) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    response = await fetch(url, requestOptions)
  }

  if (response.status === 401) {
    useAppStore.getState().logout()
    window.location.href = '/login'
  }

  if (!response.ok) {
    throw await parseGoogleError(response)
  }

  return response
}
