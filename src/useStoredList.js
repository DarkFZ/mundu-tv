import { useEffect, useState } from 'react'

// Lista de ids guardada no browser (favoritos, vistos recentemente)
function read(key) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

export function useStoredList(key) {
  const [items, setItems] = useState(() => read(key))

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(items))
    } catch {
      /* armazenamento indisponível — continua só em memória */
    }
  }, [key, items])

  return [items, setItems]
}

export function useFavorites() {
  const [list, setList] = useStoredList('iptv:favoritos')
  const favs = new Set(list)
  const toggle = (id) =>
    setList((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  return { favs, toggle }
}

export function useRecent(max = 10) {
  const [list, setList] = useStoredList('mundu:recentes')
  const push = (id) => setList((prev) => [id, ...prev.filter((x) => x !== id)].slice(0, max))
  return { recent: list, push }
}
