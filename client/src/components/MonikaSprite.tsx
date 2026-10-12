export default function MonikaSprite() {
  return (
      <img
        src="/monika-sprite.png"
        alt="Monika"
        className="drop-shadow-2xl"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
        }}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
      />
  )
}
