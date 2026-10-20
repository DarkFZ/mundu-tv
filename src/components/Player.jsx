import { useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { playableStreams } from '../api.js'

export default function Player({ channel, onClose, isFav, onToggleFav }) {
  const videoRef = useRef(null)
  const streams = playableStreams(channel)
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('loading') // loading | playing | failed

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
    let timeout
    const next = () => setIndex((i) => i + 1) // tenta o stream seguinte
    const onPlaying = () => {
      clearTimeout(timeout)
      setStatus('playing')
    }

    // Se em 15s não arrancar, passa ao próximo stream
    timeout = setTimeout(next, 15000)
    video.addEventListener('playing', onPlaying)

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true })
      hls.loadSource(stream.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          clearTimeout(timeout)
          next()
        }
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari / iOS têm HLS nativo
      video.src = stream.url
      video.play().catch(() => {})
      video.onerror = () => {
        clearTimeout(timeout)
        next()
      }
    }

    return () => {
      clearTimeout(timeout)
      video.removeEventListener('playing', onPlaying)
      video.onerror = null
      hls?.destroy()
      video.removeAttribute('src')
      video.load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel.id, index])

  const stream = streams[index]

  return (
    <section className="player">
      <div className="player-video">
        <video ref={videoRef} controls playsInline autoPlay />
        {status === 'loading' && stream && (
          <div className="player-overlay">
            <div className="spinner" />
            <span>
              A ligar… stream {index + 1} de {streams.length}
            </span>
          </div>
        )}
        {status === 'failed' && (
          <div className="player-overlay">
            <strong>Canal indisponível</strong>
            <span>
              {streams.length === 0
                ? 'Este canal só tem streams HTTP, que o browser bloqueia num site HTTPS.'
                : 'Nenhum dos streams respondeu. Pode estar offline ou bloqueado na tua região.'}
            </span>
            {streams.length > 0 && (
              <button className="btn" onClick={() => setIndex(0)}>
                Tentar de novo
              </button>
            )}
          </div>
        )}
      </div>

      <div className="player-info">
        {channel.logo && <img src={channel.logo} alt="" className="player-logo" />}
        <div className="player-text">
          <h2>{channel.name}</h2>
          <p>
            {stream?.quality && <span className="tag">{stream.quality}</span>}
            {stream?.labels?.map((l) => (
              <span key={l} className="tag tag-warn">
                {l === 'Geo-blocked' ? 'Geo-bloqueado' : l === 'Not 24/7' ? 'Não 24/7' : l}
              </span>
            ))}
            {channel.website && (
              <a href={channel.website} target="_blank" rel="noreferrer">
                Site oficial
              </a>
            )}
          </p>
        </div>
        <button
          className={`icon-btn ${isFav ? 'fav-on' : ''}`}
          onClick={onToggleFav}
          aria-label={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          {isFav ? '★' : '☆'}
        </button>
        <button className="icon-btn" onClick={onClose} aria-label="Fechar">
          ✕
        </button>
      </div>
    </section>
  )
}
