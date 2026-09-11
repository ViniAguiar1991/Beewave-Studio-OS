export type Role = 'admin' | 'colaborador' | 'cliente';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  phone?: string;
  jobTitle?: string;
  status?: 'active' | 'inactive';
  role: Role;
  color?: string;
  avatarUrl?: string;
  clientId?: string; // If role is 'cliente'
  joinedAt?: string;
  permissions?: {
    tarefas?: boolean;
    clientes?: boolean;
    calendario?: boolean;
    noticias?: boolean;
    prompts?: boolean;
    financeiro?: boolean;
    crm?: boolean;
  };
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  postsPerWeek: number;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export type TaskStatusKey =
  | 'nao_iniciado'
  | 'aguardar'
  | 'urgencia'
  | 'planejamento'
  | 'em_andamento'
  | 'em_aprovacao'
  | 'alterar'
  | 'aprovado'
  | 'postado';

export interface TaskStatus {
  key: TaskStatusKey;
  label: string;
  color: string;
  group: 'todo' | 'progress' | 'review' | 'done';
  clientVisible?: boolean;
  clientAction?: boolean;
}

export interface MonthlyReport {
  id: string;
  month: string; // e.g. "Agosto 2026"
  newFollowers?: number;
  followersGrowthPercent?: number;
  reach?: number;
  impressions?: number;
  postsPublished?: number;
  engagementRate: number; // e.g. 4.8 (%)
  reachTotal?: number; // e.g. 48500
  postsCount?: number; // e.g. 16
  linkClicks?: number; // e.g. 1240
  insights?: string;
  topPosts?: { title: string; metric: string }[];
  highlights?: string[]; // O que deu certo
  improvements?: string[]; // O que deve melhorar
  followersGrowth?: { label: string; value: number }[];
}

export interface ContractService {
  id: string;
  name: string; // e.g. "Posts de redes sociais", "Tablóide de ofertas mensal", "Stories diários"
  frequency: 'semanal' | 'quinzenal' | 'mensal' | 'diario';
  quantity: number; // e.g. 3
  defaultAssigneeId?: string;
  defaultFormat?: string; // "Post único", "Carrossel", "Reels", "Tablóide impresso", etc.
  daysOfWeek: number[]; // 0: Dom, 1: Seg, 2: Ter, 3: Qua, 4: Qui, 5: Sex, 6: Sáb
  active: boolean;
}

export interface Campaign {
  id: string;
  clientId: string;
  title: string; // e.g. "Campanha de 15 anos - Perfetto Uomo"
  description?: string;
  startDate?: string;
  endDate?: string;
  status: 'planejamento' | 'em_producao' | 'em_aprovacao' | 'concluida' | 'pausada';
  color?: string;
  folderEmoji?: string;
  createdAt: string;
}

export interface CustomService {
  id: string;
  title: string;
  description?: string;
  price: number;
  date: string;
  status: 'pendente' | 'em_andamento' | 'entregue' | 'pago' | 'cancelado';
}

export interface TrashItem {
  id: string;
  type: 'task' | 'client' | 'file' | 'note' | 'news' | 'prompt';
  title: string;
  subtitle?: string;
  deletedAt: string; // ISO String
  deletedBy?: string;
  data: any; // complete snapshot to restore with 1 click
}

export interface AdminSystemPrompts {
  headlinePrompt: string;
  copyCaptionPrompt: string;
  copyCarouselPrompt: string;
  copyScriptPrompt: string;
  chatRefinePrompt: string;
  newsTrendsPrompt: string;
}

export interface ClientFile {
  id: string;
  name: string;
  type?: string;
  size?: number;
  dataUrl: string;
  url?: string;
  uploadedAt?: string;
}

export interface Client {
  id: string;
  company: string;
  name: string;
  email: string;
  whatsapp: string;
  cnpj?: string;
  city?: string;
  country: string;
  instagram?: string;
  site?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  bannerPositionY?: number; // 0 to 100 vertical framing percentage
  emoji?: string;
  planId: string;
  mensalidade: number;
  postsPerWeek: number;
  dueDay: number;
  contractStart?: string;
  contractServices?: ContractService[];
  customServices?: CustomService[];
  // Deep Client Profile
  about?: string;
  niche?: string;
  targetAudience?: string;
  persona?: string;
  toneOfVoice?: string[];
  toneOfVoiceTags?: string[];
  toneOfVoiceCustom?: string;
  recommendedWords?: string | string[];
  forbiddenWords?: string | string[];
  monthlyReports?: MonthlyReport[];
  files?: ClientFile[];
  strategyDocument?: ClientStrategyDocument;
  portalEmail?: string;
  portalPassword?: string;
  createdAt: string;
}

export interface CarouselSlide {
  slideNumber: number;
  title: string;
  content: string;
}

export interface TaskFile {
  id: string;
  name: string;
  type?: string;
  size?: number;
  dataUrl?: string;
  url?: string;
  uploadedAt?: string;
}

export interface TaskActivity {
  ts: string;
  type: 'create' | 'status_change' | 'client_approve' | 'client_change' | 'resubmit' | 'ai_generate' | 'comment';
  by: string;
  text: string;
}

export type WorkflowStep = 'briefing' | 'headline' | 'copy' | 'arte' | 'conferencia' | 'em_aprovacao' | 'aprovado' | 'producao' | 'concluido';
export type FunnelStage = 'topo' | 'meio' | 'fundo' | 'geral';
export type ContentChannel = 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'facebook' | 'blog';

export interface TaskLiveEditing {
  userId: string;
  userName: string;
  userColor?: string;
  updatedAt: string; // ISO string
}

export interface Task {
  id: string;
  clientId: string;
  campaignId?: string;
  title: string;
  categoryId: string;
  assigneeId?: string; // primary assignee (for backward compatibility)
  assigneeIds?: string[]; // multiple assignees support
  funnelStage?: FunnelStage;
  channel?: ContentChannel;
  artDate?: string;
  postDate?: string;
  date?: string; // alias for postDate
  format?: string;
  status: TaskStatusKey;
  driveLink?: string;
  
  // Interactive Step-by-Step Workflow state (as in Tarefas.png ~ Tarefas-3.png)
  currentStep: WorkflowStep;
  briefingText: string;
  headlineOptions: string[];
  selectedHeadline?: string;
  headline?: string; // alias for selectedHeadline
  copyMode?: 'legenda' | 'carrossel' | 'roteiro' | 'none';
  caption: string;
  carouselSlides: CarouselSlide[];
  slides?: any[]; // alias for carouselSlides
  scriptText: string;
  approvedCopySections: {
    caption?: boolean;
    carousel?: boolean;
    script?: boolean;
  };
  
  files: TaskFile[];
  briefingFiles?: TaskFile[];
  timeSpent: number; // in seconds
  timerStartedAt: number | null;
  activity?: TaskActivity[];
  aiChatHistory?: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[];
  clientRequest: boolean;
  clientFeedback?: string;
  notes?: string;
  editingBy?: TaskLiveEditing | null;
  /** Valores das colunas criadas pelo usuário, indexados por CustomProperty.id. */
  customFields?: Record<string, string | number | boolean | string[] | null>;
  createdAt: string;
  updatedAt: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  source: string;
  contentIdea: string;
  imageUrl?: string;
  url?: string;
  bookmarked?: boolean;
}

export interface PromptFolder {
  id: string;
  name: string;
  color: string;
}

export interface PromptItem {
  id: string;
  folderId: string;
  title: string;
  body: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteItem {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface CustomSpaceTab {
  id: string;
  name: string;
  notes: { id: string; title: string; body: string }[];
}

export interface CloudSyncInfo {
  connected: boolean;
  provider: string;
  status: 'online' | 'syncing' | 'offline' | 'error';
  lastSync: string | null;
  autoSync: boolean;
  itemCount: number;
  backupCount?: number;
}

export interface TaskFiltersState {
  onlyMyTasks: boolean;
  selectedStatusKeys: string[];
  searchQuery: string;
  selectedClientId: string;
  selectedAssigneeId: string;
  selectedStatusDropdown: string;
  selectedDateFilter: string;
  customDateFrom?: string;
  customDateTo?: string;
  dateSortType?: 'artDate' | 'postDate';
}

export interface TableViewConfig {
  visibleColumnIds: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  appliedData?: any;
}

export interface StrategyCallout {
  quote: string;
  caption?: string;
  authorOrLabel?: string;
}

export interface StrategyPortfolioItem {
  icon?: string;
  title: string;
  description: string;
  tag?: string;
}

export interface StrategyOccasion {
  role: string;
  description: string;
  priority?: string;
}

export interface StrategyJourneyStep {
  step: string;
  name: string;
  quote: string;
  touchpoints: string;
}

export interface StrategyCommercialStep {
  step: string;
  title: string;
  description: string;
}

export interface StrategyBottleneck {
  title: string;
  subtitle?: string;
  description: string;
}

export interface StrategyKpiItem {
  metric: string;
  target: string;
  frequency: string;
  why: string;
}

export interface StrategyQuarterPlan {
  month: string;
  title: string;
  focus: string;
  actions: string[];
}

export interface StrategyResponsibilityItem {
  category: string;
  agency: string[];
  client: string[];
}

export interface StrategyGlossaryItem {
  term: string;
  definition: string;
}

export interface StrategySwot {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface StrategyChapter {
  id: string;
  number: string; // e.g. "01", "02", ... "10"
  tag: string; // e.g. "01 · MARCA E PÚBLICOS"
  title: string; // e.g. "Marca e proposta de valor"
  subtitle?: string; // e.g. "Tornar a amplitude da Emely visível..."
  contentMarkdown?: string;
  callout?: StrategyCallout;
  portfolioItems?: StrategyPortfolioItem[];
  occasions?: StrategyOccasion[];
  journeySteps?: StrategyJourneyStep[];
  commercialSteps?: StrategyCommercialStep[];
  bottleneck?: StrategyBottleneck;
  swot?: StrategySwot;
  kpis?: StrategyKpiItem[];
  quarterPlan?: StrategyQuarterPlan[];
  responsibilities?: StrategyResponsibilityItem[];
  glossary?: StrategyGlossaryItem[];
}

export interface ClientStrategyDocument {
  id?: string;
  title?: string;
  subtitle?: string;
  clientOverview?: string | { mission?: string; vision?: string; coreValues?: string[]; differential?: string; [key: string]: any };
  targetAudience?: any;
  cycleMeta?: string;
  keyDecisions?: {
    centralDecision: string;
    positioning: string;
    cyclePriority: string;
  };
  chapters?: StrategyChapter[];
  rawText?: string;
  updatedAt?: string;
  [key: string]: any;
}


/* ============================================================================
 * CENTRAL DE TAREFAS CONFIGURÁVEL
 *
 * Filtros, cores e colunas deixam de ser código e viram dados que o usuário
 * cria pela interface. Antes, "atrasada fica amarela" estava escrito num
 * switch em badgeStyles.ts: qualquer regra nova exigia mexer no código.
 * ========================================================================== */

/** Tipos de coluna que o usuário pode criar. */
export type PropertyType = 'text' | 'select' | 'multiSelect' | 'number' | 'date' | 'checkbox' | 'url';

export interface PropertyOption {
  id: string;
  label: string;
  /** Chave da paleta (ver TASK_COLORS), não hex — mantém a paleta coerente. */
  color: string;
}

/** Coluna criada pelo usuário. Vale para todas as tarefas da agência. */
export interface CustomProperty {
  id: string;
  name: string;
  type: PropertyType;
  /** Só para select e multiSelect. */
  options?: PropertyOption[];
  createdAt: string;
}

export type FilterOperator =
  | 'is'
  | 'isNot'
  | 'isAnyOf'
  | 'isNoneOf'
  | 'contains'
  | 'notContains'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'before'
  | 'after'
  | 'isToday'
  | 'isOverdue'
  | 'inNextDays'
  | 'inLastDays'
  | 'isTrue'
  | 'isFalse';

export interface FilterCondition {
  id: string;
  /** Id do campo: embutido ('status', 'postDate'…) ou `custom:<propertyId>`. */
  field: string;
  operator: FilterOperator;
  value?: string | number | string[];
}

export interface FilterGroup {
  /** 'all' = E entre as condições; 'any' = OU. */
  match: 'all' | 'any';
  conditions: FilterCondition[];
}

/** Regra de cor. A primeira que casar vence — a ordem da lista é a prioridade. */
export interface ColorRule {
  id: string;
  name: string;
  filter: FilterGroup;
  /** Chave da paleta TASK_COLORS. */
  color: string;
  enabled: boolean;
}

export interface TaskSort {
  field: string;
  direction: 'asc' | 'desc';
}

/** Uma visão salva da Central de Tarefas. */
export interface TaskView {
  id: string;
  name: string;
  mode: 'list' | 'kanban' | 'calendar';
  filter: FilterGroup;
  sort: TaskSort | null;
  colorRules: ColorRule[];
  visibleColumns: string[];
  columnOrder: string[];
  columnWidths: Record<string, number>;
  /** Campo usado para agrupar as colunas do Kanban. */
  groupBy?: string;
  /** Visões de sistema não podem ser apagadas. */
  isSystem?: boolean;
  /** Publicada para a equipe: veio do Firestore, não só deste navegador. */
  isShared?: boolean;
  createdAt: string;
}
