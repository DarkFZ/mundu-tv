// Projetar para a TV
//
// - Chromecast / Google TV (Chrome no Android e no PC): Google Cast SDK. A TV vai
//   buscar o stream sozinha; o telemóvel fica livre e pode até bloquear o ecrã.
// - AirPlay (Safari no iPhone, iPad e Mac): o seletor nativo do Safari.
//
// Os streams que passam pelo proxy são enviados com o URL completo do proxy
// (HTTPS e com CORS), por isso também funcionam na TV.
import { useEffect, useState } from 'react'

const SDK = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1'

let castReady = null // Promise<boolean>: o Cast está disponível neste browser?

function loadCast() {
  if (castReady) return castReady
  castReady = new Promise((resolve) => {
    // O SDK só funciona no Chrome (e browsers baseados nele)
    if (typeof window === 'undefined' || !window.chrome) return resolve(false)
    window.__onGCastApiAvailable = (ok) => {
      if (!ok) return resolve(false)
      const ctx = window.cast.framework.CastContext.getInstance()
      ctx.setOptions({
        receiverApplicationId: window.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      })
      resolve(true)
    }
    const s = document.createElement('script')
    s.src = SDK
    s.async = true
    s.onerror = () => resolve(false)
    document.head.appendChild(s)
  })
  return castReady
}

function supportsAirPlay() {
  return typeof window !== 'undefined' && 'WebKitPlaybackTargetAvailabilityEvent' in window
}

// Estado do botão "Projetar": que tecnologia há e se há uma TV ligada
export function useCast(videoRef) {
  const [kind, setKind] = useState(supportsAirPlay() ? 'airplay' : null) // 'cast' | 'airplay' | null
  const [airplayFound, setAirplayFound] = useState(false)
  const [connectedTo, setConnectedTo] = useState(null) // nome da TV com sessão Cast ativa

  useEffect(() => {
    if (kind === 'airplay') return
    let alive = true
    let ctx
    const onSession = () => {
      const s = ctx.getCurrentSession()
      setConnectedTo(s ? s.getCastDevice().friendlyName || 'TV' : null)
    }
    loadCast().then((ok) => {
      if (!alive || !ok) return
      setKind('cast')
      ctx = window.cast.framework.CastContext.getInstance()
      ctx.addEventListener(window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onSession)
      onSession()
    })
    return () => {
      alive = false
      ctx?.removeEventListener(window.cast.framework.CastContextEventType.SESSION_STATE_CHANGED, onSession)
    }
  }, [kind])

  // No Safari, só mostra o botão quando há um recetor AirPlay na rede
  useEffect(() => {
    const video = videoRef.current
    if (kind !== 'airplay' || !video) return
    const onAvail = (e) => setAirplayFound(e.availability === 'available')
    video.addEventListener('webkitplaybacktargetavailabilitychanged', onAvail)
    return () => video.removeEventListener('webkitplaybacktargetavailabilitychanged', onAvail)
  }, [kind, videoRef])

  const available = kind === 'cast' || (kind === 'airplay' && airplayFound)
  return { kind, available, connectedTo }
}

// Envia o canal para a TV. `url` pode ser relativo (/api/proxy?...).
export async function castChannel({ kind, video, url, title, logo }) {
  if (kind === 'airplay') {
    video?.webkitShowPlaybackTargetPicker?.()
    return
  }
  const ctx = window.cast.framework.CastContext.getInstance()
  // Abre o seletor de TVs (ou reaproveita a sessão aberta)
  if (!ctx.getCurrentSession()) await ctx.requestSession()
  const session = ctx.getCurrentSession()
  if (!session) return

  const { media } = window.chrome.cast
  const info = new media.MediaInfo(new URL(url, location.href).href, 'application/x-mpegURL')
  info.streamType = media.StreamType.LIVE
  info.metadata = new media.GenericMediaMetadata()
  info.metadata.title = title
  info.metadata.subtitle = 'Mundu TV'
  if (logo) info.metadata.images = [new window.chrome.cast.Image(logo)]
  const req = new media.LoadRequest(info)
  req.autoplay = true
  await session.loadMedia(req)
}

export function stopCasting() {
  window.cast?.framework.CastContext.getInstance().endCurrentSession(true)
}
