import {
  ClientStrategyDocument,
  StrategyBlock,
  StrategyBlockCell,
  StrategyBlockItem,
  StrategyBlockType,
  StrategyChapter,
  StrategyCoverHighlight,
} from '../../../types';

export const novoId = (prefixo: string) =>
  `${prefixo}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Catálogo de estilos, na ordem em que aparecem para escolher. */
export const ESTILOS: { tipo: StrategyBlockType; nome: string; descricao: string }[] = [
  { tipo: 'texto', nome: 'Texto', descricao: 'Parágrafo corrido' },
  { tipo: 'subtitulo', nome: 'Subtítulo', descricao: 'Divide o capítulo em partes' },
  { tipo: 'destaque', nome: 'Destaque', descricao: 'Frase em evidência, com legenda' },
  { tipo: 'alerta', nome: 'Alerta', descricao: 'Ponto de atenção ou gargalo' },
  { tipo: 'lista', nome: 'Lista', descricao: 'Tópicos simples' },
  { tipo: 'etapas', nome: 'Etapas', descricao: 'Passos numerados, com descrição' },
  { tipo: 'itens', nome: 'Itens com valor', descricao: 'Título, descrição e valor à direita' },
  { tipo: 'quadro', nome: 'Quadro', descricao: 'Colunas de tópicos, como uma SWOT' },
];

const TEXTUAIS: StrategyBlockType[] = ['texto', 'subtitulo', 'destaque', 'alerta'];
const DE_ITENS: StrategyBlockType[] = ['lista', 'etapas', 'itens'];

export const novoItem = (dados: Partial<StrategyBlockItem> = {}): StrategyBlockItem => ({
  id: novoId('it'),
  ...dados,
});

export const novaCelula = (dados: Partial<StrategyBlockCell> = {}): StrategyBlockCell => ({
  id: novoId('cel'),
  titulo: '',
  itens: [''],
  cor: 'neutro',
  ...dados,
});

export const novoBloco = (tipo: StrategyBlockType): StrategyBlock => {
  const base = { id: novoId('blc'), tipo };
  switch (tipo) {
    case 'lista':
      return { ...base, itens: [novoItem({ texto: '' })] };
    case 'etapas':
    case 'itens':
      return { ...base, itens: [novoItem({ titulo: '', texto: '' })] };
    case 'quadro':
      return {
        ...base,
        celulas: [novaCelula({ titulo: 'Coluna 1' }), novaCelula({ titulo: 'Coluna 2' })],
      };
    default:
      return { ...base, texto: '' };
  }
};

/**
 * Troca o estilo de um bloco sem jogar o conteúdo fora.
 *
 * Entre estilos de texto o texto passa direto. De texto para lista, cada
 * linha vira um tópico; de lista para texto, os tópicos viram linhas. Quadro
 * junta todos os tópicos das colunas.
 */
export const trocarEstilo = (bloco: StrategyBlock, tipo: StrategyBlockType): StrategyBlock => {
  if (bloco.tipo === tipo) return bloco;
  const { id, titulo, oculto } = bloco;
  const base = { id, tipo, titulo, oculto };

  const linhas = (): string[] => {
    if (bloco.itens?.length) {
      return bloco.itens
        .map((i) => [i.titulo, i.texto].filter(Boolean).join(' — '))
        .filter(Boolean);
    }
    if (bloco.celulas?.length) return bloco.celulas.flatMap((c) => c.itens).filter(Boolean);
    return (bloco.texto || '').split('\n').map((l) => l.trim()).filter(Boolean);
  };

  if (TEXTUAIS.includes(tipo)) {
    const texto = TEXTUAIS.includes(bloco.tipo) ? bloco.texto || '' : linhas().join('\n');
    return { ...base, texto, legenda: bloco.legenda };
  }

  if (DE_ITENS.includes(tipo)) {
    if (DE_ITENS.includes(bloco.tipo) && bloco.itens?.length) {
      return { ...base, itens: bloco.itens };
    }
    const l = linhas();
    return {
      ...base,
      itens: (l.length ? l : ['']).map((t) =>
        tipo === 'lista' ? novoItem({ texto: t }) : novoItem({ titulo: t, texto: '' })
      ),
    };
  }

  // quadro
  if (bloco.celulas?.length) return { ...base, celulas: bloco.celulas };
  const l = linhas();
  return { ...base, celulas: [novaCelula({ titulo: 'Coluna 1', itens: l.length ? l : [''] })] };
};


const semNegrito = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').trim();

/**
 * Markdown simples dos documentos importados vira blocos de verdade.
 *
 * O texto livre dos capítulos chegava com "### título", "1. **item**" e
 * "- tópico", e era exibido cru — o cliente lia os asteriscos e as
 * cerquilhas. Título vira subtítulo, sequência numerada vira etapas, marcador
 * vira lista, o resto vira parágrafo. Nenhuma frase é descartada.
 */
export const blocosDoMarkdown = (md: string): StrategyBlock[] => {
  const out: StrategyBlock[] = [];
  const linhas = md.split('\n');
  let paragrafo: string[] = [];
  let lista: StrategyBlockItem[] = [];
  let tipoLista: 'lista' | 'etapas' | null = null;

  const fecharParagrafo = () => {
    const texto = paragrafo.map(semNegrito).join('\n').trim();
    if (texto) out.push({ id: novoId('blc'), tipo: 'texto', texto });
    paragrafo = [];
  };
  const fecharLista = () => {
    if (lista.length && tipoLista) out.push({ id: novoId('blc'), tipo: tipoLista, itens: lista });
    lista = [];
    tipoLista = null;
  };

  for (const bruta of linhas) {
    const linha = bruta.trim();
    const titulo = linha.match(/^#{1,6}\s+(.*)$/);
    const numerado = linha.match(/^\d+[.)]\s+(.*)$/);
    const marcador = linha.match(/^[-*•]\s+(.*)$/);

    if (!linha) {
      fecharParagrafo();
      continue;
    }
    if (titulo) {
      fecharParagrafo();
      fecharLista();
      out.push({ id: novoId('blc'), tipo: 'subtitulo', texto: semNegrito(titulo[1]) });
      continue;
    }
    if (numerado || marcador) {
      fecharParagrafo();
      const tipo = numerado ? 'etapas' : 'lista';
      if (tipoLista && tipoLista !== tipo) fecharLista();
      tipoLista = tipo;
      const conteudo = (numerado || marcador)![1];
      // "**Título**: descrição" separa em título e texto; o resto é texto.
      const partes = conteudo.match(/^\*\*(.+?)\*\*\s*[:—-]\s*(.*)$/);
      lista.push(
        tipo === 'etapas'
          ? novoItem(partes ? { titulo: partes[1].trim(), texto: partes[2].trim() } : { titulo: semNegrito(conteudo) })
          : novoItem({ texto: semNegrito(conteudo) })
      );
      continue;
    }
    fecharLista();
    paragrafo.push(linha);
  }
  fecharParagrafo();
  fecharLista();
  return out;
};

/* ==========================================================================
 * Conversão dos documentos já importados
 *
 * Todo conteúdo dos campos antigos vira bloco, na mesma ordem em que era
 * exibido. Nada é descartado: um documento aberto e salvo sem edição mostra
 * exatamente o mesmo texto de antes.
 * ========================================================================== */
export const blocosDoCapitulo = (ch: StrategyChapter, nomeCliente: string): StrategyBlock[] => {
  if (Array.isArray(ch.blocos)) return ch.blocos;

  const out: StrategyBlock[] = [];
  const add = (b: Omit<StrategyBlock, 'id'>) => out.push({ id: novoId('blc'), ...b });

  if (ch.callout?.quote) {
    add({ tipo: 'destaque', texto: ch.callout.quote, legenda: ch.callout.caption });
  }

  if (ch.portfolioItems?.length) {
    add({
      tipo: 'itens',
      titulo: 'Portfólio e papel na receita',
      itens: ch.portfolioItems.map((i) =>
        novoItem({
          titulo: [i.icon, i.title].filter(Boolean).join(' '),
          texto: i.description,
          valor: i.tag,
        })
      ),
    });
  }

  if (ch.occasions?.length) {
    add({
      tipo: 'itens',
      titulo: 'Segmentação por ocasião',
      itens: ch.occasions.map((o) =>
        novoItem({
          titulo: o.role,
          texto: o.description,
          valor: o.priority ? `Prioridade ${o.priority}` : undefined,
        })
      ),
    });
  }

  if (ch.journeySteps?.length) {
    add({
      tipo: 'etapas',
      titulo: 'Jornada da cliente',
      itens: ch.journeySteps.map((j) =>
        novoItem({
          titulo: j.name,
          texto: j.quote ? `“${j.quote}”` : '',
          detalhe: j.touchpoints ? `Pontos de contato: ${j.touchpoints}` : undefined,
        })
      ),
    });
  }

  if (ch.commercialSteps?.length) {
    add({
      tipo: 'etapas',
      titulo: 'Do primeiro contato à visita',
      itens: ch.commercialSteps.map((c) => novoItem({ titulo: c.title, texto: c.description })),
    });
  }

  if (ch.bottleneck) {
    add({
      tipo: 'alerta',
      titulo: ch.bottleneck.title,
      legenda: ch.bottleneck.subtitle,
      texto: ch.bottleneck.description,
    });
  }

  if (ch.swot) {
    add({
      tipo: 'quadro',
      titulo: 'Análise SWOT',
      celulas: [
        novaCelula({ titulo: 'Forças', cor: 'verde', itens: ch.swot.strengths || [] }),
        novaCelula({ titulo: 'Fraquezas', cor: 'vermelho', itens: ch.swot.weaknesses || [] }),
        novaCelula({ titulo: 'Oportunidades', cor: 'azul', itens: ch.swot.opportunities || [] }),
        novaCelula({ titulo: 'Ameaças', cor: 'ambar', itens: ch.swot.threats || [] }),
      ],
    });
  }

  if (ch.kpis?.length) {
    add({
      tipo: 'itens',
      titulo: 'Metas e indicadores',
      itens: ch.kpis.map((k) =>
        novoItem({ titulo: k.metric, texto: k.why, valor: k.target, detalhe: k.frequency })
      ),
    });
  }

  if (ch.quarterPlan?.length) {
    add({ tipo: 'subtitulo', texto: 'Plano de 90 dias' });
    ch.quarterPlan.forEach((p) =>
      add({
        tipo: 'lista',
        titulo: `${p.month} · ${p.title}${p.focus ? ` — foco: ${p.focus}` : ''}`,
        itens: (p.actions || []).map((a) => novoItem({ texto: a })),
      })
    );
  }

  if (ch.responsibilities?.length) {
    add({ tipo: 'subtitulo', texto: 'Quem faz o quê' });
    ch.responsibilities.forEach((r) =>
      add({
        tipo: 'quadro',
        titulo: r.category,
        celulas: [
          novaCelula({ titulo: 'Beewave', cor: 'ambar', itens: r.agency || [] }),
          novaCelula({ titulo: nomeCliente, cor: 'neutro', itens: r.client || [] }),
        ],
      })
    );
  }

  if (ch.glossary?.length) {
    add({
      tipo: 'itens',
      titulo: 'Glossário',
      itens: ch.glossary.map((g) => novoItem({ titulo: g.term, texto: g.definition })),
    });
  }

  if (ch.contentMarkdown) {
    out.push(...blocosDoMarkdown(ch.contentMarkdown));
  }

  return out;
};

export const destaquesDaCapa = (doc: ClientStrategyDocument): StrategyCoverHighlight[] => {
  if (Array.isArray(doc.destaques)) return doc.destaques;
  const k = doc.keyDecisions;
  if (!k) return [];
  return [
    { id: novoId('dst'), rotulo: 'Decisão central', texto: k.centralDecision },
    { id: novoId('dst'), rotulo: 'Posicionamento', texto: k.positioning },
    { id: novoId('dst'), rotulo: 'Prioridade do ciclo', texto: k.cyclePriority },
  ].filter((d) => d.texto);
};

/**
 * Documento pronto para editar: capítulos já em blocos e capa em destaques.
 * Os campos antigos saem, para não haver duas fontes para o mesmo texto.
 */
export const normalizarDocumento = (
  doc: ClientStrategyDocument,
  nomeCliente: string
): ClientStrategyDocument => ({
  ...doc,
  keyDecisions: undefined,
  destaques: destaquesDaCapa(doc),
  chapters: (doc.chapters || []).map((ch) => ({
    id: ch.id,
    number: ch.number,
    tag: ch.tag,
    title: ch.title,
    subtitle: ch.subtitle,
    oculto: ch.oculto,
    blocos: blocosDoCapitulo(ch, nomeCliente),
  })),
});

export const novoCapitulo = (indice: number): StrategyChapter => {
  const numero = String(indice + 1).padStart(2, '0');
  return {
    id: novoId('chap'),
    number: numero,
    tag: `${numero} · Novo capítulo`,
    title: 'Novo capítulo',
    blocos: [novoBloco('texto')],
  };
};

/** Renumera capítulos depois de mover, excluir ou criar. */
export const renumerar = (capitulos: StrategyChapter[]): StrategyChapter[] =>
  capitulos.map((ch, i) => {
    const numero = String(i + 1).padStart(2, '0');
    const tagSemNumero = (ch.tag || '').replace(/^\s*\d{1,2}\s*·\s*/, '');
    return { ...ch, number: numero, tag: `${numero} · ${tagSemNumero || ch.title}` };
  });

export const mover = <T,>(lista: T[], de: number, para: number): T[] => {
  if (para < 0 || para >= lista.length) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
};
