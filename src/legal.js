// Pedidos de remoção feitos ao Mundu TV.
//
// Quando um canal ou titular de direitos pede para sair da app (por uma issue no
// GitHub com a etiqueta "remoção"), junta-se aqui o id do canal (o id do iptv-org,
// ex.: 'RTP1.pt'). O canal deixa de aparecer na próxima publicação.
export const REMOVED_CHANNELS = [
  // { id: 'Exemplo.pt', date: '2026-10-20', issue: 12 },
]

// Onde os titulares de direitos pedem a remoção de um canal
export const TAKEDOWN_URL =
  'https://github.com/Darkfz/mundu-tv/issues/new?labels=remo%C3%A7%C3%A3o&title=Pedido+de+remo%C3%A7%C3%A3o%3A+'

// Servidores que retransmitem canais sem serem os donos: sites de pirataria,
// agregadores que copiam o sinal de outros, plataformas de operadoras de TV paga
// (o sinal é para os clientes delas) e alojamentos genéricos usados para esconder
// a origem (GitHub, Vercel…). Um stream servido por um destes nunca entra.
// Compara-se o fim do nome do servidor: 'antik.sk' apanha 'dash2.antik.sk'.
export const BLOCKED_HOSTS = [
  // Retransmissões de canais pagos
  'boldmss.com',
  'onnethn.com',
  'gpcdn.net',
  '2x2.me',
  'stmify.com',
  'mangeinde4.lat',
  'smart-tv-data.com',
  'hopslan.com',
  's.gy',
  'nxplay.com.br',
  'x1colegal.com',
  'trapemn.tv',
  'nellaiiptv.com',
  'dstv.cx',
  'dethich.pw',
  'freem3u.xyz',
  'iptvnetwork.net',
  'anixa.tv',
  'televizor-24-tochka.ru',
  // Agregadores que copiam o sinal de outros canais
  'aynaott.com',
  'aynascope.net',
  'pishow.tv',
  'smartplaytv.in',
  'tangotv.in',
  'thaimomo.com',
  // Plataformas de operadoras de TV (sinal para clientes)
  'cinerama.uz',
  'uplink.kz',
  'antik.sk',
  'tv360.bitel.com.pe',
  // Alojamentos genéricos usados para esconder a origem
  'githubusercontent.com',
  'github.com',
  'github.io',
  'vercel.app',
  'netlify.app',
  'workers.dev',
  'pages.dev',
  'herokuapp.com',
  'onrender.com',
  'glitch.me',
]

// Marcas de canais pagos. Um canal com um destes nomes só entra se o stream vier
// de um serviço oficial gratuito (TRUSTED_HOSTS): por exemplo, o Nick Jr. da
// Pluto TV entra, o Nick Jr. copiado de uma operadora não.
export const PAID_BRANDS =
  /\b(espn|disney|cartoon ?network|boomerang|nickelodeon|nick ?jr|nicktoons|hbo|cinemax|showtime|starz|bein|eurosport|dazn|sky ?(sports?|cinema|atlantic|one)|fox ?sports?|discovery|animal planet|nat ?geo|national geographic|history|a&e|lifetime|axn|warner|comedy central|sportv|premiere|combate|gloob|telecine|megapix|multishow|gnt|canal ?\+|sport ?tv|bandsports|cine ?sony|sony (channel|movies|sab|max)|star ?(sports|plus|movies|gold)|tlc|food network|hgtv|willow|tennis channel|golf channel|amc|tnt|zee|colors)\b/i

// Serviços oficiais gratuitos (TV grátis com publicidade) e sites dos próprios
// grupos de media que transmitem canais destas marcas de forma aberta.
export const TRUSTED_HOSTS = [
  'jmp2.uk', // atalho para os streams oficiais da Pluto TV e da Samsung TV Plus
  'pluto.tv',
  'amagi.tv',
  'amazonaws.com', // AWS MediaTailor, usado pelos serviços FAST
  'wurl.com',
  'wurl.tv',
  'ottera.tv',
  'tubi.video',
  'roku.com',
  'xumo.com',
  'stingray.com',
  'getpublica.com',
  'samsung.com',
  'enhanced.live', // Warner Bros. Discovery Itália (canais abertos)
  'cbsivideo.com',
  'dai.google.com',
  'skycdp.com',
]

export function hostMatches(host, list) {
  return list.some((h) => host === h || host.endsWith('.' + h))
}
