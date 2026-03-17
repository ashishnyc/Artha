const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const CLAUDE_MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1024

export interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function callClaude(
  messages: ClaudeMessage[],
  systemPrompt: string,
): Promise<string> {
  const apiKey = import.meta.env.VITE_CLAUDE_API_KEY
  if (!apiKey) throw new Error('VITE_CLAUDE_API_KEY is not set')

  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(
      error?.error?.message ?? `Claude API error: ${response.status}`,
    )
  }

  const data = await response.json()
  return data.content[0].text as string
}
