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
    return { ...c, number: n, tag: `${n} · ${c.tag || c.title}` };
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
const CABECALHO_CAPITULO = [
  /^#{1,2}\s+(.+)$/, // "# Título" ou "## Título"
  /^(?:cap[ií]tulo|parte|se[cç][aã]o)\s+\d+\s*[·.:\-–—]?\s*(.*)$/i,
  // "01 · Marca". Sem o ponto como separador: "1. item" é lista numerada,
  // não capítulo — senão toda lista virava uma pilha de capítulos.
  /^(\d{1,2})\s*[·:\-–—]\s+(.+)$/,
];

export function documentoDoTexto(bruto: string, nomeCliente: string): ClientStrategyDocument {
  const linhas = bruto.replace(/\r\n?/g, '\n').split('\n');
  const capitulos: { titulo: string; linhas: string[] }[] = [];
  let atual: { titulo: string; linhas: string[] } | null = null;
  let tituloDoc = '';

  for (const bruta of linhas) {
    const linha = bruta.trim();
    let tituloCapitulo: string | null = null;

    for (const padrao of CABECALHO_CAPITULO) {
      const m = linha.match(padrao);
      if (m) {
        tituloCapitulo = corrigirTexto((m[2] ?? m[1] ?? '').replace(/\*\*/g, ''));
        break;
      }
    }

    // "# Título" antes de qualquer capítulo é o nome do documento.
    if (tituloCapitulo && /^#\s/.test(linha) && !tituloDoc && capitulos.length === 0) {
      tituloDoc = tituloCapitulo;
      continue;
    }

    if (tituloCapitulo) {
      atual = { titulo: tituloCapitulo, linhas: [] };
      capitulos.push(atual);
    } else {
      if (!atual) {
        atual = { titulo: 'Introdução', linhas: [] };
        capitulos.push(atual);
      }
      atual.linhas.push(bruta);
    }
  }

  const chapters = capitulos
    .map((c) => ({
      id: novoId('chap'),
      number: '',
      tag: '',
      title: c.titulo,
      blocos: blocosDoMarkdown(c.linhas.join('\n')),
    }))
    .filter((c) => c.blocos.length || c.title !== 'Introdução');

  return {
    title: tituloDoc || nomeCliente,
    subtitle: '',
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
