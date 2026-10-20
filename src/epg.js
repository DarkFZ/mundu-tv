// Guia de programação (EPG). Gerado pelo workflow .github/workflows/epg.yml
// e publicado no ramo "epg" do repositório, um ficheiro por canal.
const BASE =
  import.meta.env?.VITE_EPG_BASE || 'https://raw.githubusercontent.com/Darkfz/mundu-tv/epg'
const TTL = 30 * 60 * 1000 // volta a pedir a programação de um canal ao fim de 30 min

let indexPromise = null
const guides = new Map() // id -> { at, promise }

async function getJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

// Ids dos canais com guia. null se o índice não carregar (sem rede, ramo ainda por criar).
function loadIndex() {
  if (!indexPromise) {
    indexPromise = getJSON(`${BASE}/index.json`)
      .then((d) => new Set(d.channels))
      .catch(() => {
        indexPromise = null // tenta outra vez da próxima
        return null
      })
  }
  return indexPromise
}

// Programas de um canal, ordenados: [{ s, e, t, d? }] com s/e em segundos UTC.
// [] quando o canal não tem guia; null quando não foi possível saber.
export async function loadGuide(channelId) {
  const cached = guides.get(channelId)
  if (cached && Date.now() - cached.at < TTL) return cached.promise

  const promise = (async () => {
    const index = await loadIndex()
    if (!index) return null
    if (!index.has(channelId)) return []
    try {
      const d = await getJSON(`${BASE}/${encodeURIComponent(channelId)}.json`)
      return d.programs || []
    } catch {
      guides.delete(channelId)
      return null
    }
  })()
  guides.set(channelId, { at: Date.now(), promise })
  return promise
}

// O que está a dar e o que vem a seguir, num dado momento (segundos)
export function upcoming(programs, now, count = 6) {
  const i = programs.findIndex((p) => p.e > now)
  if (i === -1) return { current: null, next: [] }
  const current = programs[i].s <= now ? programs[i] : null
  return { current, next: programs.slice(current ? i + 1 : i, (current ? i + 1 : i) + count) }
}

const timeFmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' })
export const formatHour = (sec) => timeFmt.format(new Date(sec * 1000))
