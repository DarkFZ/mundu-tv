// Dados públicos do projeto iptv-org (https://github.com/iptv-org/api)
const BASE = 'https://iptv-org.github.io/api'

async function getJSON(name) {
  const res = await fetch(`${BASE}/${name}.json`)
  if (!res.ok) throw new Error(`Falha ao carregar ${name}.json (${res.status})`)
  return res.json()
}

const IS_HTTPS_PAGE =
  typeof window !== 'undefined' && window.location.protocol === 'https:'

// Ordena streams do mais provável de funcionar para o menos provável
function streamScore(s) {
  let score = 0
  if (s.url.startsWith('https:')) score += 100
  if (!s.referrer && !s.user_agent) score += 50 // o browser não consegue enviar estes headers
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

  const list = []
  for (const c of channels) {
    if (c.is_nsfw || c.closed || blocked.has(c.id)) continue
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
      // funciona num site https se tiver pelo menos um stream https
      browserOk: !IS_HTTPS_PAGE || sorted.some((s) => s.url.startsWith('https:')),
    })
  }
  list.sort((a, b) => a.name.localeCompare(b.name))

  // Só países/categorias que têm canais
  const usedCountries = new Set(list.map((c) => c.country))
  const usedCategories = new Set(list.flatMap((c) => c.categories))

  return {
    channels: list,
    countries: countries
      .filter((c) => usedCountries.has(c.code))
      .sort((a, b) => a.name.localeCompare(b.name)),
    categories: categories
      .filter((c) => usedCategories.has(c.id))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export function playableStreams(channel) {
  return channel.streams.filter((s) => !IS_HTTPS_PAGE || s.url.startsWith('https:'))
}
