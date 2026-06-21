# Deploy — Arquitetura dividida (Frontend Cloudflare + Backend Portainer)

```
Navegador ──▶ doramauniverse.com         (FRONTEND - Cloudflare)
                   │  fetch HTTPS (API REST)
                   ▼
              api.doramauniverse.com       (BACKEND Payload - Portainer/Docker)
                   ├── Supabase (Postgres)
                   └── Cloudflare R2 (imagens)
```

- **Frontend** (`frontend/`): Next.js que **lê via API REST** do backend. Roda na Cloudflare.
- **Backend** (raiz do projeto): Payload = **/admin + API**, no Portainer (o que já buildamos).
- Imagens: servidas pelo backend ou, melhor, por um **domínio público do R2**.

---

## Parte 1 — Backend (Portainer)

É o mesmo container que já preparamos. Só precisa de uma variável a mais:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | connection string do Supabase |
| `PAYLOAD_SECRET` | segredo do Payload |
| `PAYLOAD_PUBLIC_SERVER_URL` | `https://api.doramauniverse.com` |
| `FRONTEND_URL` | `https://doramauniverse.com` ← **novo** (libera CORS/comentários) |
| `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | credenciais do R2 |

Depois: aponte o proxy reverso de **`api.doramauniverse.com`** → container na porta **3005**, com HTTPS.

> O `/admin` do site fica em `https://api.doramauniverse.com/admin`.

---

## Parte 2 — Frontend (Cloudflare)

> Observação: a forma atual e recomendada de rodar Next.js na Cloudflare é via
> **Workers + adaptador OpenNext** (que substituiu o antigo "Pages adapter"). O site
> roda igual na borda da Cloudflare, com domínio próprio.

### 2.1 Variáveis de build (no painel da Cloudflare)
| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.doramauniverse.com` |
| `NEXT_PUBLIC_MEDIA_BASE` | `https://cdn.doramauniverse.com` (opcional — ver Parte 3) |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | `ca-pub-8751006394850232` |
| `NEXT_PUBLIC_ADSENSE_SLOT_HOME` | (vazio) |

### 2.2 Deploy via Wrangler (mais direto)
No seu PC ou num runner, dentro da pasta `frontend/`:
```bash
cd frontend
npm install
# autentica na Cloudflare (abre o navegador uma vez)
npx wrangler login
# build do Next + empacota com OpenNext + publica
npm run deploy
```
Isso cria um Worker chamado `dorama-universe`. Depois, no painel da Cloudflare
(Workers & Pages → dorama-universe → Settings → Domains), adicione o domínio
**`doramauniverse.com`**.

### 2.3 Alternativa: deploy automático pelo Git
Workers & Pages → **Create** → conecta o repositório `reynario/dorama-universe`:
- **Root directory:** `frontend`
- **Build command:** `npm run build` (e o deploy do Worker via OpenNext)
- Defina as variáveis da tabela 2.1

---

## Parte 3 — Imagens via domínio público do R2 (recomendado)

Hoje as imagens são servidas pelo backend (`/api/media/file/...`). Para virem direto da
CDN da Cloudflare (mais rápido e sem passar pelo Node):

1. Cloudflare → R2 → bucket `dorama-universe-media` → **Settings** → **Public access** →
   conecte um **domínio público** (ex.: `cdn.doramauniverse.com`).
2. No frontend, defina `NEXT_PUBLIC_MEDIA_BASE=https://cdn.doramauniverse.com`.

Pronto: o frontend monta as URLs das imagens (capas e do meio dos posts) apontando pra CDN.
Se deixar `NEXT_PUBLIC_MEDIA_BASE` vazio, as imagens são servidas pelo backend (também funciona).

---

## Parte 4 — DNS (Cloudflare)

| Subdomínio | Aponta para |
|---|---|
| `doramauniverse.com` | o Worker/frontend da Cloudflare |
| `api.doramauniverse.com` | IP do servidor do Portainer (proxy → :3005) |
| `cdn.doramauniverse.com` | bucket público do R2 (opcional) |

---

## Checklist final
- [ ] Backend no Portainer no ar em `api.doramauniverse.com` (com `FRONTEND_URL`)
- [ ] Frontend publicado na Cloudflare com as `NEXT_PUBLIC_*`
- [ ] `doramauniverse.com` → frontend; `api.` → backend
- [ ] (Opcional) R2 público em `cdn.doramauniverse.com`
- [ ] Testar home, um artigo e enviar um comentário
- [ ] AdSense passa a exibir após o site no ar + aprovação do Google
