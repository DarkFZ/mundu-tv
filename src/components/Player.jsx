import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { Airplay, Cast, ExternalLink, Gauge, Loader2, Lock, RotateCcw, Star, X } from 'lucide-react'
import { playableStreams, streamUrl } from '../api.js'
import { categoryName, labelName } from '../labels.js'
import { Logo } from './ChannelRow.jsx'
import { youtubeLiveUrl } from '../extra.js'
import Guide from './Guide.jsx'
import { initialBandwidthEstimate, isSlowConnection, setQualityPref, useNetwork } from '../network.js'
import { castChannel, stopCasting, useCast } from '../cast.js'

// Opções do hls.js. Com internet lenta: começa numa qualidade baixa, guarda mais
// vídeo em memória (aguenta quebras de rede) e espera mais por cada segmento.
function hlsConfig(slow) {
  const wait = slow
    ? { maxTimeToFirstByteMs: 20_000, maxLoadTimeMs: 60_000 }
    : { maxTimeToFirstByteMs: 10_000, maxLoadTimeMs: 20_000 }
  const retry = { maxNumRetry: slow ? 4 : 2, retryDelayMs: 1000, maxRetryDelayMs: 8000 }
  return {
    enableWorker: true,
    lowLatencyMode: false,
    startLevel: -1, // a primeira qualidade vem da estimativa abaixo
    abrEwmaDefaultEstimate: initialBandwidthEstimate(),
    testBandwidth: true,
    capLevelToPlayerSize: true, // não descarrega 1080p para um ecrã pequeno
    capLevelOnFPSDrop: true,
    // Sobe de qualidade com cautela e desce depressa
    abrBandWidthFactor: slow ? 0.7 : 0.9,
    abrBandWidthUpFactor: slow ? 0.5 : 0.7,
    maxBufferLength: slow ? 60 : 30,
    maxMaxBufferLength: slow ? 120 : 60,
    backBufferLength: 30,
    liveSyncDurationCount: slow ? 4 : 3,
    startFragPrefetch: true,
    manifestLoadPolicy: { default: { ...wait, timeoutRetry: retry, errorRetry: retry } },
    playlistLoadPolicy: { default: { ...wait, timeoutRetry: retry, errorRetry: retry } },
    fragLoadPolicy: { default: { ...wait, timeoutRetry: retry, errorRetry: retry } },
  }
}

// Limita a qualidade automática à altura máxima (0 = sem limite)
function applyCap(hls, maxHeight) {
  if (!hls?.levels?.length) return
  if (!maxHeight) {
    hls.autoLevelCapping = -1
    return
  }
  let cap = 0
  hls.levels.forEach((l, i) => {
    if (l.height && l.height <= maxHeight) cap = i
  })
  hls.autoLevelCapping = cap
}

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
      <Guide channelId={channel.id} channelName={channel.name} />
    </section>
  )
}

function HlsStage({ channel, countryLabel, onClose, isFav, onToggleFav, onPlaying }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const onPlayingRef = useRef(onPlaying)
  onPlayingRef.current = onPlaying
  const net = useNetwork()
  const netRef = useRef(net)
  netRef.current = net
  // Ordem fixa enquanto o canal está aberto (com internet lenta, os mais leves primeiro)
  const [streams] = useState(() => playableStreams(channel))
  const [index, setIndex] = useState(0)
  const [levels, setLevels] = useState([]) // alturas disponíveis no stream atual
  const [level, setLevel] = useState(-1) // escolha manual (-1 = automática)
  const [playingHeight, setPlayingHeight] = useState(0)
  const [buffering, setBuffering] = useState(false)
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

    // Se não arrancar a tempo, passa ao próximo stream. Com internet lenta espera
    // mais, e cada segmento que chega conta como sinal de vida.
    const patience = isSlowConnection() ? 30_000 : 15_000
    const armTimeout = () => {
      clearTimeout(timeout)
      timeout = setTimeout(next, patience)
    }
    armTimeout()
    setLevels([])
    setPlayingHeight(0)
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
          {
            enableWorker: true,
            lazyLoad: false,
            // Com internet lenta, não salta para a frente para apanhar o direto
            // (isso esvazia o buffer e provoca mais paragens)
            liveBufferLatencyChasing: !isSlowConnection(),
            enableStashBuffer: true,
            stashInitialSize: isSlowConnection() ? 512 * 1024 : 128 * 1024,
          }
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
      hls = new Hls(hlsConfig(isSlowConnection()))
      hlsRef.current = hls
      hls.loadSource(streamUrl(stream))
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        applyCap(hls, netRef.current.maxHeight)
        setLevels(hls.levels.map((l) => l.height || 0))
        setLevel(-1)
        video.play().catch(() => {})
      })
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, d) => setPlayingHeight(hls.levels[d.level]?.height || 0))
      hls.on(Hls.Events.FRAG_LOADED, () => {
        if (!started) armTimeout()
      })
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

    // Indicador de "a carregar" quando o vídeo pára à espera de dados
    let waitTimer
    const onWaiting = () => {
      clearTimeout(waitTimer)
      waitTimer = setTimeout(() => setBuffering(true), 1200)
    }
    const onResume = () => {
      clearTimeout(waitTimer)
      setBuffering(false)
    }
    video.addEventListener('waiting', onWaiting)
    video.addEventListener('playing', onResume)
    video.addEventListener('canplay', onResume)

    return () => {
      clearTimeout(timeout)
      clearTimeout(waitTimer)
      setBuffering(false)
      video.removeEventListener('waiting', onWaiting)
      video.removeEventListener('playing', onResume)
      video.removeEventListener('canplay', onResume)
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

  // Mudou a ligação ou a preferência "Poupar dados": ajusta o limite da qualidade automática
  useEffect(() => {
    if (level === -1) applyCap(hlsRef.current, net.maxHeight)
  }, [net.maxHeight, level])

  const chooseQuality = (value) => {
    const hls = hlsRef.current
    if (value === 'poupar' || value === 'auto') {
      setQualityPref(value)
      setLevel(-1)
      if (hls) hls.currentLevel = -1
      return
    }
    // Qualidade fixa escolhida à mão (só para este canal)
    const i = Number(value)
    setLevel(i)
    if (hls) {
      hls.autoLevelCapping = -1
      hls.currentLevel = i
    }
  }

  const stream = streams[index]
  const shownQuality = playingHeight ? `${playingHeight}p` : stream?.quality
  const meta = [channel.categories[0] && categoryName(channel.categories[0]), countryLabel, shownQuality]
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
        {buffering && status === 'playing' && !onTv && (
          <div className="buffer-badge" aria-live="polite">
            <Loader2 size={14} className="spin" /> {net.slow ? 'Internet lenta, a carregar…' : 'A carregar…'}
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

      {(stream?.labels?.length > 0 || streams.length > 1 || castError || levels.length > 1 || net.slow) && (
        <div className="stage-foot">
          {(levels.length > 1 || net.slow || net.pref === 'poupar') && (
            <label className="quality">
              <Gauge size={14} strokeWidth={1.75} aria-hidden="true" />
              <span className="sr-only">Qualidade</span>
              <select
                value={level >= 0 ? String(level) : net.pref}
                onChange={(e) => chooseQuality(e.target.value)}
                aria-label="Qualidade do vídeo"
              >
                <option value="auto">Automática{net.slow ? ' (internet lenta)' : ''}</option>
                <option value="poupar">Poupar dados (até 360p)</option>
                {levels
                  .map((h, i) => ({ h, i }))
                  .filter(({ h }) => h)
                  .sort((a, b) => b.h - a.h)
                  .map(({ h, i }) => (
                    <option key={i} value={String(i)}>
                      {h}p
                    </option>
                  ))}
              </select>
            </label>
          )}
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
      <Guide channelId={channel.id} channelName={channel.name} />
    </section>
  )
}
