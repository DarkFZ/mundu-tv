import { Share, SquarePlus, X } from 'lucide-react'

export default function InstallInvite({ ios, canPrompt, onInstall, onDismiss }) {
  return (
    <div className="invite" role="dialog" aria-labelledby="invite-title" aria-describedby="invite-text">
      <button className="icon-btn invite-close" onClick={onDismiss} aria-label="Fechar">
        <X size={18} strokeWidth={1.75} />
      </button>
      <img className="invite-icon" src="/icon-192.png" alt="" width="56" height="56" />
      <div className="invite-body">
        <h2 id="invite-title">Instala o Mundu TV</h2>
        {canPrompt || !ios ? (
          <p id="invite-text">
            Fica no ecrã principal como uma app: abre num toque, em ecrã inteiro, sem a barra do browser.
          </p>
        ) : (
          <ol id="invite-text" className="invite-steps">
            <li>
              No Safari, toca em <Share size={16} strokeWidth={1.75} aria-label="Partilhar" /> Partilhar.
            </li>
            <li>
              Escolhe <SquarePlus size={16} strokeWidth={1.75} aria-hidden="true" /> Adicionar ao ecrã
              principal.
            </li>
          </ol>
        )}
        <div className="invite-actions">
          {canPrompt ? (
            <>
              <button className="btn btn-primary" onClick={onInstall}>
                Instalar
              </button>
              <button className="btn btn-ghost" onClick={onDismiss}>
                Agora não
              </button>
            </>
          ) : (
            <button className="btn btn-secondary" onClick={onDismiss}>
              Percebi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
