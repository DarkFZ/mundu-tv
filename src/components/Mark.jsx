// Logótipo do Mundu TV: um ecrã de televisão com um anel de dez pontos
// (as dez ilhas de Cabo Verde, e o mundo dentro do ecrã)
const DOTS = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2 - Math.PI / 2
  return [256 + 74 * Math.cos(a), 256 + 74 * Math.sin(a)]
})

export default function Mark({ size = 28, muted = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="96 96 320 320"
      aria-hidden="true"
      className={`mark ${muted ? 'mark-muted' : ''}`}
    >
      <rect
        x="112"
        y="146"
        width="288"
        height="220"
        rx="58"
        fill="none"
        stroke="currentColor"
        strokeWidth="30"
      />
      {DOTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="15" className="mark-dot" />
      ))}
    </svg>
  )
}
