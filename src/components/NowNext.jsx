import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatHour, loadGuide, upcoming } from '../epg.js'

const nowSec = () => Math.floor(Date.now() / 1000)

function dayLabel(sec) {
  const d = new Date(sec * 1000)
  const today = new Date()
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)
  if (d.toDateString() === today.toDateString()) return ''
  if (d.toDateString() === tomorrow.toDateString()) return 'Amanhã '
  return d.toLocaleDateString('pt-PT', { weekday: 'short' }) + ' '
}

// "Agora" e "A seguir" do canal que está a tocar
export default function NowNext({ channelId }) {
  const [programs, setPrograms] = useState(undefined) // undefined = a carregar
  const [now, setNow] = useState(nowSec)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    let alive = true
    setPrograms(undefined)
    setOpen(false)
    loadGuide(channelId).then((p) => alive && setPrograms(p))
    return () => {
      alive = false
    }
  }, [channelId])

  // Atualiza a barra de progresso e passa ao programa seguinte sozinho
  useEffect(() => {
    const t = setInterval(() => setNow(nowSec()), 30_000)
    return () => clearInterval(t)
  }, [])

  if (programs === undefined || programs === null) return null // a carregar, ou guia indisponível
  if (!programs.length) {
    return <p className="epg-empty">Sem guia de programação para este canal.</p>
  }

  const { current, next } = upcoming(programs, now)
  if (!current && !next.length) return null
  const progress = current ? Math.min(1, (now - current.s) / Math.max(1, current.e - current.s)) : 0
  const later = next.slice(1)

  return (
    <div className="epg" aria-label="Guia de programação">
      {current && (
        <div className="epg-now">
          <div className="epg-line">
            <span className="epg-tag epg-tag-live">Agora</span>
            <span className="epg-title">{current.t}</span>
            <span className="epg-time num">
              {formatHour(current.s)}–{formatHour(current.e)}
            </span>
          </div>
          <div
            className="epg-bar"
            role="progressbar"
            aria-label="Progresso do programa"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <span style={{ width: `${progress * 100}%` }} />
          </div>
          {current.d && <p className="epg-desc">{current.d}</p>}
        </div>
      )}

      {next[0] && (
        <div className="epg-line">
          <span className="epg-tag">A seguir</span>
          <span className="epg-title">{next[0].t}</span>
          <span className="epg-time num">
            {dayLabel(next[0].s)}
            {formatHour(next[0].s)}
          </span>
        </div>
      )}

      {later.length > 0 && (
        <>
          {open && (
            <ul className="epg-list">
              {later.map((p) => (
                <li key={p.s} className="epg-line">
                  <span className="epg-time epg-time-lead num">
                    {dayLabel(p.s)}
                    {formatHour(p.s)}
                  </span>
                  <span className="epg-title">{p.t}</span>
                </li>
              ))}
            </ul>
          )}
          <button
            className="epg-more"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            {open ? 'Mostrar menos' : 'Mais tarde'}
            <ChevronDown size={14} strokeWidth={1.75} className={open ? 'flip' : undefined} />
          </button>
        </>
      )}
    </div>
  )
}
