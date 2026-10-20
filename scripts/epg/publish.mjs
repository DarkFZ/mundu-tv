// Converte o guide.xml (XMLTV) do grabber em ficheiros JSON pequenos, um por canal,
// que a app vai buscar quando abres um canal.
//
//   node scripts/epg/publish.mjs <guide.xml> <channels.map.json> <pasta de saída>
//
// Saída:
//   index.json        { updated, channels: [ids na app com programação] }
//   <id na app>.json  [{ s, e, t, d?, c? }]  (início/fim em segundos UNIX, título, descrição, categoria)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const [guideFile, mapFile, outDir] = process.argv.slice(2)
if (!guideFile || !mapFile || !outDir) {
  console.error('Uso: node scripts/epg/publish.mjs <guide.xml> <channels.map.json> <pasta>')
  process.exit(1)
}

const toApp = JSON.parse(readFileSync(mapFile, 'utf8'))
const xml = readFileSync(guideFile, 'utf8')

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) =>
      e[0] === '#'
        ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10))
        : ENTITIES[e] ?? m
    )
    .trim()

// "20261020063000 +0100" -> segundos UNIX
function parseTime(v) {
  const m = v?.match(/^(\d{4})(\d\d)(\d\d)(\d\d)(\d\d)(\d\d)?\s*([+-]\d{4})?/)
  if (!m) return null
  const [, y, mo, d, h, mi, s = '00', tz = '+0000'] = m
  const off = (tz[0] === '-' ? -1 : 1) * (parseInt(tz.slice(1, 3)) * 60 + parseInt(tz.slice(3)))
  return Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) / 1000 - off * 60
}

const tag = (body, name) => {
  const m = body.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)</${name}>`))
  return m ? decode(m[1]) : ''
}

const now = Date.now() / 1000
const from = now - 6 * 3600 // guarda um pouco do passado, para o "a dar agora"
const until = now + 3 * 86400

const byChannel = new Map()
for (const m of xml.matchAll(/<programme\b([^>]*)>([\s\S]*?)<\/programme>/g)) {
  const attrs = m[1]
  const guideId = attrs.match(/\bchannel="([^"]*)"/)?.[1]?.split('@')[0]
  const appId = toApp[guideId]
  if (!appId) continue
  const s = parseTime(attrs.match(/\bstart="([^"]*)"/)?.[1])
  const e = parseTime(attrs.match(/\bstop="([^"]*)"/)?.[1])
  if (!s || !e || e <= s || e < from || s > until) continue
  const p = { s, e, t: tag(m[2], 'title') || 'Sem título' }
  const desc = tag(m[2], 'desc')
  if (desc) p.d = desc.length > 280 ? `${desc.slice(0, 277).trimEnd()}…` : desc
  const cat = tag(m[2], 'category')
  if (cat) p.c = cat
  if (!byChannel.has(appId)) byChannel.set(appId, [])
  byChannel.get(appId).push(p)
}

mkdirSync(outDir, { recursive: true })
const ids = []
for (const [id, list] of byChannel) {
  list.sort((a, b) => a.s - b.s)
  // Sem repetidos (algumas fontes mandam o mesmo programa duas vezes)
  const clean = list.filter((p, i) => i === 0 || p.s !== list[i - 1].s)
  writeFileSync(join(outDir, `${id}.json`), JSON.stringify(clean))
  ids.push(id)
}
ids.sort()
writeFileSync(join(outDir, 'index.json'), JSON.stringify({ updated: Math.round(now), channels: ids }))
console.log(`Programação publicada para ${ids.length} canais.`)
