import { ClientStrategyDocument, StrategyChapter } from '../types';
import { EMELY_STRATEGY_DOCUMENT } from '../data/emelyStrategy';

/**
 * Intelligent heuristic fallback parser for strategy documents
 * Parses raw text, markdown or sections if the AI parser is offline.
 */
export function parseRawStrategyText(
  rawText: string,
  clientName: string = 'Cliente'
): ClientStrategyDocument {
  const lines = rawText.split('\n').map((l) => l.trim());

  let title = clientName;
  let subtitle = 'Estratégia para ampliar a presença e transformar procura em vendas.';
  let cycleMeta = `PLANO DE MARCA, CONTEÚDO E AQUISIÇÃO • ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase()}`;
  let centralDecision = 'Comunicar a proposta de valor com clareza e transformar procura em fechamento.';
  let positioning = 'Acessível sem parecer barato: linguagem elegante, simples e próxima.';
  let cyclePriority = 'Acompanhar cada oportunidade até visita, venda e receita.';

  // Try extracting headers
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('plano') && (line.includes('•') || line.includes('-') || line.includes('202'))) {
      cycleMeta = line.replace(/^[#*_\s]+/, '').trim();
    } else if (line.startsWith('# ') || (line.length > 2 && line.length < 50 && !title && i < 5)) {
      title = line.replace(/^#\s*/, '').trim();
    } else if (line.toLowerCase().includes('estratégia') || (i > 1 && i < 6 && line.length > 10 && line.length < 120)) {
      subtitle = line.replace(/^[#*_\s]+/, '').trim();
    }
  }

  // Detect chapters via "01", "02", "Capítulo", "## 01", etc.
  const chapterChunks: { titleLine: string; lines: string[] }[] = [];
  let currentChunk: { titleLine: string; lines: string[] } | null = null;

  for (const line of lines) {
    const isChapterHeader =
      /^(?:#+\s*)?(?:0[1-9]|10)\s*[\.\·\-\:]\s*[A-Za-zÀ-ÖØ-öø-ÿ]/i.test(line) ||
      /^(?:#+\s*)?capítulo\s*(?:0?[1-9]|10)/i.test(line);

    if (isChapterHeader) {
      if (currentChunk) chapterChunks.push(currentChunk);
      currentChunk = { titleLine: line, lines: [] };
    } else if (currentChunk) {
      currentChunk.lines.push(line);
    }
  }
  if (currentChunk) chapterChunks.push(currentChunk);

  const chapters: StrategyChapter[] = [];

  if (chapterChunks.length > 0) {
    chapterChunks.forEach((chunk, idx) => {
      const num = String(idx + 1).padStart(2, '0');
      const cleanTitle = chunk.titleLine.replace(/^[#*\s]+/, '').replace(/^(?:0[1-9]|10)\s*[\.\·\-\:]\s*/, '').trim();
      const body = chunk.lines.join('\n').trim();

      chapters.push({
        id: `chap-${num}`,
        number: num,
        tag: `${num} · ${cleanTitle.toUpperCase()}`,
        title: cleanTitle,
        subtitle: chunk.lines.find((l) => l.length > 15 && !l.startsWith('#')) || undefined,
        contentMarkdown: body,
      });
    });
  }

  // If no structured chapters detected, create default structure seeded with content
  if (chapters.length === 0) {
    return {
      ...EMELY_STRATEGY_DOCUMENT,
      title: title || EMELY_STRATEGY_DOCUMENT.title,
      subtitle: subtitle || EMELY_STRATEGY_DOCUMENT.subtitle,
      rawText,
    };
  }

  return {
    title,
    subtitle,
    cycleMeta,
    keyDecisions: {
      centralDecision,
      positioning,
      cyclePriority,
    },
    chapters,
    rawText,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Main parser function: attempts Gemini server endpoint first,
 * falls back to instant local heuristic parsing.
 */
export async function parseStrategyDocument(
  documentText: string,
  clientName?: string,
  cycleMeta?: string
): Promise<ClientStrategyDocument> {
  try {
    const res = await fetch('/api/ai/parse-strategy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentText, clientName, cycleMeta }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success && data.strategy && Array.isArray(data.strategy.chapters)) {
        return {
          ...data.strategy,
          rawText: documentText,
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch (err) {
    console.warn('AI parse-strategy API unavailable, using resilient local parser:', err);
  }

  // Resilient local parser fallback
  return parseRawStrategyText(documentText, clientName);
}
