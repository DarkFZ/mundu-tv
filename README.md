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
- `Player.jsx` usa hls.js (ou HLS nativo no Safari/iOS). Se um stream falhar ou não arrancar em 15 s, tenta o seguinte automaticamente.
- Favoritos e canais vistos recentemente ficam guardados no browser.

## Limitações conhecidas

- **HTTP vs HTTPS:** quando a app está publicada em HTTPS, o browser bloqueia streams `http://`. Esses canais aparecem esbatidos. O filtro "Só compatíveis com o browser" esconde-os. Para os suportar, é preciso um proxy no servidor que reescreva as playlists `.m3u8`.
- **Referrer / User-Agent:** alguns streams exigem headers que o browser não deixa definir.
- **Geo-bloqueio e canais offline:** são comuns. A app salta para o próximo stream, mas alguns canais não funcionam de todo.

## Guia de programação (Agora / A seguir)

O player mostra o programa que está a dar, uma barra de progresso, o programa seguinte e, no computador, a lista do resto do dia.

- `.github/workflows/epg.yml` corre de 6 em 6 horas (ou à mão, em **Actions → EPG → Run workflow**):
  1. instala o grabber do [iptv-org/epg](https://github.com/iptv-org/epg);
  2. `scripts/epg/channels.mjs` escolhe, para cada canal da app, um site com guia (`guides.json`), preferindo o mesmo feed do stream e programação em português;
  3. descarrega 2 dias de programação para `guide.xml` (XMLTV);
  4. `scripts/epg/split.mjs` parte-o num ficheiro JSON por canal e publica tudo no ramo **`epg`**.
- A app lê `index.json` e `<canal>.json` de `https://raw.githubusercontent.com/Darkfz/mundu-tv/epg/` (muda com `VITE_EPG_BASE`). Código em `src/epg.js` e `src/components/NowNext.jsx`.
- Países com guia: variável do repositório `EPG_COUNTRIES` (por omissão `CV,PT,BR,AO,MZ,GW,ST,TL,ES,FR,GB,US`). Dias: `EPG_DAYS` (2).
- O `vercel.json` impede a Vercel de tentar publicar o ramo `epg`.
- Nem todos os canais têm guia: muitos canais pequenos e locais não aparecem em nenhum site suportado. Nesses mostra-se "Sem guia de programação para este canal".

## Próximos passos

- PWA (instalar no telemóvel / Smart TV)
- Proxy em Node para streams HTTP
- App Android com Capacitor

## Canais com direto oficial

Canais que não têm stream a funcionar no iptv-org mas transmitem em direto oficialmente no YouTube estão em `src/extra.js`, e aparecem primeiro no seu país. Hoje: **TCV**, pelo canal oficial da RTC (@rtc.caboverde). Tocam no leitor do YouTube e não podem ser gravados.

## Gravação

O botão **● Gravar** no player guarda o programa que estás a ver.

- Os segmentos HLS são copiados tal como chegam, sem recompressão: mesma qualidade e pouco CPU.
- Ao carregar em **■ Parar**, o ficheiro é descarregado (`.ts`, ou `.mp4` em streams fMP4). Abre no VLC.
- Mudar de canal ou fechar o player também guarda o que já foi gravado.
- A qualidade fica fixa durante a gravação. Limite de 2 GB, porque a gravação fica em memória até parar.
- Não funciona no iPhone/iPad (o Safari usa HLS nativo) nem em streams encriptados.
- Só grava enquanto a página está aberta. Para uso pessoal; não redistribuas o conteúdo.
