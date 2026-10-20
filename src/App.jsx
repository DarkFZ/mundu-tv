import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Download, Search, Sparkles, Star, Tv } from 'lucide-react'
import { loadCatalog } from './api.js'
import { LUSOPHONE, countryName } from './labels.js'
import { useFavorites, useRecent } from './useStoredList.js'
import Player from './components/Player.jsx'
import ChannelRow, { Logo } from './components/ChannelRow.jsx'
import Mark from './components/Mark.jsx'
import Recommended from './components/Recommended.jsx'
import { recommendedSections } from './recommended.js'
import InstallInvite from './components/InstallInvite.jsx'
import { useInstall } from './useInstall.js'
import { TAKEDOWN_URL } from './legal.js'

const PAGE = 40
const MAX_TABS = 7

function useIsDesktop() {
  const q = '(min-width: 1024px)'
  const [match, setMatch] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const m = window.matchMedia(q)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [])
  return match
}

function plural(n, one, many) {
  return `${n.toLocaleString('pt-PT')} ${n === 1 ? one : many}`
}

export default function App() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  const [view, setView] = useState(() => {
    const v = new URLSearchParams(window.location.search).get('vista')
    return v === 'favoritos' || v === 'canais' ? v : 'recomendados'
  }) // recomendados | canais | favoritos
  const [country, setCountry] = useState('CV') // '' = todos os países
  const [category, setCategory] = useState('')
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)
  const [current, setCurrent] = useState(null)

  const { favs, toggle } = useFavorites()
  const { recent, push: pushRecent } = useRecent()
  const isDesktop = useIsDesktop()
  const installer = useInstall()
  const [inviteOpen, setInviteOpen] = useState(false)
  const inviteVisible = installer.available && (installer.showInvite || inviteOpen)
  const closeInvite = () => {
    setInviteOpen(false)
    installer.dismiss()
  }
  const startInstall = async () => {
    if (installer.canPrompt) {
      await installer.install()
      setInviteOpen(false)
    } else setInviteOpen(true)
  }

  useEffect(() => {
    setError(null)
    loadCatalog()
      .then((d) => {
        if (!d.countries.some((c) => c.code === 'CV')) setCountry('')
        setData(d)
      })
      .catch((e) => setError(e.message))
  }, [attempt])

  const byId = useMemo(() => new Map((data?.channels || []).map((c) => [c.id, c])), [data])
  const recSections = useMemo(() => recommendedSections(byId), [byId])
  const countryById = useMemo(
    () => new Map((data?.countries || []).map((c) => [c.code, c.name])),
    [data]
  )
  const lusophone = useMemo(
    () => LUSOPHONE.map((code) => data?.countries.find((c) => c.code === code)).filter(Boolean),
    [data]
  )
  const otherCountries = useMemo(
    () => (data?.countries || []).filter((c) => !LUSOPHONE.includes(c.code)),
    [data]
  )

  // Canais no âmbito atual (país ou favoritos), antes de categoria e pesquisa
  const scoped = useMemo(() => {
    if (!data) return []
    if (view === 'favoritos') return data.channels.filter((c) => favs.has(c.id))
    return data.channels.filter((c) => !country || c.country === country)
  }, [data, view, country, favs])

  // Separadores: as categorias com mais canais neste âmbito
  const tabs = useMemo(() => {
    if (!data) return []
    const counts = new Map()
    for (const c of scoped) for (const cat of c.categories) counts.set(cat, (counts.get(cat) || 0) + 1)
    return data.categories
      .filter((c) => counts.has(c.id))
      .map((c) => ({ ...c, count: counts.get(c.id) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_TABS)
  }, [data, scoped])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return scoped.filter((c) => {
      if (category && !c.categories.includes(category)) return false
      if (q && !c.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [scoped, category, query])

  useEffect(() => setLimit(PAGE), [view, country, category, query])
  // Se a categoria escolhida não existir no novo âmbito, volta a "Todas"
  useEffect(() => {
    if (category && !tabs.some((t) => t.id === category)) setCategory('')
  }, [tabs, category])

  const play = (c) => {
    setCurrent(c)
    if (!isDesktop) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openCountry = (code) => {
    setView('canais')
    setCountry(code)
    setCategory('')
  }

  const title =
    view === 'recomendados' ? 'Recomendados' : view === 'favoritos' ? 'Favoritos' : country ? countryById.get(country) || countryName(country) : 'Todos os países'

  const subline = !data
    ? 'A carregar a lista de canais abertos…'
    : view === 'recomendados'
      ? 'Canais grátis e oficiais de desporto, animação, infantil e entretenimento'
      : view === 'favoritos'
      ? scoped.length
        ? `${plural(scoped.length, 'canal guardado', 'canais guardados')} neste dispositivo`
        : 'Os canais que marcares com a estrela ficam aqui'
      : `${plural(scoped.length, 'canal', 'canais')} na lista`

  const player = current && (
    <Player
      key={current.id}
      channel={current}
      countryLabel={countryById.get(current.country)}
      onClose={() => setCurrent(null)}
      isFav={favs.has(current.id)}
      onToggleFav={() => toggle(current.id)}
      onPlaying={pushRecent}
    />
  )

  const recentChannels = recent.map((id) => byId.get(id)).filter(Boolean)
  const showCountryOnRows = view === 'favoritos' || !country

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <Mark />
          <span className="wordmark">Mundu TV</span>
        </div>

        <nav className="nav" aria-label="Secções">
          <button
            className={`nav-item ${view === 'recomendados' ? 'is-active' : ''}`}
            onClick={() => setView('recomendados')}
          >
            <Sparkles size={16} strokeWidth={1.5} /> Recomendados
          </button>
          <button
            className={`nav-item ${view === 'canais' ? 'is-active' : ''}`}
            onClick={() => setView('canais')}
          >
            <Tv size={16} strokeWidth={1.5} /> Canais
          </button>
          <button
            className={`nav-item ${view === 'favoritos' ? 'is-active' : ''}`}
            onClick={() => setView('favoritos')}
          >
            <Star size={16} strokeWidth={1.5} /> Favoritos
          </button>
          {installer.available && (
            <button className="nav-item" onClick={startInstall}>
              <Download size={16} strokeWidth={1.5} /> Instalar app
            </button>
          )}
        </nav>

        <div className="nav-group">
          <p className="nav-label">Países de língua portuguesa</p>
          {!data && !error
            ? [1, 2, 3, 4].map((i) => <span key={i} className="skeleton nav-skeleton" />)
            : lusophone.map((c) => (
                <button
                  key={c.code}
                  className={`nav-item nav-country ${view === 'canais' && country === c.code ? 'is-active' : ''}`}
                  onClick={() => openCountry(c.code)}
                >
                  <span>{c.name}</span>
                  <span className="nav-count num">{c.count}</span>
                </button>
              ))}
        </div>

        {data && (
          <div className="nav-group">
            <label className="nav-label" htmlFor="outros">
              Resto do mundo
            </label>
            <select
              id="outros"
              className="select"
              value={view === 'canais' && !LUSOPHONE.includes(country) ? country : 'escolher'}
              onChange={(e) => e.target.value !== 'escolher' && openCountry(e.target.value)}
            >
              <option value="escolher" disabled>
                Escolher país
              </option>
              <option value="">Todos os países</option>
              {otherCountries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
          </div>
        )}

      </aside>

      <header className="topbar">
        <div className="topbar-brand">
          <Mark size={22} />
          <span className="wordmark">Mundu TV</span>
        </div>
        <label className="search">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <input
            type="search"
            placeholder={
              view === 'favoritos'
                ? 'Procurar nos favoritos'
                : view === 'recomendados'
                  ? 'Procurar canal'
                  : `Procurar em ${title}`
            }
            value={query}
            onChange={(e) => {
              // Procurar a partir dos recomendados procura em todos os canais
              if (view === 'recomendados') {
                setView('canais')
                setCountry('')
              }
              setQuery(e.target.value)
            }}
            aria-label="Procurar canal"
          />
        </label>
        {data && (
          <span className="topbar-meta num">
            {plural(data.channels.length, 'canal', 'canais')} em {plural(data.countries.length, 'país', 'países')}
          </span>
        )}
        {installer.available && (
          <button className="icon-btn topbar-install" onClick={startInstall} aria-label="Instalar a app">
            <Download size={18} strokeWidth={1.75} />
          </button>
        )}
        <div className="topbar-switch" role="tablist" aria-label="Secções">
          <button
            role="tab"
            aria-selected={view === 'recomendados'}
            className={view === 'recomendados' ? 'is-active' : ''}
            onClick={() => setView('recomendados')}
          >
            Recomendados
          </button>
          <button
            role="tab"
            aria-selected={view === 'canais'}
            className={view === 'canais' ? 'is-active' : ''}
            onClick={() => setView('canais')}
          >
            Canais
          </button>
          <button
            role="tab"
            aria-selected={view === 'favoritos'}
            className={view === 'favoritos' ? 'is-active' : ''}
            onClick={() => setView('favoritos')}
          >
            Favoritos
          </button>
        </div>
      </header>

      <main className="canvas">
        {current && !isDesktop && <div className="stage stage-phone">{player}</div>}

        <div className="title-row">
          <div>
            <h1>{title}</h1>
            <p className="subline">{subline}</p>
          </div>
          {data && view === 'canais' && (
            <label className="title-picker">
              <span>{title}</span>
              <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
              <select
                className="title-picker-select"
                aria-label="Escolher país"
                value={country}
                onChange={(e) => openCountry(e.target.value)}
              >
                <option value="">Todos os países</option>
                <optgroup label="Língua portuguesa">
                  {lusophone.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Resto do mundo">
                  {otherCountries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          )}
        </div>

        <div className="workspace">
          {view === 'recomendados' ? (
          <section className="list-block" aria-label="Canais recomendados">
            {error ? (
              <div className="block-message">
                <p>Não foi possível carregar a lista de canais. Verifica a ligação à internet.</p>
                <button className="text-btn" onClick={() => setAttempt((a) => a + 1)}>
                  Tentar outra vez
                </button>
              </div>
            ) : !data ? (
              <div className="rec-sections" aria-busy="true">
                {[1, 2].map((i) => (
                  <div key={i} className="rec-section">
                    <span className="skeleton sk-name" />
                    <div className="rec-rail">
                      {[1, 2, 3, 4].map((j) => (
                        <span key={j} className="skeleton rec-tile-skeleton" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Recommended
                sections={recSections}
                countryById={countryById}
                currentId={current?.id}
                onPlay={play}
              />
            )}
          </section>
          ) : (
          <section className="list-block" aria-label="Lista de canais">
            {view === 'canais' && tabs.length > 1 && (
              <div className="tabs" role="tablist" aria-label="Categorias">
                <button
                  role="tab"
                  aria-selected={!category}
                  className={!category ? 'is-active' : ''}
                  onClick={() => setCategory('')}
                >
                  Todas
                </button>
                {tabs.map((t) => (
                  <button
                    key={t.id}
                    role="tab"
                    aria-selected={category === t.id}
                    className={category === t.id ? 'is-active' : ''}
                    onClick={() => setCategory(t.id)}
                  >
                    {t.name} <span className="tab-count num">{t.count}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="toolbar">
              <span className="num">{data ? plural(filtered.length, 'canal', 'canais') : '—'}</span>
            </div>

            {error ? (
              <div className="block-message">
                <p>Não foi possível carregar a lista de canais. Verifica a ligação à internet.</p>
                <button className="text-btn" onClick={() => setAttempt((a) => a + 1)}>
                  Tentar outra vez
                </button>
              </div>
            ) : !data ? (
              <ul className="rows" aria-busy="true">
                {Array.from({ length: 8 }, (_, i) => (
                  <li key={i} className="row row-skeleton">
                    <span className="skeleton sk-logo" />
                    <span className="sk-lines">
                      <span className="skeleton sk-name" />
                      <span className="skeleton sk-meta" />
                    </span>
                  </li>
                ))}
              </ul>
            ) : filtered.length === 0 ? (
              <div className="block-message">
                <p>
                  {view === 'favoritos' && !scoped.length
                    ? 'Ainda não guardaste nenhum canal. Toca na estrela ao lado de um canal para o guardares aqui.'
                    : query
                      ? `Nenhum canal com "${query}" aqui.`
                      : 'Nenhum canal com estes filtros.'}
                </p>
              </div>
            ) : (
              <>
                <ul className="rows">
                  {filtered.slice(0, limit).map((c) => (
                    <ChannelRow
                      key={c.id}
                      channel={c}
                      countryLabel={showCountryOnRows ? countryById.get(c.country) : null}
                      playing={current?.id === c.id}
                      isFav={favs.has(c.id)}
                      onPlay={play}
                      onToggleFav={toggle}
                    />
                  ))}
                </ul>
                {limit < filtered.length && (
                  <button className="more" onClick={() => setLimit((l) => l + PAGE)}>
                    Mostrar mais {Math.min(PAGE, filtered.length - limit)}
                    <span className="num"> · {limit} de {filtered.length.toLocaleString('pt-PT')}</span>
                  </button>
                )}
              </>
            )}
          </section>
          )}

          {isDesktop && (
          <aside className="stage stage-desk" aria-label="Player">
            {current ? (
              player
            ) : (
              <section className="stage-card stage-empty">
                <div className="screen screen-idle">
                  <Mark size={32} muted />
                  <p>Escolhe um canal da lista para começar a ver.</p>
                </div>
                <div className="recent">
                  <h2>Vistos recentemente</h2>
                  {recentChannels.length ? (
                    <ul>
                      {recentChannels.map((c) => (
                        <li key={c.id}>
                          <button onClick={() => play(c)}>
                            <Logo channel={c} size={32} />
                            <span className="row-name">{c.name}</span>
                            <span className="row-meta">{countryById.get(c.country)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="recent-empty">
                      Os canais que vires aparecem aqui, para voltares a eles com um toque.
                    </p>
                  )}
                </div>
              </section>
            )}
          </aside>
          )}
        </div>

        <footer className="legal-foot">
          <span>
            Só canais com transmissão aberta na internet. O Mundu TV não aloja nem retransmite vídeo.
          </span>
          <a href="/legal.html">Aviso legal</a>
          <a href={TAKEDOWN_URL} target="_blank" rel="noreferrer">
            Pedir remoção de um canal
          </a>
        </footer>
      </main>

      {inviteVisible && (
        <InstallInvite
          ios={installer.ios}
          canPrompt={installer.canPrompt}
          onInstall={startInstall}
          onDismiss={closeInvite}
        />
      )}
    </div>
  )
}
