// Dados públicos do projeto iptv-org (https://github.com/iptv-org/api)
import { countryName, categoryName } from './labels.js'
import { EXTRA_CHANNELS } from './extra.js'

const BASE = import.meta.env.VITE_API_BASE || 'https://iptv-org.github.io/api'

async function getJSON(name) {
  const res = await fetch(`${BASE}/${name}.json`)
  if (!res.ok) throw new Error(`Falha ao carregar ${name}.json (${res.status})`)
  return res.json()
}

const IS_HTTPS_PAGE =
  typeof window !== 'undefined' && window.location.protocol === 'https:'

// Proxy no servidor (api/proxy.js) para streams http:// e para os que exigem
// Referer / User-Agent. Liga-se sozinho no site publicado; VITE_PROXY=off desliga,
// e VITE_PROXY=<url> aponta para outro proxy (útil em `npm run dev`).
const PROXY_ENV = import.meta.env.VITE_PROXY
const PROXY_BASE =
  PROXY_ENV === 'off' ? null : PROXY_ENV || (IS_HTTPS_PAGE ? '/api/proxy' : null)

function needsProxy(s) {
  return (IS_HTTPS_PAGE && s.url.startsWith('http:')) || Boolean(s.referrer || s.user_agent)
}

// URL a dar ao player: o original, ou através do proxy quando é preciso
export function streamUrl(s) {
  if (!PROXY_BASE || !needsProxy(s)) return s.url
  const p = new URLSearchParams({ url: s.url })
  if (s.referrer) p.set('ref', s.referrer)
  if (s.user_agent) p.set('ua', s.user_agent)
  return `${PROXY_BASE}?${p}`
}

// O browser consegue tocar este stream (diretamente ou pelo proxy)?
function canPlay(s) {
  return Boolean(PROXY_BASE) || !IS_HTTPS_PAGE || s.url.startsWith('https:')
}

// Ordena streams do mais provável de funcionar para o menos provável
function streamScore(s) {
  let score = 0
  // Ligação direta primeiro; o proxy fica para quando é a única hipótese
  if (s.url.startsWith('https:')) score += 100
  if (!s.referrer && !s.user_agent) score += 50
  if (!s.labels?.includes('Geo-blocked')) score += 20
  if (!s.labels?.includes('Not 24/7')) score += 10
  score += parseInt(s.quality) / 100 || 0
  return -score
}

export async function loadCatalog() {
  const [channels, streams, countries, categories, logos, blocklist] =
    await Promise.all([
      getJSON('channels'),
      getJSON('streams'),
      getJSON('countries'),
      getJSON('categories'),
      getJSON('logos'),
      getJSON('blocklist'),
    ])

  const blocked = new Set(blocklist.map((b) => b.channel))

  // Agrupa streams por canal
  const streamsByChannel = new Map()
  for (const s of streams) {
    if (!s.channel) continue
    if (!streamsByChannel.has(s.channel)) streamsByChannel.set(s.channel, [])
    streamsByChannel.get(s.channel).push(s)
  }

  // Escolhe um logótipo por canal (preferência: o principal, em uso)
  const logoByChannel = new Map()
  for (const l of logos) {
    const current = logoByChannel.get(l.channel)
    const better = !current || (!l.feed && current.feed) || (l.in_use && !current.in_use)
    if (better) logoByChannel.set(l.channel, l)
  }

  const extraIds = new Set(EXTRA_CHANNELS.map((c) => c.id))
  const list = EXTRA_CHANNELS.map((c) => ({
    ...c,
    logo: logoByChannel.get(c.id)?.url || c.logo,
    streams: [],
    browserOk: true,
    featured: true,
  }))
  for (const c of channels) {
    if (c.is_nsfw || c.closed || blocked.has(c.id) || extraIds.has(c.id)) continue
    const chStreams = streamsByChannel.get(c.id)
    if (!chStreams?.length) continue
    const sorted = [...chStreams].sort((a, b) => streamScore(a) - streamScore(b))
    list.push({
      id: c.id,
      name: c.name,
      country: c.country,
      categories: c.categories || [],
      website: c.website,
      logo: logoByChannel.get(c.id)?.url || null,
      streams: sorted,
      browserOk: sorted.some(canPlay),
    })
  }
  // Os diretos oficiais aparecem primeiro; o resto por ordem alfabética
  list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name))

  // Só países/categorias que têm canais, com nomes em português
  const countByCountry = new Map()
  for (const c of list) countByCountry.set(c.country, (countByCountry.get(c.country) || 0) + 1)
  const usedCategories = new Set(list.flatMap((c) => c.categories))

  return {
    channels: list,
    countries: countries
      .filter((c) => countByCountry.has(c.code))
      .map((c) => ({
        code: c.code,
        name: countryName(c.code, c.name),
        count: countByCountry.get(c.code),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt')),
    categories: categories
      .filter((c) => usedCategories.has(c.id))
      .map((c) => ({ id: c.id, name: categoryName(c.id, c.name) })),
  }
}

// Um único estado por canal, para mostrar na lista
export function channelStatus(channel) {
  if (channel.youtube) return null
  if (!channel.browserOk) return { kind: 'neutral', text: 'Só HTTP' }
  const best = playableStreams(channel)[0]
  if (best?.labels?.includes('Geo-blocked')) return { kind: 'warning', text: 'Geo-bloqueado' }
  if (best?.labels?.includes('Not 24/7')) return { kind: 'neutral', text: 'Não 24/7' }
  return null
}

export function playableStreams(channel) {
  return channel.streams.filter(canPlay)
}
