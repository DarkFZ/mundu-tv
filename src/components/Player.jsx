import { useCallback, useEffect, useRef, useState } from 'react'
import Hls from 'hls.js'
import { playableStreams } from '../api.js'

const MAX_BYTES = 2 * 1024 ** 3 // pára sozinho aos 2 GB para não esgotar a memória

function formatTime(sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function formatSize(bytes) {
  return bytes >= 1024 ** 3
    ? `${(bytes / 1024 ** 3).toFixed(2)} GB`
    : `${Math.max(0.1, bytes / 1024 ** 2).toFixed(1)} MB`
}

function fileName(channel, ext) {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}h${p(d.getMinutes())}`
  const safe = channel.name.replace(/[^\w\-]+/g, '_')
  return `${safe}_${stamp}.${ext}`
}

function download(blob, name) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export default function Player({ channel, onClose, isFav, onToggleFav }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const recRef = useRef(null) // gravação em curso: { chunks, bytes, start, ext, initPromise }
  const streams = playableStreams(channel)
  const [index, setIndex] = useState(0)
  const [status, setStatus] = useState('loading') // loading | playing | failed
  const [rec, setRec] = useState(null) // { seconds, bytes } para a interface
  const [recError, setRecError] = useState(null)

  const canRecord = Hls.isSupported() // no iOS o HLS é nativo e não deixa ler os segmentos

  // Termina a gravação e descarrega o ficheiro
  const stopRecording = useCallback(async () => {
    const r = recRef.current
    if (!r) return
    recRef.current = null
    setRec(null)
    if (hlsRef.current) hlsRef.current.loadLevel = -1 // volta à qualidade automática

    if (r.encrypted) {
      setRecError('Este stream é encriptado e não pode ser gravado.')
      return
    }
    if (!r.chunks.length) {
      setRecError('Não chegou nenhum segmento de vídeo. Grava durante mais tempo.')
      return
    }
    const init = r.initPromise ? await r.initPromise : null
    const parts = init ? [init, ...r.chunks] : r.chunks
    const type = r.ext === 'mp4' ? 'video/mp4' : 'video/mp2t'
    download(new Blob(parts, { type }), fileName(channel, r.ext))
  }, [channel])

  const startRecording = () => {
    setRecError(null)
    recRef.current = { chunks: [], bytes: 0, start: Date.now(), ext: 'ts', initPromise: null }
    const hls = hlsRef.current
    // Fixa a qualidade atual: mudar a meio deixaria o ficheiro com saltos
    if (hls && hls.currentLevel >= 0) hls.loadLevel = hls.currentLevel
    setRec({ seconds: 0, bytes: 0 })
  }

  // Atualiza o contador da gravação a cada segundo
  useEffect(() => {
    if (!rec) return
    const t = setInterval(() => {
      const r = recRef.current
      if (!r) return
      if (r.bytes >= MAX_BYTES) {
        stopRecording()
        return
      }
      setRec({ seconds: (Date.now() - r.start) / 1000, bytes: r.bytes })
    }, 1000)
    return () => clearInterval(t)
  }, [rec !== null, stopRecording]) // eslint-disable-line react-hooks/exhaustive-deps

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
      hls = new Hls({ enableWorker: true, lowLatencyMode: false })
      hlsRef.current = hls
      hls.loadSource(stream.url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}))
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          clearTimeout(timeout)
          next()
        }
      })

      // Gravação: copia cada segmento de vídeo tal como chega (sem recomprimir)
      hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
        const r = recRef.current
        if (!r || data.frag.type !== 'main' || data.part || !data.payload) return
        const method = data.frag.decryptdata?.method
        if (method && method !== 'NONE') {
          r.encrypted = true
          return
        }
        // Streams fMP4 precisam do segmento de inicialização no início do ficheiro
        const initUrl = data.frag.initSegment?.url
        if (initUrl && !r.initPromise) {
          r.ext = 'mp4'
          r.initPromise = fetch(initUrl)
            .then((res) => (res.ok ? res.arrayBuffer() : null))
            .catch(() => null)
        }
        const copy = data.payload.slice(0) // cópia: o hls.js transfere o original
        r.chunks.push(copy)
        r.bytes += copy.byteLength
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
      stopRecording() // ao mudar de canal ou fechar, guarda o que já foi gravado
      video.removeEventListener('playing', onPlaying)
      video.onerror = null
      hls?.destroy()
      hlsRef.current = null
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
        {rec && (
          <div className="rec-badge">
            <span className="rec-dot" /> REC {formatTime(rec.seconds)} · {formatSize(rec.bytes)}
          </div>
        )}
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
          className={`rec-btn ${rec ? 'rec-on' : ''}`}
          onClick={rec ? stopRecording : startRecording}
          disabled={!canRecord || status !== 'playing'}
          title={
            !canRecord
              ? 'Gravação não suportada neste browser (iPhone/iPad)'
              : rec
                ? 'Parar e guardar'
                : 'Gravar'
          }
        >
          {rec ? '■ Parar' : '● Gravar'}
        </button>
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
      {recError && (
        <p className="rec-error" onClick={() => setRecError(null)}>
          {recError}
        </p>
      )}
    </section>
  )
}
