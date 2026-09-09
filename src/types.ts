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

export type WorkflowStep = 'briefing' | 'headline' | 'copy' | 'arte' | 'conferencia' | 'em_aprovacao' | 'aprovado';
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
  title: string;
  categoryId: string;
  assigneeId?: string; // primary assignee (for backward compatibility)
  assigneeIds?: string[]; // multiple assignees support
  funnelStage?: FunnelStage;
  channel?: ContentChannel;
  artDate?: string;
  postDate?: string;
  status: TaskStatusKey;
  
  // Interactive Step-by-Step Workflow state (as in Tarefas.png ~ Tarefas-3.png)
  currentStep: WorkflowStep;
  briefingText: string;
  headlineOptions: string[];
  selectedHeadline?: string;
  copyMode?: 'legenda' | 'carrossel' | 'roteiro' | 'none';
  caption: string;
  carouselSlides: CarouselSlide[];
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
  activity: TaskActivity[];
  aiChatHistory?: { id: string; role: 'user' | 'assistant'; content: string; timestamp: string }[];
  clientRequest: boolean;
  notes?: string;
  editingBy?: TaskLiveEditing | null;
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
  dateSortType?: 'artDate' | 'postDate';
}

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  appliedData?: any;
}
