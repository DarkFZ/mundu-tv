// Nomes em português para países e categorias

let regionNames = null
try {
  regionNames = new Intl.DisplayNames(['pt-PT', 'pt'], { type: 'region' })
} catch {
  regionNames = null
}

export function countryName(code, fallback) {
  try {
    const n = regionNames?.of(code)
    if (n && n !== code) return n
  } catch {
    /* código não reconhecido */
  }
  return fallback || code
}

// Países de língua portuguesa aparecem primeiro na barra lateral
export const LUSOPHONE = ['CV', 'PT', 'BR', 'AO', 'MZ', 'GW', 'ST', 'TL', 'GQ']

const CATEGORY_PT = {
  animation: 'Animação',
  auto: 'Automóvel',
  business: 'Economia',
  classic: 'Clássicos',
  comedy: 'Comédia',
  cooking: 'Culinária',
  culture: 'Cultura',
  documentary: 'Documentários',
  education: 'Educação',
  entertainment: 'Entretenimento',
  family: 'Família',
  general: 'Geral',
  kids: 'Infantil',
  legislative: 'Parlamento',
  lifestyle: 'Estilo de vida',
  movies: 'Filmes',
  music: 'Música',
  news: 'Notícias',
  outdoor: 'Ar livre',
  public: 'Serviço público',
  relax: 'Relaxar',
  religious: 'Religião',
  science: 'Ciência',
  series: 'Séries',
  shop: 'Compras',
  sports: 'Desporto',
  travel: 'Viagens',
  weather: 'Meteorologia',
}

export function categoryName(id, fallback) {
  return CATEGORY_PT[id] || fallback || id
}

export function labelName(l) {
  if (l === 'Geo-blocked') return 'Geo-bloqueado'
  if (l === 'Not 24/7') return 'Não 24/7'
  return l
}
