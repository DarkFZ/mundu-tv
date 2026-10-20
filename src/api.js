// Dados públicos do projeto iptv-org (https://github.com/iptv-org/api)
import { countryName, categoryName } from './labels.js'
import { EXTRA_CHANNELS } from './extra.js'
import { REMOVED_CHANNELS } from './legal.js'

const BASE = import.meta.env.VITE_API_BASE || 'https://iptv-org.github.io/api'

async function getJSON(name) {
  const res = await fetch(`${BASE}/${name}.json`)
  if (!res.ok) throw new Error(`Falha ao carregar ${name}.json (${res.status})`)
  return res.json()
}

// Regras de legalidade (ver README, secção "Legalidade"):
// - O Mundu TV não retransmite nada: o browser liga-se diretamente ao servidor
//   do canal. Não há proxy, por isso só servem streams HTTPS.
// - Não finge ser outro site nem outro programa: streams que exigem Referer ou
//   User-Agent especiais (proteção contra uso fora do site do canal) ficam de fora.
// - Não contorna restrições de região: streams marcados como geo-bloqueados ficam de fora.
export function isLegalStream(s) {
  return (
    s.url.startsWith('https:') &&
    !s.referrer &&
    !s.user_agent &&
    !s.labels?.includes('Geo-blocked')
  )
}

// O URL que o player usa é sempre o original do canal
export function streamUrl(s) {
  return s.url
}

// Ordena streams do mais provável de funcionar para o menos provável
function streamScore(s) {
  let score = 0
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

  // Bloqueados pelo iptv-org (pedidos DMCA, NSFW) e pedidos de remoção feitos ao Mundu TV
  const blocked = new Set([...blocklist.map((b) => b.channel), ...REMOVED_CHANNELS.map((r) => r.id)])

  // Agrupa os streams legais por canal
  const streamsByChannel = new Map()
  for (const s of streams) {
    if (!s.channel || !isLegalStream(s)) continue
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
  const list = EXTRA_CHANNELS.filter((c) => !blocked.has(c.id)).map((c) => ({
    ...c,
    logo: logoByChannel.get(c.id)?.url || c.logo || null,
    streams: [],
    featured: !c.subscription,
  }))
  for (const c of channels) {
    if (c.is_nsfw || c.closed || blocked.has(c.id) || extraIds.has(c.id)) continue
    const chStreams = streamsByChannel.get(c.id)
    if (!chStreams?.length) continue
    list.push({
      id: c.id,
      name: c.name,
      country: c.country,
      categories: c.categories || [],
      website: c.website,
      logo: logoByChannel.get(c.id)?.url || null,
      streams: [...chStreams].sort((a, b) => streamScore(a) - streamScore(b)),
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
  if (channel.subscription) return { kind: 'neutral', text: 'Assinatura' }
  if (channel.youtube) return null
  if (channel.streams[0]?.labels?.includes('Not 24/7')) return { kind: 'neutral', text: 'Não 24/7' }
  return null
}

export function playableStreams(channel) {
  return channel.streams
}
