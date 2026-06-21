import type { CollectionConfig } from 'payload'

// Comentarios dos leitores. Alimentam o contador de comentarios dos cards
// e a secao de comentarios da pagina do post.
export const Comments: CollectionConfig = {
  slug: 'comments',
  access: {
    read: () => true,
    // Qualquer visitante pode enviar um comentario pelo site.
    create: () => true,
  },
  admin: {
    useAsTitle: 'authorName',
    defaultColumns: ['authorName', 'post', 'approved', 'createdAt'],
  },
  fields: [
    {
      name: 'post',
      label: 'Post',
      type: 'relationship',
      relationTo: 'posts',
      required: true,
    },
    {
      name: 'authorName',
      label: 'Nome de quem comentou',
      type: 'text',
      required: true,
    },
    {
      name: 'email',
      label: 'E-mail',
      type: 'email',
    },
    {
      name: 'content',
      label: 'Comentario',
      type: 'textarea',
      required: true,
    },
    {
      name: 'approved',
      label: 'Aprovado',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        description: 'So aparece no site depois de aprovado (controle de spam).',
      },
    },
  ],
}
