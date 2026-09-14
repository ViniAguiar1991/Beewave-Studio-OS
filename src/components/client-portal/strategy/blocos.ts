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
  const base = { id, tipo, titulo, oculto, marcador: tipo === 'lista' ? bloco.marcador : undefined };

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


export const semNegrito = (t: string) =>
  t.replace(/\*\*(.+?)\*\*/g, '$1').replace(/__(.+?)__/g, '$1').trim();

/* ==========================================================================
 * Markdown → blocos
 *
 * O Markdown colado precisa sair com a mesma cara do documento montado à
 * mão. Antes só título, lista e parágrafo eram entendidos: tabela, citação,
 * "---" e as linhas com ✔ chegavam como texto cru, com as barras à mostra.
 *
 *   ## / ###            subtítulo dentro do capítulo
 *   > frase             destaque
 *   > Rótulo            destaque com rótulo (texto na linha de baixo ou no
 *                       parágrafo seguinte); "Atenção", "Risco"… viram alerta
 *   | a | b |           itens (título à esquerda, valor curto à direita);
 *                       colunas Forças/Fraquezas/… viram quadro SWOT
 *   - item / 1. item    lista / etapas
 *   ✔ item / ✘ item     lista com ✓ / lista com ✕
 *   **Rótulo** sozinho  rótulo do bloco seguinte
 *   **Rótulo:** texto   parágrafo com rótulo
 *   ---                 ignorado: capítulos já têm separação
 *
 * Negrito dentro do texto é mantido e aparece em negrito na leitura.
 * ========================================================================== */

type Marcador = NonNullable<StrategyBlock['marcador']>;

type Elemento =
  | { t: 'titulo'; texto: string }
  | { t: 'citacao'; linhas: string[] }
  | { t: 'tabela'; linhas: string[][]; comCabecalho: boolean }
  | { t: 'item'; tipo: 'lista' | 'etapas'; texto: string; marcador: Marcador }
  | { t: 'paragrafo'; linhas: string[] }
  | { t: 'vazio' };

const RE_TITULO = /^#{1,6}\s+(.*)$/;
const RE_REGUA = /^([-*_])(\s*\1){2,}\s*$/;
const RE_CITACAO = /^>\s?(.*)$/;
const RE_LINHA_TABELA = /^\|.*\|\s*$/;
const RE_SEPARADOR_TABELA = /^\|?(\s*:?-{2,}:?\s*\|)+\s*(:?-{2,}:?\s*)?\|?\s*$/;
const RE_NUMERADO = /^\d+[.)]\s+(.*)$/;
const RE_MARCADOR = /^[-*•+]\s+(.*)$/;
const RE_CHECK = /^(?:✔|✓|✅|☑)\uFE0F?\s*(.+)$/u;
const RE_XIS = /^(?:✘|✗|❌|✖|✕)\uFE0F?\s*(.+)$/u;

const itemDaLinha = (linha: string): Extract<Elemento, { t: 'item' }> | null => {
  const numerado = linha.match(RE_NUMERADO);
  if (numerado) return { t: 'item', tipo: 'etapas', texto: numerado[1], marcador: 'ponto' };

  const marcado = linha.match(RE_MARCADOR);
  const conteudo = marcado ? marcado[1] : linha;
  const check = conteudo.match(RE_CHECK);
  if (check) return { t: 'item', tipo: 'lista', texto: check[1], marcador: 'check' };
  const xis = conteudo.match(RE_XIS);
  if (xis) return { t: 'item', tipo: 'lista', texto: xis[1], marcador: 'x' };
  if (marcado) return { t: 'item', tipo: 'lista', texto: conteudo, marcador: 'ponto' };
  return null;
};

const celulasDaLinha = (linha: string) =>
  linha
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.replace(/\\\|/g, '|').trim());

/** Uma linha que começa outro tipo de elemento encerra citação e parágrafo. */
const comecaElemento = (linha: string) =>
  RE_TITULO.test(linha) ||
  RE_REGUA.test(linha) ||
  RE_CITACAO.test(linha) ||
  RE_LINHA_TABELA.test(linha) ||
  !!itemDaLinha(linha);

const lerElementos = (md: string): Elemento[] => {
  const linhas = md.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim());
  const out: Elemento[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (!linha) {
      out.push({ t: 'vazio' });
      i++;
      continue;
    }
    if (RE_REGUA.test(linha)) {
      out.push({ t: 'vazio' });
      i++;
      continue;
    }

    const titulo = linha.match(RE_TITULO);
    if (titulo) {
      out.push({ t: 'titulo', texto: titulo[1] });
      i++;
      continue;
    }

    if (RE_CITACAO.test(linha)) {
      const citadas: string[] = [];
      // Linhas com ">" e, logo abaixo, linhas sem ">" que continuam a mesma
      // citação — o Markdown aceita as duas formas.
      while (i < linhas.length && linhas[i] && (RE_CITACAO.test(linhas[i]) || !comecaElemento(linhas[i]))) {
        const m = linhas[i].match(RE_CITACAO);
        citadas.push(m ? m[1].trim() : linhas[i]);
        i++;
      }
      out.push({ t: 'citacao', linhas: citadas.filter(Boolean) });
      continue;
    }

    if (RE_LINHA_TABELA.test(linha)) {
      const brutas: string[] = [];
      while (i < linhas.length && RE_LINHA_TABELA.test(linhas[i])) brutas.push(linhas[i++]);
      const comCabecalho = brutas.length > 1 && RE_SEPARADOR_TABELA.test(brutas[1]);
      const tabela = brutas.filter((l) => !RE_SEPARADOR_TABELA.test(l)).map(celulasDaLinha);
      out.push({ t: 'tabela', linhas: tabela, comCabecalho });
      continue;
    }

    const item = itemDaLinha(linha);
    if (item) {
      out.push(item);
      i++;
      continue;
    }

    const paragrafo: string[] = [];
    while (i < linhas.length && linhas[i] && !comecaElemento(linhas[i])) paragrafo.push(linhas[i++]);
    out.push({ t: 'paragrafo', linhas: paragrafo });
  }
  return out;
};

const ALERTA = /^(aten[cç][aã]o|alerta|cuidado|riscos?|importante|aviso|pend[eê]ncias?|pendente)\b/i;
const AVISOS_GITHUB: Record<string, 'destaque' | 'alerta'> = {
  NOTE: 'destaque',
  TIP: 'destaque',
  IMPORTANT: 'alerta',
  WARNING: 'alerta',
  CAUTION: 'alerta',
};

/** "Objetivo", "Insight", "**Forças**", "Público:" — rótulo, não frase. */
const pareceRotulo = (t: string) => {
  const limpo = semNegrito(t).replace(/:$/, '').trim();
  return (
    limpo.length > 0 &&
    limpo.length <= 40 &&
    limpo.split(/\s+/).length <= 4 &&
    !/[.!?;]$/.test(limpo)
  );
};
const textoDoRotulo = (t: string) => semNegrito(t).replace(/:$/, '').trim();

const NOMES_SWOT: Record<string, { titulo: string; cor: StrategyBlockCell['cor'] }> = {
  forcas: { titulo: 'Forças', cor: 'verde' },
  fraquezas: { titulo: 'Fraquezas', cor: 'vermelho' },
  oportunidades: { titulo: 'Oportunidades', cor: 'azul' },
  ameacas: { titulo: 'Ameaças', cor: 'ambar' },
};
const chaveSwot = (t: string) =>
  semNegrito(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z]/g, '');

const blocoDaTabela = (linhas: string[][], comCabecalho: boolean, rotulo?: string): StrategyBlock | null => {
  const cabecalho = comCabecalho ? linhas[0] : [];
  const corpo = (comCabecalho ? linhas.slice(1) : linhas).filter((l) => l.some(Boolean));
  const colunas = Math.max(cabecalho.length, ...corpo.map((l) => l.length), 0);
  if (!corpo.length || !colunas) return null;

  // SWOT em colunas: cada coluna vira uma célula colorida.
  const swot = cabecalho.map((c) => NOMES_SWOT[chaveSwot(c)]);
  if (swot.filter(Boolean).length >= 3 && swot.every(Boolean)) {
    return {
      id: novoId('blc'),
      tipo: 'quadro',
      titulo: rotulo || 'Análise SWOT',
      celulas: swot.map((s, c) =>
        novaCelula({
          titulo: s!.titulo,
          cor: s!.cor,
          itens: corpo.map((l) => l[c] || '').filter(Boolean),
        })
      ),
    };
  }

  if (colunas === 1) {
    return {
      id: novoId('blc'),
      tipo: 'lista',
      titulo: rotulo || cabecalho[0] || undefined,
      itens: corpo.map((l) => novoItem({ texto: l[0] })),
    };
  }

  // Última coluna curta em todas as linhas ("✔ Confirmado", "Alta", "R$ 90")
  // vai para a direita, como valor. Longa, vira texto embaixo do título.
  const ultima = colunas - 1;
  const ultimaCurta = corpo.every((l) => semNegrito(l[ultima] || '').length <= 28);

  return {
    id: novoId('blc'),
    tipo: 'itens',
    // Com duas colunas o cabeçalho ("Item | Definição") não diz nada que o
    // título do capítulo já não diga. Com mais colunas ele explica o que é o quê.
    titulo: rotulo || (colunas > 2 ? cabecalho.map(semNegrito).filter(Boolean).join(' · ') : '') || undefined,
    itens: corpo.map((l) => {
      const meio = l.slice(1, ultimaCurta ? ultima : colunas);
      const texto = meio
        .map((v, k) => (v && colunas > 3 && cabecalho[k + 1] ? `${semNegrito(cabecalho[k + 1])}: ${v}` : v))
        .filter(Boolean)
        .join('\n');
      return novoItem({
        titulo: semNegrito(l[0] || ''),
        texto: texto || undefined,
        valor: ultimaCurta ? semNegrito(l[ultima] || '') || undefined : undefined,
      });
    }),
  };
};

export const blocosDoMarkdown = (md: string): StrategyBlock[] => {
  const elementos = lerElementos(md);
  const out: StrategyBlock[] = [];

  /** Rótulo que espera o próximo bloco: "**Forças**" antes de uma lista, "> Insight" antes de um parágrafo. */
  let pendente: { texto: string; vira: 'rotulo' | 'destaque' | 'alerta' } | null = null;
  let paragrafos: string[] = [];
  let lista: { tipo: 'lista' | 'etapas'; marcador: Marcador; itens: StrategyBlockItem[] } | null = null;

  const add = (b: Omit<StrategyBlock, 'id'>) => {
    const bloco: StrategyBlock = { id: novoId('blc'), ...b };
    if (pendente && !bloco.titulo && bloco.tipo !== 'subtitulo') bloco.titulo = pendente.texto;
    pendente = null;
    out.push(bloco);
  };

  const fecharParagrafos = () => {
    if (!paragrafos.length) return;
    add({ tipo: 'texto', texto: paragrafos.join('\n\n') });
    paragrafos = [];
  };
  const fecharLista = () => {
    if (!lista) return;
    add({
      tipo: lista.tipo,
      itens: lista.itens,
      marcador: lista.tipo === 'lista' && lista.marcador !== 'ponto' ? lista.marcador : undefined,
    });
    lista = null;
  };
  const fecharTudo = () => {
    fecharParagrafos();
    fecharLista();
  };

  for (const el of elementos) {
    if (el.t === 'vazio') continue;

    if (el.t !== 'item') fecharLista();
    if (el.t !== 'paragrafo') fecharParagrafos();

    switch (el.t) {
      case 'titulo':
        pendente = null;
        add({ tipo: 'subtitulo', texto: semNegrito(el.texto) });
        break;

      case 'citacao': {
        let [primeira = '', ...resto] = el.linhas;
        const github = primeira.match(/^\[!(\w+)\]\s*(.*)$/);
        let estilo: 'destaque' | 'alerta' = 'destaque';
        let rotulo: string | undefined;

        if (github) {
          estilo = AVISOS_GITHUB[github[1].toUpperCase()] || 'destaque';
          primeira = github[2];
          if (!primeira && resto.length) [primeira = '', ...resto] = resto;
        }

        const comDoisPontos = primeira.match(/^\*\*(.+?)\*\*\s*[:—-]?\s*(.+)$/) || primeira.match(/^([^.!?]{2,40}):\s+(.+)$/);
        if (comDoisPontos && pareceRotulo(comDoisPontos[1])) {
          rotulo = textoDoRotulo(comDoisPontos[1]);
          resto = [comDoisPontos[2], ...resto];
        } else if (pareceRotulo(primeira) && (resto.length || !github)) {
          rotulo = textoDoRotulo(primeira);
        } else {
          resto = [primeira, ...resto];
        }
        if (rotulo && ALERTA.test(rotulo)) estilo = 'alerta';

        const texto = resto.filter(Boolean).join('\n');
        if (texto) {
          add({ tipo: estilo, titulo: rotulo, texto });
        } else if (rotulo) {
          // Só o rótulo: o texto vem no parágrafo seguinte.
          pendente = { texto: rotulo, vira: estilo };
        }
        break;
      }

      case 'tabela': {
        const rotulo = pendente?.texto;
        pendente = null;
        const bloco = blocoDaTabela(el.linhas, el.comCabecalho, rotulo);
        if (bloco) out.push(bloco);
        break;
      }

      case 'item': {
        if (lista && (lista.tipo !== el.tipo || lista.marcador !== el.marcador)) fecharLista();
        if (!lista) lista = { tipo: el.tipo, marcador: el.marcador, itens: [] };
        if (el.tipo === 'etapas') {
          const partes = el.texto.match(/^\*\*(.+?)\*\*\s*[:—–-]?\s*(.*)$/);
          lista.itens.push(
            novoItem(
              partes
                ? { titulo: partes[1].replace(/[:—–-]\s*$/, '').trim(), texto: partes[2].trim() || undefined }
                : { titulo: semNegrito(el.texto) }
            )
          );
        } else {
          lista.itens.push(novoItem({ texto: el.texto }));
        }
        break;
      }

      case 'paragrafo': {
        const texto = el.linhas.join('\n');

        // "**Forças**" ou "Público:" sozinhos na linha rotulam o próximo bloco.
        if (el.linhas.length === 1 && pareceRotulo(texto) && (/^\*\*.+\*\*:?$/.test(texto) || /:$/.test(texto))) {
          fecharParagrafos();
          pendente = { texto: textoDoRotulo(texto), vira: 'rotulo' };
          break;
        }

        // Rótulo de citação esperando texto: o primeiro parágrafo é o destaque.
        if (pendente && pendente.vira !== 'rotulo') {
          fecharParagrafos();
          const { texto: rotulo, vira } = pendente;
          pendente = null;
          out.push({ id: novoId('blc'), tipo: vira, titulo: rotulo, texto });
          break;
        }

        // "**Rótulo:** texto" começa um parágrafo rotulado.
        // O negrito já avisa que é rótulo, então aceita um pouco mais de
        // palavras: "**O que a pessoa pensa:** …".
        const rotulado = texto.match(/^\*\*([^*]{2,60}?):?\*\*:?\s+([\s\S]+)$/);
        if (rotulado && rotulado[1].split(/\s+/).length <= 7 && !/[.!?]$/.test(rotulado[1])) {
          fecharParagrafos();
          pendente = null;
          out.push({ id: novoId('blc'), tipo: 'texto', titulo: textoDoRotulo(rotulado[1]), texto: rotulado[2] });
          break;
        }

        paragrafos.push(texto);
        break;
      }
    }
  }

  fecharTudo();
  return juntarSwot(out);
};

/**
 * "### Forças" + lista, "### Fraquezas" + lista… (ou "**Forças**" como rótulo
 * da lista) é a SWOT escrita em Markdown. Vira o quadro colorido de quatro
 * partes, igual ao da SWOT montada à mão.
 */
const juntarSwot = (blocos: StrategyBlock[]): StrategyBlock[] => {
  const out: StrategyBlock[] = [];
  let i = 0;

  const parteSwot = (k: number): { titulo: string; cor: StrategyBlockCell['cor']; itens: string[]; usados: number } | null => {
    const b = blocos[k];
    if (!b) return null;
    const textoDoBloco = (x?: StrategyBlock) =>
      x?.tipo === 'lista'
        ? (x.itens || []).map((it) => it.texto || '').filter(Boolean)
        : x?.tipo === 'texto' && x.texto
          ? x.texto.split(/\n+/).map((l) => l.trim()).filter(Boolean)
          : null;

    if (b.tipo === 'subtitulo') {
      const nome = NOMES_SWOT[chaveSwot(b.texto || '')];
      const itens = textoDoBloco(blocos[k + 1]);
      return nome && itens ? { ...nome, itens, usados: 2 } : null;
    }
    if (b.tipo === 'lista' && b.titulo) {
      const nome = NOMES_SWOT[chaveSwot(b.titulo)];
      return nome ? { ...nome, itens: textoDoBloco(b)!, usados: 1 } : null;
    }
    return null;
  };

  while (i < blocos.length) {
    const partes: NonNullable<ReturnType<typeof parteSwot>>[] = [];
    let k = i;
    for (let p = parteSwot(k); p && partes.length < 4; p = parteSwot(k)) {
      partes.push(p);
      k += p.usados;
    }
    const nomes = new Set(partes.map((p) => p.titulo));
    if (partes.length >= 3 && nomes.size === partes.length) {
      out.push({
        id: novoId('blc'),
        tipo: 'quadro',
        celulas: partes.map((p) => novaCelula({ titulo: p.titulo, cor: p.cor, itens: p.itens })),
      });
      i = k;
    } else {
      out.push(blocos[i]);
      i++;
    }
  }
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
    tag: numero,
    title: 'Novo capítulo',
    blocos: [novoBloco('texto')],
  };
};

/** O rótulo do capítulo sem o "01 ·" da frente. */
export const rotuloSemNumero = (tag?: string) => (tag || '').replace(/^\s*\d{1,2}\s*(·\s*)?/, '').trim();

const normalizado = (t: string) =>
  t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * O que aparece acima do título do capítulo. Rótulo igual ao título
 * ("01 · Resumo Executivo" em cima de "Resumo Executivo") vira só o número.
 */
export const sobretituloDoCapitulo = (ch: StrategyChapter) => {
  const rotulo = rotuloSemNumero(ch.tag);
  return rotulo && normalizado(rotulo) !== normalizado(ch.title || '') ? `${ch.number} · ${rotulo}` : ch.number;
};

/** Renumera capítulos depois de mover, excluir ou criar. */
export const renumerar = (capitulos: StrategyChapter[]): StrategyChapter[] =>
  capitulos.map((ch, i) => {
    const numero = String(i + 1).padStart(2, '0');
    const tagSemNumero = rotuloSemNumero(ch.tag);
    return { ...ch, number: numero, tag: tagSemNumero ? `${numero} · ${tagSemNumero}` : numero };
  });

export const mover = <T,>(lista: T[], de: number, para: number): T[] => {
  if (para < 0 || para >= lista.length) return lista;
  const copia = [...lista];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
};
