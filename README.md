# Mundu TV — webapp IPTV

Webapp em React + Vite + hls.js que lista e reproduz canais com **transmissão aberta** na internet, a partir do projeto [iptv-org](https://github.com/iptv-org/iptv).

## Legalidade

O Mundu TV é um guia, não um distribuidor. As regras estão em `src/api.js` (`isLegalStream`) e o aviso para o público em `public/legal.html` (link no rodapé da app).

- **Não retransmite:** não há proxy nem servidor pelo meio. O browser (ou a TV, ao projetar) liga-se diretamente ao servidor do canal.
- **Só streams diretos e abertos:** HTTPS, sem Referer/User-Agent falsificados e sem geo-bloqueio. Os streams que precisavam disto ficam de fora.
- **Respeita remoções:** a lista de bloqueio do iptv-org (pedidos DMCA) e os pedidos feitos ao Mundu TV, em `src/legal.js`.
- **Canais pagos só como atalho:** SPORT TV e SporTV aparecem com o selo "Assinatura" e abrem o serviço oficial. Nunca se toca o sinal na app.
- **Sem gravação nem descargas.**

### Pedidos de remoção

1. O titular abre uma issue com a etiqueta `remoção` (link no rodapé da app e no aviso legal).
2. Junta o id do canal a `REMOVED_CHANNELS` em `src/legal.js` e publica. O canal sai da lista.
3. Responde na issue e fecha-a.

Cria a etiqueta `remoção` no GitHub (*Issues → Labels*) para o link já a trazer preenchida.

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
  - Remove canais NSFW, encerrados, bloqueados (DMCA) e os de `src/legal.js`.
  - Só aceita streams que cumprem as regras da secção "Legalidade".
  - Mostra os nomes de países e categorias em português (`src/labels.js`).
- `Player.jsx` usa hls.js (ou HLS nativo no Safari/iOS). Se um stream falhar ou não arrancar em 15 s, tenta o seguinte automaticamente.
- Favoritos e canais vistos recentemente ficam guardados no browser.

## Limitações conhecidas

- **Menos canais:** os que só tinham stream HTTP, com headers especiais ou geo-bloqueado já não aparecem. É o preço de não retransmitir nem contornar proteções.
- **Canais offline:** são comuns. A app salta para o próximo stream, mas alguns canais não funcionam de todo.

## Próximos passos

- PWA (instalar no telemóvel / Smart TV)
- App Android com Capacitor

## Canais com direto oficial

Canais que não têm stream a funcionar no iptv-org mas transmitem em direto oficialmente no YouTube estão em `src/extra.js`, e aparecem primeiro no seu país. Hoje: **TCV**, pelo canal oficial da RTC (@rtc.caboverde). Tocam no leitor oficial do YouTube.

O mesmo ficheiro tem os atalhos para canais pagos (`subscription`): mostram o selo "Assinatura" e um botão para o serviço oficial.

## Programação (EPG)

- A GitHub Action `.github/workflows/epg.yml` corre às 04:17 e às 16:17 UTC (e à mão, em *Actions → EPG → Run workflow*).
- `scripts/epg/channels.mjs` escolhe os canais: os da app nos países lusófonos (ou os que indicares no campo "countries"), com a melhor fonte do [iptv-org/epg](https://github.com/iptv-org/epg) para cada um.
- O grabber descarrega 2 dias de programação; `scripts/epg/publish.mjs` converte-a num JSON por canal, publicado no branch `epg-data` (um só commit, sempre substituído; a Vercel não faz deploy desse branch).
- No player aparece o que está a dar (com barra de progresso), o seguinte e a lista por dia. Canais sem fonte de programação não mostram nada.
- A TCV usa o guia da TCV Internacional (`epgId` em `src/extra.js`).

## Projetar na TV

O botão de projetar aparece no player quando há como enviar o canal para a TV (`src/cast.js`).

- **Chromecast / Google TV / Android TV:** no Chrome (Android ou PC), pelo Google Cast. A TV vai buscar o stream sozinha; o telemóvel pausa e pode até bloquear o ecrã. Mudar de canal com a TV ligada envia logo o novo canal.
- **AirPlay:** no Safari (iPhone, iPad, Mac), pelo seletor nativo. O botão só aparece se houver uma Apple TV ou TV compatível na rede.
- Streams MPEG-TS contínuos e canais do YouTube não usam este botão (o leitor do YouTube tem o seu próprio).
- Smart TVs sem Chromecast nem AirPlay (Miracast, "Smart View") só por espelhamento do ecrã, nas definições do telemóvel.
