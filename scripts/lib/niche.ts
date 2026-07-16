// Vocabulario do nicho (dorama / k-pop) usado pelo radar para decidir se um
// assunto em alta pertence ao blog. Edite a vontade: quanto mais entidades,
// mais pautas o radar reconhece.

// Termos genericos: bateu um deles, a pauta e do nicho.
export const GENERIC_TERMS = [
  'dorama',
  'doramas',
  'k-drama',
  'kdrama',
  'k-dramas',
  'drama coreano',
  'serie coreana',
  'novela coreana',
  'k-pop',
  'kpop',
  'idol coreano',
  'idols coreanos',
  'comeback',
  'lightstick',
  'ator coreano',
  'atriz coreana',
  'cantora coreana',
  'cantor coreano',
  'coreia do sul',
  'sul-coreano',
  'sul-coreana',
  'hallyu',
  'mnet',
  'melon chart',
  'billboard hot 100 kpop',
]

// Entidades fortes: nomes com 2+ palavras (ou inconfundiveis). Bateu, aceitou.
export const STRONG_ENTITIES = [
  // grupos
  'bts',
  'blackpink',
  'stray kids',
  'twice',
  'seventeen',
  'tomorrow x together',
  'txt band',
  'enhypen',
  'newjeans',
  'new jeans',
  'aespa',
  'le sserafim',
  'itzy',
  'ive girl group',
  'nct dream',
  'nct 127',
  'exo',
  'red velvet',
  '(g)i-dle',
  'g-idle',
  'ateez',
  'riize',
  'illit',
  'babymonster',
  'kiss of life',
  'zerobaseone',
  'boynextdoor',
  'bigbang',
  'super junior',
  'girls generation',
  'snsd',
  'shinee',
  'monsta x',
  'kard',
  'mamamoo',
  'dreamcatcher',
  'oneus',
  'p1harmony',
  'xikers',
  'nmixx',
  'stayc',
  'fromis_9',
  'viviz',
  'kep1er',
  'tws kpop',
  // solistas
  'g-dragon',
  'j-hope',
  'jungkook',
  'jimin',
  'taehyung',
  'kim taehyung',
  'jin bts',
  'suga bts',
  'agust d',
  'lisa blackpink',
  'jennie blackpink',
  'jisoo blackpink',
  'rose blackpink',
  'taeyeon',
  'iu cantora',
  'lee ji-eun',
  'psy gangnam',
  'sunmi',
  'chungha',
  'hwasa',
  'zico',
  'jay park',
  'dean kpop',
  'crush cantor',
  'baekhyun',
  'kai exo',
  'karina aespa',
  'winter aespa',
  'hanni newjeans',
  'minji newjeans',
  'danielle newjeans',
  'haerin newjeans',
  'hyein newjeans',
  'wonyoung',
  'jang wonyoung',
  'an yujin',
  'felix stray kids',
  'hyunjin stray kids',
  'bang chan',
  // atores e atrizes
  'byeon woo-seok',
  'byeon wooseok',
  'kim soo-hyun',
  'kim soo hyun',
  'song hye-kyo',
  'song hye kyo',
  'park bo-gum',
  'park bo gum',
  'cha eun-woo',
  'cha eun woo',
  'lee jung-jae',
  'lee jung jae',
  'jung hae-in',
  'kim ji-won',
  'kim ji won',
  'kim yoo-jung',
  'ahn hyo-seop',
  'park seo-joon',
  'park seo joon',
  'lee min-ho',
  'lee min ho',
  'hyun bin',
  'son ye-jin',
  'son ye jin',
  'lee do-hyun',
  'nam joo-hyuk',
  'kim tae-ri',
  'han so-hee',
  'han so hee',
  'park shin-hye',
  'ji chang-wook',
  'gong yoo',
  'lee jong-suk',
  'bae suzy',
  'wi ha-joon',
  'park eun-bin',
  'moon ga-young',
  'roh yoon-seo',
  'kim seon-ho',
  'song kang',
  'kim woo-bin',
  'jun ji-hyun',
  'ma dong-seok',
  'lee byung-hun',
  'yoo ah-in',
  'do kyung-soo',
  'im si-wan',
  'park hyung-sik',
  'seo in-guk',
  'shin hye-sun',
  'kim go-eun',
  'kim hye-yoon',
  'go yoon-jung',
  'jung ho-yeon',
  // doramas / filmes
  'squid game',
  'round 6',
  'lovely runner',
  'queen of tears',
  'rainha das lagrimas',
  'true beauty',
  'beleza verdadeira',
  'goblin dorama',
  'crash landing on you',
  'pousando no amor',
  'itaewon class',
  'hometown cha-cha-cha',
  'business proposal',
  'proposta de negocio',
  'my demon',
  'meu demonio favorito',
  'king the land',
  'descendants of the sun',
  'descendentes do sol',
  'vincenzo',
  'extraordinary attorney woo',
  'uma advogada extraordinaria',
  'all of us are dead',
  'sweet home',
  'the glory',
  'moving dorama',
  'marry my husband',
  'case-se com meu marido',
  'when life gives you tangerines',
  'se a vida te der tangerinas',
  'mr sunshine',
  'reply 1988',
  'hospital playlist',
  'signal dorama',
  'kingdom coreano',
  'alquimia das almas',
  'alchemy of souls',
  'doona',
  'gyeongseong creature',
  'criatura de gyeongseong',
  'parasita filme',
  'train to busan',
  'invasao zumbi',
  // eventos / industria
  'mama awards',
  'melon music awards',
  'golden disc awards',
  'seoul music awards',
  'music bank',
  'kcon',
  'hybe',
  'sm entertainment',
  'jyp entertainment',
  'yg entertainment',
  'starship entertainment',
  'ador entertainment',
  'weverse',
  'kdrama netflix',
  'dorama netflix',
]

// Entidades fracas: nomes curtos/ambiguos. So contam se aparecer tambem um
// termo generico ou entidade forte no mesmo texto (evita falso positivo:
// "Lisa" pode ser qualquer pessoa; "V" e uma letra).
export const WEAK_ENTITIES = [
  'lisa',
  'jennie',
  'jisoo',
  'rose',
  'jungkook',
  'jimin',
  'suga',
  'jin',
  'iu',
  'psy',
  'suzy',
  'karina',
  'winter',
  'hanni',
  'minji',
  'felix',
  'somi',
  'bibi',
  'ive',
  'txt',
  'nct',
]

// Normaliza para comparacao: minusculas e sem acentos.
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

function hasWord(text: string, term: string): boolean {
  // Busca com fronteira de palavra (evita "jin" dentro de "Beijing").
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`, 'i').test(text)
}

export type NicheMatch = {
  matched: boolean
  keywords: string[]
  entity?: string // primeira entidade identificada (usada para agrupar noticias)
}

// Verifica se um texto pertence ao nicho dorama/k-pop.
export function matchNiche(rawText: string): NicheMatch {
  const text = normalize(rawText)
  const keywords: string[] = []
  let entity: string | undefined

  for (const term of GENERIC_TERMS) {
    if (hasWord(text, term)) keywords.push(term)
  }
  for (const term of STRONG_ENTITIES) {
    if (hasWord(text, term)) {
      keywords.push(term)
      if (!entity) entity = term
    }
  }
  // fracas: precisam de reforco de um termo generico/forte
  if (keywords.length > 0) {
    for (const term of WEAK_ENTITIES) {
      if (hasWord(text, term)) {
        keywords.push(term)
        if (!entity) entity = term
      }
    }
  }

  return { matched: keywords.length > 0, keywords, entity }
}
