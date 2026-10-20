// Gera o channels.xml para o grabber do iptv-org/epg com os canais do Mundu TV
// que têm programação disponível.
//
//   node scripts/epg/channels.mjs <pasta do iptv-org/epg> <saída.xml>
//
// Países: EPG_COUNTRIES (ex.: "CV,PT,BR"); por omissão, os lusófonos da app.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { LUSOPHONE } from '../../src/labels.js'
import { EXTRA_CHANNELS } from '../../src/extra.js'

const [epgDir, outFile] = process.argv.slice(2)
if (!epgDir || !outFile) {
  console.error('Uso: node scripts/epg/channels.mjs <pasta iptv-org/epg> <saída.xml>')
  process.exit(1)
}

const API = 'https://iptv-org.github.io/api'
const COUNTRIES = new Set((process.env.EPG_COUNTRIES || LUSOPHONE.join(',')).split(',').map((c) => c.trim()))
// Fontes que costumam responder bem para estes países, por ordem de preferência
const PREFERRED_SITES = ['nostv.pt', 'meo.pt', 'vodafone.pt', 'tvi.iol.pt', 'zap.co.ao', 'mi.tv', 'tvprofil.com']

const getJSON = async (name) => {
  const res = await fetch(`${API}/${name}.json`)
  if (!res.ok) throw new Error(`${name}.json: ${res.status}`)
  return res.json()
}

// Os mesmos canais que a app mostra: com streams, sem NSFW nem encerrados
const [channels, streams, blocklist] = await Promise.all([
  getJSON('channels'),
  getJSON('streams'),
  getJSON('blocklist'),
])
const withStreams = new Set(streams.map((s) => s.channel).filter(Boolean))
const blocked = new Set(blocklist.map((b) => b.channel))
const wanted = new Map() // id do guia -> id na app
for (const c of channels) {
  if (!COUNTRIES.has(c.country) || c.is_nsfw || c.closed || blocked.has(c.id)) continue
  if (withStreams.has(c.id)) wanted.set(c.id, c.id)
}
for (const c of EXTRA_CHANNELS) {
  if (COUNTRIES.has(c.country)) wanted.set(c.epgId || c.id, c.id)
}

// Lê todas as fontes do iptv-org/epg e fica com a melhor para cada canal
const sitesDir = join(epgDir, 'sites')
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1]
const rank = (ch) => {
  const i = PREFERRED_SITES.indexOf(ch.site)
  return (i === -1 ? 100 : i) + (ch.lang === 'pt' ? 0 : 50)
}
const best = new Map()
for (const site of readdirSync(sitesDir)) {
  const dir = join(sitesDir, site)
  let files
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.channels.xml'))
  } catch {
    continue
  }
  for (const f of files) {
    const xml = readFileSync(join(dir, f), 'utf8')
    for (const m of xml.matchAll(/<channel\b([^>]*)>([^<]*)<\/channel>/g)) {
      const xmltvId = attr(m[1], 'xmltv_id')
      if (!xmltvId) continue
      const guideId = xmltvId.split('@')[0]
      if (!wanted.has(guideId)) continue
      const ch = {
        site: attr(m[1], 'site'),
        siteId: attr(m[1], 'site_id'),
        lang: attr(m[1], 'lang') || 'pt',
        xmltvId,
        name: m[2].trim(),
      }
      if (!ch.site || !ch.siteId || !existsSync(join(dir, `${ch.site}.config.js`)) && !existsSync(join(dir, `${ch.site}.config.ts`))) continue
      const cur = best.get(guideId)
      if (!cur || rank(ch) < rank(cur)) best.set(guideId, ch)
    }
  }
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
const lines = [...best.values()]
  .sort((a, b) => a.site.localeCompare(b.site) || a.xmltvId.localeCompare(b.xmltvId))
  .map(
    (c) =>
      `  <channel site="${esc(c.site)}" lang="${esc(c.lang)}" xmltv_id="${esc(c.xmltvId)}" site_id="${esc(c.siteId)}">${esc(c.name)}</channel>`
  )
writeFileSync(outFile, `<?xml version="1.0" encoding="UTF-8"?>\n<channels>\n${lines.join('\n')}\n</channels>\n`)

// Mapa id do guia -> id na app (para o TCV, que usa o guia da TCV Internacional)
writeFileSync(outFile.replace(/\.xml$/, '.map.json'), JSON.stringify(Object.fromEntries(wanted)))

const bySite = {}
for (const c of best.values()) bySite[c.site] = (bySite[c.site] || 0) + 1
console.log(`${best.size} de ${wanted.size} canais têm programação. Fontes:`, bySite)
