import type { CollectionConfig } from 'payload'

// Autores exibidos na assinatura dos posts (ex.: Marina Costa, Ana Silva,
// K-Pop Insider). Separado de Users (que sao as contas de login do admin),
// para que um colunista possa ter assinatura sem precisar de acesso ao painel.
export const Authors: CollectionConfig = {
  slug: 'authors',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'role'],
  },
  fields: [
    {
      name: 'name',
      label: 'Nome',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      label: 'Cargo / funcao',
      type: 'text',
      admin: {
        description: 'Opcional. Ex.: Editora, Colunista de K-Pop',
      },
    },
    {
      name: 'avatar',
      label: 'Foto',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'bio',
      label: 'Bio',
      type: 'textarea',
    },
  ],
}
