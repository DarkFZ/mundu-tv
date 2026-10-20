// Canais que o Mundu TV junta ao catálogo do iptv-org, a partir das transmissões
// oficiais dos próprios canais. Substituem a entrada do iptv-org com o mesmo id.
export const EXTRA_CHANNELS = [
  {
    id: 'TCV.cv',
    name: 'TCV',
    country: 'CV',
    categories: ['general'],
    website: 'https://www.rtc.cv/tcv/',
    logo: 'https://i.imgur.com/zObwEsr.png',
    // Canal oficial da RTC - Rádio Televisão Cabo-verdiana (@rtc.caboverde)
    youtube: { channelId: 'UCE8NLIaNMwDy-LKUTcCU-5g' },
    source: 'Direto oficial da RTC no YouTube',
    // A programação vem da TCV Internacional (é o guia que existe no iptv-org/epg)
    epgId: 'TCVInternacional.cv',
  },

  // Canais pagos: o Mundu TV não tem direitos para os transmitir, por isso não
  // toca o sinal. Mostra um atalho para o serviço oficial, onde se entra com a
  // própria assinatura.
  {
    id: 'mundu.sporttv.pt',
    name: 'SPORT TV',
    country: 'PT',
    categories: ['sports'],
    website: 'https://www.sporttv.pt',
    subscription: {
      url: 'https://www.sporttv.pt',
      provider: 'SPORT TV',
      note: 'Canal pago. Vê-se na app oficial da SPORT TV ou numa operadora de TV com o canal no pacote.',
    },
  },
  {
    id: 'mundu.sportv.br',
    name: 'SporTV',
    country: 'BR',
    categories: ['sports'],
    website: 'https://globoplay.globo.com',
    subscription: {
      url: 'https://globoplay.globo.com',
      provider: 'Globoplay',
      note: 'Canal pago do Grupo Globo. Vê-se no Globoplay, com o plano que inclui os canais ao vivo.',
    },
  },
]

export function youtubeLiveUrl(channelId) {
  const params = new URLSearchParams({
    channel: channelId,
    autoplay: '1',
    playsinline: '1',
    rel: '0',
    modestbranding: '1',
  })
  return `https://www.youtube.com/embed/live_stream?${params}`
}
