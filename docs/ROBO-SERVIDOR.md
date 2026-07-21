# Robô de conteúdo no servidor (cron de 2 em 2 horas)

O ciclo automático roda no mesmo servidor do backend:

1. **Radar** (grátis, sem IA): lê Google Trends BR + Google News + Soompi/Koreaboo/
   Dramabeans e grava pautas na collection `leads`.
2. **Gate**: se não houver pauta pendente com score ≥ 45, o ciclo termina aqui
   (não gasta nada).
3. **Claude Code headless**: escreve até 2 artigos por ciclo seguindo a skill
   `/gerar-artigos` — apuração nas fontes, texto original em pt-BR, capa dupla
   (TMDB + sharp) e post criado como **rascunho** para revisão no admin.

Custo: o radar é só RSS; a redação consome a assinatura do Claude (sem fatura
de API).

---

## Instalação (uma vez, via SSH)

### 1. Node 20+, pnpm e dependências

```bash
# Node 22 (se o servidor ainda não tiver)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo npm i -g pnpm

# clone dedicado do robô (separado do clone usado para buildar a imagem Docker)
sudo git clone https://github.com/reynario/dorama-universe.git /opt/dorama-universe
cd /opt/dorama-universe
pnpm install   # instala com devDependencies (tsx, fast-xml-parser)
```

> Se o `pnpm install` reclamar de builds ignoradas (sharp), confirme que o
> `pnpm-workspace.yaml` tem a chave `allowBuilds` liberando `sharp`.

### 2. `.env` do robô

```bash
cp .env.example .env
nano .env
```

Preencher com os MESMOS valores do stack do Portainer:
`DATABASE_URL`, `PAYLOAD_SECRET`, `R2_BUCKET`, `R2_ENDPOINT`,
`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `TMDB_API_KEY` e
`PAYLOAD_PUBLIC_SERVER_URL=https://api.doramauniverse.com`.

Teste: `pnpm payload run scripts/leads.ts` deve listar a fila.

### 3. Claude Code CLI (login único)

```bash
sudo npm i -g @anthropic-ai/claude-code
claude setup-token   # abre o fluxo de login; usar a conta da assinatura
```

Teste rápido (gera 1 artigo de verdade):

```bash
cd /opt/dorama-universe
claude -p "/gerar-artigos 1" --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,Skill,TodoWrite"
```

### 4. Cron

```bash
chmod +x /opt/dorama-universe/automation/robo-2h.sh
sudo touch /var/log/robo-dorama.log && sudo chown $USER /var/log/robo-dorama.log
crontab -e
```

Adicionar (a cada 2 horas, no minuto 10):

```cron
10 */2 * * * /opt/dorama-universe/automation/robo-2h.sh >> /var/log/robo-dorama.log 2>&1
```

Acompanhar: `tail -f /var/log/robo-dorama.log`

---

## Ajustes finos (variáveis no topo do robo-2h.sh ou no crontab)

| Variável | Padrão | Efeito |
|---|---|---|
| `MIN_SCORE` | 45 | score mínimo de pauta para acionar a IA |
| `ARTIGOS_POR_CICLO` | 2 | máximo de artigos por execução |
| `REPO_DIR` | /opt/dorama-universe | onde o clone do robô está |

- **Aprovação**: os artigos entram como rascunho — publicar no admin
  (`/admin/collections/posts`, filtro Status = Draft).
- **Publicação automática** (quando confiar na qualidade): mudar
  `"publish": false` para `true` na skill `.claude/skills/gerar-artigos/SKILL.md`
  (passo 5) e o robô publica direto.
- **Atualizar o robô** após mudanças no repositório:
  `cd /opt/dorama-universe && git pull && pnpm install`.
- **Pausar o robô**: `crontab -e` e comentar a linha com `#`.
