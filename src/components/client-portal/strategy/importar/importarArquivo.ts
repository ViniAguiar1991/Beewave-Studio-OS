import {
  ClientStrategyDocument,
  StrategyBlock,
  StrategyBlockItem,
  StrategyChapter,
} from '../../../../types';
import { blocosDoMarkdown, novoId } from '../blocos';
import { corrigirTexto, documentoDoPdf, PaginaPdf } from './layoutPdf';

/* ============================================================================
 * Importação da estratégia a partir de arquivo ou texto colado.
 *
 * Três caminhos, um resultado: um documento em blocos, pronto para abrir no
 * editor. Não existe documento de reserva. Antes, quando o texto não tinha
 * capítulos reconhecíveis, o importador devolvia a estratégia inteira da
 * Emely com o nome do cliente trocado — foi assim que o plano da Perfetto
 * virou o da Emely. Sem estrutura reconhecida, o texto entra como um
 * capítulo só, para a agência organizar no editor.
 *
 * As bibliotecas de PDF e Word são carregadas só na hora de importar: pesam
 * e ninguém precisa delas para abrir o app.
 * ========================================================================== */

export type OrigemImportacao = 'pdf' | 'docx' | 'texto';

export interface ResultadoImportacao {
  documento: ClientStrategyDocument;
  origem: OrigemImportacao;
  capitulos: number;
  blocos: number;
}

const contar = (doc: ClientStrategyDocument) => ({
  capitulos: doc.chapters?.length || 0,
  blocos: (doc.chapters || []).reduce((s, c) => s + (c.blocos?.length || 0), 0),
});

const numerar = (capitulos: StrategyChapter[]): StrategyChapter[] =>
  capitulos.map((c, i) => {
    const n = String(i + 1).padStart(2, '0');
    // Sem rótulo próprio, fica só o número — repetir o título em cima dele
    // não diz nada.
    return { ...c, number: n, tag: c.tag ? `${n} · ${c.tag}` : n };
  });

/* ---------------------------------------------------------------------------
 * PDF
 * ------------------------------------------------------------------------- */
async function lerPdf(arquivo: File, nomeCliente: string): Promise<ClientStrategyDocument> {
  const pdfjs = await import('pdfjs-dist');
  const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = worker;

  const pdf = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) }).promise;
  const paginas: PaginaPdf[] = [];

  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const conteudo = await pagina.getTextContent();
    paginas.push({
      altura: pagina.getViewport({ scale: 1 }).height,
      pedacos: (conteudo.items as any[])
        .filter((i) => typeof i.str === 'string' && i.str.trim())
        .map((i) => ({
          x: i.transform[4],
          y: i.transform[5],
          w: i.width,
          tam: Math.round(Math.hypot(i.transform[0], i.transform[1]) * 10) / 10,
          fonte: i.fontName,
          texto: i.str,
        })),
    });
  }

  const total = paginas.reduce((s, p) => s + p.pedacos.length, 0);
  if (total === 0) {
    throw new Error(
      'Este PDF não tem texto selecionável — provavelmente é uma imagem escaneada. Exporte o PDF de novo a partir do arquivo original, ou cole o texto.'
    );
  }

  return documentoDoPdf(paginas, nomeCliente);
}

/* ---------------------------------------------------------------------------
 * Word (.docx) — via HTML, que preserva títulos, listas e tabelas
 * ------------------------------------------------------------------------- */
async function lerDocx(arquivo: File, nomeCliente: string): Promise<ClientStrategyDocument> {
  const mammoth: any = await import('mammoth');
  const { value: html } = await (mammoth.default || mammoth).convertToHtml({
    arrayBuffer: await arquivo.arrayBuffer(),
  });

  const corpo = new DOMParser().parseFromString(html, 'text/html').body;
  const capitulos: StrategyChapter[] = [];
  let atual: StrategyChapter | null = null;
  let titulo = '';
  const texto = (el: Element) => corrigirTexto(el.textContent || '');

  const capituloAtual = () => {
    if (!atual) {
      atual = { id: novoId('chap'), number: '', tag: '', title: 'Introdução', blocos: [] };
      capitulos.push(atual);
    }
    return atual;
  };
  const add = (b: StrategyBlock) => capituloAtual().blocos!.push(b);

  for (const el of Array.from(corpo.children)) {
    const tag = el.tagName.toLowerCase();
    const t = texto(el);
    if (!t && tag !== 'table') continue;

    if (tag === 'h1') {
      // O primeiro título, antes de qualquer conteúdo, é o nome do plano.
      if (!titulo && capitulos.length === 0) {
        titulo = t;
        continue;
      }
      atual = { id: novoId('chap'), number: '', tag: '', title: t, blocos: [] };
      capitulos.push(atual);
    } else if (tag === 'h2') {
      atual = { id: novoId('chap'), number: '', tag: '', title: t, blocos: [] };
      capitulos.push(atual);
    } else if (/^h[3-6]$/.test(tag)) {
      add({ id: novoId('blc'), tipo: 'subtitulo', texto: t });
    } else if (tag === 'ul' || tag === 'ol') {
      const itens: StrategyBlockItem[] = Array.from(el.querySelectorAll(':scope > li')).map((li) => {
        const forte = li.querySelector('strong');
        const tituloItem = forte ? texto(forte).replace(/[:\-–—]\s*$/, '') : '';
        const resto = tituloItem ? texto(li).slice(texto(forte!).length).replace(/^[:\-–—]\s*/, '') : texto(li);
        return tag === 'ol'
          ? { id: novoId('it'), titulo: tituloItem || resto, texto: tituloItem ? resto : '' }
          : { id: novoId('it'), texto: texto(li) };
      });
      add({ id: novoId('blc'), tipo: tag === 'ol' ? 'etapas' : 'lista', itens });
    } else if (tag === 'table') {
      const linhas = Array.from(el.querySelectorAll('tr')).map((tr) =>
        Array.from(tr.querySelectorAll('td,th')).map((c) => texto(c))
      );
      if (!linhas.length) continue;
      const [cab, ...resto] = linhas;
      add({
        id: novoId('blc'),
        tipo: 'itens',
        titulo: cab.filter(Boolean).join(' · ') || undefined,
        itens: resto.map((cel) => ({
          id: novoId('it'),
          titulo: cel[0] || '',
          texto: cel
            .slice(1)
            .map((v, i) => (v ? (cab[i + 1] ? `${cab[i + 1]}: ${v}` : v) : ''))
            .filter(Boolean)
            .join('\n'),
        })),
      });
    } else {
      const m = t.match(/^([^:.!?]{3,48}):\s+(.+)$/s);
      if (m && m[1].split(/\s+/).length <= 5) {
        add({ id: novoId('blc'), tipo: 'texto', titulo: m[1].trim(), texto: m[2].trim() });
      } else {
        add({ id: novoId('blc'), tipo: 'texto', texto: t });
      }
    }
  }

  return {
    title: titulo || nomeCliente,
    subtitle: '',
    cycleMeta: '',
    destaques: [],
    chapters: numerar(capitulos.filter((c) => c.blocos?.length || c.title)),
  };
}

/* ---------------------------------------------------------------------------
 * Texto (.txt, .md ou colado)
 * ------------------------------------------------------------------------- */

/** Texto sem Markdown de título: "Capítulo 2 — Marca" ou "01 · Marca". */
const CABECALHO_SEM_MARKDOWN = [
  /^(?:cap[ií]tulo|parte|se[cç][aã]o)\s+\d+\s*[·.:\-–—]?\s*(.*)$/i,
  // Sem o ponto como separador: "1. item" é lista numerada, não capítulo.
  /^(\d{1,2})\s*[·:\-–—]\s+(.+)$/,
];

/** "## 1. Objetivos do Projeto" → "Objetivos do Projeto": a numeração é automática. */
const limparTitulo = (t: string) =>
  corrigirTexto(t.replace(/\*\*/g, '').replace(/^\d{1,2}\s*[.)·:\-–—]\s+/, '').trim());

export function documentoDoTexto(bruto: string, nomeCliente: string): ClientStrategyDocument {
  const linhas = bruto.replace(/\r\n?/g, '\n').split('\n');
  const nivelDe = (l: string) => l.trim().match(/^(#{1,6})\s+\S/)?.[1].length || 0;
  const niveis = linhas.map(nivelDe).filter(Boolean);

  /*
   * Quem é capítulo depende de como o documento foi escrito:
   * - "# Título" uma vez só, no topo, e "##" depois: # é o nome do plano,
   *   ## são os capítulos e ### em diante são subtítulos.
   * - Vários "#": cada # é um capítulo e ## em diante são subtítulos.
   * Antes todo # e ## virava capítulo, e o primeiro # virava o nome do plano
   * mesmo quando era só a primeira seção.
   */
  let nivelDoTitulo = 0;
  let nivelDoCapitulo = 0;
  if (niveis.length) {
    const menor = Math.min(...niveis);
    const primeiro = linhas.findIndex((l) => nivelDe(l) > 0);
    const textoAntes = linhas.slice(0, primeiro).some((l) => l.trim());
    const maiores = niveis.filter((n) => n > menor);
    if (niveis.filter((n) => n === menor).length === 1 && !textoAntes && maiores.length) {
      nivelDoTitulo = menor;
      nivelDoCapitulo = Math.min(...maiores);
    } else {
      nivelDoCapitulo = menor;
    }
  }

  const capitulos: { titulo: string; linhas: string[] }[] = [];
  const antesDoPrimeiro: string[] = [];
  let atual: { titulo: string; linhas: string[] } | null = null;
  let tituloDoc = '';

  for (const linha of linhas) {
    const nivel = nivelDe(linha);
    const textoTitulo = nivel ? linha.trim().replace(/^#{1,6}\s+/, '') : '';

    if (nivel && nivel === nivelDoTitulo && !tituloDoc) {
      tituloDoc = limparTitulo(textoTitulo);
      continue;
    }

    let tituloCapitulo: string | null = null;
    if (nivel && nivel === nivelDoCapitulo) {
      tituloCapitulo = limparTitulo(textoTitulo);
    } else if (!niveis.length) {
      for (const padrao of CABECALHO_SEM_MARKDOWN) {
        const m = linha.trim().match(padrao);
        if (m) {
          tituloCapitulo = limparTitulo(m[2] ?? m[1] ?? '');
          break;
        }
      }
    }

    if (tituloCapitulo !== null) {
      atual = { titulo: tituloCapitulo, linhas: [] };
      capitulos.push(atual);
    } else if (atual) {
      atual.linhas.push(linha);
    } else {
      antesDoPrimeiro.push(linha);
    }
  }

  // Texto entre o nome do plano e o primeiro capítulo: uma frase curta é o
  // subtítulo da capa; mais que isso vira a introdução.
  const intro = antesDoPrimeiro.join('\n').trim();
  let subtitulo = '';
  if (intro) {
    const umaFrase = !intro.includes('\n\n') && intro.length <= 280 && !/^[>|#\-*\d]/.test(intro);
    if (umaFrase && capitulos.length) subtitulo = corrigirTexto(intro.replace(/\*\*/g, ''));
    else capitulos.unshift({ titulo: 'Introdução', linhas: antesDoPrimeiro });
  }

  const chapters = capitulos
    .map((c) => ({
      id: novoId('chap'),
      number: '',
      tag: '',
      title: c.titulo || 'Sem título',
      blocos: blocosDoMarkdown(c.linhas.join('\n')),
    }))
    .filter((c) => c.blocos.length || c.title !== 'Introdução');

  return {
    title: tituloDoc || nomeCliente,
    subtitle: subtitulo,
    cycleMeta: '',
    destaques: [],
    chapters: numerar(chapters),
  };
}

/* ---------------------------------------------------------------------------
 * Entrada única
 * ------------------------------------------------------------------------- */
export async function importarEstrategia(
  entrada: File | string,
  nomeCliente: string
): Promise<ResultadoImportacao> {
  let documento: ClientStrategyDocument;
  let origem: OrigemImportacao;

  if (typeof entrada === 'string') {
    documento = documentoDoTexto(entrada, nomeCliente);
    origem = 'texto';
  } else {
    const nome = entrada.name.toLowerCase();
    if (nome.endsWith('.pdf') || entrada.type === 'application/pdf') {
      documento = await lerPdf(entrada, nomeCliente);
      origem = 'pdf';
    } else if (nome.endsWith('.docx')) {
      documento = await lerDocx(entrada, nomeCliente);
      origem = 'docx';
    } else if (nome.endsWith('.doc')) {
      throw new Error(
        'Arquivos .doc (Word antigo) não podem ser lidos. Abra no Word e salve como .docx ou PDF.'
      );
    } else {
      documento = documentoDoTexto(await entrada.text(), nomeCliente);
      origem = 'texto';
    }
  }

  const { capitulos, blocos } = contar(documento);
  if (blocos === 0) {
    throw new Error('Não encontramos texto neste arquivo. Confira se é o documento certo.');
  }

  return { documento: { ...documento, rawText: undefined }, origem, capitulos, blocos };
}
