import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { dayLabel, hhmm, useGuide } from '../epg.js'

// Programação do canal: o que está a dar, o que vem a seguir e a lista dos próximos dias
export default function Guide({ channelId }) {
  const guide = useGuide(channelId)
  const [open, setOpen] = useState(false)
  if (!guide) return null
  const { now, current, next, upcoming } = guide

  const progress = current ? Math.min(100, ((now - current.s) / (current.e - current.s)) * 100) : 0

  // Agrupa por dia para a lista completa
  const days = []
  for (const p of upcoming) {
    const label = dayLabel(p.s)
    if (days.at(-1)?.label !== label) days.push({ label, items: [] })
    days.at(-1).items.push(p)
  }

  return (
    <section className="guide" aria-label="Programação">
      {current && (
        <div className="guide-now">
          <span className="now">
            <span className="now-dot" /> A dar agora
          </span>
          <p className="guide-title">{current.t}</p>
          <div className="guide-bar" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${progress}%` }} />
          </div>
          <p className="guide-time num">
            {hhmm(current.s)}–{hhmm(current.e)}
            {current.c && ` · ${current.c}`}
          </p>
          {current.d && <p className="guide-desc">{current.d}</p>}
        </div>
      )}
      {next && (
        <p className="guide-next">
          <span className="num">{hhmm(next.s)}</span> A seguir: {next.t}
        </p>
      )}

      <button className="guide-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Esconder a programação' : 'Ver a programação'}
        <ChevronDown size={16} strokeWidth={1.75} className={open ? 'is-flipped' : ''} />
      </button>

      {open && (
        <div className="guide-list">
          {days.map((d) => (
            <div key={d.label}>
              <h3>{d.label}</h3>
              <ol>
                {d.items.map((p) => (
                  <li key={p.s} className={p === current ? 'is-now' : ''}>
                    <span className="num">{hhmm(p.s)}</span>
                    <span>
                      {p.t}
                      {p.c && <small>{p.c}</small>}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
