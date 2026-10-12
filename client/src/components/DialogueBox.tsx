import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Message } from '../types'
import { useDialogue } from '../context/DialogueContext'

interface Props {
  last: Message
  children: ReactNode
}

const CHARS_PER_TICK = 1
const TICK_MS = 28

export default function DialogueBox({ last, children }: Props) {
  const { auto, skipTick, endStream } = useDialogue()
  const isMonika = last.role === 'assistant'
  const [shown, setShown] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (!auto) {
      setShown(last.content)
      endStream()
      return
    }
    setShown('')
    let i = 0
    intervalRef.current = setInterval(() => {
      i = Math.min(i + CHARS_PER_TICK, last.content.length)
      setShown(last.content.slice(0, i))
      if (i >= last.content.length) {
        clearInterval(intervalRef.current!)
        intervalRef.current = null
        endStream()
      }
    }, TICK_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [last.content, auto, endStream])

  useEffect(() => {
    if (!skipTick || !auto) return
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setShown(last.content)
    endStream()
  }, [skipTick, last.content, auto, endStream])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [shown])

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 mx-32 my-2">
      <div className="ml-8 inline-block px-5 py-1 rounded-t-xl font-bold text-base relative z-10"
        style={{
          background: isMonika ? 'rgba(255,200,220,0.92)' : 'rgba(220,240,220,0.92)',
          color: isMonika ? '#c05080' : '#507050',
          fontFamily: 'Eczar, serif',
          letterSpacing: '0.05em',
        }}>
        {isMonika ? 'Monika' : 'You'}
      </div>

      <div className="relative" style={{
        background: 'rgba(255, 182, 210, 0.88)',
        backdropFilter: 'blur(4px)',
        border: '3px solid rgba(255,255,255,0.6)',
        borderRadius: '10px',
      }}>
        {/* Polka dot overlay */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: `
          radial-gradient(circle, rgba(255,255,255,0.18) 8px, transparent 13px),
          radial-gradient(circle, rgba(255,255,255,0.18) 8px, transparent 13px)
        `,
          backgroundSize: '64px 64px',
          backgroundPosition: '0 0, 32px 32px'
        }} />

        <div ref={scrollRef} className="relative px-8 pt-4 pb-2 min-h-[100px] max-h-[160px] overflow-y-auto">
          <p className="text-lg leading-relaxed" style={{ color: '#4a2040', fontFamily: 'Eczar, serif' }}>
            {shown}
            {shown.length < last.content.length && (
              <span className="inline-block w-[0.55em] h-[1.1em] align-[-0.15em] ml-0.5 animate-pulse"
                style={{ background: 'rgba(74,32,64,0.55)' }} />
            )}
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
