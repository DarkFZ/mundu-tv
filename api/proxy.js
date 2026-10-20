// Proxy de streams do Mundu TV (Vercel Function).
//
// O site está em HTTPS e o browser bloqueia streams http:// ("mixed content").
// Este proxy vai buscar o stream no servidor e devolve-o por HTTPS.
// Também envia o Referer / User-Agent que alguns canais exigem e que o browser
// não deixa definir.
//
//   /api/proxy?url=<stream>&ref=<referer>&ua=<user-agent>
//
// Playlists .m3u8 são reescritas para que cada sub-playlist, segmento, chave e
// segmento de inicialização também passe por aqui. O resto é passado em stream,
// sem guardar em memória.

const PLAYLIST_TYPES = ['mpegurl', 'm3u']
// Só passamos conteúdo de vídeo/áudio: não queremos ser um proxy aberto para tudo
const ALLOWED_TYPES = [
  'mpegurl', 'm3u', 'video/', 'audio/', 'application/octet-stream',
  'binary/octet-stream', 'mp2t', 'mp4', 'application/x-mpegts', 'text/plain',
]
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type',
}

function fail(status, message) {
  return new Response(message, { status, headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } })
}

// Recusa endereços internos (localhost, redes privadas), para o proxy não poder
// ser usado para espreitar a rede da Vercel
function isPrivateHost(host) {
  const h = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.internal') || h.endsWith('.local')) return true
  if (h.includes(':')) return h === '::1' || h === '::' || /^(fc|fd|fe80|::ffff:)/.test(h)
  const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127) || a >= 224
  )
}

function proxied(origin, target, ref, ua) {
  const p = new URLSearchParams({ url: target })
  if (ref) p.set('ref', ref)
  if (ua) p.set('ua', ua)
  return `${origin}/api/proxy?${p}`
}

export function rewritePlaylist(text, baseUrl, wrap) {
  const abs = (u) => {
    try {
      return new URL(u, baseUrl).href
    } catch {
      return u
    }
  }
  return text
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim()
      if (!t) return line
      // Tags com URI="..." (chaves, init, áudio alternativo, legendas, partes LL-HLS)
      if (t.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_, u) => `URI="${wrap(abs(u))}"`)
      // Linha de URL: sub-playlist ou segmento
      return wrap(abs(t))
    })
    .join('\n')
}

async function handle(request) {
  const reqUrl = new URL(request.url)
  const target = reqUrl.searchParams.get('url')
  const ref = reqUrl.searchParams.get('ref') || ''
  const ua = reqUrl.searchParams.get('ua') || ''
  if (!target) return fail(400, 'Falta o parâmetro url')

  let upstreamUrl
  try {
    upstreamUrl = new URL(target)
  } catch {
    return fail(400, 'URL inválido')
  }
  if (!['http:', 'https:'].includes(upstreamUrl.protocol)) return fail(400, 'Só http e https')
  if (isPrivateHost(upstreamUrl.hostname)) return fail(403, 'Endereço não permitido')

  const headers = { 'User-Agent': ua || DEFAULT_UA, Accept: '*/*' }
  if (ref) {
    headers.Referer = ref
    try {
      headers.Origin = new URL(ref).origin
    } catch {}
  }
  const range = request.headers.get('range')
  if (range) headers.Range = range

  let upstream
  try {
    upstream = await fetch(upstreamUrl, {
      method: request.method === 'HEAD' ? 'HEAD' : 'GET',
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(20_000),
    })
  } catch (e) {
    return fail(502, `O stream não respondeu (${e.name === 'TimeoutError' ? 'tempo esgotado' : 'erro de ligação'})`)
  }

  if (!upstream.ok && upstream.status !== 206) {
    return fail(upstream.status === 404 ? 404 : 502, `O stream respondeu ${upstream.status}`)
  }

  // Depois de redirecionamentos, o URL final é a base para os caminhos relativos
  const finalUrl = upstream.url || upstreamUrl.href
  const type = (upstream.headers.get('content-type') || '').toLowerCase()
  const looksLikePlaylist =
    PLAYLIST_TYPES.some((t) => type.includes(t)) || /\.m3u8?(\?|$)/i.test(new URL(finalUrl).pathname)

  if (looksLikePlaylist && request.method !== 'HEAD') {
    const text = await upstream.text()
    if (!text.trimStart().startsWith('#EXTM3U')) return fail(502, 'A resposta não é uma playlist HLS')
    // Usa o proxy só onde precisa: http, ou quando o canal exige headers
    const wrap = (u) => (u.startsWith('http:') || ref || ua ? proxied(reqUrl.origin, u, ref, ua) : u)
    return new Response(rewritePlaylist(text, finalUrl, wrap), {
      status: 200,
      headers: {
        ...CORS,
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store',
      },
    })
  }

  if (type && !ALLOWED_TYPES.some((t) => type.includes(t))) return fail(415, 'Tipo de conteúdo não suportado')

  const out = new Headers(CORS)
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const v = upstream.headers.get(h)
    if (v) out.set(h, v)
  }
  // Segmentos (têm tamanho) não mudam: um pouco de cache no CDN poupa pedidos.
  // Um stream contínuo (MPEG-TS sem tamanho) nunca pode ir para cache.
  out.set(
    'Cache-Control',
    upstream.headers.get('content-length') ? 'public, max-age=0, s-maxage=30' : 'no-store'
  )
  return new Response(upstream.body, { status: upstream.status, headers: out })
}

export function GET(request) {
  return handle(request)
}

export function HEAD(request) {
  return handle(request)
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS })
}
