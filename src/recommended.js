// Canais recomendados, por secção.
//
// Só entram canais gratuitos e oficiais: transmissões dos próprios canais ou dos
// serviços de TV grátis com publicidade (Pluto TV, Samsung TV Plus, Roku…). Canais
// pagos nunca entram aqui, mesmo que apareçam no iptv-org.
// A ordem conta: os de língua portuguesa primeiro, depois os mais conhecidos.
// Um canal que saia do catálogo (offline, removido, bloqueado) desaparece sozinho.
export const RECOMMENDED = [
  {
    id: 'desporto',
    title: 'Desporto',
    channels: [
      'NSports.br',
      'FUELTV.pt',
      'RedBullTV.at',
      'FIFAPlus.uk',
      'NFLChannel.us',
      'NHLNetwork.us',
      'FightNetwork.ca',
      'SuperTennis.it',
    ],
  },
  {
    id: 'animacao',
    title: 'Animação',
    channels: [
      'MrBeanAnimated.uk',
      'KartoonChannel.us',
      'SmurfTV.us',
      'ToonGoggles.us',
      'AnimeVision.es',
      'FilmRiseAnime.us',
    ],
  },
  {
    id: 'infantil',
    title: 'Infantil',
    channels: [
      'KuriakosKids.pt',
      'ReinoInfantil.mz',
      'PBSKids.us',
      'BabySharkTV.us',
      'Teletubbies.uk',
      'NickJrPlutoTV.us',
      'KartoonChannel.us',
    ],
  },
  {
    id: 'entretenimento',
    title: 'Entretenimento',
    channels: [
      'TVVitoria.mz',
      'SolTV.gq',
      'TVZoom.br',
      'RedeNGT.br',
      'PlutoTVCanalUOL.us',
      'TopGear.uk',
      'MTVPlutoTV.us',
    ],
  },
]

// As secções com os canais que existem no catálogo carregado
export function recommendedSections(byId) {
  return RECOMMENDED.map((s) => ({
    ...s,
    channels: s.channels.map((id) => byId.get(id)).filter(Boolean),
  })).filter((s) => s.channels.length)
}
