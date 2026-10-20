# Mundu TV — design

Direção dada pela Taste Skill (`.taste-skill/direction.json`): estilo **true-black flat**, seed 1299611519.

- **Pergunta do ecrã:** "O que posso ver agora?" O player é o maior bloco; a lista serve-o.
- **Chão e elevação:** #000 → cartão #111 → painel #2a2a2a. Sem sombras nem bordas em cartões.
- **Cor:** uma só cor de dado, o azul do mar (`--accent: #4cb3f0`), na marca e no canal que está a tocar. Nunca em botões, separadores ou navegação.
- **Ação principal:** pílula branca invertida (Gravar). Vermelho só para gravação e erros.
- **Tipo:** Inter 400/500/600. Título 20, secção 16, corpo 14, meta 13/12. Números em `tabular-nums`.
- **Navegação:** o item ativo só muda de cinzento (#bbb) para branco.
- **Elemento próprio:** a barra lateral começa pelos países de língua portuguesa, com Cabo Verde primeiro.
- **Linhas de canais:** logótipo numa placa clara, nome, um só estado (Geo-bloqueado, Não 24/7, Só HTTP) ou a qualidade, e a estrela.
- **Telemóvel:** a barra lateral dobra para a barra de topo; o seletor de país é o título; o player fica preso ao topo enquanto se percorre a lista.
- **Ícones:** Lucide, traço 1.5–1.75. Sem emoji nem glifos Unicode.

Skills instaladas em `.claude/skills/`: `impeccable` (Apache 2.0) e `taste-skill` (MIT).
