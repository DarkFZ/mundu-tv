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
