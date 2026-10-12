import { describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { DialogueProvider, useDialogue } from './DialogueContext'

function wrapper({ children }: { children: ReactNode }) {
  return <DialogueProvider>{children}</DialogueProvider>
}

describe('useDialogue', () => {
  it('throws outside DialogueProvider', () => {
    expect(() => renderHook(() => useDialogue())).toThrow(
      'useDialogue must be used within DialogueProvider',
    )
  })

  it('exposes defaults', () => {
    const { result } = renderHook(() => useDialogue(), { wrapper })
    expect(result.current.auto).toBe(true)
    expect(result.current.streaming).toBe(true)
    expect(result.current.skipTick).toBe(0)
    expect(result.current.canSkip).toBe(true)
    expect(result.current.historyOpen).toBe(false)
  })

  it('toggleAuto flips auto and updates canSkip', () => {
    const { result } = renderHook(() => useDialogue(), { wrapper })
    act(() => result.current.toggleAuto())
    expect(result.current.auto).toBe(false)
    expect(result.current.canSkip).toBe(false)
    act(() => result.current.toggleAuto())
    expect(result.current.auto).toBe(true)
    expect(result.current.canSkip).toBe(true)
  })

  it('beginStream / endStream control streaming and canSkip', () => {
    const { result } = renderHook(() => useDialogue(), { wrapper })
    act(() => result.current.endStream())
    expect(result.current.streaming).toBe(false)
    expect(result.current.canSkip).toBe(false)
    act(() => result.current.beginStream())
    expect(result.current.streaming).toBe(true)
    expect(result.current.canSkip).toBe(true)
  })

  it('skip increments skipTick', () => {
    const { result } = renderHook(() => useDialogue(), { wrapper })
    act(() => result.current.skip())
    act(() => result.current.skip())
    expect(result.current.skipTick).toBe(2)
  })

  it('toggleHistory and closeHistory', () => {
    const { result } = renderHook(() => useDialogue(), { wrapper })
    act(() => result.current.toggleHistory())
    expect(result.current.historyOpen).toBe(true)
    act(() => result.current.toggleHistory())
    expect(result.current.historyOpen).toBe(false)
    act(() => result.current.toggleHistory())
    act(() => result.current.closeHistory())
    expect(result.current.historyOpen).toBe(false)
  })
})
