import { Logo } from './ChannelRow.jsx'

// Secções de canais recomendados (Desporto, Animação, Infantil, Entretenimento)
export default function Recommended({ sections, countryById, currentId, onPlay }) {
  if (!sections.length) {
    return (
      <div className="block-message">
        <p>Os canais recomendados não estão disponíveis neste momento.</p>
      </div>
    )
  }

  return (
    <div className="rec-sections">
      {sections.map((s) => (
        <section key={s.id} className="rec-section" aria-labelledby={`rec-${s.id}`}>
          <h2 id={`rec-${s.id}`}>{s.title}</h2>
          <ul className="rec-rail">
            {s.channels.map((c) => (
              <li key={c.id}>
                <button
                  className={`rec-tile ${currentId === c.id ? 'is-playing' : ''}`}
                  onClick={() => onPlay(c)}
                  aria-current={currentId === c.id ? 'true' : undefined}
                >
                  <Logo channel={c} size={64} />
                  <span className="rec-name">{c.name}</span>
                  <span className="rec-meta">
                    {currentId === c.id ? (
                      <span className="now">
                        <span className="now-dot" /> A tocar
                      </span>
                    ) : (
                      countryById.get(c.country)
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
