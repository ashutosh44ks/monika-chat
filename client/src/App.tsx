import { useCallback, useState, useRef } from 'react'
import type { Message } from './types'
import { DialogueProvider, useDialogue } from './context/DialogueContext'
import { TRAP_LINES, useDevToolsTrap, type TrapKind } from './lib/devtools'
import Background from './components/Background'
import FakeContextMenu from './components/FakeContextMenu'
import HistoryOverlay from './components/HistoryOverlay'
import DialogueBox from './components/DialogueBox'
import ChatInput from './components/ChatInput'
import NavBar from './components/NavBar'

const MONIKA_INTRO = "Oh my! A new visitor. I'm so happy you're here. I'm Monika, the president of the Literature Club. I've been waiting for someone like you... someone real. Let's talk — I have so many things I want to share with you. 💚"

function AppShell() {
  const { streaming, beginStream, historyOpen, closeHistory } = useDialogue()
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: MONIKA_INTRO },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const onTrap = useCallback((kind: TrapKind) => {
    beginStream()
    setMessages(prev => [...prev, { role: 'assistant', content: TRAP_LINES[kind] }])
  }, [beginStream])

  const { menu, setMenu, glitchNonce, hiddenMenuIds, triggerMenuTrap } = useDevToolsTrap(onTrap)

  async function send() {
    const text = input.trim()
    if (!text || loading || streaming) return
    const next: Message[] = [...messages, { role: 'user', content: text }]
    beginStream()
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json().catch(() => ({})) as { content?: string; error?: string }
      beginStream()
      if (!res.ok) {
        const line = res.status === 429
          ? "Ah— everyone's talking at once right now. Give me a moment and try again? ♥"
          : res.status === 504
            ? "I… lost the thread for a second. Could you say that again?"
            : "Something went wrong... Are you still there?"
        setMessages([...next, { role: 'assistant', content: line }])
        return
      }
      setMessages([...next, { role: 'assistant', content: data.content ?? "I... don't know what to say." }])
    } catch {
      beginStream()
      setMessages([...next, { role: 'assistant', content: 'Something went wrong... Are you still there?' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none" style={{ fontFamily: "'Noto Sans', sans-serif" }}>
      <Background glitchNonce={glitchNonce} />
      {historyOpen && <HistoryOverlay messages={messages} onClose={closeHistory} />}
      <DialogueBox last={loading ? { role: 'assistant', content: '...' } : messages[messages.length - 1]}>
        {!streaming && !loading && (
          <ChatInput value={input} onChange={setInput} onSend={send} disabled={false} inputRef={inputRef} />
        )}
        <NavBar />
      </DialogueBox>
      {menu && (
        <FakeContextMenu
          menu={menu}
          hiddenMenuIds={hiddenMenuIds}
          onClose={() => setMenu(null)}
          onTrapItem={triggerMenuTrap}
        />
      )}
    </div>
  )
}

export default function App() {
  return (
    <DialogueProvider>
      <AppShell />
    </DialogueProvider>
  )
}
