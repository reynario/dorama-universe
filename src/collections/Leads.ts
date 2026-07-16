import type { CollectionConfig } from 'payload'

// Leads = fila de pautas do robo de conteudo.
// O script scripts/radar.ts descobre assuntos em alta (Google Trends BR,
// Google News e feeds internacionais) e grava aqui. A skill /gerar-artigos
// consome os leads "pendentes", escreve o artigo e marca como "publicado".
export const Leads: CollectionConfig = {
  slug: 'leads',
  admin: {
    useAsTitle: 'topic',
    defaultColumns: ['topic', 'score', 'status', 'kind', 'createdAt'],
    description: 'Pautas descobertas pelo radar. O gerador de artigos consome as pendentes.',
  },
  access: {
    read: () => true,
  },
  fields: [
    {
      name: 'topic',
      label: 'Assunto / termo em alta',
      type: 'text',
      required: true,
    },
    {
      name: 'topicKey',
      label: 'Chave de deduplicacao',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Gerada pelo radar (slug do assunto). Evita pauta repetida.',
      },
    },
    {
      name: 'kind',
      label: 'Tipo',
      type: 'select',
      required: true,
      defaultValue: 'news',
      options: [
        { label: 'Termo em alta (Google Trends)', value: 'trend' },
        { label: 'Noticia (feeds/Google News)', value: 'news' },
      ],
    },
    {
      name: 'score',
      label: 'Score (quao em alta esta)',
      type: 'number',
      defaultValue: 0,
      admin: {
        description: 'Calculado pelo radar: volume de buscas + quantidade de fontes falando disso.',
      },
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'pending',
      index: true,
      options: [
        { label: 'Pendente', value: 'pending' },
        { label: 'Em producao', value: 'processing' },
        { label: 'Publicado', value: 'done' },
        { label: 'Descartado', value: 'discarded' },
      ],
    },
    {
      name: 'matchedKeywords',
      label: 'Palavras do nicho que bateram',
      type: 'text',
      admin: {
        description: 'Quais termos de dorama/k-pop fizeram o radar aceitar essa pauta.',
      },
    },
    {
      name: 'trafficVolume',
      label: 'Volume aproximado (Trends)',
      type: 'text',
      admin: {
        description: 'Ex.: "50 mil+ pesquisas". Vazio quando a pauta veio de feed.',
      },
    },
    {
      name: 'sources',
      label: 'Fontes encontradas',
      type: 'array',
      admin: {
        description: 'Links de noticias sobre o assunto (usados como base do artigo).',
      },
      fields: [
        { name: 'url', label: 'URL', type: 'text', required: true },
        { name: 'title', label: 'Titulo', type: 'text' },
        { name: 'outlet', label: 'Veiculo', type: 'text' },
      ],
    },
    {
      name: 'post',
      label: 'Post gerado',
      type: 'relationship',
      relationTo: 'posts',
      admin: {
        position: 'sidebar',
        description: 'Preenchido quando o artigo e criado.',
      },
    },
    {
      name: 'notes',
      label: 'Notas do gerador',
      type: 'textarea',
      admin: {
        description: 'Observacoes do robo (ex.: motivo do descarte).',
      },
    },
  ],
  timestamps: true,
}
