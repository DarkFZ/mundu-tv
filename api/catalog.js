// Catálogo de canais já filtrado e compacto.
//
// Em vez de cada pessoa descarregar ~18 MB de listas do iptv-org, o servidor
// faz isso uma vez e devolve só o que a app usa. A CDN da Vercel guarda a
// resposta durante 6 horas, por isso esta função quase nunca corre.
// Não toca em vídeo: os streams continuam a ir diretamente do canal para quem vê.
import { fetchAndBuildCatalog } from '../src/catalog-core.js'

export default async function handler(req, res) {
  try {
    const catalog = await fetchAndBuildCatalog()
    // Browser: 1 h. CDN: 6 h, e mais 24 h a servir a cópia antiga enquanto atualiza.
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=21600, stale-while-revalidate=86400')
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(200).send(JSON.stringify(catalog))
  } catch (e) {
    res.setHeader('Cache-Control', 'no-store')
    res.status(502).json({ error: String(e?.message || e) })
  }
}
