import type { MetadataRoute } from 'next'

// Bots de IA liberados explicitamente. Sao os que leem o site para responder e
// CITAR (ChatGPT, Perplexity, Claude, Gemini, Copilot) — a porta de entrada do
// trafego de busca por IA, que e justamente o que o blog quer capturar.
//
// Para bloquear apenas treinamento e manter a citacao, tire desta lista:
// GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot,
// meta-externalagent, Bytespider e Amazonbot (esses coletam para treino).
// Os *-SearchBot / *-User sao os de busca e leitura sob demanda.
const BOTS_DE_IA = [
  'OAI-SearchBot',
  'ChatGPT-User',
  'GPTBot',
  'PerplexityBot',
  'Perplexity-User',
  'ClaudeBot',
  'Claude-SearchBot',
  'Claude-User',
  'Google-Extended',
  'Applebot-Extended',
  'meta-externalagent',
  'Amazonbot',
  'Bytespider',
  'CCBot',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // A busca com ?q= gera variacao infinita de pagina rasa; ja e
        // noindex,follow no HTML, e aqui evita-se tambem gastar rastreamento.
        disallow: '/?q=',
      },
      {
        userAgent: BOTS_DE_IA,
        allow: '/',
      },
    ],
    sitemap: 'https://doramauniverse.com/sitemap.xml',
  }
}
