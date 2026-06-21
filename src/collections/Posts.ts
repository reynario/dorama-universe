import type { CollectionConfig } from 'payload'

// Posts = o coracao do blog. Cada artigo da home (card de destaque + grid)
// e a pagina de leitura saem daqui.
export const Posts: CollectionConfig = {
  slug: 'posts',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'category', 'author', 'publishedAt', '_status'],
  },
  // Habilita rascunho/publicado (aba "Status" no admin).
  versions: {
    drafts: true,
  },
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
