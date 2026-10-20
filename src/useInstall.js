import { useEffect, useState } from 'react'

const DISMISS_KEY = 'mundu:convite-instalar'

// O browser só oferece instalação depois de o site cumprir os requisitos de PWA.
// Guardamos esse evento para mostrar o nosso próprio convite.
let deferred = null
const listeners = new Set()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.navigator.standalone === true
  )
}

function isIOS() {
  const ua = navigator.userAgent
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1'
  } catch {
    return false
  }
}

export function useInstall() {
  const [, force] = useState(0)
  const [dismissed, setDismissed] = useState(readDismissed)
  const [standalone] = useState(isStandalone)
  const ios = isIOS()

  useEffect(() => {
    const l = () => force((n) => n + 1)
    listeners.add(l)
    return () => listeners.delete(l)
  }, [])

  const canPrompt = !!deferred
  const available = !standalone && (canPrompt || ios)

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* sem armazenamento: o convite volta na próxima visita */
    }
  }

  const install = async () => {
    if (!deferred) return false
    deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null
    force((n) => n + 1)
    if (outcome === 'accepted') dismiss()
    return outcome === 'accepted'
  }

  return {
    available, // dá para instalar (ou mostrar instruções no iPhone)
    canPrompt, // o browser abre o diálogo de instalação
    ios,
    showInvite: available && !dismissed, // primeira visita: mostrar o convite
    install,
    dismiss,
  }
}
