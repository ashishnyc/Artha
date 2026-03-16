import { useState, useRef } from 'react'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
}

function TagInput({ tags, onChange }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase()
    if (!tag || tags.includes(tag)) return
    onChange([...tags, tag])
    setInputValue('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(inputValue)
    }
    if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      onChange(tags.slice(0, -1))
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    // Auto-add on comma typed inline
    if (value.endsWith(',')) {
      addTag(value.slice(0, -1))
    } else {
      setInputValue(value)
    }
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5 min-h-8 px-2 py-1 border border-gray-200 rounded-md bg-gray-50 focus-within:border-indigo-300 focus-within:bg-white transition-colors cursor-text"
      onClick={() => inputRef.current?.focus()}
      data-testid="tag-input"
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100"
          data-testid={`tag-chip-${tag}`}
        >
          {tag}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onChange(tags.filter((t) => t !== tag)) }}
            aria-label={`Remove tag ${tag}`}
            className="text-indigo-300 hover:text-indigo-600 transition-colors"
            data-testid={`tag-remove-${tag}`}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Add tags…' : ''}
        className="flex-1 min-w-16 text-xs outline-none bg-transparent text-gray-700 placeholder-gray-400"
        data-testid="tag-input-field"
        aria-label="Add tag"
      />
    </div>
  )
}

export default TagInput
