import { useEffect, useState } from 'react'

const KEY = 'iptv:favoritos'

function read() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))
  } catch {
    return new Set()
  }
}

export function useFavorites() {
  const [favs, setFavs] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...favs]))
    } catch {
      /* armazenamento indisponível — ignora */
    }
  }, [favs])

  const toggle = (id) =>
    setFavs((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  return { favs, toggle, isFav: (id) => favs.has(id) }
}
