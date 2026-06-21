# syntax=docker/dockerfile:1

# Imagem base: Debian slim (mais compativel com o sharp/Payload do que Alpine)
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# ---------- dependencias ----------
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# O pnpm 11 nao executa os build scripts das dependencias por padrao
# (erro ERR_PNPM_IGNORED_BUILDS). Por isso instalamos e, em seguida, compilamos
# explicitamente o sharp (binario nativo essencial para o Payload) e o esbuild.
# O "|| true" tolera o aviso de build ignorado; o passo seguinte e que importa.
RUN pnpm install --frozen-lockfile --prod=false || true
RUN pnpm rebuild sharp esbuild

# ---------- build ----------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# As variaveis NEXT_PUBLIC_* sao embutidas no bundle do cliente em tempo de BUILD,
# por isso entram como build args (sao publicas, sem problema de seguranca).
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_SLOT_HOME
ENV NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT
ENV NEXT_PUBLIC_ADSENSE_SLOT_HOME=$NEXT_PUBLIC_ADSENSE_SLOT_HOME

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build

# ---------- runtime ----------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# usuario nao-root
RUN groupadd -r nodejs && useradd -r -g nodejs nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

USER nextjs
EXPOSE 3000

# Healthcheck usando o fetch nativo do Node 22
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["pnpm", "start"]
