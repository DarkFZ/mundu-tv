// Monta o catálogo do Mundu TV a partir dos dados públicos do iptv-org.
//
// Corre em dois sítios: no servidor (api/catalog.js), que devolve o resultado já
// filtrado e compacto, e no browser, como alternativa se esse endpoint falhar.
// Não usa nada do browser nem do Vite, só JavaScript simples.
import { EXTRA_CHANNELS } from './extra.js'
import { BLOCKED_HOSTS, PAID_BRANDS, REMOVED_CHANNELS, TRUSTED_HOSTS, hostMatches } from './legal.js'

export const IPTV_ORG_API = 'https://iptv-org.github.io/api'
export const SOURCES = ['channels', 'streams', 'countries', 'categories', 'logos', 'blocklist']

// Regras de legalidade (ver README, secção "Legalidade"):
// - O Mundu TV não retransmite nada: o browser liga-se diretamente ao servidor
//   do canal. Não há proxy, por isso só servem streams HTTPS.
// - Não finge ser outro site nem outro programa: streams que exigem Referer ou
//   User-Agent especiais (proteção contra uso fora do site do canal) ficam de fora.
// - Não contorna restrições de região: streams marcados como geo-bloqueados ficam de fora.
// - Não usa retransmissões: servidores de pirataria, agregadores e operadoras
//   (BLOCKED_HOSTS em legal.js) ficam de fora.
function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export function isLegalStream(s) {
  const host = hostOf(s.url)
  return (
    s.url.startsWith('https:') &&
    host !== '' &&
    !hostMatches(host, BLOCKED_HOSTS) &&
    !s.referrer &&
    !s.user_agent &&
    !s.labels?.includes('Geo-blocked')
  )
}

// Canais pagos só entram pelos serviços oficiais gratuitos (ex.: Nick Jr. da Pluto TV)
function legalStreamsFor(channel, streams) {
  if (!PAID_BRANDS.test(channel.name)) return streams
  return streams.filter((s) => hostMatches(hostOf(s.url), TRUSTED_HOSTS))
}

// Altura em linhas (ex.: '720p' → 720), 0 se não se sabe
export function streamHeight(s) {
  return parseInt(s.quality) || 0
}

// Ordena streams do mais provável de funcionar para o menos provável
function streamScore(s) {
  let score = 0
  if (!s.labels?.includes('Not 24/7')) score += 10
  score += streamHeight(s) / 100
  return -score
}

// Só os campos que a app usa: menos bytes para descarregar
function compactStream(s) {
  const out = { url: s.url }
  if (s.quality) out.quality = s.quality
  if (s.labels?.length) out.labels = s.labels
  return out
}

export function buildCatalog({ channels, streams, countries, categories, logos, blocklist }) {
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
    const chStreams = legalStreamsFor(c, streamsByChannel.get(c.id) || [])
    if (!chStreams.length) continue
    const item = {
      id: c.id,
      name: c.name,
      country: c.country,
      categories: c.categories || [],
      logo: logoByChannel.get(c.id)?.url || null,
      streams: [...chStreams].sort((a, b) => streamScore(a) - streamScore(b)).map(compactStream),
    }
    if (c.website) item.website = c.website
    list.push(item)
  }
  // Os diretos oficiais aparecem primeiro; o resto por ordem alfabética
  list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || a.name.localeCompare(b.name))

  // Só países/categorias que têm canais
  const usedCountries = new Set(list.map((c) => c.country))
  const usedCategories = new Set(list.flatMap((c) => c.categories))

  return {
    updated: new Date().toISOString(),
    channels: list,
    countries: countries.filter((c) => usedCountries.has(c.code)).map((c) => ({ code: c.code, name: c.name })),
    categories: categories.filter((c) => usedCategories.has(c.id)).map((c) => ({ id: c.id, name: c.name })),
  }
}

// Descarrega os dados do iptv-org e monta o catálogo (usado no servidor e como alternativa)
export async function fetchAndBuildCatalog(base = IPTV_ORG_API, fetchFn = fetch) {
  const raw = Object.fromEntries(
    await Promise.all(
      SOURCES.map(async (name) => {
        const res = await fetchFn(`${base}/${name}.json`)
        if (!res.ok) throw new Error(`Falha ao carregar ${name}.json (${res.status})`)
        return [name, await res.json()]
      })
    )
  )
  return buildCatalog(raw)
}
