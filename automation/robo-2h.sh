#!/usr/bin/env bash
# =============================================================================
# ROBO DE CONTEUDO - ciclo de 2 em 2 horas (cron)
#
# 1. Roda o radar (gratis, sem IA): descobre pautas em alta e grava na fila.
# 2. Se houver pauta pendente com score bom, chama o Claude Code em modo
#    headless para escrever ate N artigos (rascunhos no admin do Payload).
#
# Instalacao: ver docs/ROBO-SERVIDOR.md
# Crontab sugerido (a cada 2h, minuto 10):
#   10 */2 * * * /opt/dorama-universe/automation/robo-2h.sh >> /var/log/robo-dorama.log 2>&1
# =============================================================================
set -u

# ---------- configuracao ----------
REPO_DIR="${REPO_DIR:-/opt/dorama-universe}"   # clone do repositorio no servidor
MIN_SCORE="${MIN_SCORE:-45}"                   # score minimo para acionar a IA
ARTIGOS_POR_CICLO="${ARTIGOS_POR_CICLO:-2}"    # maximo de artigos por execucao
CLAUDE_BIN="${CLAUDE_BIN:-claude}"             # caminho do Claude Code CLI
LOCK_FILE="/tmp/robo-dorama.lock"

cd "$REPO_DIR" || { echo "[robo] ERRO: repo nao encontrado em $REPO_DIR"; exit 1; }

echo "=============================================="
echo "[robo] ciclo iniciado em $(date '+%Y-%m-%d %H:%M:%S')"

# trava: nao deixa dois ciclos rodarem ao mesmo tempo (artigo demora)
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[robo] ciclo anterior ainda em execucao; saindo."
  exit 0
fi

# ---------- 1. radar (sem IA) ----------
echo "[robo] rodando radar..."
pnpm payload run scripts/radar.ts || echo "[robo] AVISO: radar falhou (segue para o gate)"

# ---------- 2. gate: tem pauta boa? ----------
COUNT=$(ACTION=count MIN_SCORE="$MIN_SCORE" pnpm payload run scripts/leads.ts 2>/dev/null \
  | grep -oP 'PENDENTES=\K[0-9]+' || echo 0)
echo "[robo] pautas pendentes com score >= $MIN_SCORE: $COUNT"

if [ "$COUNT" -eq 0 ]; then
  echo "[robo] nada quente na fila; ciclo encerrado sem gastar IA."
  exit 0
fi

# ---------- 3. gerar artigos com o Claude Code (headless) ----------
N=$(( COUNT < ARTIGOS_POR_CICLO ? COUNT : ARTIGOS_POR_CICLO ))
echo "[robo] chamando Claude Code para gerar $N artigo(s)..."

"$CLAUDE_BIN" -p "/gerar-artigos $N" \
  --allowedTools "Bash,Read,Write,Edit,Glob,Grep,WebFetch,WebSearch,Skill,TodoWrite" \
  --output-format text \
  || echo "[robo] AVISO: claude retornou erro (ver acima)"

echo "[robo] ciclo encerrado em $(date '+%Y-%m-%d %H:%M:%S')"
