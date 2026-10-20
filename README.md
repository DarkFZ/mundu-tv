# Mundu TV — webapp IPTV

Webapp em React + Vite + hls.js que lista e reproduz os canais **públicos** do projeto [iptv-org](https://github.com/iptv-org/iptv).

## Correr localmente

```bash
npm install
npm run dev
```

Abre http://localhost:5173.

## Publicar (Vercel / Netlify)

```bash
npm run build   # gera a pasta dist/
```

Na Vercel: importa o repositório. O preset "Vite" é detetado automaticamente.

## Design

Ver `DESIGN.md`. As skills de design `impeccable` e `taste-skill` estão em `.claude/skills/` e ficam disponíveis em sessões do Claude Code neste repo.

## Como funciona

- `src/api.js` carrega `channels`, `streams`, `countries`, `categories`, `logos` e `blocklist` de `https://iptv-org.github.io/api/`.
  - Remove canais NSFW, encerrados ou bloqueados (DMCA).
  - Mostra os nomes de países e categorias em português (`src/labels.js`).
  - Ordena os streams de cada canal: primeiro HTTPS, sem headers especiais, sem geo-bloqueio.
- `Player.jsx` usa hls.js (ou HLS nativo no Safari/iOS). Se um stream falhar ou não arrancar em 15 s, tenta o seguinte automaticamente.
- Favoritos e canais vistos recentemente ficam guardados no browser.

## Limitações conhecidas

- **HTTP vs HTTPS:** quando a app está publicada em HTTPS, o browser bloqueia streams `http://`. Esses canais aparecem esbatidos. O filtro "Só compatíveis com o browser" esconde-os. Para os suportar, é preciso um proxy no servidor que reescreva as playlists `.m3u8`.
- **Referrer / User-Agent:** alguns streams exigem headers que o browser não deixa definir.
- **Geo-bloqueio e canais offline:** são comuns. A app salta para o próximo stream, mas alguns canais não funcionam de todo.

## Próximos passos

- Guia de programação (EPG) via `guides.json` + [iptv-org/epg](https://github.com/iptv-org/epg)
- PWA (instalar no telemóvel / Smart TV)
- Proxy em Node para streams HTTP
- App Android com Capacitor

## Gravação

O botão **● Gravar** no player guarda o programa que estás a ver.

- Os segmentos HLS são copiados tal como chegam, sem recompressão: mesma qualidade e pouco CPU.
- Ao carregar em **■ Parar**, o ficheiro é descarregado (`.ts`, ou `.mp4` em streams fMP4). Abre no VLC.
- Mudar de canal ou fechar o player também guarda o que já foi gravado.
- A qualidade fica fixa durante a gravação. Limite de 2 GB, porque a gravação fica em memória até parar.
- Não funciona no iPhone/iPad (o Safari usa HLS nativo) nem em streams encriptados.
- Só grava enquanto a página está aberta. Para uso pessoal; não redistribuas o conteúdo.
