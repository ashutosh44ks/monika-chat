import type { KeyboardEvent, RefObject } from 'react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  disabled: boolean
  inputRef: RefObject<HTMLTextAreaElement | null>
}

export default function ChatInput({ value, onChange, onSend, disabled, inputRef }: Props) {
  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className="relative flex items-center gap-3 px-8 pb-3 pt-1">
      <textarea
        ref={inputRef}
        rows={1}
        className="flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none leading-snug"
        style={{
          background: 'rgba(255,255,255,0.7)',
          color: '#4a2040',
          border: '1px solid rgba(255,255,255,0.8)',
          maxHeight: 72,
        }}
        placeholder="Say something..."
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        onInput={e => {
          const t = e.target as HTMLTextAreaElement
          t.style.height = 'auto'
          t.style.height = t.scrollHeight + 'px'
        }}
      />
      <button
        onClick={onSend}
        disabled={disabled || !value.trim()}
        className="rounded-xl px-5 py-2 text-sm font-bold transition-opacity disabled:opacity-40 shrink-0"
        style={{ background: '#d1548a', color: '#fff' }}
      >
        Send ♥
      </button>
    </div>
  )
}
