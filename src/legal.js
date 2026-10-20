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
