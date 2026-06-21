import type { CollectionConfig } from 'payload'

// Categorias = as abas de navegacao do blog
// (Novidades, Atores, Resenha de Episodios, Series, K-Pop...).
export const Categories: CollectionConfig = {
  slug: 'categories',
  access: {
    read: () => true,
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug'],
  },
  fields: [
    {
      name: 'name',
      label: 'Nome',
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
        description: 'Usado no endereco da pagina. Ex.: resenha-de-episodios',
      },
    },
    {
      name: 'color',
      label: 'Cor do selo (hex)',
      type: 'text',
      admin: {
        description: 'Opcional. Cor do badge da categoria. Ex.: #ec4899',
      },
    },
    {
      name: 'description',
      label: 'Descricao',
      type: 'textarea',
    },
  ],
}
