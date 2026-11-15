import { useEffect, useState } from 'react'

const BG = '/Mon_cg.webp'
const DELETED_BG = '/1E76849C-79E2-4D1D-B2D5-6373E07AF060.webp'

const GLITCH_ON_MIN = 80
const GLITCH_ON_MAX = 140
const GLITCH_BURST_GAP_MIN = 30
const GLITCH_BURST_GAP_MAX = 100
const GLITCH_DURATION_MIN = 250
const GLITCH_DURATION_MAX = 750

const randomBetween = (min: number, max: number) =>
  min + Math.random() * (max - min)

interface Props {
  /** Increment to fire a 1–3s glitch burst. */
  glitchNonce?: number
}

export default function Background({ glitchNonce = 0 }: Props) {
  const [glitch, setGlitch] = useState(false)

  useEffect(() => {
    if (!glitchNonce) return
    let id: ReturnType<typeof setTimeout>
    let on = false
    const endAt = Date.now() + randomBetween(GLITCH_DURATION_MIN, GLITCH_DURATION_MAX)

    const tick = () => {
      if (Date.now() >= endAt) {
        setGlitch(false)
        return
      }
      on = !on
      setGlitch(on)
      id = setTimeout(
        tick,
        on ? randomBetween(GLITCH_ON_MIN, GLITCH_ON_MAX) : randomBetween(GLITCH_BURST_GAP_MIN, GLITCH_BURST_GAP_MAX),
      )
    }
    tick()
    return () => {
      clearTimeout(id)
      setGlitch(false)
    }
  }, [glitchNonce])

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
      <div className="absolute inset-0 -z-10" style={{
        background: 'linear-gradient(180deg, #c8956c 0%, #b07550 30%, #7a5038 60%, #3d2a1a 100%)'
      }} />
    </div>
  )
}
