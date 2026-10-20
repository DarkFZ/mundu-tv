// Guia de programação: lê os JSON que a GitHub Action "EPG" publica no branch epg-data
import { useEffect, useState } from 'react'

const BASE =
  import.meta.env.VITE_EPG_BASE || 'https://raw.githubusercontent.com/DarkFZ/mundu-tv/epg-data'

let indexPromise = null // Promise<Set<string>>: canais com programação
const cache = new Map() // id -> Promise<programas>

function loadIndex() {
  if (!indexPromise) {
    indexPromise = fetch(`${BASE}/index.json`)
      .then((r) => (r.ok ? r.json() : { channels: [] }))
      .then((d) => new Set(d.channels))
      .catch(() => {
        indexPromise = null // tenta outra vez da próxima
        return new Set()
      })
  }
  return indexPromise
}

async function loadGuide(id) {
  if (!(await loadIndex()).has(id)) return null
  if (!cache.has(id)) {
    cache.set(
      id,
      fetch(`${BASE}/${encodeURIComponent(id)}.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => {
          cache.delete(id)
          return null
        })
    )
  }
  return cache.get(id)
}

// Programas do canal e o instante atual (atualiza a cada 30 s)
export function useGuide(channelId) {
  const [programmes, setProgrammes] = useState(null)
  const [now, setNow] = useState(() => Date.now() / 1000)

  useEffect(() => {
    let alive = true
    setProgrammes(null)
    loadGuide(channelId).then((list) => alive && setProgrammes(list))
    return () => {
      alive = false
    }
  }, [channelId])

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 30_000)
    return () => clearInterval(t)
  }, [])

  if (!programmes?.length) return null
  const upcoming = programmes.filter((p) => p.e > now)
  if (!upcoming.length) return null
  const current = upcoming[0].s <= now ? upcoming[0] : null
  return { now, current, next: upcoming[current ? 1 : 0] || null, upcoming }
}

const timeFmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' })
export const hhmm = (sec) => timeFmt.format(new Date(sec * 1000))

// "Hoje", "Amanhã" ou "quarta, 22 out." no fuso de quem está a ver
const dayFmt = new Intl.DateTimeFormat('pt-PT', { weekday: 'long', day: 'numeric', month: 'short' })
export function dayLabel(sec) {
  const d = new Date(sec * 1000)
  const today = new Date()
  const diff = Math.round(
    (new Date(d.getFullYear(), d.getMonth(), d.getDate()) -
      new Date(today.getFullYear(), today.getMonth(), today.getDate())) /
      86_400_000
  )
  return diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : dayFmt.format(d)
}
