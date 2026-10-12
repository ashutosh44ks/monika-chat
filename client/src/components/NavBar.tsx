import { Fragment } from 'react'
import { useDialogue } from '../context/DialogueContext'

const DISABLED_ITEMS = ['Save', 'Load', 'Settings']

export default function NavBar() {
  const { toggleHistory, skip, canSkip, auto, toggleAuto } = useDialogue()

  return (
    <div className="relative flex items-center justify-center gap-6 py-2 text-xs font-semibold border-t"
      style={{ color: '#8a4060', borderColor: 'rgba(255,255,255,0.4)' }}>
      <button className="hover:text-pink-800 transition-colors" onClick={toggleHistory}>History</button>
      <span className="opacity-30">|</span>
      <button
        className={`hover:text-pink-800 transition-colors ${canSkip ? '' : 'opacity-40 cursor-not-allowed'}`}
        onClick={canSkip ? skip : undefined}
        disabled={!canSkip}
      >
        Skip
      </button>
      <span className="opacity-30">|</span>
      <button
        className={`hover:text-pink-800 transition-colors ${auto ? 'text-white' : 'opacity-40'}`}
        onClick={toggleAuto}
      >
        Auto
      </button>
      {DISABLED_ITEMS.map(label => (
        <Fragment key={label}>
          <span className="opacity-30">|</span>
          <button className="hover:text-pink-800 transition-colors opacity-40 cursor-not-allowed">{label}</button>
        </Fragment>
      ))}
    </div>
  )
}
