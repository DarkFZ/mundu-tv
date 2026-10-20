import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Airplay, Cast, ExternalLink, Loader2, Lock, RotateCcw, Star, X } from 'lucide-react'
import { playableStreams, streamUrl } from '../api.js'
import { categoryName, labelName } from '../labels.js'
import { Logo } from './ChannelRow.jsx'
import { youtubeLiveUrl } from '../extra.js'
import Guide from './Guide.jsx'
import { castChannel, stopCasting, useCast } from '../cast.js'

export default function Player(props) {
  if (props.channel.subscription) return <SubscriptionStage {...props} />
  return props.channel.youtube ? <YouTubeStage {...props} /> : <HlsStage {...props} />
}

// Canais pagos: sem sinal na app, só o atalho para o serviço oficial
function SubscriptionStage({ channel, countryLabel, onClose, isFav, onToggleFav }) {
  const sub = channel.subscription
  const meta = [channel.categories[0] && categoryName(channel.categories[0]), countryLabel]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="stage-card" aria-label={channel.name}>
      <div className="screen">
        <div className="screen-overlay">
          <Lock size={22} strokeWidth={1.75} />
          <strong>{channel.name} precisa de assinatura</strong>
          <span>{sub.note}</span>
          <a className="btn btn-primary" href={sub.url} target="_blank" rel="noreferrer">
            <ExternalLink size={16} strokeWidth={1.75} /> Abrir {sub.provider}
          </a>
        </div>
      </div>

      <div className="stage-head">
        <Logo channel={channel} size={48} />
        <div className="stage-title">
          <h2>{channel.name}</h2>
          <p className="stage-meta">{meta}</p>
        </div>
        <div className="stage-actions">
          <button
            className={`icon-btn ${isFav ? 'is-on' : ''}`}
            onClick={onToggleFav}
            aria-label={isFav ? 'Tirar dos favoritos' : 'Guardar nos favoritos'}
            aria-pressed={isFav}
          >
            <Star size={18} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
          </button>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar o player">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="stage-foot">
        <span>O Mundu TV não transmite canais pagos. Este atalho leva ao serviço oficial.</span>
      </div>
    </section>
  )
}

// Canais com direto oficial no YouTube: o vídeo vem do leitor do YouTube
function YouTubeStage({ channel, countryLabel, onClose, isFav, onToggleFav, onPlaying }) {
  useEffect(() => {
    onPlaying?.(channel.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id])

  const meta = [channel.categories[0] && categoryName(channel.categories[0]), countryLabel]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="stage-card" aria-label={`A ver ${channel.name}`}>
      <div className="screen">
        <iframe
          src={youtubeLiveUrl(channel.youtube.channelId)}
          title={`${channel.name} em direto`}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>

      <div className="stage-head">
        <Logo channel={channel} size={48} />
        <div className="stage-title">
          <h2>{channel.name}</h2>
          <p className="stage-meta">{meta}</p>
        </div>
        <div className="stage-actions">
          <button
            className={`icon-btn ${isFav ? 'is-on' : ''}`}
            onClick={onToggleFav}
            aria-label={isFav ? 'Tirar dos favoritos' : 'Guardar nos favoritos'}
            aria-pressed={isFav}
          >
            <Star size={18} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
          </button>
          {channel.website && (
            <a
              className="icon-btn stage-link"
              href={channel.website}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir o site do canal"
            >
              <ExternalLink size={18} strokeWidth={1.75} />
            </a>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Fechar o player">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="stage-foot">
        <span>{channel.source}.</span>
      </div>
      <Guide channelId={channel.id} />
    </section>
  )
}

function HlsStage({ channel, countryLabel, onClose, isFav, onToggleFav, onPlaying }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const onPlayingRef = useRef(onPlaying)
  onPlayingRef.current = onPlaying
  const streams = playableStreams(channel)
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('loading') // loading | playing | failed
  // Formato do stream atual: HLS (.m3u8) ou MPEG-TS contínuo (ex.: /play/a02z)
  const [format, setFormat] = useState('hls')
  const [reconnect, setReconnect] = useState(0) // nova ligação ao mesmo stream
  const [castError, setCastError] = useState(null) // mensagem de erro no rodapé
  const cast = useCast(videoRef)
  const onTv = cast.kind === 'cast' && cast.connectedTo

  // O recetor da TV só toca HLS; MPEG-TS contínuo fica no telemóvel
  const canCast = cast.available && format === 'hls' && status === 'playing'

  const castedRef = useRef(null) // URL que está na TV, para não o enviar duas vezes
  const projectToTv = async () => {
    setCastError(null)
    const stream = streams[index]
    castedRef.current = streamUrl(stream)
    try {
      await castChannel({
        kind: cast.kind,
        video: videoRef.current,
        url: streamUrl(stream),
        title: channel.name,
        logo: channel.logo,
      })
    } catch (e) {
      castedRef.current = null
      if (e === 'cancel' || e?.code === 'cancel') return // fechou o seletor de TVs
      setCastError('Não foi possível projetar este canal na TV.')
    }
  }

  // Enquanto o canal está na TV, o telemóvel não gasta dados a tocá-lo também
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!onTv) {
      if (status === 'playing') video.play().catch(() => {})
      return
    }
    video.pause()
    const keepPaused = () => video.pause()
    video.addEventListener('playing', keepPaused)
    return () => video.removeEventListener('playing', keepPaused)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTv])

  // Mudar de canal com a TV ligada: o novo canal vai logo para a TV
  useEffect(() => {
    if (!onTv) {
      castedRef.current = null
      return
    }
    const stream = streams[index]
    if (format === 'hls' && stream && castedRef.current !== streamUrl(stream)) projectToTv()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, index, format, onTv])

  useEffect(() => {
    const video = videoRef.current
    const stream = streams[index]
    if (!video) return
    if (!stream) {
      setStatus('failed')
      return
    }
    setStatus('loading')

    let hls
    let ts
    let timeout
    let started = false
    let disposed = false
    // tenta o stream seguinte
    const next = () => {
      setFormat('hls')
      setIndex((i) => i + 1)
    }
    const onPlaying = () => {
      clearTimeout(timeout)
      started = true
      setStatus('playing')
    }
    const onFirstPlay = () => onPlayingRef.current?.(channel.id)

    // Se em 15s não arrancar, passa ao próximo stream
    timeout = setTimeout(next, 15000)
    video.addEventListener('playing', onPlaying)
    video.addEventListener('playing', onFirstPlay, { once: true })

    if (format === 'ts') {
      // MPEG-TS contínuo (comum em servidores Astra): toca com mpegts.js
      import('mpegts.js').then(({ default: mpegts }) => {
        if (disposed) return
        if (!mpegts.getFeatureList().mseLivePlayback) {
          clearTimeout(timeout)
          next()
          return
        }
        ts = mpegts.createPlayer(
          { type: 'mpegts', isLive: true, url: new URL(streamUrl(stream), location.href).href },
          { enableWorker: true, liveBufferLatencyChasing: true, lazyLoad: false }
        )
        ts.attachMediaElement(video)
        ts.load()
        Promise.resolve(ts.play()).catch(() => {})
        ts.on(mpegts.Events.ERROR, () => {
          clearTimeout(timeout)
          // Se já estava a tocar, a ligação caiu: liga outra vez ao mesmo stream.
          // Senão, passa ao seguinte.
          if (started) setReconnect((n) => n + 1)
          else next()
        })
      })
    } else if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hlsRef.current = hls
      hls.loadSource(streamUrl(stream))
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return
        clearTimeout(timeout)
        // A resposta não era uma playlist: pode ser MPEG-TS contínuo
        if (data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR) setFormat('ts')
        else next()
      })

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS têm HLS nativo
      video.src = streamUrl(stream)
      video.play().catch(() => {})
      video.onerror = () => {
        clearTimeout(timeout)
        next()
      }
    }

    return () => {
      clearTimeout(timeout)
      video.removeEventListener('playing', onPlaying)
      video.removeEventListener('playing', onFirstPlay)
      video.onerror = null
      disposed = true
      hls?.destroy()
      hlsRef.current = null
      if (ts) {
        ts.pause()
        ts.unload()
        ts.detachMediaElement()
        ts.destroy()
      }
      video.removeAttribute('src')
      video.load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, index, format, reconnect])

  const stream = streams[index]
  const meta = [channel.categories[0] && categoryName(channel.categories[0]), countryLabel, stream?.quality]
    .filter(Boolean)
    .join(' · ')

  return (
    <section className="stage-card" aria-label={`A ver ${channel.name}`}>
      <div className="screen">
        <video ref={videoRef} controls playsInline autoPlay x-webkit-airplay="allow" />
        {onTv && (
          <div className="screen-overlay">
            <Cast size={22} strokeWidth={1.75} />
            <strong>A ver na {cast.connectedTo}</strong>
            <button className="btn btn-secondary" onClick={stopCasting}>
              Parar de projetar
            </button>
          </div>
        )}
        {status === 'loading' && stream && (
          <div className="screen-overlay">
            <Loader2 size={22} className="spin" />
            <span>
              A ligar ao stream {index + 1} de {streams.length}
            </span>
          </div>
        )}
        {status === 'failed' && (
          <div className="screen-overlay">
            <strong>Este canal não está a responder</strong>
            <span>
              {streams.length === 0
                ? 'Não tem nenhum stream oficial disponível neste momento.'
                : `Tentámos ${streams.length === 1 ? 'o único stream' : `os ${streams.length} streams`}. Pode estar offline.`}
            </span>
            {streams.length > 0 && (
              <button className="btn btn-secondary" onClick={() => { setFormat('hls'); setIndex(0) }}>
                <RotateCcw size={16} strokeWidth={1.75} /> Tentar outra vez
              </button>
            )}
          </div>
        )}
      </div>

      <div className="stage-head">
        <Logo channel={channel} size={48} />
        <div className="stage-title">
          <h2>{channel.name}</h2>
          <p className="stage-meta">{meta}</p>
        </div>
        <div className="stage-actions">
          {cast.available && (
            <button
              className={`icon-btn ${onTv ? 'is-on' : ''}`}
              onClick={onTv ? stopCasting : projectToTv}
              disabled={!onTv && !canCast}
              aria-label={onTv ? 'Parar de projetar' : 'Projetar na TV'}
              title={
                format !== 'hls'
                  ? 'Este stream não pode ser projetado na TV'
                  : status !== 'playing' && !onTv
                    ? 'Espera que o canal comece a tocar'
                    : undefined
              }
            >
              {cast.kind === 'airplay' ? (
                <Airplay size={18} strokeWidth={1.75} />
              ) : (
                <Cast size={18} strokeWidth={1.75} />
              )}
            </button>
          )}
          <button
            className={`icon-btn ${isFav ? 'is-on' : ''}`}
            onClick={onToggleFav}
            aria-label={isFav ? 'Tirar dos favoritos' : 'Guardar nos favoritos'}
            aria-pressed={isFav}
          >
            <Star size={18} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
          </button>
          {channel.website && (
            <a
              className="icon-btn stage-link"
              href={channel.website}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir o site do canal"
            >
              <ExternalLink size={18} strokeWidth={1.75} />
            </a>
          )}
          <button className="icon-btn" onClick={onClose} aria-label="Fechar o player">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {(stream?.labels?.length > 0 || streams.length > 1 || castError) && (
        <div className="stage-foot">
          {streams.length > 1 && (
            <span className="num">
              Stream {Math.min(index + 1, streams.length)} de {streams.length}
            </span>
          )}
          {stream?.labels?.map((l) => (
            <span key={l} className={`pill ${l === 'Geo-blocked' ? 'pill-warning' : 'pill-neutral'}`}>
              {labelName(l)}
            </span>
          ))}
          {castError && (
            <button className="stage-error" onClick={() => setCastError(null)}>
              {castError}
            </button>
          )}
        </div>
      )}
      <Guide channelId={channel.id} />
    </section>
  )
}
