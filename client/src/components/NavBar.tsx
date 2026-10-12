import { Fragment } from 'react'

const DISABLED_ITEMS = ['Skip', 'Auto', 'Save', 'Load', 'Settings']

export default function NavBar({ onToggleHistory }: { onToggleHistory: () => void }) {
  return (
    <div className="relative flex items-center justify-center gap-6 py-2 text-xs font-semibold border-t"
      style={{ color: '#8a4060', borderColor: 'rgba(255,255,255,0.4)' }}>
      <button className="hover:text-pink-800 transition-colors" onClick={onToggleHistory}>History</button>
      {DISABLED_ITEMS.map(label => (
        <Fragment key={label}>
          <span className="opacity-30">|</span>
          <button className="hover:text-pink-800 transition-colors opacity-40 cursor-not-allowed">{label}</button>
        </Fragment>
      ))}
    </div>
  )
}
