import { memo } from 'react'

function ChannelCard({ channel, flag, active, isFav, onPlay, onToggleFav }) {
  return (
    <div
      className={`card ${active ? 'card-active' : ''} ${channel.browserOk ? '' : 'card-off'}`}
      onClick={() => onPlay(channel)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onPlay(channel)}
      title={channel.browserOk ? channel.name : 'Só HTTP — não toca num site HTTPS'}
    >
      <div className="card-logo">
        {channel.logo ? (
          <img src={channel.logo} alt="" loading="lazy" />
        ) : (
          <span>{channel.name.slice(0, 2).toUpperCase()}</span>
        )}
      </div>
      <div className="card-name">{channel.name}</div>
      <div className="card-meta">
        {flag} {channel.categories[0] || ''}
      </div>
      <button
        className={`card-fav ${isFav ? 'fav-on' : ''}`}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFav(channel.id)
        }}
        aria-label="Favorito"
      >
        {isFav ? '★' : '☆'}
      </button>
    </div>
  )
}

export default memo(ChannelCard)
