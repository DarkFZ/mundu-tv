# Mundu TV — design

Direção dada pela Taste Skill (`.taste-skill/direction.json`): estilo **true-black flat**, seed 1299611519.

- **Pergunta do ecrã:** "O que posso ver agora?" O player é o maior bloco; a lista serve-o.
- **Chão e elevação:** #000 → cartão #111 → painel #2a2a2a. Sem sombras nem bordas em cartões.
- **Cor:** identidade Mundu TV (ver `src/brand.css`): fundo azul-noite `#0B1020`, azul *mar* `#5B8CFF` na marca, no canal a tocar e no botão principal; amarelo *sol* `#FFC233` no foco e nos favoritos; vermelho *vivo* `#FF5470` só para direto e erros. Logótipos em `public/brand/`.
- **Ação principal:** pílula branca invertida (ex.: Abrir o serviço oficial de um canal pago). Vermelho só para direto e erros.
- **Tipo:** Inter 400/500/600. Título 20, secção 16, corpo 14, meta 13/12. Números em `tabular-nums`.
- **Navegação:** o item ativo só muda de cinzento (#bbb) para branco.
- **Elemento próprio:** a barra lateral começa pelos países de língua portuguesa, com Cabo Verde primeiro.
- **Linhas de canais:** logótipo numa placa clara, nome, um só estado (Assinatura, Não 24/7) ou a qualidade, e a estrela.
- **Telemóvel:** a barra lateral dobra para a barra de topo; o seletor de país é o título; o player fica preso ao topo enquanto se percorre a lista.
- **Ícones:** Lucide, traço 1.5–1.75. Sem emoji nem glifos Unicode.

Skills instaladas em `.claude/skills/`: `impeccable` (Apache 2.0) e `taste-skill` (MIT).
