import {
  Task,
  Client,
  User,
  Category,
  TaskStatus,
  Campaign,
  CustomProperty,
  FilterCondition,
  FilterGroup,
  FilterOperator,
  ColorRule,
  TaskSort,
  TaskView,
  PropertyType,
} from '../types';

/* ============================================================================
 * Motor de visões da Central de Tarefas.
 *
 * Filtros, ordenação e cores são dados, não código. Este arquivo sabe três
 * coisas: quais campos existem, o que cada operador significa e como aplicar
 * isso a uma tarefa. A interface só monta os objetos.
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * Paleta
 *
 * Cores nomeadas em vez de hex livre: garante contraste legível no claro e no
 * escuro, e mantém a tabela coerente mesmo com dez regras criadas por pessoas
 * diferentes.
 * ------------------------------------------------------------------------- */

export interface TaskColor {
  key: string;
  label: string;
  /** Texto sobre fundo claro/escuro. */
  text: string;
  /** Fundo suave da pílula. */
  chip: string;
  /** Ponto sólido e barra lateral da linha. */
  solid: string;
  /** Tinta de fundo da linha inteira, bem discreta. */
  row: string;
}

export const TASK_COLORS: TaskColor[] = [
  {
    key: 'slate',
    label: 'Cinza',
    text: 'text-slate-600 dark:text-slate-300',
    chip: 'bg-slate-100 dark:bg-slate-800',
    solid: 'bg-slate-400',
    row: 'bg-slate-50/70 dark:bg-slate-800/25',
  },
  {
    key: 'amber',
    label: 'Amarelo',
    text: 'text-amber-700 dark:text-amber-400',
    chip: 'bg-amber-100 dark:bg-amber-950/50',
    solid: 'bg-amber-500',
    row: 'bg-amber-50/70 dark:bg-amber-950/20',
  },
  {
    key: 'orange',
    label: 'Laranja',
    text: 'text-orange-700 dark:text-orange-400',
    chip: 'bg-orange-100 dark:bg-orange-950/50',
    solid: 'bg-orange-500',
    row: 'bg-orange-50/70 dark:bg-orange-950/20',
  },
  {
    key: 'rose',
    label: 'Vermelho',
    text: 'text-rose-700 dark:text-rose-400',
    chip: 'bg-rose-100 dark:bg-rose-950/50',
    solid: 'bg-rose-500',
    row: 'bg-rose-50/70 dark:bg-rose-950/20',
  },
  {
    key: 'emerald',
    label: 'Verde',
    text: 'text-emerald-700 dark:text-emerald-400',
    chip: 'bg-emerald-100 dark:bg-emerald-950/50',
    solid: 'bg-emerald-500',
    row: 'bg-emerald-50/70 dark:bg-emerald-950/20',
  },
  {
    key: 'teal',
    label: 'Verde-água',
    text: 'text-teal-700 dark:text-teal-400',
    chip: 'bg-teal-100 dark:bg-teal-950/50',
    solid: 'bg-teal-500',
    row: 'bg-teal-50/70 dark:bg-teal-950/20',
  },
  {
    key: 'sky',
    label: 'Azul',
    text: 'text-sky-700 dark:text-sky-400',
    chip: 'bg-sky-100 dark:bg-sky-950/50',
    solid: 'bg-sky-500',
    row: 'bg-sky-50/70 dark:bg-sky-950/20',
  },
  {
    key: 'indigo',
    label: 'Azul-marinho',
    text: 'text-indigo-700 dark:text-indigo-400',
    chip: 'bg-indigo-100 dark:bg-indigo-950/50',
    solid: 'bg-indigo-500',
    row: 'bg-indigo-50/70 dark:bg-indigo-950/20',
  },
  {
    key: 'violet',
    label: 'Roxo',
    text: 'text-violet-700 dark:text-violet-400',
    chip: 'bg-violet-100 dark:bg-violet-950/50',
    solid: 'bg-violet-500',
    row: 'bg-violet-50/70 dark:bg-violet-950/20',
  },
  {
    key: 'pink',
    label: 'Rosa',
    text: 'text-pink-700 dark:text-pink-400',
    chip: 'bg-pink-100 dark:bg-pink-950/50',
    solid: 'bg-pink-500',
    row: 'bg-pink-50/70 dark:bg-pink-950/20',
  },
];

const FALLBACK_COLOR = TASK_COLORS[0];

export const getColor = (key?: string | null): TaskColor =>
  TASK_COLORS.find((c) => c.key === key) || FALLBACK_COLOR;

/** Âncora RGB de cada cor da paleta, para achar a mais próxima de um hex. */
const COLOR_ANCHORS: Record<string, [number, number, number]> = {
  slate: [100, 116, 139],
  amber: [245, 158, 11],
  orange: [249, 115, 22],
  rose: [244, 63, 94],
  emerald: [16, 185, 129],
  teal: [20, 184, 166],
  sky: [14, 165, 233],
  indigo: [99, 102, 241],
  violet: [139, 92, 246],
  pink: [236, 72, 153],
};

const parseHex = (hex: string): [number, number, number] | null => {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || !/^[0-9a-f]{6}$/i.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
};

/**
 * Converte o hex livre que o admin escolhe no cadastro de status para a cor da
 * paleta mais próxima.
 *
 * É por distância no espaço RGB, e não por tabela de correspondência: assim
 * qualquer hex — inclusive um escolhido a dedo no seletor de cores — cai numa
 * cor de verdade, em vez de virar cinza por não constar numa lista.
 */
export const hexToColorKey = (hex?: string | null): string => {
  if (!hex) return 'slate';
  const rgb = parseHex(hex);
  if (!rgb) return 'slate';

  let best = 'slate';
  let bestDist = Infinity;
  for (const [key, anchor] of Object.entries(COLOR_ANCHORS)) {
    const d =
      (rgb[0] - anchor[0]) ** 2 + (rgb[1] - anchor[1]) ** 2 + (rgb[2] - anchor[2]) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = key;
    }
  }
  return best;
};

/* ---------------------------------------------------------------------------
 * Campos
 * ------------------------------------------------------------------------- */

export interface FieldDef {
  id: string;
  label: string;
  type: PropertyType | 'status' | 'client' | 'user' | 'category' | 'campaign' | 'derived';
  /** Pode ser coluna da tabela. */
  columnar: boolean;
  /** Pode agrupar o Kanban. */
  groupable?: boolean;
  minWidth?: number;
  defaultWidth?: number;
}

export const BUILTIN_FIELDS: FieldDef[] = [
  { id: 'client', label: 'Cliente', type: 'client', columnar: true, groupable: true, minWidth: 110, defaultWidth: 190 },
  { id: 'title', label: 'Tarefa', type: 'text', columnar: true, minWidth: 150, defaultWidth: 340 },
  { id: 'attachments', label: 'Arte', type: 'derived', columnar: true, minWidth: 55, defaultWidth: 72 },
  { id: 'category', label: 'Formato', type: 'category', columnar: true, groupable: true, minWidth: 85, defaultWidth: 125 },
  { id: 'assignee', label: 'Responsável', type: 'user', columnar: true, groupable: true, minWidth: 110, defaultWidth: 165 },
  { id: 'status', label: 'Status', type: 'status', columnar: true, groupable: true, minWidth: 120, defaultWidth: 155 },
  { id: 'postDate', label: 'Publicação', type: 'date', columnar: true, minWidth: 100, defaultWidth: 150 },
  { id: 'artDate', label: 'Data da arte', type: 'date', columnar: true, minWidth: 100, defaultWidth: 140 },
  { id: 'campaign', label: 'Campanha', type: 'campaign', columnar: true, groupable: true, minWidth: 100, defaultWidth: 160 },
  { id: 'channel', label: 'Canal', type: 'text', columnar: true, minWidth: 90, defaultWidth: 120 },
  { id: 'isOverdue', label: 'Atrasada', type: 'checkbox', columnar: false },
  { id: 'clientRequest', label: 'Pedido do cliente', type: 'checkbox', columnar: true, minWidth: 90, defaultWidth: 130 },
  { id: 'timeSpent', label: 'Tempo gasto (min)', type: 'number', columnar: true, minWidth: 90, defaultWidth: 130 },
];

/**
 * Valor especial de filtro que significa "o usuário logado agora".
 *
 * Guardar o id da pessoa dentro da visão não serviria: a visão "Minhas
 * tarefas" é compartilhada, e cada um precisa ver as suas.
 */
export const ME = '@me';

export const customFieldId = (propertyId: string) => `custom:${propertyId}`;
export const isCustomField = (fieldId: string) => fieldId.startsWith('custom:');
export const customPropertyId = (fieldId: string) => fieldId.slice('custom:'.length);

/** Todos os campos disponíveis, embutidos mais os criados pelo usuário. */
export const allFields = (properties: CustomProperty[]): FieldDef[] => [
  ...BUILTIN_FIELDS,
  ...properties.map((p) => ({
    id: customFieldId(p.id),
    label: p.name,
    type: p.type,
    columnar: true,
    groupable: p.type === 'select',
    minWidth: 90,
    defaultWidth: 150,
  })),
];

export const findField = (fieldId: string, properties: CustomProperty[]): FieldDef | undefined =>
  allFields(properties).find((f) => f.id === fieldId);

/* ---------------------------------------------------------------------------
 * Operadores
 * ------------------------------------------------------------------------- */

export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  is: 'é',
  isNot: 'não é',
  isAnyOf: 'é um de',
  isNoneOf: 'não é nenhum de',
  contains: 'contém',
  notContains: 'não contém',
  isEmpty: 'está vazio',
  isNotEmpty: 'está preenchido',
  gt: 'maior que',
  gte: 'maior ou igual a',
  lt: 'menor que',
  lte: 'menor ou igual a',
  before: 'antes de',
  after: 'depois de',
  isToday: 'é hoje',
  isOverdue: 'já passou',
  inNextDays: 'nos próximos (dias)',
  inLastDays: 'nos últimos (dias)',
  isTrue: 'sim',
  isFalse: 'não',
};

/** Operadores que fazem sentido para cada tipo de campo. */
export const operatorsFor = (type: FieldDef['type']): FilterOperator[] => {
  switch (type) {
    case 'text':
    case 'url':
      return ['contains', 'notContains', 'is', 'isNot', 'isEmpty', 'isNotEmpty'];
    case 'number':
      return ['is', 'isNot', 'gt', 'gte', 'lt', 'lte', 'isEmpty', 'isNotEmpty'];
    case 'date':
      return ['isToday', 'isOverdue', 'before', 'after', 'is', 'inNextDays', 'inLastDays', 'isEmpty', 'isNotEmpty'];
    case 'checkbox':
      return ['isTrue', 'isFalse'];
    case 'multiSelect':
      return ['isAnyOf', 'isNoneOf', 'isEmpty', 'isNotEmpty'];
    default:
      // status, client, user, category, campaign, select
      return ['is', 'isNot', 'isAnyOf', 'isNoneOf', 'isEmpty', 'isNotEmpty'];
  }
};

/** Operadores que não pedem valor — a interface esconde o campo de valor. */
export const isUnaryOperator = (op: FilterOperator) =>
  ['isEmpty', 'isNotEmpty', 'isToday', 'isOverdue', 'isTrue', 'isFalse'].includes(op);

/* ---------------------------------------------------------------------------
 * Leitura de valores
 * ------------------------------------------------------------------------- */

export interface EvalContext {
  clients: Client[];
  users: User[];
  categories: Category[];
  statuses: TaskStatus[];
  campaigns: Campaign[];
  properties: CustomProperty[];
  /** Para o filtro "minhas tarefas". */
  currentUserId?: string | null;
}

const dayOf = (raw?: string | null): string | null => {
  if (!raw || !raw.trim()) return null;
  return raw.split('T')[0];
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const shiftDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DONE_STATUSES = ['aprovado', 'postado'];

/** Valor bruto de um campo numa tarefa, já normalizado para comparação. */
export const readField = (task: Task, fieldId: string, ctx: EvalContext): unknown => {
  if (isCustomField(fieldId)) {
    return (task as any).customFields?.[customPropertyId(fieldId)] ?? null;
  }

  switch (fieldId) {
    case 'client':
      return task.clientId || null;
    case 'title':
      return task.selectedHeadline || task.headline || task.title || '';
    case 'attachments':
      return (task.files || []).length;
    case 'category':
      return task.categoryId || null;
    case 'assignee':
      // Lista completa, não só o primeiro: uma tarefa com dois responsáveis
      // precisa aparecer em "Minhas tarefas" para os dois.
      return task.assigneeIds?.length
        ? task.assigneeIds
        : task.assigneeId
          ? [task.assigneeId]
          : [];
    case 'status':
      return task.status || null;
    case 'postDate':
      return dayOf(task.postDate || task.date);
    case 'artDate':
      return dayOf(task.artDate);
    case 'campaign':
      return task.campaignId || null;
    case 'channel':
      return task.channel || '';
    case 'clientRequest':
      return !!task.clientRequest;
    case 'timeSpent':
      return Math.round((task.timeSpent || 0) / 60);
    case 'isOverdue': {
      const d = dayOf(task.postDate || task.date);
      return !!d && d < todayKey() && !DONE_STATUSES.includes(task.status);
    }
    default:
      return null;
  }
};

/** Rótulo legível de um valor, para exibir na tabela e nos seletores. */
export const readLabel = (task: Task, fieldId: string, ctx: EvalContext): string => {
  const raw = readField(task, fieldId, ctx);
  if (raw === null || raw === undefined || raw === '') return '';

  if (isCustomField(fieldId)) {
    const prop = ctx.properties.find((p) => p.id === customPropertyId(fieldId));
    if (prop?.type === 'select') {
      return prop.options?.find((o) => o.id === raw)?.label || String(raw);
    }
    if (prop?.type === 'multiSelect' && Array.isArray(raw)) {
      return raw
        .map((v) => prop.options?.find((o) => o.id === v)?.label || String(v))
        .join(', ');
    }
    if (prop?.type === 'checkbox') return raw ? 'Sim' : 'Não';
    return String(raw);
  }

  switch (fieldId) {
    case 'client':
      return ctx.clients.find((c) => c.id === raw)?.company || '';
    case 'assignee': {
      const ids = Array.isArray(raw) ? raw : [raw];
      const nomes = ids
        .map((id) => ctx.users.find((u) => u.id === id)?.name)
        .filter(Boolean) as string[];
      return nomes.join(', ');
    }
    case 'category':
      return ctx.categories.find((c) => c.id === raw)?.name || '';
    case 'status':
      return ctx.statuses.find((s) => s.key === raw)?.label || String(raw);
    case 'campaign':
      return ctx.campaigns.find((c) => c.id === raw)?.title || '';
    case 'clientRequest':
    case 'isOverdue':
      return raw ? 'Sim' : 'Não';
    default:
      return String(raw);
  }
};

/* ---------------------------------------------------------------------------
 * Avaliação
 * ------------------------------------------------------------------------- */

const asArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.map(String) : v === null || v === undefined || v === '' ? [] : [String(v)];

export const evaluateCondition = (
  task: Task,
  cond: FilterCondition,
  ctx: EvalContext
): boolean => {
  const raw = readField(task, cond.field, ctx);
  const op = cond.operator;

  // ME vira o id de quem está logado no momento da avaliação.
  const resolveMe = (v: unknown): unknown =>
    v === ME
      ? ctx.currentUserId || ''
      : Array.isArray(v)
        ? v.map((x) => (x === ME ? ctx.currentUserId || '' : x))
        : v;
  const value = resolveMe(cond.value);

  const empty =
    raw === null ||
    raw === undefined ||
    raw === '' ||
    (Array.isArray(raw) && raw.length === 0) ||
    (cond.field === 'attachments' && raw === 0);

  switch (op) {
    case 'isEmpty':
      return empty;
    case 'isNotEmpty':
      return !empty;
    case 'isTrue':
      return raw === true;
    case 'isFalse':
      return raw !== true;

    case 'is':
      // Campo de lista (responsáveis, seleção múltipla): "é" quer dizer
      // "está entre", senão a comparação viraria texto contra texto.
      return Array.isArray(raw)
        ? raw.map(String).includes(String(value ?? ''))
        : String(raw ?? '') === String(value ?? '');
    case 'isNot':
      return Array.isArray(raw)
        ? !raw.map(String).includes(String(value ?? ''))
        : String(raw ?? '') !== String(value ?? '');

    case 'isAnyOf': {
      const set = asArray(value);
      return asArray(raw).some((v) => set.includes(v));
    }
    case 'isNoneOf': {
      const set = asArray(value);
      return !asArray(raw).some((v) => set.includes(v));
    }

    case 'contains':
      return String(raw ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());
    case 'notContains':
      return !String(raw ?? '').toLowerCase().includes(String(value ?? '').toLowerCase());

    case 'gt':
      return Number(raw) > Number(value);
    case 'gte':
      return Number(raw) >= Number(value);
    case 'lt':
      return Number(raw) < Number(value);
    case 'lte':
      return Number(raw) <= Number(value);

    case 'isToday':
      return raw === todayKey();
    case 'isOverdue':
      // "Já passou" só conta enquanto a pauta não foi concluída.
      return (
        typeof raw === 'string' &&
        raw < todayKey() &&
        !DONE_STATUSES.includes(task.status)
      );
    case 'before':
      return typeof raw === 'string' && !!value && raw < String(value);
    case 'after':
      return typeof raw === 'string' && !!value && raw > String(value);
    case 'inNextDays': {
      const n = Number(value) || 0;
      return typeof raw === 'string' && raw >= todayKey() && raw <= shiftDays(n);
    }
    case 'inLastDays': {
      const n = Number(value) || 0;
      return typeof raw === 'string' && raw <= todayKey() && raw >= shiftDays(-n);
    }

    default:
      return true;
  }
};

export const matchesFilter = (task: Task, filter: FilterGroup, ctx: EvalContext): boolean => {
  const active = filter.conditions.filter((c) => c.field);
  if (active.length === 0) return true;
  return filter.match === 'any'
    ? active.some((c) => evaluateCondition(task, c, ctx))
    : active.every((c) => evaluateCondition(task, c, ctx));
};

/** A primeira regra ativa que casar define a cor. Ordem = prioridade. */
export const resolveRowColor = (
  task: Task,
  rules: ColorRule[],
  ctx: EvalContext
): TaskColor | null => {
  for (const rule of rules) {
    if (!rule.enabled) continue;
    if (rule.filter.conditions.length === 0) continue;
    if (matchesFilter(task, rule.filter, ctx)) return getColor(rule.color);
  }
  return null;
};

export const sortTasks = (tasks: Task[], sort: TaskSort | null, ctx: EvalContext): Task[] => {
  if (!sort) return tasks;
  const dir = sort.direction === 'desc' ? -1 : 1;

  return [...tasks].sort((a, b) => {
    const va = readField(a, sort.field, ctx);
    const vb = readField(b, sort.field, ctx);

    // Vazios sempre no fim, independentemente da direção.
    const ea = va === null || va === undefined || va === '';
    const eb = vb === null || vb === undefined || vb === '';
    if (ea && eb) return 0;
    if (ea) return 1;
    if (eb) return -1;

    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
    if (typeof va === 'boolean' && typeof vb === 'boolean') {
      return (Number(va) - Number(vb)) * dir;
    }

    // Campos de referência ordenam pelo rótulo, não pelo id.
    const la = ['client', 'assignee', 'category', 'status', 'campaign'].includes(sort.field)
      ? readLabel(a, sort.field, ctx)
      : String(va);
    const lb = ['client', 'assignee', 'category', 'status', 'campaign'].includes(sort.field)
      ? readLabel(b, sort.field, ctx)
      : String(vb);

    return la.localeCompare(lb, 'pt-BR') * dir;
  });
};

/* ---------------------------------------------------------------------------
 * Fábricas
 * ------------------------------------------------------------------------- */

const rid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const newCondition = (field = 'status'): FilterCondition => ({
  id: rid('cond'),
  field,
  operator: 'is',
  value: '',
});

export const newColorRule = (name = 'Nova regra', color = 'amber'): ColorRule => ({
  id: rid('rule'),
  name,
  color,
  enabled: true,
  filter: { match: 'all', conditions: [newCondition()] },
});

export const DEFAULT_COLUMNS = [
  'client',
  'title',
  'attachments',
  'category',
  'assignee',
  'status',
  'postDate',
];

export const newView = (name: string, mode: TaskView['mode'] = 'list'): TaskView => ({
  id: rid('view'),
  name,
  mode,
  filter: { match: 'all', conditions: [] },
  sort: null,
  colorRules: [],
  visibleColumns: [...DEFAULT_COLUMNS],
  columnOrder: [...DEFAULT_COLUMNS],
  columnWidths: {},
  groupBy: 'status',
  createdAt: new Date().toISOString(),
});

/**
 * Visões iniciais.
 *
 * A primeira já traz as regras de cor que antes estavam fixas no código —
 * agora editáveis e removíveis como qualquer outra.
 */
export const buildDefaultViews = (): TaskView[] => {
  const regras: ColorRule[] = [
    {
      id: rid('rule'),
      name: 'Atrasada',
      color: 'amber',
      enabled: true,
      filter: {
        match: 'all',
        conditions: [{ id: rid('cond'), field: 'postDate', operator: 'isOverdue' }],
      },
    },
    {
      id: rid('rule'),
      name: 'Ajuste pedido pelo cliente',
      color: 'rose',
      enabled: true,
      filter: {
        match: 'all',
        conditions: [{ id: rid('cond'), field: 'status', operator: 'is', value: 'alterar' }],
      },
    },
    {
      id: rid('rule'),
      name: 'Em aprovação',
      color: 'sky',
      enabled: true,
      filter: {
        match: 'all',
        conditions: [{ id: rid('cond'), field: 'status', operator: 'is', value: 'em_aprovacao' }],
      },
    },
    {
      id: rid('rule'),
      name: 'Aprovada',
      color: 'emerald',
      enabled: true,
      filter: {
        match: 'all',
        conditions: [
          { id: rid('cond'), field: 'status', operator: 'isAnyOf', value: ['aprovado', 'postado'] },
        ],
      },
    },
  ];

  const todas = newView('Todas as tarefas');
  todas.isSystem = true;
  todas.colorRules = regras;

  // "Minhas tarefas" é visão de verdade, não atalho: filtra pelo responsável
  // logado. O filtro é resolvido na hora da avaliação, por isso o valor
  // especial ME — o id do usuário muda a cada sessão.
  const minhas = newView('Minhas tarefas');
  minhas.isSystem = true;
  minhas.filter = {
    match: 'all',
    conditions: [{ id: rid('cond'), field: 'assignee', operator: 'is', value: ME }],
  };
  minhas.colorRules = JSON.parse(JSON.stringify(regras));

  return [todas, minhas];
};
