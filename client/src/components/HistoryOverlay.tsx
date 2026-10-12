import { useEffect, useRef } from 'react'
import type { Message } from '../types'

interface Props {
  messages: Message[]
  onClose: () => void
}

export default function HistoryOverlay({ messages, onClose }: Props) {
  const historyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight })
  }, [messages])

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center" onClick={onClose}>
      <div
        className="w-full max-w-3xl mx-4 mb-4 rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,240,245,0.96)', maxHeight: '70vh' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-3 font-semibold text-sm border-b" style={{ color: '#c06090', borderColor: '#ffd0e0' }}>
          Chat History
        </div>
        <div ref={historyRef} className="overflow-y-auto p-4 flex flex-col gap-3" style={{ maxHeight: 'calc(70vh - 48px)' }}>
          {messages.map((m, i) => (
            <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <span className="text-xs mb-1 font-semibold" style={{ color: m.role === 'user' ? '#a04070' : '#6a9a6a' }}>
                {m.role === 'user' ? 'You' : 'Monika'}
              </span>
              <span className="text-sm leading-relaxed px-3 py-2 rounded-xl max-w-[80%]"
                style={{
                  background: m.role === 'user' ? '#f8d0e0' : '#e8f8e8',
                  color: '#4a3a4a'
                }}>
                {m.content}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
