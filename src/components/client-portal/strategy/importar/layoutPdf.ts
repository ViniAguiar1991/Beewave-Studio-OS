import {
  ClientStrategyDocument,
  StrategyBlock,
  StrategyBlockItem,
  StrategyChapter,
} from '../../../../types';

/* ============================================================================
 * Leitura de PDF diagramado por layout.
 *
 * Um PDF não guarda "título", "tabela" ou "parágrafo" — só pedaços de texto
 * com posição e tamanho de fonte. A estrutura é reconstruída daí:
 *
 *   - o que se repete no topo ou no pé de quase toda página é cabeçalho ou
 *     rodapé, e sai;
 *   - fonte bem maior que o corpo é título de capítulo, e a linha em
 *     maiúsculas logo acima dele é o rótulo;
 *   - fonte intermediária é subtítulo;
 *   - várias colunas alinhadas viram tabela, e a tabela vira bloco de itens;
 *   - "Rótulo: texto" isolado vira bloco com rótulo — alerta, se o rótulo
 *     falar de risco.
 *
 * Esta parte é pura: recebe os pedaços de texto e devolve o documento. Quem
 * abre o arquivo é outro módulo, para esta lógica poder ser testada fora do
 * navegador.
 * ========================================================================== */

export interface PedacoPdf {
  x: number;
  y: number;
  w: number;
  tam: number;
  fonte: string;
  texto: string;
}

export interface PaginaPdf {
  altura: number;
  pedacos: PedacoPdf[];
}

interface Linha {
  y: number;
  tam: number;
  fonte: string;
  pedacos: PedacoPdf[];
  texto: string;
}

let contador = 0;
const id = (p: string) => `${p}_${Date.now().toString(36)}${(contador++).toString(36)}`;

/**
 * Corrige o defeito de codificação comum nesses PDFs: "a" no fim de palavra
 * sai como "à" ("umà loja", "dà escolha"). Nenhuma palavra em português
 * termina em "à" colado a outras letras, então a troca é segura. O "à"
 * sozinho, que é crase de verdade, fica intacto.
 */
export const corrigirTexto = (t: string) =>
  t
    .replace(/(\p{L})à(?=[^\p{L}]|$)/gu, '$1a')
    .replace(/[ \t]+/g, ' ')
    .trim();

const moda = (valores: number[]) => {
  const cont = new Map<number, number>();
  valores.forEach((v) => cont.set(v, (cont.get(v) || 0) + 1));
  return [...cont.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0;
};

const ehMaiusculas = (t: string) => {
  const letras = t.replace(/[^\p{L}]/gu, '');
  return letras.length >= 3 && letras === letras.toLocaleUpperCase('pt-BR');
};

/* ---------------------------------------------------------------------------
 * 1. Cabeçalho e rodapé repetidos
 * ------------------------------------------------------------------------- */
const assinatura = (t: string) => t.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();

const repetidos = (paginas: PaginaPdf[]): Set<string> => {
  const cont = new Map<string, number>();
  for (const p of paginas) {
    const vistos = new Set<string>();
    for (const x of p.pedacos) {
      const margem = x.y > p.altura * 0.9 || x.y < p.altura * 0.08;
      if (!margem) continue;
      const a = assinatura(x.texto);
      if (a && !vistos.has(a)) {
        vistos.add(a);
        cont.set(a, (cont.get(a) || 0) + 1);
      }
    }
  }
  const minimo = Math.max(2, Math.floor(paginas.length * 0.6));
  return new Set([...cont.entries()].filter(([, n]) => n >= minimo).map(([a]) => a));
};

/* ---------------------------------------------------------------------------
 * 2. Pedaços → linhas
 * ------------------------------------------------------------------------- */
const montarLinhas = (pedacos: PedacoPdf[]): Linha[] => {
  const ordenados = [...pedacos].sort((a, b) => b.y - a.y || a.x - b.x);
  const linhas: Linha[] = [];
  for (const p of ordenados) {
    const atual = linhas[linhas.length - 1];
    if (atual && Math.abs(atual.y - p.y) <= 2) {
      atual.pedacos.push(p);
      atual.tam = Math.max(atual.tam, p.tam);
    } else {
      linhas.push({ y: p.y, tam: p.tam, fonte: p.fonte, pedacos: [p], texto: '' });
    }
  }
  for (const l of linhas) {
    l.pedacos.sort((a, b) => a.x - b.x);
    l.texto = corrigirTexto(l.pedacos.map((p) => p.texto).join(' '));
    l.fonte = l.pedacos[0].fonte;
  }
  return linhas.filter((l) => l.texto);
};

/* ---------------------------------------------------------------------------
 * 3. Tabela
 * ------------------------------------------------------------------------- */
const TOLERANCIA_COLUNA = 6;

const colunaDe = (x: number, colunas: number[]) => {
  let idx = 0;
  colunas.forEach((c, i) => {
    if (x >= c - TOLERANCIA_COLUNA) idx = i;
  });
  return idx;
};

/** Uma linha "tem cara de tabela" quando traz pedaços em mais de uma coluna. */
const colunasDaLinha = (l: Linha) => {
  const xs: number[] = [];
  for (const p of l.pedacos) {
    if (!xs.some((x) => Math.abs(x - p.x) <= TOLERANCIA_COLUNA)) xs.push(p.x);
  }
  return xs.sort((a, b) => a - b);
};

const COR_SWOT: Record<string, 'verde' | 'vermelho' | 'azul' | 'ambar'> = {
  forcas: 'verde',
  fraquezas: 'vermelho',
  oportunidades: 'azul',
  ameacas: 'ambar',
};
/** Nome certo de cada quadrante. O PDF da Perfetto veio com "Forcas" e "Ameacas". */
const NOME_SWOT: Record<string, string> = {
  forcas: 'Forças',
  fraquezas: 'Fraquezas',
  oportunidades: 'Oportunidades',
  ameacas: 'Ameaças',
};
const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export interface LinhaDeTabela {
  celulas: string[];
  /** Todos os pedaços na fonte forte do documento: é título, não conteúdo. */
  forte: boolean;
}

const tabelaParaBloco = (linhas: LinhaDeTabela[]): StrategyBlock => {
  const col = Math.max(...linhas.map((l) => l.celulas.length));
  const [primeira, ...resto] = linhas;
  const titulosNoMeio = resto.some((l) => l.forte);

  /* Cartões: título forte em cima, texto embaixo, repetido em pares.
     Também cobre a tabela de cabeçalho com uma única linha de conteúdo
     ("Topo | Meio | Fundo"), que se lê melhor coluna a coluna. */
  if (primeira.forte && (titulosNoMeio || resto.length === 1)) {
    const pares: { titulo: string; texto: string }[] = [];
    let tituloAtual: string[] | null = null;
    for (const l of linhas) {
      if (l.forte) {
        tituloAtual = l.celulas;
        continue;
      }
      l.celulas.forEach((texto, c) => {
        const titulo = tituloAtual?.[c] || '';
        if (titulo || texto) pares.push({ titulo, texto });
      });
      tituloAtual = null;
    }

    // SWOT reconhecida pelos nomes das colunas vira quadro colorido.
    const chaves = pares.map((p) => semAcento(p.titulo));
    if (pares.length === 4 && chaves.every((k) => k in COR_SWOT)) {
      return {
        id: id('blc'),
        tipo: 'quadro',
        titulo: 'Análise SWOT',
        celulas: pares.map((p) => ({
          id: id('cel'),
          titulo: NOME_SWOT[semAcento(p.titulo)],
          cor: COR_SWOT[semAcento(p.titulo)],
          itens: [p.texto],
        })),
      };
    }

    return {
      id: id('blc'),
      tipo: 'itens',
      itens: pares.map((p) => ({ id: id('it'), titulo: p.titulo, texto: p.texto })),
    };
  }

  const cabecalho = primeira.forte ? primeira.celulas : [];
  const corpo = primeira.forte ? resto : linhas;
  const rotulo = (i: number) => cabecalho[i] || '';

  // Primeira coluna numerada ("1. Gatilho") é sequência: vira Etapas.
  const numerada = corpo.length > 1 && corpo.every((l) => /^\d+[.)]\s+/.test(l.celulas[0] || ''));

  const itens: StrategyBlockItem[] = corpo.map(({ celulas: cel }) => {
    const item: StrategyBlockItem = {
      id: id('it'),
      titulo: numerada ? (cel[0] || '').replace(/^\d+[.)]\s+/, '') : cel[0] || '',
    };
    if (col === 2) {
      item.texto = cel[1] || '';
    } else if (col === 3 && !numerada) {
      const curtas = corpo.every((c) => (c.celulas[2] || '').length <= 24);
      item.texto = cel[1] || '';
      if (curtas) item.valor = cel[2] || '';
      else if (cel[2]) item.detalhe = rotulo(2) ? `${rotulo(2)}: ${cel[2]}` : cel[2];
    } else {
      item.texto = cel
        .slice(1)
        .map((v, i) => (v ? (rotulo(i + 1) ? `${rotulo(i + 1)}: ${v}` : v) : ''))
        .filter(Boolean)
        .join('\n');
    }
    return item;
  });

  // Os nomes das colunas ficam como rótulo do bloco: "35%" sem "Peso
  // inicial" perde o sentido, e o rótulo pequeno não pesa na leitura.
  const titulo = cabecalho.filter(Boolean).join(' · ') || undefined;
  return { id: id('blc'), tipo: numerada ? 'etapas' : 'itens', titulo, itens };
};

/* ---------------------------------------------------------------------------
 * 4. Parágrafo com rótulo
 * ------------------------------------------------------------------------- */
const RISCO = /gargalo|aten[cç][aã]o|risco|cuidado|alerta|critic|crític|n[aã]o fazer/i;
const ESSENCIA = /ess[eê]ncia|frase|manifesto/i;

const paragrafoParaBloco = (texto: string): StrategyBlock => {
  const m = texto.match(/^([^:.!?]{3,48}):\s+(.+)$/s);
  // Rótulo de verdade é curto ("Regra de mídia", "Gargalo crítico"). Frase
  // longa com dois-pontos no meio ("A marca já tem os elementos certos:")
  // continua sendo texto corrido.
  // Também não vale rótulo que termina em verbo ("O posicionamento
  // recomendado é:"): isso é começo de frase.
  if (m && m[1].trim().split(/\s+/).length <= 5 && !/\s(é|são|foi|será|seria)$/i.test(m[1].trim())) {
    const rotulo = m[1].trim();
    const corpo = m[2].trim();
    if (RISCO.test(rotulo)) return { id: id('blc'), tipo: 'alerta', titulo: rotulo, texto: corpo };
    if (ESSENCIA.test(rotulo)) return { id: id('blc'), tipo: 'destaque', texto: corpo, legenda: rotulo };
    return { id: id('blc'), tipo: 'texto', titulo: rotulo, texto: corpo };
  }
  const marcador = texto.match(/^[•\-–]\s+(.+)$/s);
  if (marcador) return { id: id('blc'), tipo: 'lista', itens: [{ id: id('it'), texto: marcador[1] }] };
  return { id: id('blc'), tipo: 'texto', texto };
};

/* ---------------------------------------------------------------------------
 * 5. Documento
 * ------------------------------------------------------------------------- */
export const documentoDoPdf = (paginas: PaginaPdf[], nomeCliente: string): ClientStrategyDocument => {
  const fora = repetidos(paginas);
  // Só sai o repetido que está na margem. O título da capa costuma ter o
  // mesmo texto do cabeçalho corrido ("Perfetto Uomo") e não pode sumir junto.
  const naMargem = (x: PedacoPdf, p: PaginaPdf) => x.y > p.altura * 0.9 || x.y < p.altura * 0.08;
  const porPagina = paginas.map((p) =>
    montarLinhas(p.pedacos.filter((x) => !(naMargem(x, p) && fora.has(assinatura(x.texto)))))
  );

  const todas = porPagina.flat();
  // Corpo = tamanho mais frequente ponderado pela quantidade de texto.
  const corpo = moda(todas.flatMap((l) => Array(Math.max(1, Math.round(l.texto.length / 20))).fill(l.tam)));
  const tamTitulo = Math.max(corpo * 1.8, 16);
  const tamSubtitulo = corpo * 1.3;
  // A fonte dos títulos é a "forte" do documento: tabela com essa fonte numa
  // linha inteira está mostrando cabeçalho ou título de cartão.
  const fonteForte = moda(todas.filter((l) => l.tam >= tamTitulo).map((l) => l.fonte as unknown as number)) as unknown as string;

  const doc: ClientStrategyDocument = { title: '', subtitle: '', cycleMeta: '', destaques: [], chapters: [] };
  const capitulos: StrategyChapter[] = [];
  let atual: StrategyChapter | null = null;

  const garantirCapitulo = () => {
    if (!atual) {
      atual = { id: id('chap'), number: '', tag: '', title: 'Introdução', blocos: [] };
      capitulos.push(atual);
    }
    return atual;
  };

  porPagina.forEach((linhas, indicePagina) => {
    /* ---- capa: primeira página com o maior texto do documento ---- */
    if (indicePagina === 0) {
      const ordenadas = [...linhas].sort((a, b) => b.tam - a.tam);
      const maior = ordenadas[0];
      const ehCapa = maior && maior.tam >= tamTitulo && !linhas.some((l) => l !== maior && l.tam >= tamTitulo);
      if (ehCapa) {
        doc.title = maior.texto;
        const segundo = ordenadas.find((l) => l !== maior && l.tam > corpo);
        // Frase de apoio da capa. Linha cadastral (CNPJ, endereço, @perfil)
        // fica de fora: é rodapé da capa, não subtítulo do plano.
        const cadastral = (t: string) => /\||cnpj|@\w|\b\d{5}-?\d{3}\b|av\.|rua |avenida/i.test(t);
        const frases = linhas.filter(
          (l) => l !== maior && l !== segundo && !ehMaiusculas(l.texto) && l.texto.length > 40 && !cadastral(l.texto)
        );
        // Cada linha da capa é uma frase: "…em Chapecó" + "Estratégia para…"
        // colados sem ponto viravam "Chapecó Estratégia".
        doc.subtitle = [segundo?.texto, ...frases.map((f) => f.texto)]
          .filter(Boolean)
          .map((t) => (/[.!?…:]$/.test(t!.trim()) ? t!.trim() : `${t!.trim()}.`))
          .join(' ');
        const meta = linhas.filter((l) => ehMaiusculas(l.texto)).map((l) => l.texto);
        const data = linhas.find((l) => /\b(19|20)\d{2}\b/.test(l.texto) && l.texto.length < 30);
        doc.cycleMeta = [meta[0], data?.texto].filter(Boolean).join(' · ');
        return;
      }
    }

    let i = 0;
    let paragrafo: string[] = [];
    let yAnterior = 0;
    let tamAnterior = 0;

    const fecharParagrafo = () => {
      const texto = paragrafo.join(' ').trim();
      if (texto) garantirCapitulo().blocos!.push(paragrafoParaBloco(texto));
      paragrafo = [];
    };

    while (i < linhas.length) {
      const l = linhas[i];

      /* ---- título que quebrou em duas linhas: continua o anterior ---- */
      if (
        l.tam >= tamTitulo &&
        i > 0 &&
        linhas[i - 1].tam >= tamTitulo &&
        linhas[i - 1].y - l.y <= l.tam * 1.6 &&
        atual
      ) {
        (atual as StrategyChapter).title = corrigirTexto(`${(atual as StrategyChapter).title} ${l.texto}`);
        i++;
        continue;
      }

      /* ---- título de capítulo ---- */
      if (l.tam >= tamTitulo) {
        fecharParagrafo();
        const rotulo =
          i > 0 && ehMaiusculas(linhas[i - 1].texto) && linhas[i - 1].tam < tamTitulo ? linhas[i - 1].texto : '';
        atual = { id: id('chap'), number: '', tag: rotulo, title: l.texto, blocos: [] };
        capitulos.push(atual);
        // O rótulo já tinha entrado como parágrafo; sai de lá.
        const blocos = capitulos[capitulos.length - 2]?.blocos;
        if (rotulo && blocos?.length) {
          const ultimo = blocos[blocos.length - 1];
          if (ultimo.tipo === 'texto' && ultimo.texto === rotulo) blocos.pop();
        }
        i++;
        continue;
      }

      /* ---- rótulo em maiúsculas logo acima de um título: espera o título ---- */
      if (ehMaiusculas(l.texto) && linhas[i + 1]?.tam >= tamTitulo) {
        fecharParagrafo();
        i++;
        continue;
      }

      /* ---- subtítulo ---- */
      if (l.tam >= tamSubtitulo) {
        fecharParagrafo();
        garantirCapitulo().blocos!.push({ id: id('blc'), tipo: 'subtitulo', texto: l.texto });
        i++;
        continue;
      }

      /* ---- tabela: linha com pedaços em várias colunas ---- */
      const cols = colunasDaLinha(l);
      if (cols.length >= 2) {
        fecharParagrafo();
        const forteDaLinha = (x: Linha) => !!fonteForte && x.pedacos.every((p) => p.fonte === fonteForte);
        /**
         * Nem todo título de cartão vem na fonte forte: na SWOT da Perfetto,
         * "Forças | Fraquezas" vêm fortes e "Oportunidades | Ameaças" não.
         * Então também vale como título a linha com palavras curtas, sem
         * pontuação final, em duas ou mais colunas — o formato de um
         * cabeçalho. Exigir duas colunas evita confundir com a sobra de uma
         * célula que quebrou ("chapeco" sozinho numa linha).
         */
        const pareceTitulo = (x: Linha, tabelaComCabecalho: boolean) =>
          forteDaLinha(x) ||
          (tabelaComCabecalho &&
            colunasDaLinha(x).length >= 2 &&
            x.pedacos.every((p) => p.texto.trim().split(/\s+/).length <= 3 && !/[.,;:?!]$/.test(p.texto.trim())));
        const linhasDaTabela: LinhaDeTabela[] = [
          { celulas: Array(cols.length).fill(''), forte: forteDaLinha(l) },
        ];
        for (const p of l.pedacos) {
          const c = colunaDe(p.x, cols);
          linhasDaTabela[0].celulas[c] = corrigirTexto(`${linhasDaTabela[0].celulas[c]} ${p.texto}`);
        }

        const alturaLinha = Math.max(8, l.tam * 1.25);
        let yPrev = l.y;
        let j = i + 1;

        while (j < linhas.length) {
          const t = linhas[j];
          if (t.tam >= tamSubtitulo || t.tam > l.tam + 0.5) break;
          if (t.pedacos[0].x < cols[0] - TOLERANCIA_COLUNA) break;
          const gap = yPrev - t.y;
          if (gap > alturaLinha * 3.2) break;

          const anterior = linhasDaTabela[linhasDaTabela.length - 1];
          const forte = pareceTitulo(t, linhasDaTabela[0].forte);
          // Muda de "título" para "conteúdo" (ou o contrário) ou abre espaço: linha nova.
          const novaLinha = gap > alturaLinha * 1.45 || forte !== anterior.forte;
          if (novaLinha) linhasDaTabela.push({ celulas: Array(cols.length).fill(''), forte });
          const atualLinha = linhasDaTabela[linhasDaTabela.length - 1];
          for (const p of t.pedacos) {
            const c = colunaDe(p.x, cols);
            atualLinha.celulas[c] = corrigirTexto(`${atualLinha.celulas[c]} ${p.texto}`);
          }
          yPrev = t.y;
          j++;
        }

        if (linhasDaTabela.length > 1) {
          garantirCapitulo().blocos!.push(tabelaParaBloco(linhasDaTabela));
          i = j;
          continue;
        }
      }

      /* ---- parágrafo: linhas de corpo seguidas ---- */
      const gap = yAnterior - l.y;
      const quebra = paragrafo.length > 0 && (gap > l.tam * 1.9 || Math.abs(l.tam - tamAnterior) > 0.5);
      if (quebra) fecharParagrafo();
      // Frase com rótulo começa bloco novo mesmo colada à anterior.
      const inicioRotulo = l.texto.match(/^([^:.!?]{3,48}):\s/);
      if (paragrafo.length && inicioRotulo && inicioRotulo[1].split(/\s+/).length <= 5) fecharParagrafo();
      paragrafo.push(l.texto);
      yAnterior = l.y;
      tamAnterior = l.tam;
      i++;
    }
    fecharParagrafo();
  });

  // Contracapa: último "capítulo" com o próprio nome da marca e só contato.
  const ultimo = capitulos[capitulos.length - 1];
  if (
    ultimo &&
    capitulos.length > 1 &&
    semAcento(ultimo.title) === semAcento(doc.title || '') &&
    (ultimo.blocos || []).every((b) => b.tipo === 'texto' && (b.texto || '').length < 80)
  ) {
    capitulos.pop();
  }

  doc.chapters = capitulos
    .filter((c) => c.title || c.blocos?.length)
    .map((c, n) => {
      const numero = String(n + 1).padStart(2, '0');
      return { ...c, number: numero, tag: `${numero} · ${c.tag || c.title}` };
    });

  if (!doc.title) doc.title = nomeCliente;
  return doc;
};
