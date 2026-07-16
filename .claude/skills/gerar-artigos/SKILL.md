---
name: gerar-artigos
description: Gera artigos do blog a partir das pautas em alta (collection leads). Consome leads pendentes, apura nas fontes, escreve artigo original em pt-BR otimizado para SEO/GEO, gera capa (TMDB + sharp) e cria o post como rascunho no Payload. Use quando o usuário pedir para gerar artigos, processar pautas ou rodar o ciclo de conteúdo.
---

# Gerar artigos a partir das pautas do radar

Pipeline do robô de conteúdo do Dorama Universe. Cada execução: escolher as
melhores pautas pendentes, apurar, escrever, gerar capa e salvar como
**rascunho** para revisão humana no admin do Payload.

Argumento opcional: quantidade de artigos (padrão: **2**) ou um id de lead
específico (ex.: `/gerar-artigos 3` ou `/gerar-artigos lead 42`).

## Passo 1 — Atualizar e escolher pautas

```powershell
pnpm payload run scripts/radar.ts        # descobre pautas novas (barato, sem IA)
pnpm payload run scripts/leads.ts        # lista pendentes por score
```

Critérios de escolha (nesta ordem):
1. `kind=trend` sempre tem prioridade (termo explodindo no Google agora).
2. Maior score / mais fontes.
3. Pular pautas que são divulgação local de eventos pequenos (feiras, shows de
   cover em cidades do interior) e listicles de outros sites — marcar como
   `discarded` com NOTES explicando.
4. Não escrever sobre assunto que já tem post recente: conferir com
   `ACTION=show` e buscar o slug provável em posts (evitar duplicata).

Marcar a pauta escolhida: `ACTION=mark, LEAD=<id>, STATUS=processing`.

## Passo 2 — Apurar

- Ler TODAS as fontes do lead com WebFetch (`ACTION=show` traz os links).
- Se a pauta veio de fonte internacional (Soompi/Koreaboo/Dramabeans), buscar
  com WebSearch o contexto brasileiro: onde assistir no Brasil, horário de
  Brasília, se há data de estreia BR, reação dos fãs brasileiros.
- Confirmar fatos em pelo menos 2 fontes quando possível. Nunca inventar
  datas, números ou declarações.

## Passo 3 — Escrever (regras editoriais)

- **Artigo 100% original em pt-BR.** Nunca traduzir parágrafos literalmente;
  os fatos são a matéria-prima, o texto é nosso.
- 600–1000 palavras. Tom: fã informado — próximo, animado, sem sensacionalismo.
- **Primeiro parágrafo responde a busca** (quem/o quê/quando/onde) — isso é o
  que IAs e featured snippets citam.
- Estrutura: H2/H3 descritivos (usar `<h2>`/`<h3>` no HTML), parágrafos curtos,
  uma lista `<ul>` quando fizer sentido.
- **Ângulo brasileiro sempre**: onde assistir no Brasil, horário de Brasília,
  ingressos/preços em reais, contexto do fandom BR.
- Se existir MV/teaser/trailer oficial no YouTube, incluir embed:
  `<iframe src="https://www.youtube.com/embed/<ID>" ...></iframe>`.
- Palavra-chave principal no título, no slug, no primeiro parágrafo e em 1 H2.
- `metaTitle` ≤ 60 caracteres; `metaDescription` ≤ 155.
- FAQ com 3–4 perguntas reais que as pessoas buscariam (vira schema FAQPage).
- Citar as fontes no campo `sources` (nunca copiar texto ou imagem delas).

### Mapeamento de categoria (slugs existentes)

| Assunto | slug |
|---|---|
| Notícia de dorama/estreia/streaming | `novidades` |
| Vida/carreira de ator ou atriz | `atores` |
| Análise de episódios | `resenha-de-episodios` |
| Matéria sobre uma série (visão geral) | `series` |
| Tudo de música coreana/idols | `k-pop` |

## Passo 4 — Capa

No JSON do artigo, preencher `cover.query` com o nome do dorama/filme/pessoa
para buscar no TMDB (`type`: `tv`, `movie`, `person` ou `multi`) e `cover.alt`
descritivo. Sem resultado no TMDB, o script cai automaticamente no template
brand (degradê + título) — nunca usar imagem de outro site.

## Passo 5 — Publicar (como rascunho)

Salvar o JSON no scratchpad (um arquivo por artigo) no formato documentado em
`scripts/create-post.ts`, com `"leadId"` preenchido e `"publish": false`, e rodar:

```powershell
$env:POST_JSON='<caminho>.json'; pnpm payload run scripts/create-post.ts
```

O script gera a capa, sobe para o R2, cria o post como rascunho e marca o
lead como `done` sozinho.

## Passo 6 — Relatório

Ao final, informar ao usuário: artigos criados (título + link do admin),
pautas descartadas e por quê, e qualquer fato que não foi possível confirmar.
