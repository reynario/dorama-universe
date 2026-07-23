import type { CollectionConfig } from 'payload'

// Posts = o coracao do blog. Cada artigo da home (card de destaque + grid)
// e a pagina de leitura saem daqui.
export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    // Visitantes leem apenas posts publicados; rascunhos so aparecem para
    // quem esta autenticado no painel (necessario para o botao Preview).
    read: ({ req }) => {
      if (req.user) return true
      return { _status: { equals: 'published' } }
    },
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'author', 'publishedAt', '_status'],
    // Botao "Preview" no editor: abre o rascunho renderizado no site publico.
    // O token de sessao do usuario vai na URL e o site usa ele para buscar o
    // rascunho na API — o link so funciona para quem tem acesso ao painel.
    preview: (doc, { token }) => {
      const id = (doc as { id?: number | string }).id
      if (!id || !token) return null
      const site = process.env.FRONTEND_URL || 'https://doramauniverse.com'
      return `${site}/preview/${id}?token=${encodeURIComponent(token)}`
    },
  },
  // Habilita rascunho/publicado (aba "Status" no admin).
  versions: {
    drafts: true,
  },
  // Endpoint publico para curtir um post: POST /api/posts/:id/like
  // Incrementa o contador no servidor (o visitante nao precisa de login).
  endpoints: [
    {
      path: '/:id/like',
      method: 'post',
      handler: async (req) => {
        const id = Number(req.routeParams?.id)
        if (!id) return Response.json({ error: 'id invalido' }, { status: 400 })
        const post = await req.payload
          .findByID({ collection: 'posts', id, depth: 0 })
          .catch(() => null)
        if (!post) return Response.json({ error: 'post nao encontrado' }, { status: 404 })
        const likes = (post.likes ?? 0) + 1
        await req.payload.update({
          collection: 'posts',
          id,
          data: { likes },
          depth: 0,
          overrideAccess: true,
        })
        return Response.json({ likes })
      },
    },
  ],
  fields: [
    {
      name: 'title',
      label: 'Titulo',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      label: 'Slug (URL)',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Endereco do post. Ex.: analise-elenco-byeon-woo-seok',
      },
    },
    {
      name: 'excerpt',
      label: 'Resumo / chamada',
      type: 'textarea',
      required: true,
      admin: {
        description: 'Texto curto que aparece nos cards e abaixo do titulo.',
      },
    },
    {
      name: 'heroImage',
      label: 'Imagem de capa',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'ogImage',
      label: 'Imagem social (OG)',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Versao da capa com titulo/marca, usada so em compartilhamentos (WhatsApp, redes, Discover). Vazio = usa a capa normal.',
      },
    },
    {
      name: 'content',
      label: 'Conteudo',
      type: 'richText',
      admin: {
        description: 'Conteudo dos posts novos. Posts importados usam o campo HTML abaixo.',
      },
    },
    {
      name: 'contentHtml',
      label: 'Conteudo importado (HTML)',
      type: 'textarea',
      // HTML de posts do WordPress pode ser grande; sobe bem acima do limite padrao.
      maxLength: 10_000_000,
      admin: {
        description:
          'Preenchido automaticamente na importacao do WordPress. Para posts novos, use o campo Conteudo acima.',
      },
    },
    {
      name: 'tags',
      label: 'Tags',
      type: 'relationship',
      relationTo: 'tags',
      hasMany: true,
    },
    // ----- SEO / robo de conteudo -----
    {
      name: 'seo',
      label: 'SEO',
      type: 'group',
      fields: [
        {
          name: 'metaTitle',
          label: 'Meta title',
          type: 'text',
          maxLength: 70,
          admin: {
            description: 'Titulo para o Google (ate 60-65 caracteres). Vazio = usa o titulo do post.',
          },
        },
        {
          name: 'metaDescription',
          label: 'Meta description',
          type: 'textarea',
          maxLength: 170,
          admin: {
            description: 'Descricao para o Google (ate 155 caracteres). Vazio = usa o resumo.',
          },
        },
      ],
    },
    {
      name: 'faq',
      label: 'Perguntas frequentes (FAQ)',
      type: 'array',
      admin: {
        description: 'Opcional. Gera schema FAQPage e ajuda o post a aparecer em IAs e featured snippets.',
      },
      fields: [
        { name: 'question', label: 'Pergunta', type: 'text', required: true },
        { name: 'answer', label: 'Resposta', type: 'textarea', required: true },
      ],
    },
    {
      name: 'sourceLinks',
      label: 'Fontes consultadas',
      type: 'array',
      admin: {
        description: 'Links das noticias usadas como base (exibidos no fim do artigo, dao credibilidade E-E-A-T).',
      },
      fields: [
        { name: 'url', label: 'URL', type: 'text', required: true },
        { name: 'title', label: 'Titulo', type: 'text' },
      ],
    },
    // ----- Campos da barra lateral (metadados) -----
    {
      name: 'category',
      label: 'Categoria',
      type: 'relationship',
      relationTo: 'categories',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'author',
      label: 'Autor',
      type: 'relationship',
      relationTo: 'authors',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'publishedAt',
      label: 'Data de publicacao',
      type: 'date',
      required: true,
      defaultValue: () => new Date().toISOString(),
      admin: {
        position: 'sidebar',
        date: { pickerAppearance: 'dayAndTime' },
      },
    },
    {
      name: 'featured',
      label: 'Artigo principal (destaque da home)',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description: 'Marque para usar como o grande card de destaque no topo.',
      },
    },
    {
      name: 'rating',
      label: 'Nota (0 a 5)',
      type: 'number',
      min: 0,
      max: 5,
      admin: {
        position: 'sidebar',
        step: 0.1,
        description: 'Opcional. Usado em resenhas (mostra a estrela. Ex.: 4.8).',
      },
    },
    {
      name: 'likes',
      label: 'Curtidas',
      type: 'number',
      defaultValue: 0,
      min: 0,
      admin: {
        position: 'sidebar',
      },
    },
  ],
}
