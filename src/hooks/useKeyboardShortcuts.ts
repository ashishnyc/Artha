import { useEffect } from 'react'

type ShortcutHandler = (e: KeyboardEvent) => void

function getCombo(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.metaKey || e.ctrlKey) parts.push('cmd')
  if (e.shiftKey) parts.push('shift')
  parts.push(e.key.toLowerCase())
  return parts.join('+')
}

/**
 * Register global keyboard shortcut handlers.
 * Handlers are skipped when user is typing in an input/textarea,
 * UNLESS the combo starts with 'cmd' (modifier key combos always fire).
 */
export function useKeyboardShortcuts(shortcuts: Record<string, ShortcutHandler>) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const isTyping =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable

      const combo = getCombo(e)

      // Skip non-modifier shortcuts when typing
      if (isTyping && !combo.startsWith('cmd')) return

      const handler = shortcuts[combo]
      if (handler) {
        e.preventDefault()
        handler(e)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [shortcuts])
}
