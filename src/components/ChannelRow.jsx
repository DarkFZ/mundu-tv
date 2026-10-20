import { memo, useState } from 'react'
import { Star } from 'lucide-react'
import { channelStatus, playableStreams } from '../api.js'
import { categoryName } from '../labels.js'

export function Logo({ channel, size = 40 }) {
  const [broken, setBroken] = useState(false)
  return (
    <span className="logo" style={{ width: size, height: size }}>
      {channel.logo && !broken ? (
        <img src={channel.logo} alt="" loading="lazy" onError={() => setBroken(true)} />
      ) : (
        <span className="logo-initials">{channel.name.slice(0, 2).toUpperCase()}</span>
      )}
    </span>
  )
}

function ChannelRow({ channel, countryLabel, playing, isFav, onPlay, onToggleFav }) {
  const status = channelStatus(channel)
  const quality = playableStreams(channel)[0]?.quality
  const meta = [channel.categories[0] && categoryName(channel.categories[0]), countryLabel]
    .filter(Boolean)
    .join(' · ')

  return (
    <li className={`row ${playing ? 'is-playing' : ''} ${channel.browserOk ? '' : 'is-off'}`}>
      <button className="row-main" onClick={() => onPlay(channel)}>
        <Logo channel={channel} />
        <span className="row-text">
          <span className="row-name">{channel.name}</span>
          <span className="row-meta">{meta || 'Sem categoria'}</span>
        </span>
        <span className="row-end">
          {playing ? (
            <span className="now">
              <span className="now-dot" /> A tocar
            </span>
          ) : status ? (
            <span className={`pill pill-${status.kind}`}>{status.text}</span>
          ) : quality ? (
            <span className="row-quality num">{quality}</span>
          ) : null}
        </span>
      </button>
      <button
        className={`icon-btn row-fav ${isFav ? 'is-on' : ''}`}
        onClick={() => onToggleFav(channel.id)}
        aria-label={isFav ? `Tirar ${channel.name} dos favoritos` : `Guardar ${channel.name} nos favoritos`}
        aria-pressed={isFav}
      >
        <Star size={16} strokeWidth={1.75} fill={isFav ? 'currentColor' : 'none'} />
      </button>
    </li>
  )
}

export default memo(ChannelRow)
