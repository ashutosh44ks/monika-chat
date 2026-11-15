import {
  fireMenuAction,
  visibleMenuItems,
  type ContextMenuState,
  type MenuItemId,
  type TrapMenuId,
} from '../lib/devtools'

interface Props {
  menu: ContextMenuState
  hiddenMenuIds: ReadonlySet<TrapMenuId>
  onTrapItem: (id: TrapMenuId) => void
  onClose: () => void
}

export default function FakeContextMenu({ menu, hiddenMenuIds, onTrapItem, onClose }: Props) {
  const items = visibleMenuItems(hiddenMenuIds)
  const left = Math.min(menu.x, window.innerWidth - 220)
  const top = Math.min(menu.y, window.innerHeight - 340)

  return (
    <div
      role="menu"
      className="fixed z-[100] select-none"
      style={{
        left,
        top,
        minWidth: 200,
        background: '#fff',
        color: '#202124',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        fontSize: 13,
        lineHeight: '20px',
        boxShadow: '0 2px 6px rgba(0,0,0,0.2), 0 10px 20px rgba(0,0,0,0.1)',
        borderRadius: 4,
        padding: '6px 0',
        border: '1px solid rgba(0,0,0,0.08)',
      }}
      onMouseDown={e => e.stopPropagation()}
      onContextMenu={e => e.preventDefault()}
    >
      {items.map(item => {
        if ('sep' in item && item.sep) {
          return (
            <div
              key={item.id}
              style={{ height: 1, margin: '6px 0', background: 'rgba(0,0,0,0.08)' }}
            />
          )
        }
        const disabled = 'disabled' in item && item.disabled
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={!!disabled}
            className="block w-full text-left"
            style={{
              padding: '4px 24px 4px 28px',
              background: 'transparent',
              border: 'none',
              color: disabled ? '#9aa0a6' : '#202124',
              cursor: disabled ? 'default' : 'pointer',
            }}
            onMouseEnter={e => {
              if (!disabled) (e.currentTarget as HTMLButtonElement).style.background = '#e8f0fe'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            }}
            onClick={() => {
              if (disabled) return
              fireMenuAction(item.id as MenuItemId, onTrapItem)
              onClose()
            }}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
