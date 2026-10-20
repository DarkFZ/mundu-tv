import { useEffect, useRef, useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import { dayLabel, hhmm, useGuide } from '../epg.js'

// Programação do canal: o que está a dar, o que vem a seguir e a lista dos próximos dias
export default function Guide({ channelId, channelName }) {
  const guide = useGuide(channelId)
  const [open, setOpen] = useState(false)
  const dialogRef = useRef(null)

  // Abre a janela como modal (o browser trata do foco, do Esc e do fundo)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // Leva a lista até ao programa que está a dar
      dialog.querySelector('.is-now')?.scrollIntoView({ block: 'center' })
    } else if (!open && dialog.open) dialog.close()
  }, [open])

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

      <button className="guide-toggle" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <CalendarDays size={16} strokeWidth={1.75} /> Ver a programação
      </button>

      <dialog
        ref={dialogRef}
        className="guide-dialog"
        aria-labelledby="guide-dialog-title"
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === e.currentTarget && setOpen(false)} // toque fora da janela
      >
        <div className="guide-dialog-body">
          <header className="guide-dialog-head">
            <h2 id="guide-dialog-title">Programação{channelName ? ` · ${channelName}` : ''}</h2>
            <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Fechar a programação">
              <X size={18} strokeWidth={1.75} />
            </button>
          </header>
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
        </div>
      </dialog>
    </section>
  )
}
