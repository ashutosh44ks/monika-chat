import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from 'react'

export type TrapKind = 'inspect' | 'shortcut'

export const TRAP_LINES: Record<TrapKind, string> = {
  inspect: 'Why do you want to do that?',
  shortcut: 'You can ask anything about her directly — no need to play games.',
}

export type ContextMenuState = { x: number; y: number }

/** Chrome-ish page context menu rows. `inspect` is the trap. */
export const CHROME_MENU_ITEMS = [
  { id: 'back', label: 'Back', disabled: true },
  { id: 'forward', label: 'Forward', disabled: true },
  { id: 'reload', label: 'Reload' },
  { id: 'sep1', sep: true },
  { id: 'save', label: 'Save as...' },
  { id: 'print', label: 'Print...' },
  { id: 'sep2', sep: true },
  { id: 'cast', label: 'Cast...' },
  { id: 'sep3', sep: true },
  { id: 'translate', label: 'Translate to English' },
  { id: 'sep4', sep: true },
  { id: 'source', label: 'View page source' },
  { id: 'inspect', label: 'Inspect' },
] as const

export type MenuItemId = Exclude<(typeof CHROME_MENU_ITEMS)[number]['id'], `sep${string}`>
export type TrapMenuId = 'inspect' | 'source'

/** Drop hidden trap rows and collapse orphan / edge separators. */
export function visibleMenuItems(hidden: ReadonlySet<TrapMenuId>) {
  const withoutHidden = CHROME_MENU_ITEMS.filter(
    item => !('label' in item) || !hidden.has(item.id as TrapMenuId),
  )
  const out: (typeof CHROME_MENU_ITEMS)[number][] = []
  for (const item of withoutHidden) {
    const isSep = 'sep' in item && !!item.sep
    const prevSep = out.length > 0 && 'sep' in out[out.length - 1] && !!out[out.length - 1].sep
    if (isSep && (out.length === 0 || prevSep)) continue
    out.push(item)
  }
  while (out.length && 'sep' in out[out.length - 1] && out[out.length - 1].sep) out.pop()
  return out
}

/** Right-click → fake Chrome menu; Ctrl+Shift+I / ⌘⌥I → trap. */
export function useDevToolsTrap(onTrap: (kind: TrapKind) => void): {
  menu: ContextMenuState | null
  setMenu: Dispatch<SetStateAction<ContextMenuState | null>>
  glitchNonce: number
  hiddenMenuIds: ReadonlySet<TrapMenuId>
  trigger: (kind: TrapKind) => void
  triggerMenuTrap: (id: TrapMenuId) => void
} {
  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [glitchNonce, setGlitchNonce] = useState(0)
  const [hiddenMenuIds, setHiddenMenuIds] = useState(() => new Set<TrapMenuId>())

  const trigger = useCallback((kind: TrapKind) => {
    setMenu(null)
    setGlitchNonce(n => n + 1)
    onTrap(kind)
  }, [onTrap])

  const triggerMenuTrap = useCallback((id: TrapMenuId) => {
    setHiddenMenuIds(prev => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
    trigger('inspect')
  }, [trigger])

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault()
      setMenu({ x: e.clientX, y: e.clientY })
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC')
      const openDevtools = isMac
        ? e.metaKey && e.altKey && e.code === 'KeyI'
        : e.ctrlKey && e.shiftKey && e.code === 'KeyI'
      if (!openDevtools) return
      e.preventDefault()
      trigger('shortcut')
    }

    const onPointerDown = () => setMenu(null)

    window.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('mousedown', onPointerDown)
    return () => {
      window.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('mousedown', onPointerDown)
    }
  }, [trigger])

  return { menu, setMenu, glitchNonce, hiddenMenuIds, trigger, triggerMenuTrap }
}

export function fireMenuAction(
  id: MenuItemId,
  onTrapItem: (id: TrapMenuId) => void,
): void {
  if (id === 'inspect' || id === 'source') {
    onTrapItem(id)
    return
  }
  if (id === 'reload') window.location.reload()
  if (id === 'print') window.print()
}
