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

## Como funciona

- `src/api.js` carrega `channels`, `streams`, `countries`, `categories`, `logos` e `blocklist` de `https://iptv-org.github.io/api/`.
  - Remove canais NSFW, encerrados ou bloqueados (DMCA).
  - Ordena os streams de cada canal: primeiro HTTPS, sem headers especiais, sem geo-bloqueio.
- `Player.jsx` usa hls.js (ou HLS nativo no Safari/iOS). Se um stream falhar ou não arrancar em 15 s, tenta o seguinte automaticamente.
- Favoritos são guardados em `localStorage`.

## Limitações conhecidas

- **HTTP vs HTTPS:** quando a app está publicada em HTTPS, o browser bloqueia streams `http://`. Esses canais aparecem esbatidos. O filtro "Só compatíveis com o browser" esconde-os. Para os suportar, é preciso um proxy no servidor que reescreva as playlists `.m3u8`.
- **Referrer / User-Agent:** alguns streams exigem headers que o browser não deixa definir.
- **Geo-bloqueio e canais offline:** são comuns. A app salta para o próximo stream, mas alguns canais não funcionam de todo.

## Próximos passos

- Guia de programação (EPG) via `guides.json` + [iptv-org/epg](https://github.com/iptv-org/epg)
- PWA (instalar no telemóvel / Smart TV)
- Proxy em Node para streams HTTP
- App Android com Capacitor
