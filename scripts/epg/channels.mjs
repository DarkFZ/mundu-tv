// Gera o channels.xml que o grabber do iptv-org/epg vai usar.
// Só entram canais que o Mundu TV mostra (têm stream ou estão em src/extra.js)
// e que têm um guia conhecido em guides.json. Um guia (site) por canal.
//
// Uso: node scripts/epg/channels.mjs --data <pasta com os .json da API> --out channels.xml
// Variáveis: EPG_COUNTRIES="CV,PT,BR" (vazio = todos os países)
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { EXTRA_CHANNELS } from '../../src/extra.js'

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]])
    return acc
  }, [])
)
const DATA = args.data || 'temp/data'
const OUT = args.out || 'channels.xml'
const COUNTRIES = (process.env.EPG_COUNTRIES || '')
  .split(',')
  .map((c) => c.trim().toUpperCase())
  .filter(Boolean)

// Línguas preferidas para a programação, por ordem
const LANGS = ['pt', 'en', 'es', 'fr']

const load = async (name) => JSON.parse(await readFile(path.join(DATA, `${name}.json`), 'utf8'))
const [channels, streams, guides, blocklist] = await Promise.all([
  load('channels'),
  load('streams'),
  load('guides'),
  load('blocklist').catch(() => []),
])

const blocked = new Set(blocklist.map((b) => b.channel))
const byId = new Map(channels.map((c) => [c.id, c]))

// Canais que aparecem na app, com o feed do primeiro stream (o mais provável de tocar)
const wanted = new Map()
for (const s of streams) {
  if (!s.channel || wanted.has(s.channel)) continue
  const c = byId.get(s.channel)
  if (!c || c.is_nsfw || c.closed || blocked.has(c.id)) continue
  wanted.set(c.id, s.feed || null)
}
for (const c of EXTRA_CHANNELS) wanted.set(c.id, null)

const inCountry = (id) => {
  if (!COUNTRIES.length) return true
  const country = byId.get(id)?.country || EXTRA_CHANNELS.find((c) => c.id === id)?.country
  return COUNTRIES.includes(country)
}

// Pontua cada guia: mesmo feed do stream, depois língua preferida
function score(g, feed) {
  let s = 0
  if (feed && g.feed === feed) s += 100
  const li = LANGS.indexOf(g.lang)
  s += li === -1 ? 0 : 50 - li * 10
  return s
}

const best = new Map()
for (const g of guides) {
  if (!g.channel || !g.site || !g.site_id || !wanted.has(g.channel) || !inCountry(g.channel)) continue
  const sc = score(g, wanted.get(g.channel))
  const cur = best.get(g.channel)
  if (!cur || sc > cur.sc || (sc === cur.sc && g.site < cur.g.site)) best.set(g.channel, { g, sc })
}

const esc = (v) =>
  String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const lines = [...best.values()]
  .map(({ g }) => g)
  .sort((a, b) => a.site.localeCompare(b.site) || a.channel.localeCompare(b.channel))
  .map((g) => {
    const xmltvId = g.feed ? `${g.channel}@${g.feed}` : g.channel
    const name = g.site_name || byId.get(g.channel)?.name || g.channel
    return `  <channel site="${esc(g.site)}" site_id="${esc(g.site_id)}" lang="${esc(g.lang || 'en')}" xmltv_id="${esc(xmltvId)}">${esc(name)}</channel>`
  })

await writeFile(OUT, `<?xml version="1.0" encoding="UTF-8"?>\n<channels>\n${lines.join('\n')}\n</channels>\n`)

const sites = new Set([...best.values()].map(({ g }) => g.site))
console.log(
  `${lines.length} canais com guia (de ${wanted.size} na app), ${sites.size} sites` +
    (COUNTRIES.length ? `, países: ${COUNTRIES.join(', ')}` : '')
)
