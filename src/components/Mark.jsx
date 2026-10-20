// Símbolo do Mundu TV: um play com uma órbita e um satélite à volta —
// «mundu» é mundo em kriolu, e a marca é o mundo inteiro num ecrã.
// Igual a public/brand/mundu-mark.svg. Com `muted`, desenha a versão
// de uma só cor (segue o CSS `color`), para estados vazios e fundos de cor.
import { useId } from 'react'

export default function Mark({ size = 28, muted = false }) {
  const maskId = useId()

  if (muted) {
    return (
      <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" className="mark mark-muted">
        <defs>
          <mask id={maskId}>
            <rect width="96" height="96" fill="#fff" />
            <g transform="rotate(-20 48 50)">
              <ellipse cx="48" cy="50" rx="37" ry="14" fill="none" stroke="#000" strokeWidth="5" />
              <circle cx="76" cy="41" r="5.5" fill="#000" />
            </g>
            <path d="M39 31 L39 67 L69 49 Z" fill="#000" stroke="#000" strokeWidth="8" strokeLinejoin="round" />
          </mask>
        </defs>
        <rect width="96" height="96" rx="24" fill="currentColor" mask={`url(#${maskId})`} />
      </svg>
    )
  }

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true" className="mark">
      <rect width="96" height="96" rx="24" fill="#1D4ED8" />
      <ellipse cx="48" cy="50" rx="37" ry="14" transform="rotate(-20 48 50)"
        fill="none" stroke="#FFC233" strokeWidth="5" />
      <path d="M39 31 L39 67 L69 49 Z" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="8" strokeLinejoin="round" />
      <g transform="rotate(-20 48 50)">
        <path d="M11 50 A37 14 0 0 0 85 50" fill="none" stroke="#FFC233" strokeWidth="5" strokeLinecap="round" />
        <circle cx="76" cy="41" r="5.5" fill="#FFC233" />
      </g>
    </svg>
  )
}
