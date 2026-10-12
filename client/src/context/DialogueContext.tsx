import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

interface DialogueContextValue {
  auto: boolean
  toggleAuto: () => void
  streaming: boolean
  beginStream: () => void
  endStream: () => void
  skipTick: number
  skip: () => void
  canSkip: boolean
  historyOpen: boolean
  toggleHistory: () => void
  closeHistory: () => void
}

const DialogueContext = createContext<DialogueContextValue | null>(null)

export function DialogueProvider({ children }: { children: ReactNode }) {
  const [auto, setAuto] = useState(true)
  const [streaming, setStreaming] = useState(true)
  const [skipTick, setSkipTick] = useState(0)
  const [historyOpen, setHistoryOpen] = useState(false)

  const toggleAuto = useCallback(() => setAuto(a => !a), [])
  const beginStream = useCallback(() => setStreaming(true), [])
  const endStream = useCallback(() => setStreaming(false), [])
  const skip = useCallback(() => setSkipTick(t => t + 1), [])
  const toggleHistory = useCallback(() => setHistoryOpen(h => !h), [])
  const closeHistory = useCallback(() => setHistoryOpen(false), [])

  const value = useMemo<DialogueContextValue>(() => ({
    auto,
    toggleAuto,
    streaming,
    beginStream,
    endStream,
    skipTick,
    skip,
    canSkip: streaming && auto,
    historyOpen,
    toggleHistory,
    closeHistory,
  }), [auto, toggleAuto, streaming, beginStream, endStream, skipTick, skip, historyOpen, toggleHistory, closeHistory])

  return <DialogueContext.Provider value={value}>{children}</DialogueContext.Provider>
}

export function useDialogue() {
  const ctx = useContext(DialogueContext)
  if (!ctx) throw new Error('useDialogue must be used within DialogueProvider')
  return ctx
}
