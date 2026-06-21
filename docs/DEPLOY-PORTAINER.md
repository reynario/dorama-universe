# Deploy do Dorama Universe no Portainer

O site é **um único container** (Next.js + Payload). O banco (**Supabase**) e as imagens
(**Cloudflare R2**) são serviços externos — não precisam de container nem de volume.

---

## 1. Pré-requisitos

- Um servidor com **Docker + Portainer** já instalados.
- O **domínio** `doramauniverse.com` apontando (DNS tipo A) para o IP do servidor.
- Um **proxy reverso** para HTTPS (Nginx Proxy Manager ou Traefik). A maioria dos setups
  de Portainer já tem um. Ele vai encaminhar o domínio para o container na porta `3000`.
- O servidor precisa de uns **8 GB de RAM livres durante o build** (o build do Next usa bastante).

---

## ⚠️ Antes: seu Portainer é Swarm ou standalone?

Na tela de criar stack, olhe a frase logo abaixo do nome:

- Se disser **"...equivalent of the `docker stack deploy` command"** → é **Swarm**.
  Swarm **não builda** imagem a partir do compose. Siga a **Seção A (Swarm)** abaixo.
- Se disser **"...equivalent of `docker-compose`"** → é **standalone**. Siga a
  **Seção B (standalone)** — o build pelo compose funciona.

> Em qualquer compose, o conteúdo precisa começar com `services:` e o serviço fica
> indentado abaixo. Se colar começando direto em `dorama-universe:`, dá o erro
> *"Additional property dorama-universe is not allowed"*.

---

## Seção A — Portainer em modo Swarm

Como o Swarm não builda, você **builda a imagem uma vez** e depois sobe o stack que
**usa** essa imagem.

### A.1 Buildar a imagem (via SSH no servidor)

```bash
git clone <url-do-seu-repo> dorama-universe
cd dorama-universe
docker build --build-arg NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-8751006394850232 -t dorama-universe:latest .
```

> Em Swarm de **um nó só**, a imagem local já basta. Se for **vários nós**, faça push
> para um registry e use o nome completo da imagem no stack.

### A.2 Subir o stack

Portainer → Stacks → Add stack → **Web editor**, cole o conteúdo de **`docker-stack.yml`**
(esse arquivo já está no projeto, é só pra Swarm) e preencha as variáveis (passo 4).

---

## Seção B — Portainer standalone

Use o **`docker-compose.yml`** (tem o `build:`). Confirme que ele começa com `services:`.
Pode usar o método **Repository** (recomendado) ou **Web editor**.

---

## 2. Colocar o código onde o Portainer alcança

A forma mais simples no Portainer é **deploy a partir de um repositório Git**:

1. Suba este projeto para um repositório (ex.: GitHub privado).
2. **Não** suba o arquivo `.env` (ele já está no `.gitignore`). Os segredos vão nas
   variáveis de ambiente do Portainer (passo 4).

> Alternativa sem Git: build manual no servidor com
> `docker compose build && docker compose up -d` (precisa copiar o projeto pro servidor).

---

## 3. Criar o stack no Portainer

1. Portainer → **Stacks** → **Add stack**.
2. Nome: `dorama-universe`.
3. Método: **Repository** (cole a URL do repositório e a branch).
   - "Compose path": `docker-compose.yml`.

---

## 4. Variáveis de ambiente (no próprio stack)

Na seção **Environment variables** do stack, adicione (use os valores reais):

| Variável | Valor |
|---|---|
| `DATABASE_URL` | a connection string do Supabase (Session Pooler, porta 5432) |
| `PAYLOAD_SECRET` | o mesmo segredo do `.env` |
| `PAYLOAD_PUBLIC_SERVER_URL` | `https://doramauniverse.com` ← **domínio real, não localhost** |
| `R2_BUCKET` | `dorama-universe-media` |
| `R2_ENDPOINT` | o endpoint do R2 |
| `R2_ACCESS_KEY_ID` | a chave do R2 |
| `R2_SECRET_ACCESS_KEY` | o segredo do R2 |
| `NEXT_PUBLIC_ADSENSE_CLIENT` | `ca-pub-8751006394850232` |
| `NEXT_PUBLIC_ADSENSE_SLOT_HOME` | (deixe vazio — auto ads) |

> Essas variáveis alimentam tanto o **runtime** quanto os **build args** das
> `NEXT_PUBLIC_*` (que precisam existir no momento do build).

4. Clique em **Deploy the stack**. O Portainer vai **buildar a imagem** (demora alguns
   minutos na primeira vez) e subir o container.

---

## 5. Proxy reverso (domínio + HTTPS)

Aponte o proxy para o container:

- **Host/destino:** `dorama-universe` (ou o IP do servidor) na porta **3000**
- **Domínio:** `doramauniverse.com` (e `www` se quiser)
- Ative **SSL** (Let's Encrypt).

---

## 6. Conferir

- Acesse `https://doramauniverse.com` → a home deve carregar.
- Acesse `https://doramauniverse.com/admin` → painel do Payload (o usuário admin já existe).

---

## Observações importantes

- **Banco já está pronto:** o schema foi criado no Supabase durante o desenvolvimento.
  Em produção o Payload **não** recria/sincroniza schema sozinho. Se um dia mudarmos as
  coleções (campos novos etc.), será preciso gerar e rodar **migrations** do Payload —
  me avise quando chegar a hora.
- **AdSense:** os anúncios só começam a aparecer depois que o site estiver **no ar no
  domínio** e o Google aprovar a conta.
- **Atualizar o site:** depois de mudanças no código, é só dar **Pull and redeploy** no
  stack (ou rebuildar a imagem).
- **Logo:** lembre de colocar a arte oficial em `public/logo.svg` e `public/favicon.svg`
  antes do build (ou substituir depois e rebuildar).
