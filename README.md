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

## App instalável (PWA)

- `public/manifest.webmanifest`: nome, cores, ícones (normal e *maskable*) e um atalho para os Favoritos.
- `public/sw.js`: guarda a app para abrir depressa e sem rede. Não guarda streams nem a API.
- Na primeira visita aparece um convite para instalar. No Android/Chrome/Edge abre o diálogo do browser; no iPhone mostra os passos do Safari. Depois de fechado, não volta, mas fica o botão **Instalar app** (barra lateral, ou ícone de download no telemóvel).
- O logótipo (ecrã com um anel de dez pontos, as dez ilhas) está em `src/components/Mark.jsx` e `public/icon.svg`.

## Design

Ver `DESIGN.md`. As skills de design `impeccable` e `taste-skill` estão em `.claude/skills/` e ficam disponíveis em sessões do Claude Code neste repo.

## Como funciona

- `src/api.js` carrega `channels`, `streams`, `countries`, `categories`, `logos` e `blocklist` de `https://iptv-org.github.io/api/`.
  - Remove canais NSFW, encerrados ou bloqueados (DMCA).
  - Mostra os nomes de países e categorias em português (`src/labels.js`).
  - Ordena os streams de cada canal: primeiro HTTPS, sem headers especiais, sem geo-bloqueio.
- `api/proxy.js` (Vercel Function) resolve dois problemas do browser:
  - **HTTP num site HTTPS:** o browser bloqueia streams `http://`. O proxy vai buscá-los no servidor e devolve-os por HTTPS.
  - **Referrer / User-Agent:** envia os headers que alguns canais exigem e que o browser não deixa definir.
  - As playlists `.m3u8` são reescritas para que sub-playlists, segmentos, chaves e `EXT-X-MAP` passem também pelo proxy. Os segmentos HTTPS de canais sem headers continuam diretos.
  - Recusa endereços internos (localhost, redes privadas) e conteúdo que não seja vídeo/áudio.
  - Liga-se sozinho no site publicado. `VITE_PROXY=off` desliga; `VITE_PROXY=<url>` usa outro proxy (por exemplo, em `npm run dev`, que não corre a pasta `api/`; para testar tudo localmente usa `vercel dev`).
- `Player.jsx` usa hls.js (ou HLS nativo no Safari/iOS). Se um stream falhar ou não arrancar em 15 s, tenta o seguinte automaticamente.
- Favoritos e canais vistos recentemente ficam guardados no browser.

## Limitações conhecidas

- **Geo-bloqueio pelo proxy:** os streams que passam pelo proxy saem dos servidores da Vercel, não da tua rede. Um canal geo-bloqueado pode funcionar ou não conforme a região da função.
- **Tráfego:** cada canal pelo proxy gasta transferência da Vercel (o plano Hobby tem um limite mensal). Os streams HTTPS continuam diretos e não gastam nada.
- **Geo-bloqueio e canais offline:** são comuns. A app salta para o próximo stream, mas alguns canais não funcionam de todo.

## Próximos passos

- Guia de programação (EPG) via `guides.json` + [iptv-org/epg](https://github.com/iptv-org/epg)
- PWA (instalar no telemóvel / Smart TV)
- App Android com Capacitor

## Canais com direto oficial

Canais que não têm stream a funcionar no iptv-org mas transmitem em direto oficialmente no YouTube estão em `src/extra.js`, e aparecem primeiro no seu país. Hoje: **TCV**, pelo canal oficial da RTC (@rtc.caboverde). Tocam no leitor do YouTube e não podem ser gravados.

## Projetar na TV

O botão de projetar aparece no player quando há como enviar o canal para a TV (`src/cast.js`).

- **Chromecast / Google TV / Android TV:** no Chrome (Android ou PC), pelo Google Cast. A TV vai buscar o stream sozinha; o telemóvel pausa e pode até bloquear o ecrã. Mudar de canal com a TV ligada envia logo o novo canal.
- **AirPlay:** no Safari (iPhone, iPad, Mac), pelo seletor nativo. O botão só aparece se houver uma Apple TV ou TV compatível na rede.
- Canais que passam pelo proxy funcionam na TV (o URL enviado é o do proxy, HTTPS).
- Streams MPEG-TS contínuos e canais do YouTube não usam este botão (o leitor do YouTube tem o seu próprio).
- Smart TVs sem Chromecast nem AirPlay (Miracast, "Smart View") só por espelhamento do ecrã, nas definições do telemóvel.

## Gravação

O botão **● Gravar** no player guarda o programa que estás a ver.

- Os segmentos HLS são copiados tal como chegam, sem recompressão: mesma qualidade e pouco CPU.
- Ao carregar em **■ Parar**, o ficheiro é descarregado (`.ts`, ou `.mp4` em streams fMP4). Abre no VLC.
- Mudar de canal ou fechar o player também guarda o que já foi gravado.
- A qualidade fica fixa durante a gravação. Limite de 2 GB, porque a gravação fica em memória até parar.
- Não funciona no iPhone/iPad (o Safari usa HLS nativo) nem em streams encriptados.
- Só grava enquanto a página está aberta. Para uso pessoal; não redistribuas o conteúdo.
