// Replace with an actual classroom image by putting it at /public/classroom.webp
const BG = '/classroom.webp'

export default function Background() {
  return (
    <div className="absolute inset-0 z-0">
      <img
        src={BG}
        alt=""
        className="w-full h-full object-cover pointer-events-none"
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
      {/* Fallback gradient — only visible if image fails to load */}
      <div className="absolute inset-0 -z-10" style={{
        background: 'linear-gradient(180deg, #c8956c 0%, #b07550 30%, #7a5038 60%, #3d2a1a 100%)'
      }} />
    </div>
  )
}
