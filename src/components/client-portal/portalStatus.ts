import { Task, TaskStatusKey } from '../../types';

/**
 * Fonte única de verdade para como um status aparece no Portal do Cliente.
 *
 * O portal fala a língua do cliente, não a do sistema: ele não precisa saber o
 * que é "nao_iniciado" ou "urgencia" — precisa saber se a bola está com ele ou
 * com a Beewave. Por isso os nove status internos colapsam em cinco estados.
 */
export type PortalStateKey =
  | 'aguardando_voce'
  | 'ajuste_solicitado'
  | 'aprovado'
  | 'publicado'
  | 'em_producao';

export interface PortalState {
  key: PortalStateKey;
  /** Rótulo curto, para pílulas e listas densas. */
  label: string;
  /** Frase completa, para cabeçalhos e estados vazios. */
  sentence: string;
  /** De quem é a próxima ação. Define o que ganha destaque na tela. */
  owner: 'cliente' | 'beewave';
  dot: string;
  text: string;
}

const STATES: Record<PortalStateKey, PortalState> = {
  aguardando_voce: {
    key: 'aguardando_voce',
    label: 'Aguardando sua aprovação',
    sentence: 'Aguardando sua aprovação',
    owner: 'cliente',
    dot: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-400',
  },
  ajuste_solicitado: {
    key: 'ajuste_solicitado',
    label: 'Ajuste solicitado',
    sentence: 'Você pediu ajuste — a Beewave está refazendo',
    owner: 'beewave',
    dot: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-400',
  },
  aprovado: {
    key: 'aprovado',
    label: 'Aprovado',
    sentence: 'Aprovado por você',
    owner: 'beewave',
    dot: 'bg-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  publicado: {
    key: 'publicado',
    label: 'Publicado',
    sentence: 'Publicado',
    owner: 'beewave',
    dot: 'bg-slate-400',
    text: 'text-slate-600 dark:text-slate-400',
  },
  em_producao: {
    key: 'em_producao',
    label: 'Em produção',
    sentence: 'Em produção na Beewave',
    owner: 'beewave',
    dot: 'bg-slate-300 dark:bg-slate-600',
    text: 'text-slate-600 dark:text-slate-400',
  },
};

export const getPortalState = (status?: TaskStatusKey | string | null): PortalState => {
  switch (status) {
    case 'em_aprovacao':
      return STATES.aguardando_voce;
    case 'alterar':
      return STATES.ajuste_solicitado;
    case 'aprovado':
      return STATES.aprovado;
    case 'postado':
      return STATES.publicado;
    default:
      return STATES.em_producao;
  }
};

/** Pautas que exigem uma decisão do cliente agora. */
export const needsClientDecision = (t: Task) => t.status === 'em_aprovacao';

/** Pautas que o cliente devolveu e a equipe está refazendo. */
export const isBeingRevised = (t: Task) => t.status === 'alterar';

/** Pautas ainda não publicadas — o que o cliente vê como "vem por aí". */
export const isUpcoming = (t: Task) => t.status !== 'postado';

/**
 * Extrai a data de publicação normalizada (YYYY-MM-DD) de uma pauta.
 * `date` é alias de `postDate` no modelo, e ambos podem vir com hora anexada.
 */
export const getPostDay = (t: Task): string | null => {
  const raw = t.postDate || t.date;
  if (!raw || !raw.trim()) return null;
  return raw.split('T')[0];
};

/**
 * Traduz um registro de atividade para a língua do cliente.
 *
 * O modelo grava textos internos como "Alterou status para: em_aprovacao".
 * O cliente não deve ler tokens do sistema, então o status é extraído e
 * reescrito. Quando não dá para traduzir com segurança, devolve null e a
 * entrada simplesmente não aparece — melhor omitir do que mostrar jargão.
 */
export const describeActivity = (
  act: { type: string; by: string; text: string },
  clientName: string
): string | null => {
  const isClient = act.by === clientName;

  switch (act.type) {
    case 'client_approve':
      return 'Você aprovou a publicação';
    case 'client_change':
      return `Você pediu ajuste: ${act.text}`;
    case 'resubmit':
      return 'A Beewave reenviou para sua aprovação';
    case 'comment':
      return isClient ? `Você comentou: ${act.text}` : `${act.by} comentou: ${act.text}`;
    case 'status_change': {
      const token = act.text.split(':').pop()?.trim();
      if (!token) return null;
      if (token === 'em_aprovacao') return 'A Beewave enviou para sua aprovação';
      if (token === 'aprovado') return 'Publicação aprovada';
      if (token === 'postado') return 'Publicado nas redes';
      if (token === 'alterar') return 'Marcada para ajuste';
      // Movimentações internas de produção não interessam ao cliente.
      return null;
    }
    default:
      return null;
  }
};

/** Ordena pautas pela data de publicação, sem data por último. */
export const byPostDate = (a: Task, b: Task) => {
  const da = getPostDay(a);
  const db = getPostDay(b);
  if (!da && !db) return 0;
  if (!da) return 1;
  if (!db) return -1;
  return da.localeCompare(db);
};
