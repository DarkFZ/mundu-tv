// Velocidade da internet e preferência "Poupar dados".
//
// O browser (Chrome, Edge, Android) diz em navigator.connection a velocidade
// estimada (downlink, em Mbit/s), o tipo (2g, 3g, 4g) e se a pessoa ligou o
// modo de poupança de dados. O Safari não diz nada: aí conta só a preferência
// escolhida na app e o que o hls.js mede ao descarregar os segmentos.
import { useEffect, useState } from 'react'

const KEY = 'mundu:qualidade' // 'auto' | 'poupar'

function connection() {
  return typeof navigator !== 'undefined' ? navigator.connection : undefined
}

export function getQualityPref() {
  try {
    return localStorage.getItem(KEY) === 'poupar' ? 'poupar' : 'auto'
  } catch {
    return 'auto'
  }
}

export function setQualityPref(v) {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    /* sem armazenamento: vale só nesta sessão */
  }
  window.dispatchEvent(new Event('mundu:qualidade'))
}

// Ligação lenta: 2g/3g, menos de 1,5 Mbit/s, ou poupança de dados do sistema
export function isSlowConnection() {
  const c = connection()
  if (!c) return false
  return Boolean(c.saveData) || ['slow-2g', '2g', '3g'].includes(c.effectiveType) || (c.downlink > 0 && c.downlink < 1.5)
}

// Altura máxima a pedir (em linhas), ou 0 para não limitar
export function maxHeightForConnection() {
  const c = connection()
  if (getQualityPref() === 'poupar' || c?.saveData) return 360
  if (c && ['slow-2g', '2g'].includes(c.effectiveType)) return 240
  if (isSlowConnection()) return 480
  return 0
}

// Estimativa inicial de largura de banda (bit/s) para o hls.js escolher a
// primeira qualidade sem ter de adivinhar
export function initialBandwidthEstimate() {
  const c = connection()
  if (c?.downlink > 0) return Math.round(c.downlink * 1_000_000 * 0.8) // margem de 20%
  return 1_000_000 // sem informação: começa prudente (≈ 360p-480p)
}

// Atualiza a interface quando muda a ligação ou a preferência
export function useNetwork() {
  const read = () => ({ pref: getQualityPref(), slow: isSlowConnection(), maxHeight: maxHeightForConnection() })
  const [state, setState] = useState(read)
  useEffect(() => {
    const on = () => setState(read())
    const c = connection()
    c?.addEventListener?.('change', on)
    window.addEventListener('mundu:qualidade', on)
    window.addEventListener('online', on)
    return () => {
      c?.removeEventListener?.('change', on)
      window.removeEventListener('mundu:qualidade', on)
      window.removeEventListener('online', on)
    }
  }, [])
  return state
}
