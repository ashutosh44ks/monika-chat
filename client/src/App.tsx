import { useState, useRef, useCallback } from 'react'
import type { Message } from './types'
import Background from './components/Background'
import HistoryOverlay from './components/HistoryOverlay'
import DialogueBox from './components/DialogueBox'
import ChatInput from './components/ChatInput'
import NavBar from './components/NavBar'

const MONIKA_INTRO = "Oh my! A new visitor. I'm so happy you're here. I'm Monika, the president of the Literature Club. I've been waiting for someone like you... someone real. Let's talk — I have so many things I want to share with you. 💚"

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: MONIKA_INTRO },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const onStreamEnd = useCallback(() => setStreaming(false), [])

  async function send() {
    const text = input.trim()
    if (!text || loading || streaming) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    setStreaming(true)
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      setStreaming(true)
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch {
      setStreaming(true)
      setMessages([...next, { role: 'assistant', content: 'Something went wrong... Are you still there?' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
      <Background />
      {historyOpen && <HistoryOverlay messages={messages} onClose={() => setHistoryOpen(false)} />}
      <DialogueBox last={messages[messages.length - 1]} onStreamEnd={onStreamEnd}>
        {!streaming && !loading && (
          <ChatInput value={input} onChange={setInput} onSend={send} disabled={false} inputRef={inputRef} />
        )}
        <NavBar onToggleHistory={() => setHistoryOpen(h => !h)} />
      </DialogueBox>
    </div>
  )
}
