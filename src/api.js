// Catálogo de canais. Vem já filtrado e compacto do servidor (api/catalog.js);
// se esse endpoint não existir (ex.: `npm run dev`), monta-o aqui a partir do iptv-org.
import { countryName, categoryName } from './labels.js'
import { IPTV_ORG_API, fetchAndBuildCatalog, streamHeight } from './catalog-core.js'
import { isSlowConnection, maxHeightForConnection } from './network.js'

export { isLegalStream } from './catalog-core.js'

// VITE_API_BASE aponta para outra cópia da API do iptv-org (e salta o endpoint)
const API_BASE = import.meta.env.VITE_API_BASE
const CATALOG_URL = import.meta.env.VITE_CATALOG_URL || `/api/catalog/${import.meta.env.VITE_BUILD_ID}`

// O URL que o player usa é sempre o original do canal
export function streamUrl(s) {
  return s.url
}

async function fetchCompactCatalog() {
  const res = await fetch(CATALOG_URL)
  const type = res.headers.get('content-type') || ''
  if (!res.ok || !type.includes('json')) throw new Error(`Catálogo indisponível (${res.status})`)
  return res.json()
}

export async function loadCatalog() {
  let raw
  if (API_BASE) raw = await fetchAndBuildCatalog(API_BASE)
  else {
    try {
      raw = await fetchCompactCatalog()
    } catch {
      raw = await fetchAndBuildCatalog(IPTV_ORG_API) // muito mais pesado, só como recurso
    }
  }

  // Nomes em português e contagens por país
  const countByCountry = new Map()
  for (const c of raw.channels) countByCountry.set(c.country, (countByCountry.get(c.country) || 0) + 1)

  return {
    channels: raw.channels,
    countries: raw.countries
      .filter((c) => countByCountry.has(c.code))
      .map((c) => ({ code: c.code, name: countryName(c.code, c.name), count: countByCountry.get(c.code) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    categories: raw.categories.map((c) => ({ id: c.id, name: categoryName(c.id, c.name) })),
  }
}

// Um único estado por canal, para mostrar na lista
export function channelStatus(channel) {
  if (channel.subscription) return { kind: 'neutral', text: 'Assinatura' }
  if (channel.youtube) return null
  if (channel.streams[0]?.labels?.includes('Not 24/7')) return { kind: 'neutral', text: 'Não 24/7' }
  return null
}

// Streams pela ordem a tentar. Com internet lenta (ou "Poupar dados"), os de
// resolução mais baixa passam à frente: arrancam mais depressa e param menos.
export function playableStreams(channel) {
  const max = maxHeightForConnection()
  if (!max || channel.streams.length < 2) return channel.streams
  const fits = (s) => streamHeight(s) > 0 && streamHeight(s) <= max
  return [...channel.streams.filter(fits), ...channel.streams.filter((s) => !fits(s))]
}

export { isSlowConnection }
