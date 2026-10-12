import { useEffect, useState } from 'react'

const BG = '/Mon_cg.webp'
const DELETED_BG = '/1E76849C-79E2-4D1D-B2D5-6373E07AF060.webp'
const DEVTOOLS_THRESHOLD = 160

// Flicker timings in ms, used while DevTools is open
const GLITCH_START_DELAY = 200
const GLITCH_ON_MIN = 100
const GLITCH_ON_MAX = 150
const GLITCH_OFF_MIN = 500
const GLITCH_OFF_MAX = 12000
// >1 favours short gaps with occasional long pauses; 1 = uniform
const GLITCH_OFF_SKEW = 2.5
// Flashes per burst, picked between 1 and this
const GLITCH_BURST_MAX = 4
// Gap between flashes inside a burst
const GLITCH_BURST_GAP_MIN = 30
const GLITCH_BURST_GAP_MAX = 120

const randomBetween = (min: number, max: number, skew = 1) =>
  min + Math.random() ** skew * (max - min)

function isDevToolsOpen() {
  return (
    window.outerWidth - window.innerWidth > DEVTOOLS_THRESHOLD ||
    window.outerHeight - window.innerHeight > DEVTOOLS_THRESHOLD
  )
}

export default function Background() {
  const [devToolsOpen, setDevToolsOpen] = useState(isDevToolsOpen)
  const [glitch, setGlitch] = useState(false)

  // Browsers don't expose DevTools state; this detects a docked panel by its size.
  useEffect(() => {
    const update = () => setDevToolsOpen(isDevToolsOpen())
    window.addEventListener('resize', update)
    update()
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!devToolsOpen) {
      setGlitch(false)
      return
    }
    let id: ReturnType<typeof setTimeout>
    let on = false
    let flashesLeft = 0
    const tick = () => {
      on = !on
      setGlitch(on)
      if (on) {
        if (flashesLeft === 0) flashesLeft = 1 + Math.floor(Math.random() * GLITCH_BURST_MAX)
        flashesLeft--
        id = setTimeout(tick, randomBetween(GLITCH_ON_MIN, GLITCH_ON_MAX))
      } else {
        id = setTimeout(tick, flashesLeft > 0
          ? randomBetween(GLITCH_BURST_GAP_MIN, GLITCH_BURST_GAP_MAX)
          : randomBetween(GLITCH_OFF_MIN, GLITCH_OFF_MAX, GLITCH_OFF_SKEW))
      }
    }
    id = setTimeout(tick, GLITCH_START_DELAY)
    return () => clearTimeout(id)
  }, [devToolsOpen])

  return (
    <div className="absolute inset-0 z-0">
      <img
        src={BG}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      <img
        src={DELETED_BG}
        alt=""
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: glitch ? 1 : 0 }}
      />
      {/* Fallback gradient — only visible if image fails to load */}
      <div className="absolute inset-0 -z-10" style={{
        background: 'linear-gradient(180deg, #c8956c 0%, #b07550 30%, #7a5038 60%, #3d2a1a 100%)'
      }} />
    </div>
  )
}
