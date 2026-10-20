// Parte o guide.xml (XMLTV) em ficheiros pequenos, um por canal, para a app
// só descarregar a programação do canal que está a ver.
//
// Uso: node scripts/epg/split.mjs guide.xml pasta-de-saida
// Saída: <pasta>/index.json  -> { updated, channels: ["RTP1.pt", ...] }
//        <pasta>/<canal>.json -> { updated, programs: [{ s, e, t, d? }] }  (s/e em segundos UTC)
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const [input = 'guide.xml', outDir = 'epg-out'] = process.argv.slice(2)
const PAST_H = 6 // guarda um pouco do passado para o "agora" de quem abre tarde
const FUTURE_H = 48
const DESC_MAX = 280

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const decode = (s) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
      if (e[0] === '#') {
        const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)
        return Number.isFinite(n) ? String.fromCodePoint(n) : m
      }
      return ENTITIES[e] ?? m
    })
    .trim()

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]

// "20261020143000 +0100" -> segundos UTC
function xmltvTime(v) {
  const m = v?.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})?\s*([+-]\d{2})?(\d{2})?/)
  if (!m) return null
  const [, Y, M, D, h, i, s = '00', oh = '+00', om = '00'] = m
  const utc = Date.UTC(+Y, +M - 1, +D, +h, +i, +s) / 1000
  const sign = oh[0] === '-' ? -1 : 1
  return utc - sign * (Math.abs(+oh) * 3600 + +om * 60)
}

const firstText = (body, tag) => {
  const m = body.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`))
  return m ? decode(m[1]) : ''
}

const xml = await readFile(input, 'utf8')
const now = Math.floor(Date.now() / 1000)
const from = now - PAST_H * 3600
const to = now + FUTURE_H * 3600

const byChannel = new Map()
const re = /<programme\b([^>]*)>([\s\S]*?)<\/programme>/g
let m
let total = 0
while ((m = re.exec(xml))) {
  const [, head, body] = m
  const channel = attr(head, 'channel')?.split('@')[0]
  const s = xmltvTime(attr(head, 'start'))
  const e = xmltvTime(attr(head, 'stop')) ?? s
  if (!channel || s == null || e <= from || s >= to) continue
  const t = firstText(body, 'title')
  if (!t) continue
  const p = { s, e, t }
  const subtitle = firstText(body, 'sub-title')
  let d = firstText(body, 'desc') || subtitle
  if (d) p.d = d.length > DESC_MAX ? `${d.slice(0, DESC_MAX - 1).trimEnd()}…` : d
  if (!byChannel.has(channel)) byChannel.set(channel, new Map())
  byChannel.get(channel).set(s, p) // mesma hora de início = mesmo programa
  total++
}

await mkdir(outDir, { recursive: true })
const updated = new Date().toISOString()
const ids = []
for (const [id, map] of byChannel) {
  const programs = [...map.values()].sort((a, b) => a.s - b.s)
  // Programas sem fim definido acabam quando começa o seguinte
  for (let i = 0; i < programs.length - 1; i++) {
    if (programs[i].e <= programs[i].s) programs[i].e = programs[i + 1].s
  }
  if (!programs.some((p) => p.e > now)) continue
  ids.push(id)
  await writeFile(path.join(outDir, `${id}.json`), JSON.stringify({ updated, programs }))
}
ids.sort()
await writeFile(path.join(outDir, 'index.json'), JSON.stringify({ updated, channels: ids }))
console.log(`${ids.length} canais com programação, ${total} programas na janela`)
