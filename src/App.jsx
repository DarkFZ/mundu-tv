import { useEffect, useMemo, useState } from 'react'
import { loadCatalog } from './api.js'
import { useFavorites } from './useFavorites.js'
import Player from './components/Player.jsx'
import ChannelCard from './components/ChannelCard.jsx'

const PAGE = 60

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const [tab, setTab] = useState('todos') // todos | favoritos
  const [country, setCountry] = useState('CV')
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [onlyWorking, setOnlyWorking] = useState(true)
  const [limit, setLimit] = useState(PAGE)
  const [current, setCurrent] = useState(null)

  const { favs, toggle, isFav } = useFavorites()

  useEffect(() => {
    loadCatalog()
      .then((d) => {
        // Se Cabo Verde não tiver canais, começa com "Todos os países"
        if (!d.countries.some((c) => c.code === 'CV')) setCountry('')
        setData(d)
      })
      .catch((e) => setError(e.message))
  }, [])

  const flags = useMemo(
    () => Object.fromEntries((data?.countries || []).map((c) => [c.code, c.flag])),
    [data]
  )

  const filtered = useMemo(() => {
    if (!data) return []
    const q = query.trim().toLowerCase()
    return data.channels.filter((c) => {
      if (tab === 'favoritos') return favs.has(c.id)
      if (onlyWorking && !c.browserOk) return false
      if (country && c.country !== country) return false
      if (category && !c.categories.includes(category)) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [data, tab, country, category, query, onlyWorking, favs])

  // Volta à primeira página quando os filtros mudam
  useEffect(() => setLimit(PAGE), [tab, country, category, query, onlyWorking])

  const playChannel = (c) => {
    setCurrent(c)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (error)
    return (
      <div className="center">
        <p>Não foi possível carregar os canais.</p>
        <small>{error}</small>
        <button className="btn" onClick={() => location.reload()}>
          Recarregar
        </button>
      </div>
    )

  if (!data)
    return (
      <div className="center">
        <div className="spinner" />
        <p>A carregar canais…</p>
      </div>
    )

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          <span className="dot" /> Mundu TV
        </h1>
        <nav className="tabs">
          <button className={tab === 'todos' ? 'on' : ''} onClick={() => setTab('todos')}>
            Canais
          </button>
          <button className={tab === 'favoritos' ? 'on' : ''} onClick={() => setTab('favoritos')}>
            Favoritos ({favs.size})
          </button>
        </nav>
      </header>

      {current && (
        <Player
          key={current.id}
          channel={current}
          onClose={() => setCurrent(null)}
          isFav={isFav(current.id)}
          onToggleFav={() => toggle(current.id)}
        />
      )}

      {tab === 'todos' && (
        <div className="filters">
          <input
            type="search"
            placeholder="Pesquisar canal…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">🌍 Todos os países</option>
            {data.countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Todas as categorias</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <label className="check">
            <input
              type="checkbox"
              checked={onlyWorking}
              onChange={(e) => setOnlyWorking(e.target.checked)}
            />
            Só compatíveis com o browser
          </label>
        </div>
      )}

      <p className="count">
        {filtered.length} {filtered.length === 1 ? 'canal' : 'canais'}
      </p>

      {filtered.length === 0 ? (
        <p className="empty">
          {tab === 'favoritos'
            ? 'Ainda não tens favoritos. Toca na ☆ de um canal.'
            : 'Nenhum canal encontrado com estes filtros.'}
        </p>
      ) : (
        <div className="grid">
          {filtered.slice(0, limit).map((c) => (
            <ChannelCard
              key={c.id}
              channel={c}
              flag={flags[c.country]}
              active={current?.id === c.id}
              isFav={favs.has(c.id)}
              onPlay={playChannel}
              onToggleFav={toggle}
            />
          ))}
        </div>
      )}

      {limit < filtered.length && (
        <div className="more">
          <button className="btn" onClick={() => setLimit((l) => l + PAGE)}>
            Mostrar mais ({filtered.length - limit})
          </button>
        </div>
      )}

      <footer className="footer">
        Canais públicos via <a href="https://github.com/iptv-org/iptv">iptv-org</a>. Nenhum
        vídeo é alojado nesta app.
      </footer>
    </div>
  )
}
