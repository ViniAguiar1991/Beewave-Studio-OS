import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  syncTaskToCloud,
  syncTaskLiveEditingToCloud,
  deleteTaskFromCloud,
  syncClientToCloud,
  deleteClientFromCloud,
  syncUserToCloud,
  deleteUserFromCloud,
  syncAdminPromptsToCloud,
  publishTaskViewsToCloud,
  syncMascotToCloud,
  syncDashboardPhrasesToCloud,
  syncPromptsConfigToCloud,
} from './services/firestoreSync';
import {
  User,
  Client,
  Task,
  TaskActivity,
  Plan,
  Category,
  TaskStatus,
  NewsItem,
  PromptFolder,
  PromptItem,
  NoteItem,
  CustomSpaceTab,
  CloudSyncInfo,
  WorkflowStep,
  TaskFiltersState,
  TrashItem,
  CustomService,
  AdminSystemPrompts,
  TaskLiveEditing,
  TableViewConfig,
  ClientStrategyDocument,
  Campaign,
  ContractService,
  TaskView,
  CustomProperty,
} from './types';
import { FRASES_PADRAO } from './lib/weekPlan';
import { buildDefaultViews } from './lib/taskViews';
import { EMELY_STRATEGY_DOCUMENT } from './data/emelyStrategy';

export const DEFAULT_ADMIN_PROMPTS: AdminSystemPrompts = {
  headlinePrompt: `Você é um estrategista sênior de marketing digital e copywriter premiado.
Gere opções de Headlines de altíssimo impacto, curiosidade e retenção baseadas estritamente no briefing e perfil do cliente fornecidos.`,
  copyCaptionPrompt: `Você é um copywriter sênior especialista em redes sociais de alta conversão.
Escreva uma legenda completa e envolvente, respeitando o briefing, o tom de voz do cliente e a headline selecionada. Use parágrafos curtos, escaneabilidade e CTA claro.`,
  copyCarouselPrompt: `Você é um designer de narrativas visuais e estrategista de carrosséis para Instagram e LinkedIn.
Crie um roteiro de carrossel de 5 a 7 lâminas que retenha a atenção slide a slide, conectado à headline escolhida.`,
  copyScriptPrompt: `Você é um diretor criativo de vídeos curtos (Reels, TikTok, Shorts).
Estruture um roteiro dinâmico com Gancho Visual e Sonoro (0-3s), Desenvolvimento Rápido (3-20s), Clímax e Chamada para Ação (CTA).`,
  chatRefinePrompt: `Você é o co-piloto de IA criativo da agência BeeWave.
Seu objetivo é refinar, reescrever ou adaptar o conteúdo gerado (headline, legenda, carrossel ou roteiro) exatamente conforme a solicitação do usuário, mantendo coerência com o briefing e a identidade do cliente.`,
  newsTrendsPrompt: `Você é um curador sênior de inteligência de mercado, tendências e notícias para criadores de conteúdo e agências.
Curadoria de notícias quentes, tendências e ideias práticas de conteúdo pertinentes aos nichos e turnos cadastrados.`
};

export const DEFAULT_NICHES = [
  'Marketing Digital & Social Media',
  'Finanças, Investimentos & Economia',
  'Saúde, Clínicas & Bem-estar',
  'Cafés Especiais & Gastronomia',
  'Imobiliário, Arquitetura & Construção',
  'Moda, Beleza & Estilo',
  'Inteligência Artificial & Tecnologia'
];

export const DEFAULT_SIDEBAR_ORDER = [
  'inicio',
  'tarefas',
  'clientes',
  'colaboradores',
  'noticias',
  'prompts',
  'financeiro',
  'crm',
];

export const INITIAL_TASK_FILTERS: TaskFiltersState = {
  onlyMyTasks: false,
  selectedStatusKeys: [],
  searchQuery: '',
  selectedClientId: 'all',
  selectedAssigneeId: 'all',
  selectedStatusDropdown: 'all',
  selectedDateFilter: 'all',
  customDateFrom: '',
  customDateTo: '',
  dateSortType: 'postDate',
};

export const INITIAL_STATUSES: TaskStatus[] = [
  { key: 'nao_iniciado', label: 'Não iniciado', color: '#64748b', group: 'todo', clientVisible: true },
  { key: 'aguardar', label: 'Aguardar', color: '#3b82f6', group: 'todo' },
  { key: 'urgencia', label: 'Urgência', color: '#ef4444', group: 'todo' },
  { key: 'em_andamento', label: 'Em andamento', color: '#f59e0b', group: 'progress' },
  { key: 'em_aprovacao', label: 'Em aprovação', color: '#0ea5e9', group: 'review', clientVisible: true, clientAction: true },
  { key: 'alterar', label: 'Alterar', color: '#f97316', group: 'review', clientVisible: true },
  { key: 'aprovado', label: 'Aprovado', color: '#10b981', group: 'done', clientVisible: true },
  { key: 'postado', label: 'Postado', color: '#059669', group: 'done', clientVisible: true },
];

export const DEFAULT_PLANS: Plan[] = [
  { id: 'plan_ess', name: 'Essencial', price: 990, postsPerWeek: 3, description: '1 rede social + 3 posts por semana + suporte' },
  { id: 'plan_pro', name: 'Profissional', price: 1890, postsPerWeek: 5, description: '2 redes + 5 posts/semana + stories + relatórios' },
  { id: 'plan_prem', name: 'Premium & Tráfego', price: 3200, postsPerWeek: 7, description: 'Estratégia completa: carrosséis, reels, design e tráfego pago' },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_carrossel', name: 'Carrossel', color: '#f59e0b' },
  { id: 'cat_reels', name: 'Reels / Vídeo curto', color: '#10b981' },
  { id: 'cat_post', name: 'Post único / Estático', color: '#0ea5e9' },
  { id: 'cat_video', name: 'Vídeo Longo / YouTube', color: '#8b5cf6' },
  { id: 'cat_stories', name: 'Stories / Enquetes', color: '#f97316' },
  { id: 'cat_design', name: 'Design & Identidade', color: '#06b6d4' },
];

export const DEFAULT_USERS: User[] = [
  {
    id: 'u_admin',
    name: 'Vinicius Aguiar',
    email: 'admin@beewave.com',
    password: 'admin',
    phone: '(54) 99988-7766',
    jobTitle: 'Diretor Geral & Estrategista',
    status: 'active',
    role: 'admin',
    color: '#f59e0b',
    joinedAt: '2025-01-15',
    permissions: {},
  },
  {
    id: 'u_ana',
    name: 'Ana Prado',
    email: 'ana@beewave.com',
    password: '1234',
    phone: '(51) 98765-4321',
    jobTitle: 'Head de Conteúdo & Copywriter',
    status: 'active',
    role: 'colaborador',
    color: '#0ea5e9',
    joinedAt: '2025-03-01',
    permissions: { tarefas: true, clientes: true, equipe: true, prompts: true },
  },
  {
    id: 'u_rafa',
    name: 'Rafael Nunes',
    email: 'rafa@beewave.com',
    password: '1234',
    phone: '(54) 99123-4567',
    jobTitle: 'Designer Sênior & Motion',
    status: 'active',
    role: 'colaborador',
    color: '#8b5cf6',
    joinedAt: '2025-04-10',
    permissions: { tarefas: true, prompts: true },
  },
  {
    id: 'u_joao',
    name: 'João Silva',
    email: 'joao@beewave.com',
    password: '1234',
    phone: '(54) 99811-2233',
    jobTitle: 'Social Media & Redator',
    status: 'active',
    role: 'colaborador',
    color: '#10b981',
    joinedAt: '2025-05-15',
    permissions: { tarefas: true, clientes: true, equipe: true, prompts: true },
  },
  {
    id: 'u_cli_grao',
    name: 'Cafeteria Grão Nobre',
    email: 'graonobre@cliente.com',
    password: '1234',
    phone: '(54) 99912-3344',
    role: 'cliente',
    clientId: 'c_zaffari',
    color: '#f59e0b',
    permissions: {},
  },
  {
    id: 'u_cli_bella',
    name: 'Studio Bella Pilates',
    email: 'bella@cliente.com',
    password: '1234',
    phone: '(51) 98876-2211',
    role: 'cliente',
    clientId: 'c_bella',
    color: '#10b981',
    permissions: {},
  },
  {
    id: 'u_cli_emely',
    name: 'Emely Moda Festa',
    email: 'emely@cliente.com',
    password: '1234',
    phone: '(54) 99871-5500',
    role: 'cliente',
    clientId: 'c_emely',
    color: '#059669',
    permissions: {},
  },
];

export const DEFAULT_CLIENTS: Client[] = [
  {
    id: 'c_emely',
    company: 'Emely Moda Festa',
    name: 'Emely Oliveira',
    email: 'contato@emelymodafesta.com.br',
    portalEmail: 'emely@cliente.com',
    portalPassword: '1234',
    whatsapp: '(54) 99871-5500',
    cnpj: '24.551.902/0001-83',
    city: 'Caxias do Sul',
    country: 'Brasil',
    instagram: '@emelymodafesta',
    site: 'emelymodafesta.com.br',
    emoji: '👗',
    planId: 'plan_prem',
    mensalidade: 3200,
    postsPerWeek: 7,
    dueDay: 15,
    contractStart: '2025-01-10',
    bannerUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1600&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=400&q=80',
    about: 'Loja especializada em vestidos de noiva, debutantes, moda festa feminina, ternos masculinos e trajes a rigor para toda a família.',
    niche: 'Vestidos de Noiva, Festas & Trajes a Rigor',
    targetAudience: 'Noivas, madrinhas, debutantes, formandas e familiares que buscam atendimento acolhedor, modelagem sob medida e elegância sem inacessibilidade.',
    persona: 'Carolina, 27 anos, noiva, procura um vestido que valorize seu corpo sem estourar o orçamento do casamento.',
    toneOfVoice: ['Elegante', 'Acolhedor', 'Empático', 'Claro e Transparente'],
    toneOfVoiceTags: ['Sofisticado / Elegante', 'Acolhedor / Empático', 'Acessível / Claro', 'Celebrativo / Emocional'],
    toneOfVoiceCustom: 'Comunicar com elegância e proximidade. Falar de momentos únicos, caimento real e segurança para o grande dia.',
    recommendedWords: 'vestido de noiva, caimento impecável, momento especial, prova dos sonhos, ateliê próprio, alta costura, moda festa, padrinhos',
    forbiddenWords: 'vestidinho barato, promoção bizarra, tecido descartável, qualquer um usa, sobra de estoque',
    strategyDocument: EMELY_STRATEGY_DOCUMENT,
    createdAt: '2025-01-10',
    files: [
      { id: 'f-emely-1', name: 'Plano_Estrategico_Emely_2026.pdf', type: 'application/pdf', size: 1840000, dataUrl: '', uploadedAt: '2026-09-01' }
    ]
  },
  {
    id: 'c_zaffari',
    company: 'Cafeteria Grão Nobre',
    name: 'Marcelo Zaffari',
    email: 'contato@graonobre.com.br',
    portalEmail: 'graonobre@cliente.com',
    portalPassword: '1234',
    whatsapp: '(54) 99912-3344',
    cnpj: '18.442.101/0001-22',
    city: 'Caxias do Sul',
    country: 'Brasil',
    instagram: '@graonobre',
    site: 'graonobre.com.br',
    emoji: '☕',
    planId: 'plan_pro',
    mensalidade: 1890,
    postsPerWeek: 5,
    dueDay: 10,
    contractStart: '2025-03-01',
    bannerUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=80',
    about: 'Cafeteria artesanal focada em grãos especiais de origem única, métodos manuais de extração e doces autorais para um público refinado.',
    niche: 'Cafés Especiais & Gastronomia',
    targetAudience: 'Amantes de café, profissionais liberais e pessoas que buscam momentos de pausa e conforto.',
    persona: 'Lucas e Camila, 28-45 anos, apreciadores de experiências gastronômicas, valorizam sustentabilidade, momentos de desaceleração e qualidade superior em cada detalhe.',
    toneOfVoice: ['Acolhedor', 'Sofisticado', 'Sensorial', 'Técnico sem ser prolixo'],
    toneOfVoiceTags: ['Acolhedor / Empático', 'Sofisticado / Elegante', 'Técnico / Especialista', 'Sensorial / Narrativo'],
    toneOfVoiceCustom: 'Falar com calma e apreço pela arte do café. Enfatizar aromas, texturas e rituais diários. Nunca soar apelativo ou apressado.',
    recommendedWords: 'origem única, notas sensoriais, extração artesanal, torra fresca, pausa com afeto, microlote, barista, ritual',
    forbiddenWords: 'barato, café comum, promoção relâmpago, pó de mercado, cafezinho rápido, fórmula mágica',
    monthlyReports: [
      {
        id: 'rep-aug',
        month: 'Agosto 2026',
        followersGrowth: [
          { label: 'Sem 1', value: 4120 },
          { label: 'Sem 2', value: 4380 },
          { label: 'Sem 3', value: 4690 },
          { label: 'Sem 4', value: 5040 }
        ],
        engagementRate: 5.4,
        reachTotal: 34200,
        postsCount: 16,
        linkClicks: 890,
        highlights: [
          'Carrossel sobre notas sensoriais atingiu o recorde de salvamentos (340 saves).',
          'Vídeos de bastidores com o barista geraram 45% mais compartilhamentos nos Stories.',
          'Crescimento orgânico consistente de +920 novos seguidores no mês.'
        ],
        improvements: [
          'Aumentar frequência de chamadas diretas para reserva de mesa aos sábados.',
          'Testar formato de enquetes interativas nos Stories às terças-feiras.'
        ]
      },
      {
        id: 'rep-jul',
        month: 'Julho 2026',
        followersGrowth: [
          { label: 'Sem 1', value: 3400 },
          { label: 'Sem 2', value: 3620 },
          { label: 'Sem 3', value: 3890 },
          { label: 'Sem 4', value: 4120 }
        ],
        engagementRate: 4.8,
        reachTotal: 28900,
        postsCount: 15,
        linkClicks: 640,
        highlights: [
          'Campanha de inverno com chocolate quente artesanal esgotou o lote especial.',
          'Excelente recepção do reels com método Prensa Francesa.'
        ],
        improvements: [
          'Padronizar a tipografia nas capas dos destaques do perfil.'
        ]
      }
    ],
    createdAt: '2025-03-01',
    files: [
      { id: 'f-1', name: 'Manual_Marca_GraoNobre.pdf', type: 'application/pdf', size: 1240000, dataUrl: '', uploadedAt: '2025-03-02' },
      { id: 'f-2', name: 'Contrato_Prestacao_Servicos.pdf', type: 'application/pdf', size: 840000, dataUrl: '', uploadedAt: '2025-03-01' }
    ]
  },
  {
    id: 'c_bella',
    company: 'Studio Bella Pilates',
    name: 'Juliana Bellintani',
    email: 'ju@studiobella.com',
    portalEmail: 'bella@cliente.com',
    portalPassword: '1234',
    whatsapp: '(51) 98876-2211',
    cnpj: '32.109.556/0001-04',
    city: 'Porto Alegre',
    country: 'Brasil',
    instagram: '@studiobellapilates',
    site: 'studiobella.com.br',
    emoji: '🧘‍♀️',
    planId: 'plan_prem',
    mensalidade: 3200,
    postsPerWeek: 7,
    dueDay: 5,
    contractStart: '2024-11-15',
    bannerUrl: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80',
    about: 'Estúdio boutique de pilates contemporâneo e reabilitação postural com turmas personalizadas de até 3 alunos.',
    niche: 'Saúde, Pilates & Bem-estar',
    targetAudience: 'Mulheres e homens de 28 a 60 anos com dores na coluna ou em busca de condicionamento sem impacto.',
    persona: 'Helena, 38 anos, médica ou advogada, sofre com tensão muscular por horas na mesma posição, busca acolhimento, postura elegante e vitalidade.',
    toneOfVoice: ['Acolhedor', 'Inspirador', 'Claro', 'Técnico com empatia'],
    toneOfVoiceTags: ['Acolhedor / Empático', 'Inspirador / Motivador', 'Acessível / Claro', 'Autoridade / Científico'],
    toneOfVoiceCustom: 'Transmitir cuidado, precisão anatômica e bem-estar corporal. Inspirar o movimento consciente sem pressão estética punitiva.',
    recommendedWords: 'alívio postural, fortalecimento do core, respiração consciente, movimento seguro, reabilitação, flexibilidade, saúde da coluna',
    forbiddenWords: 'secar barriga em 3 dias, emagrecimento radical, dor é normal, sem dor sem ganho, pilates barato',
    monthlyReports: [
      {
        id: 'rep-aug-bella',
        month: 'Agosto 2026',
        followersGrowth: [
          { label: 'Sem 1', value: 6800 },
          { label: 'Sem 2', value: 7150 },
          { label: 'Sem 3', value: 7520 },
          { label: 'Sem 4', value: 7980 }
        ],
        engagementRate: 6.2,
        reachTotal: 58000,
        postsCount: 22,
        linkClicks: 1420,
        highlights: [
          'Série de vídeos sobre alívio da dor lombar gerou 84 novos contatos no WhatsApp.',
          'Taxa de conversão de aulas experimentais atingiu 78% dos leads que vieram do Instagram.'
        ],
        improvements: [
          'Inserir depoimentos em vídeo de alunas reais duas vezes por mês.'
        ]
      }
    ],
    createdAt: '2024-11-15',
    files: [
      { id: 'f-3', name: 'Fotos_Equipe_Studio.zip', type: 'application/zip', size: 3400000, dataUrl: '', uploadedAt: '2024-11-20' }
    ]
  },
  {
    id: 'c_norte',
    company: 'Norte Engenharia & Obras',
    name: 'Eduardo Klein',
    email: 'ed@norteengenharia.com.br',
    portalEmail: 'norte@cliente.com',
    portalPassword: '1234',
    whatsapp: '(54) 99145-8890',
    cnpj: '09.887.223/0001-71',
    city: 'Bento Gonçalves',
    country: 'Brasil',
    instagram: '@norteengenharia',
    site: 'norteengenharia.com.br',
    emoji: '🏗️',
    planId: 'plan_ess',
    mensalidade: 990,
    postsPerWeek: 3,
    dueDay: 20,
    contractStart: '2025-06-10',
    bannerUrl: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=1200&q=80',
    about: 'Construtora e engenharia focada em empreendimentos residenciais de alto padrão e laudos de perícia técnica.',
    niche: 'Construção Civil & Arquitetura',
    targetAudience: 'Investidores imobiliários, famílias em busca de apartamento próprio e corretores.',
    persona: 'Roberto, 46 anos, empresário, valoriza solidez financeira, pontualidade na entrega de obras e acabamentos nobres.',
    toneOfVoice: ['Profissional', 'Confiável', 'Direto', 'Informativo'],
    toneOfVoiceTags: ['Profissional / Confiante', 'Direto / Pragmático', 'Técnico / Especialista', 'Sério / Corporativo'],
    toneOfVoiceCustom: 'Foco em números, prazos rigorosos, segurança estrutural e valorização patrimonial.',
    recommendedWords: 'alto padrão, solidez, valorização, engenharia de ponta, entrega no prazo, laudo técnico, acabamento nobre',
    forbiddenWords: 'obra barata, improviso, quebra-galho, puxadinho, pedreiro sem registro',
    monthlyReports: [
      {
        id: 'rep-aug-norte',
        month: 'Agosto 2026',
        followersGrowth: [
          { label: 'Sem 1', value: 2100 },
          { label: 'Sem 2', value: 2240 },
          { label: 'Sem 3', value: 2390 },
          { label: 'Sem 4', value: 2580 }
        ],
        engagementRate: 3.9,
        reachTotal: 19500,
        postsCount: 12,
        linkClicks: 410,
        highlights: [
          'Vídeo de vistoria da sacada gourmet gerou 14 pedidos de agendamento de visita.',
          'Post de perícia estrutural consolidou a autoridade técnica da marca.'
        ],
        improvements: [
          'Postar mais fotos em carrossel mostrando os detalhes de acabamento em mármore.'
        ]
      }
    ],
    createdAt: '2025-06-10',
    files: []
  },
  {
    id: 'c_perfetto',
    company: 'Perfetto Uomo',
    name: 'Branca',
    email: 'contato@perfettouomo.com.br',
    portalEmail: 'perfetto@cliente.com',
    portalPassword: '1234',
    whatsapp: '(54) 99611-8822',
    cnpj: '12.345.678/0001-90',
    city: 'Caxias do Sul',
    country: 'Brasil',
    instagram: '@perfettouomo',
    site: 'perfettouomo.com.br',
    emoji: '👔',
    planId: 'plan_prem',
    mensalidade: 3500,
    postsPerWeek: 3,
    dueDay: 10,
    contractStart: '2025-01-01',
    bannerUrl: 'https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=300&q=80',
    about: 'Alfaiataria masculina contemporânea, trajes sob medida e peças casuais de alto padrão para homens sofisticados.',
    niche: 'Moda Masculina & Alfaiataria',
    targetAudience: 'Homens de 28 a 60 anos que buscam caimento impecável, conforto e elegância no trabalho e em celebrações.',
    persona: 'Rodrigo, 35 anos, empresário, valoriza corte sob medida e praticidade sem perder a elegância refinada.',
    toneOfVoice: ['Sofisticado', 'Seguro', 'Inspirador', 'Acolhedor'],
    toneOfVoiceTags: ['Sofisticado / Elegante', 'Autoridade / Especialista', 'Direto / Seguro'],
    toneOfVoiceCustom: 'Transmitir elegância atemporal, caimento que acompanha o movimento e segurança pessoal.',
    recommendedWords: 'elegância, caimento impecável, alfaiataria contemporânea, presença marcante, tecido nobre, sob medida',
    forbiddenWords: 'roupa barata, promoção imperdível, terno qualquer, promoção relâmpago',
    contractServices: [
      {
        id: 'srv-perf-1',
        name: 'Posts de redes sociais',
        frequency: 'semanal',
        quantity: 3,
        defaultAssigneeId: 'u_joao',
        defaultFormat: 'Post único',
        daysOfWeek: [1, 3, 5],
        active: true,
      }
    ],
    strategyDocument: {
      clientOverview: {
        mission: 'Vestir o homem contemporâneo com presença, elegância e segurança sob medida.',
        vision: 'Ser a principal referência em alfaiataria premium e moda masculina da serra gaúcha.',
        coreValues: ['Caimento impecável', 'Atendimento consultivo', 'Materiais nobres', 'Elegância discreta'],
        differential: 'Consultoria de estilo sob medida com ateliê próprio de ajustes e acervo premium.'
      },
      targetAudience: {
        demographics: 'Homens de 28 a 60 anos, empresários, executivos, noivos e formandos.',
        behavior: 'Valorizam tempo, qualidade percebida e buscam aconselhamento profissional de imagem.',
        painPoints: ['Dificuldade de encontrar roupas prontas com caimento perfeito', 'Medo de errar no dress code em eventos importantes'],
        desires: ['Sentir-se confiante e elegante sem esforço aparente', 'Ter peças versáteis que durem anos']
      },
      voiceAndTone: {
        personality: ['Seguro', 'Sofisticado', 'Acolhedor', 'Consultivo'],
        guidelines: 'Fale de estilo como uma extensão da personalidade, nunca como imposição ou ostentação vazia.',
        dos: ['Exaltar texturas, tecidos nobres e acabamentos artesanais', 'Inspirar combinações inteligentes para trabalho e eventos'],
        donts: ['Usar apelo de preço baixo ou liquidacionismo agressivo', 'Linguagem excessivamente juvenil ou gírias da moda']
      },
      contentPillars: [
        { name: 'Elegância e Caimento', percentage: 40, description: 'Detalhes de alfaiataria, cortes sob medida e tecidos nobres.' },
        { name: 'Ocasiões e Estilo', percentage: 30, description: 'Guia de trajes para casamentos, formaturas e negócios.' },
        { name: 'Bastidores e Atendimento', percentage: 20, description: 'Consultoria da equipe, ajustes ao vivo e cuidado com o cliente.' },
        { name: '15 Anos Perfetto', percentage: 10, description: 'Histórias, clientes marcantes e celebrações com a comunidade.' }
      ],
      goals: [
        { metric: 'Agendamentos de consultoria', target: '45/mês', current: '38/mês' },
        { metric: 'Engajamento em carrosséis', target: '5.2%', current: '4.8%' },
        { metric: 'Visualizações de vídeos de prova', target: '25.000', current: '21.400' }
      ]
    },
    createdAt: '2025-01-01',
    files: []
  },
  {
    id: 'c_melatti',
    company: 'Melatti Cosméticos',
    name: 'Camila Melatti',
    email: 'contato@melatticosmeticos.com.br',
    portalEmail: 'melatti@cliente.com',
    portalPassword: '1234',
    whatsapp: '(54) 99122-3344',
    cnpj: '98.765.432/0001-11',
    city: 'Caxias do Sul',
    country: 'Brasil',
    instagram: '@melatticosmeticos',
    site: 'melatticosmeticos.com.br',
    emoji: '✨',
    planId: 'plan_prem',
    mensalidade: 4200,
    postsPerWeek: 4,
    dueDay: 15,
    contractStart: '2025-02-01',
    bannerUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=300&q=80',
    about: 'Rede especializada em cosméticos, perfumaria premium e dermocosméticos, com tablóide mensal de ofertas especiais.',
    niche: 'Beleza, Cosméticos & Cuidados Pessoais',
    targetAudience: 'Consumidores de dermocosméticos, profissionais da estética e amantes de autocuidado.',
    persona: 'Mariana, 32 anos, busca produtos dermatológicos comprovados com bom custo-benefício e orientação confiável.',
    toneOfVoice: ['Acolhedor', 'Científico Acessível', 'Vibrante', 'Confiável'],
    toneOfVoiceTags: ['Acolhedor / Empático', 'Técnico / Especialista', 'Acessível / Claro'],
    toneOfVoiceCustom: 'Explicar os benefícios reais de cada fórmula de forma simples e incentivar o autocuidado diário.',
    recommendedWords: 'autocuidado, pele saudável, hidratação profunda, dermocosméticos, ofertas exclusivas, bem-estar',
    forbiddenWords: 'milagre instantâneo, fórmula mágica, produto barato demais',
    contractServices: [
      {
        id: 'srv-mel-1',
        name: 'Posts de redes sociais',
        frequency: 'semanal',
        quantity: 4,
        defaultAssigneeId: 'u_joao',
        defaultFormat: 'Post único',
        daysOfWeek: [1, 2, 4, 5],
        active: true,
      },
      {
        id: 'srv-mel-2',
        name: 'Tablóide de ofertas mensal',
        frequency: 'mensal',
        quantity: 1,
        defaultAssigneeId: 'u_admin',
        defaultFormat: 'Tablóide impresso',
        daysOfWeek: [1],
        active: true,
      }
    ],
    strategyDocument: {
      clientOverview: {
        mission: 'Proporcionar saúde da pele e autoestima por meio da melhor seleção em dermocosméticos e perfumaria.',
        vision: 'Ser a rede de cosméticos mais querida e recomendada da região.',
        coreValues: ['Cuidado autêntico', 'Transparência nas fórmulas', 'Atendimento especialista', 'Preço justo'],
        differential: 'Equipe com farmacêuticos e consultores dermocosméticos treinados em loja física e suporte no WhatsApp.'
      },
      targetAudience: {
        demographics: 'Mulheres e homens de 22 a 55 anos interessados em skincare e cuidados com o cabelo.',
        behavior: 'Pesquisam ativos (ácido hialurônico, vitamina C) e buscam promoções no tablóide mensal.',
        painPoints: ['Dúvida de como montar rotina de skincare sem gastar muito', 'Sensibilidade cutânea a cosméticos agressivos'],
        desires: ['Pele viçosa e saudável com produtos recomendados por especialistas']
      },
      voiceAndTone: {
        personality: ['Didático', 'Acolhedor', 'Científico sem complicação', 'Animado'],
        guidelines: 'Incentive a consistência nos cuidados diários. Mostre como ler rótulos e aplicar os produtos corretamente.',
        dos: ['Destacar ativos e textura dos produtos', 'Avisar sobre as datas especiais do tablóide de ofertas'],
        donts: ['Prometer resultados milagrosos da noite para o dia', 'Desprezar rotinas simples']
      },
      contentPillars: [
        { name: 'Dermocosméticos & Rotina', percentage: 40, description: 'Passo a passo de skincare, ordem de aplicação e ativos.' },
        { name: 'Tablóide & Ofertas do Mês', percentage: 30, description: 'Destaques do encarte impresso e combos de ofertas.' },
        { name: 'Cabelos & Perfumaria', percentage: 20, description: 'Cronograma capilar e fragrâncias em alta.' },
        { name: 'Dicas dos Consultores', percentage: 10, description: 'Perguntas frequentes respondidas pela equipe da loja.' }
      ],
      goals: [
        { metric: 'Retirada de tablóides na loja', target: '2.500 un', current: '2.100 un' },
        { metric: 'Mensagens no WhatsApp pedindo ofertas', target: '180/mês', current: '145/mês' }
      ]
    },
    createdAt: '2025-02-01',
    files: []
  }
];

export const DEFAULT_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-perfetto-15',
    clientId: 'c_perfetto',
    title: 'Campanha de 15 Anos - Perfetto Uomo',
    description: 'Celebração comemorativa dos 15 anos da loja: vitrine especial, jornal/encarte, catálogo e peças para Instagram e Stories.',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    status: 'em_producao',
    color: '#b45309',
    folderEmoji: '🎉',
    createdAt: '2026-08-25',
  },
  {
    id: 'camp-melatti-tabloide',
    clientId: 'c_melatti',
    title: 'Tablóide de Ofertas & Festival Primavera',
    description: 'Ação com tablóide impresso mensal de ofertas, encartes promocionais e distribuição de conteúdo digital.',
    startDate: '2026-09-10',
    endDate: '2026-09-28',
    status: 'em_producao',
    color: '#0284c7',
    folderEmoji: '🌸',
    createdAt: '2026-09-02',
  },
  {
    id: 'camp-emely-noivas',
    clientId: 'c_emely',
    title: 'Temporada Noivas & Debutantes 2026',
    description: 'Campanha de captação de noivas para prova de vestidos com antecedência.',
    startDate: '2026-09-15',
    endDate: '2026-10-15',
    status: 'planejamento',
    color: '#e11d48',
    folderEmoji: '👰‍♀️',
    createdAt: '2026-09-05',
  }
];

export const DEFAULT_TASKS: Task[] = [
  {
    id: 'task-perf-1',
    clientId: 'c_perfetto',
    title: 'Elegância que faz parte da sua rotina',
    categoryId: 'cat_carrossel',
    assigneeId: 'u_joao',
    assigneeIds: ['u_joao'],
    postDate: '2026-09-10',
    date: '2026-09-10',
    format: 'Carrossel',
    status: 'em_aprovacao',
    currentStep: 'em_aprovacao',
    headline: 'Elegância que faz parte da sua rotina',
    selectedHeadline: 'Elegância que faz parte da sua rotina',
    briefingText: 'Carrossel demonstrando tecidos nobres e como a alfaiataria se encaixa na rotina diária.',
    headlineOptions: ['Elegância que faz parte da sua rotina'],
    copyMode: 'carrossel',
    caption: 'Seu estilo aparece nos detalhes. No caimento que acompanha seus movimentos, na textura que faz a diferença e na confiança de se sentir bem.\n\nConheça a nossa seleção e encontre a peça que combina com o seu próximo momento.\n\n#PerfettoUomo #EstiloMasculino',
    carouselSlides: [
      { slideNumber: 1, title: 'Capa', content: 'Elegância que faz parte da sua rotina.' },
      { slideNumber: 2, title: 'Corte', content: 'Caimento anatômico ajustado sob medida para o seu corpo.' },
      { slideNumber: 3, title: 'Tecido', content: 'Fibras naturais de alta respirabilidade e toque macio.' },
    ],
    scriptText: '',
    approvedCopySections: { caption: true, carousel: true },
    files: [
      {
        id: 'f-perf-1',
        name: 'Perfetto_Elegancia.jpg',
        dataUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=80',
        uploadedAt: '2026-09-09',
      }
    ],
    timeSpent: 2400,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-08T10:00:00.000Z',
    updatedAt: '2026-09-09T14:30:00.000Z',
  },
  {
    id: 'task-perf-2',
    clientId: 'c_perfetto',
    title: 'O seu próximo capítulo começa aqui',
    categoryId: 'cat_post',
    assigneeId: 'u_ana',
    assigneeIds: ['u_ana'],
    postDate: '2026-09-12',
    date: '2026-09-12',
    format: 'Post único',
    status: 'em_aprovacao',
    currentStep: 'em_aprovacao',
    headline: 'O seu próximo capítulo começa aqui',
    briefingText: 'Post institucional para noivos e formandos.',
    headlineOptions: ['O seu próximo capítulo começa aqui'],
    caption: 'O terno certo não é apenas uma roupa: é a presença que você leva para os momentos decisivos da sua vida.\n\nAtendimento consultivo com hora marcada para você viver essa escolha com tranquilidade.\n\n#PerfettoUomo #TrajesMasculinos',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: { caption: true },
    files: [
      {
        id: 'f-perf-2',
        name: 'Perfetto_Capitulo.jpg',
        dataUrl: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=80',
        uploadedAt: '2026-09-10',
      }
    ],
    timeSpent: 1800,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-09T09:00:00.000Z',
    updatedAt: '2026-09-10T11:00:00.000Z',
  },
  {
    id: 'task-perf-3',
    clientId: 'c_perfetto',
    title: 'Posts de redes sociais · 02/09',
    categoryId: 'cat_post',
    assigneeId: 'u_joao',
    assigneeIds: ['u_joao'],
    postDate: '2026-09-02',
    date: '2026-09-02',
    format: 'Post único',
    status: 'planejamento',
    currentStep: 'briefing',
    briefingText: 'Entrega semanal recorrente de contrato.',
    headlineOptions: [],
    caption: '',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: {},
    files: [],
    timeSpent: 0,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'task-perf-4',
    clientId: 'c_perfetto',
    title: 'Posts de redes sociais · 04/09',
    categoryId: 'cat_post',
    assigneeId: 'u_joao',
    assigneeIds: ['u_joao'],
    postDate: '2026-09-04',
    date: '2026-09-04',
    format: 'Post único',
    status: 'planejamento',
    currentStep: 'briefing',
    briefingText: 'Entrega semanal recorrente de contrato.',
    headlineOptions: [],
    caption: '',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: {},
    files: [],
    timeSpent: 0,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'task-perf-5',
    clientId: 'c_perfetto',
    title: 'Posts de redes sociais · 07/09',
    categoryId: 'cat_post',
    assigneeId: 'u_joao',
    assigneeIds: ['u_joao'],
    postDate: '2026-09-07',
    date: '2026-09-07',
    format: 'Post único',
    status: 'planejamento',
    currentStep: 'briefing',
    briefingText: 'Entrega semanal recorrente de contrato.',
    headlineOptions: [],
    caption: '',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: {},
    files: [],
    timeSpent: 0,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'task-perf-6',
    clientId: 'c_perfetto',
    title: 'Muito além do primeiro olhar',
    categoryId: 'cat_reels',
    assigneeId: 'u_admin',
    assigneeIds: ['u_admin'],
    postDate: '2026-09-08',
    date: '2026-09-08',
    format: 'Reels',
    status: 'postado',
    currentStep: 'concluido',
    headline: 'Muito além do primeiro olhar',
    briefingText: 'Vídeo mostrando a diferença entre terno comum de loja e alfaiataria com ajuste fino.',
    headlineOptions: ['Muito além do primeiro olhar'],
    caption: 'A diferença do terno sob medida está no detalhe que quase ninguém vê, mas todo mundo sente.',
    carouselSlides: [],
    scriptText: 'Gancho: Você sabe porque alguns homens parecem mais elegantes mesmo usando um terno simples?',
    approvedCopySections: { script: true },
    files: [],
    timeSpent: 3600,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-05T10:00:00.000Z',
    updatedAt: '2026-09-08T18:00:00.000Z',
  },
  {
    id: 'task-perf-7',
    clientId: 'c_perfetto',
    title: 'Posts de redes sociais · 09/09',
    categoryId: 'cat_post',
    assigneeId: 'u_joao',
    assigneeIds: ['u_joao'],
    postDate: '2026-09-09',
    date: '2026-09-09',
    format: 'Post único',
    status: 'planejamento',
    currentStep: 'briefing',
    briefingText: 'Entrega semanal recorrente de contrato.',
    headlineOptions: [],
    caption: '',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: {},
    files: [],
    timeSpent: 0,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-01T08:00:00.000Z',
    updatedAt: '2026-09-01T08:00:00.000Z',
  },
  {
    id: 'task-camp-perf-1',
    clientId: 'c_perfetto',
    campaignId: 'camp-perfetto-15',
    title: 'Adesivo de Vitrine · 15 Anos Perfetto',
    categoryId: 'cat_design',
    assigneeId: 'u_rafa',
    assigneeIds: ['u_rafa'],
    postDate: '2026-09-18',
    date: '2026-09-18',
    format: 'Adesivo / Vitrine',
    status: 'em_andamento',
    currentStep: 'producao',
    headline: 'Vitrine Comemorativa 15 Anos Perfetto',
    briefingText: 'Layout em corte vinil fosco dourado e preto para as duas vitrines principais da loja comemorando os 15 anos.',
    headlineOptions: [],
    caption: '',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: {},
    files: [],
    timeSpent: 1200,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-06T11:00:00.000Z',
  },
  {
    id: 'task-camp-perf-2',
    clientId: 'c_perfetto',
    campaignId: 'camp-perfetto-15',
    title: 'Jornal & Encarte de Ofertas Especial 15 Anos',
    categoryId: 'cat_design',
    assigneeId: 'u_rafa',
    assigneeIds: ['u_rafa'],
    postDate: '2026-09-22',
    date: '2026-09-22',
    format: 'Impresso / Jornal',
    status: 'planejamento',
    currentStep: 'briefing',
    briefingText: 'Encarte de 4 páginas com editorial de fotos dos clientes homenageados e agradecimento da marca aos 15 anos.',
    headlineOptions: [],
    caption: '',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: {},
    files: [],
    timeSpent: 0,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'task-camp-perf-3',
    clientId: 'c_perfetto',
    campaignId: 'camp-perfetto-15',
    title: 'Stories: Linha do Tempo 15 Anos',
    categoryId: 'cat_stories',
    assigneeId: 'u_joao',
    assigneeIds: ['u_joao'],
    postDate: '2026-09-15',
    date: '2026-09-15',
    format: 'Stories',
    status: 'planejamento',
    currentStep: 'briefing',
    briefingText: 'Sequência de 5 stories resgatando as primeiras fotos da inauguração da loja há 15 anos.',
    headlineOptions: [],
    caption: '',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: {},
    files: [],
    timeSpent: 0,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-02T10:00:00.000Z',
    updatedAt: '2026-09-02T10:00:00.000Z',
  },
  {
    id: 'task-mel-1',
    clientId: 'c_melatti',
    title: 'O cuidado começa na escolha certa',
    categoryId: 'cat_reels',
    assigneeId: 'u_joao',
    assigneeIds: ['u_joao'],
    postDate: '2026-09-10',
    date: '2026-09-10',
    format: 'Reels',
    status: 'alterar',
    currentStep: 'em_aprovacao',
    headline: 'O cuidado começa na escolha certa',
    briefingText: 'Vídeo dinâmico apresentando sérum facial antioxidante.',
    headlineOptions: ['O cuidado começa na escolha certa'],
    caption: 'Você sabia que o sérum facial deve ser aplicado antes do hidratante pesado? Descubra o passo a passo.',
    carouselSlides: [],
    scriptText: 'Gancho: Não jogue dinheiro fora usando seus dermocosméticos na ordem errada!',
    clientFeedback: 'Por favor, dar mais destaque para a textura do produto nos primeiros 3 segundos do vídeo.',
    approvedCopySections: { script: true },
    files: [],
    timeSpent: 2100,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-05T09:00:00.000Z',
    updatedAt: '2026-09-09T16:00:00.000Z',
  },
  {
    id: 'task-mel-2',
    clientId: 'c_melatti',
    campaignId: 'camp-melatti-tabloide',
    title: 'Tablóide de Ofertas Mensal - Setembro',
    categoryId: 'cat_design',
    assigneeId: 'u_admin',
    assigneeIds: ['u_admin'],
    postDate: '2026-09-15',
    date: '2026-09-15',
    format: 'Tablóide impresso',
    status: 'em_andamento',
    currentStep: 'producao',
    headline: 'Tablóide Primavera de Ofertas Melatti',
    briefingText: 'Diagramação de tablóide quinzenal/mensal com 12 ofertas principais de protetor solar e hidratantes.',
    headlineOptions: [],
    caption: '',
    carouselSlides: [],
    scriptText: '',
    approvedCopySections: {},
    files: [],
    timeSpent: 4200,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-01T10:00:00.000Z',
    updatedAt: '2026-09-08T15:00:00.000Z',
  },
  {
    id: 'task-mel-3',
    clientId: 'c_melatti',
    title: 'Rotina de Skincare Noturna: Os 3 Passos',
    categoryId: 'cat_carrossel',
    assigneeId: 'u_ana',
    assigneeIds: ['u_ana'],
    postDate: '2026-09-11',
    date: '2026-09-11',
    format: 'Carrossel',
    status: 'em_aprovacao',
    currentStep: 'em_aprovacao',
    headline: 'Rotina de Skincare Noturna',
    briefingText: 'Carrossel educativo ensinando limpeza dupla e hidratação.',
    headlineOptions: ['Rotina de Skincare Noturna: Os 3 Passos'],
    caption: 'Acordar com a pele descansada começa na noite anterior. Salve esse post para não esquecer a ordem correta!',
    carouselSlides: [
      { slideNumber: 1, title: 'Capa', content: 'Rotina Noturna em 3 Passos' },
      { slideNumber: 2, title: 'Passo 1', content: 'Limpeza suave com água micelar' },
      { slideNumber: 3, title: 'Passo 2', content: 'Tratamento com sérum nutritivo' },
    ],
    scriptText: '',
    approvedCopySections: { caption: true, carousel: true },
    files: [
      {
        id: 'f-mel-3',
        name: 'Melatti_Skincare.jpg',
        dataUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=1200&q=80',
        uploadedAt: '2026-09-10',
      }
    ],
    timeSpent: 1900,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-08T11:00:00.000Z',
    updatedAt: '2026-09-10T17:00:00.000Z',
  },
  {
    id: 'task-emely-aprov-1',
    clientId: 'c_emely',
    title: 'Carrossel: Os 4 Erros mais comuns ao escolher o Vestido de Noiva',
    categoryId: 'cat_carrossel',
    assigneeId: 'u_ana',
    assigneeIds: ['u_ana'],
    postDate: '2026-09-14',
    date: '2026-09-14',
    format: 'Carrossel',
    status: 'em_aprovacao',
    currentStep: 'em_aprovacao',
    headline: 'Não cometa o erro nº 3 antes de visitar uma loja especializada 👰‍♀️',
    selectedHeadline: 'Não cometa o erro nº 3 antes de visitar uma loja especializada 👰‍♀️',
    briefingText: 'Post educativo voltado a noivas que estão no momento de decisão do vestido.',
    headlineOptions: ['Não cometa o erro nº 3 antes de visitar uma loja especializada 👰‍♀️'],
    caption: 'O vestido dos seus sonhos não precisa ser uma fonte de estresse.\n\nEvite esses 4 erros e agende sua prova com consultoria acolhedora na Emely Moda Festa!',
    carouselSlides: [
      { slideNumber: 1, title: 'Capa', content: 'Os 4 Maiores Erros ao Escolher seu Vestido de Noiva' },
      { slideNumber: 2, title: 'Erro 01', content: 'Deixar para a última hora: ajustes finos exigem tempo e calma.' },
    ],
    scriptText: '',
    approvedCopySections: { caption: true, carousel: true },
    files: [
      {
        id: 'f-emely-1',
        name: 'Emely_Vestido.jpg',
        dataUrl: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=1200&q=80',
        uploadedAt: '2026-09-11',
      }
    ],
    timeSpent: 1800,
    timerStartedAt: null,
    clientRequest: false,
    createdAt: '2026-09-09T10:00:00.000Z',
    updatedAt: '2026-09-11T12:00:00.000Z',
  }
];

export const DEFAULT_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Instagram prioriza carrosséis dinâmicos e formatos com música de fundo',
    summary: 'A plataforma confirmou que posts no formato carrossel com áudio de fundo recebem até 40% mais impressões na aba Explorar e no feed.',
    category: 'Social Media',
    date: 'Hoje',
    source: 'Creators Insider',
    contentIdea: 'Criar carrosséis com dicas do seu nicho usando áudios em alta para alcançar novos seguidores.',
    imageUrl: 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80',
    bookmarked: true
  },
  {
    id: 'news-2',
    title: 'Vídeos de 7 a 15 segundos têm a maior retenção média em 2026',
    summary: 'Micro-conteúdos com gancho forte nos primeiros 2 segundos mantêm mais de 75% da audiência até o final do vídeo.',
    category: 'Tendências de Vídeo',
    date: 'Hoje',
    source: 'Trend Report',
    contentIdea: 'Grave um corte rápido mostrando o antes/depois do seu serviço com uma chamada para a legenda.',
    imageUrl: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
    bookmarked: false
  },
  {
    id: 'news-3',
    title: 'Conteúdo autêntico e bastidores sem filtro geram 3x mais conversão',
    summary: 'Consumidores estão preferindo vídeos informais de bastidores do que produções corporativas altamente editadas.',
    category: 'Estratégia & Vendas',
    date: 'Ontem',
    source: 'Marketing Hub',
    contentIdea: 'Grave seu processo de trabalho com a câmera apoiada na mesa e conte um desafio do dia.',
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
    bookmarked: false
  },
  {
    id: 'news-4',
    title: 'Automação inteligente de Directs no Instagram dobra resposta de leads',
    summary: 'Respostas em menos de 5 minutos com links imediatos no direct reduzem a desistência do lead em 50%.',
    category: 'IA & Automação',
    date: 'Esta semana',
    source: 'Digital Growth',
    contentIdea: 'Faça um post chamando o público para comentar uma palavra-chave e receber o material na hora.',
    imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
    bookmarked: true
  }
];

interface BeeWaveState {
  // Appearance & Layout
  darkMode: boolean;
  agencyName: string;
  logoDataUrl: string | null;
  iconDataUrl: string | null;
  /** Poses do mascote usadas na saudação do Início. Uma por dia. */
  mascotImages: string[];
  addMascotImages: (dataUrls: string[]) => Promise<void>;
  /** Frases da saudação do Início. Uma por dia, igual para a equipe toda. */
  dashboardPhrases: string[];
  setDashboardPhrases: (frases: string[]) => Promise<void>;
  removeMascotImage: (index: number) => Promise<void>;
  toggleDarkMode: () => void;
  setDarkMode: (enabled: boolean) => void;
  setAgencyName: (name: string) => void;
  setLogo: (dataUrl: string | null) => void;
  setIcon: (dataUrl: string | null) => void;

  // Auth & Permissions
  currentUserId: string | null;
  users: User[];
  login: (email: string, pass: string) => { ok: boolean; user?: User; error?: string };
  logout: () => void;
  currentUser: () => User | null;
  can: (permKey?: string | null) => boolean;
  addUser: (user: Partial<User>) => User;
  updateUser: (id: string, data: Partial<User>) => void;
  deleteUser: (id: string) => void;
  togglePermission: (userId: string, permKey: string) => void;

  // Clients
  clients: Client[];
  addClient: (client: Partial<Client>) => Client;
  updateClient: (id: string, data: Partial<Client>) => void;
  updateClientStrategy: (clientId: string, strategy: ClientStrategyDocument) => void;
  deleteClient: (id: string) => void;
  addClientFiles: (clientId: string, files: any[]) => void;
  removeClientFile: (clientId: string, fileId: string) => void;

  // Timer Dock
  dockedTimerTaskId: string | null;
  /**
   * Cronômetro que o usuário fechou à mão nesta máquina.
   *
   * Fica só local, de propósito: quando a gravação na nuvem falha (cota
   * esgotada, rede caindo), o listener devolve a tarefa com o cronômetro
   * ainda rodando e o aviso voltava à tela por mais que se fechasse.
   */
  dismissedTimerTaskId: string | null;
  dismissTimerWidget: (taskId: string) => void;
  setDockedTimerTaskId: (id: string | null) => void;
  resetTimer: (id: string) => void;

  // Tasks & Workflow
  tasks: Task[];
  addTask: (task: Partial<Task>) => Task;
  duplicateTask: (taskId: string) => Task | undefined;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  setTaskStatus: (id: string, status: any) => void;
  setTaskWorkflowStep: (id: string, step: WorkflowStep) => void;
  startTimer: (id: string) => void;
  stopTimer: (id: string) => void;
  addTaskFiles: (taskId: string, files: any[]) => void;
  removeTaskFile: (taskId: string, fileId: string) => void;
  clientApprove: (taskId: string, clientName: string) => void;
  clientRequestChange: (taskId: string, clientName: string, reason: string) => void;
  clientRequestMultipleChanges: (taskId: string, clientName: string, reasons: string[]) => void;
  addTaskComment: (taskId: string, authorName: string, text: string, type?: 'comment' | 'client_change') => void;
  setTaskLiveEditing: (taskId: string, user: { id: string; name: string; color?: string }) => void;
  clearTaskLiveEditing: (taskId: string) => void;

  // Notícias & Trends
  news: NewsItem[];
  toggleBookmarkNews: (id: string) => void;
  addNewsItem: (item: Partial<NewsItem>) => void;
  deleteNewsItem: (id: string) => void;
  refreshNewsFromAI: () => Promise<void>;

  // Notes & Focus
  notes: NoteItem[];
  addNote: (userId: string, text: string) => void;
  toggleNote: (id: string) => void;
  deleteNote: (id: string) => void;

  // Custom tabs & Prompts
  promptFolders: PromptFolder[];
  prompts: PromptItem[];
  addPromptFolder: (data: Partial<PromptFolder>) => void;
  deletePromptFolder: (id: string) => void;
  addPrompt: (data: Partial<PromptItem>) => void;
  updatePrompt: (id: string, data: Partial<PromptItem>) => void;
  deletePrompt: (id: string) => void;
  customTabs: CustomSpaceTab[];
  addCustomTab: (data: Partial<CustomSpaceTab>) => void;
  updateCustomTab: (id: string, data: Partial<CustomSpaceTab>) => void;
  deleteCustomTab: (id: string) => void;

  // Plans, Categories & Statuses
  plans: Plan[];
  categories: Category[];
  statuses: TaskStatus[];
  addPlan: (p: Partial<Plan>) => void;
  updatePlan: (id: string, p: Partial<Plan>) => void;
  deletePlan: (id: string) => void;
  addCategory: (c: Partial<Category>) => void;
  updateCategory: (id: string, c: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addStatus: (s: Partial<TaskStatus>) => void;
  updateStatus: (key: string, s: Partial<TaskStatus>) => void;
  deleteStatus: (key: string) => void;
  moveStatus: (key: string, direction: number) => void;
  reorderStatuses: (newStatuses: TaskStatus[]) => void;

  // Campaigns
  campaigns: Campaign[];
  addCampaign: (campaign: Partial<Campaign>) => Campaign;
  updateCampaign: (id: string, data: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;

  // Contract Services & Recurring Flow
  addContractService: (clientId: string, service: Partial<ContractService>) => void;
  updateContractService: (clientId: string, serviceId: string, data: Partial<ContractService>) => void;
  deleteContractService: (clientId: string, serviceId: string) => void;
  generateMonthlyTasksFromContract: (clientId: string, monthDateStr?: string) => number;

  // Custom Client Services
  addCustomService: (clientId: string, service: Omit<CustomService, 'id'>) => void;
  updateCustomService: (clientId: string, serviceId: string, data: Partial<CustomService>) => void;
  deleteCustomService: (clientId: string, serviceId: string) => void;

  // 30-Day Trash & Recycle Bin
  trash: TrashItem[];
  moveToTrash: (item: Omit<TrashItem, 'id' | 'deletedAt'>) => void;
  restoreFromTrash: (trashId: string) => void;
  permanentlyDeleteFromTrash: (trashId: string) => void;
  emptyTrash: () => void;
  purgeExpiredTrash: () => void;

  // Hidden Admin AI Prompts
  adminPrompts: AdminSystemPrompts;
  updateAdminPrompts: (prompts: Partial<AdminSystemPrompts>) => void;
  resetAdminPrompts: () => void;

  // Registered News Niches
  newsNiches: string[];
  addNewsNiche: (niche: string) => void;
  removeNewsNiche: (niche: string) => void;

  // Sidebar Order
  sidebarOrder: string[];
  setSidebarOrder: (order: string[]) => void;

  // Task Filters Persistence
  taskFilters: TaskFiltersState;
  setTaskFilters: (filters: Partial<TaskFiltersState>) => void;
  resetTaskFilters: () => void;

  // Table View Configuration (Shared admin layout)
  tableViewConfig: TableViewConfig | null;
  setTableViewConfig: (config: TableViewConfig | null) => void;

  // Central de Tarefas configurável: visões e colunas criadas pelo usuário
  taskViews: TaskView[];
  activeViewId: string;
  customProperties: CustomProperty[];
  /** Há mudanças de visão ainda não publicadas para a equipe. */
  viewsDirty: boolean;
  publishTaskViews: () => Promise<void>;
  setActiveView: (viewId: string) => void;
  addTaskView: (view: TaskView) => void;
  updateTaskView: (viewId: string, data: Partial<TaskView>) => void;
  deleteTaskView: (viewId: string) => void;
  duplicateTaskView: (viewId: string) => void;
  addCustomProperty: (prop: CustomProperty) => void;
  updateCustomProperty: (id: string, data: Partial<CustomProperty>) => void;
  deleteCustomProperty: (id: string) => void;
  setTaskCustomField: (taskId: string, propertyId: string, value: any) => void;

  // Cloud Services
  cloudSync: CloudSyncInfo;
  syncWithCloud: () => Promise<void>;
  exportBackupJson: () => string;
  importBackupJson: (jsonString: string) => boolean;

  resetAllData: () => void;
}

export const useAppStore = create<BeeWaveState>()(
  persist(
    (set, get) => ({
      // Filter Persistence
      taskFilters: INITIAL_TASK_FILTERS,
      setTaskFilters: (filters) =>
        set((state) => ({
          taskFilters: { ...state.taskFilters, ...filters },
        })),
      resetTaskFilters: () => set({ taskFilters: INITIAL_TASK_FILTERS }),

      tableViewConfig: null,
      setTableViewConfig: (config) => set({ tableViewConfig: config }),

      /* ------------------------------------------------------------------
       * Central de Tarefas configurável.
       *
       * Visões, filtros, regras de cor e colunas viram dados do usuário.
       * Tudo aqui é persistido junto com o resto da store.
       * ---------------------------------------------------------------- */
      taskViews: buildDefaultViews(),
      activeViewId: '',
      customProperties: [],
      viewsDirty: false,

      /**
       * Publica a configuração de visões para toda a equipe.
       * Enquanto ninguém publica, cada pessoa só enxerga as próprias.
       */
      publishTaskViews: async () => {
        const { taskViews, customProperties } = get();
        const autor = get().currentUser()?.name || 'Equipe';
        await publishTaskViewsToCloud(
          taskViews.map((v) => ({ ...v, isShared: true })),
          customProperties,
          autor
        );
        set((state) => ({
          taskViews: state.taskViews.map((v) => ({ ...v, isShared: true })),
          viewsDirty: false,
        }));
      },

      setActiveView: (activeViewId) => set({ activeViewId }),

      addTaskView: (view) =>
        set((state) => ({ taskViews: [...state.taskViews, view], activeViewId: view.id, viewsDirty: true })),

      updateTaskView: (viewId, data) =>
        set((state) => ({
          taskViews: state.taskViews.map((v) => (v.id === viewId ? { ...v, ...data } : v)),
          viewsDirty: true,
        })),

      deleteTaskView: (viewId) =>
        set((state) => {
          // Sempre sobra pelo menos uma visão: sem visão não há tabela.
          const restantes = state.taskViews.filter((v) => v.id !== viewId && !v.isSystem ? true : v.id !== viewId);
          const finais = restantes.length > 0 ? restantes : buildDefaultViews();
          return {
            taskViews: finais,
            activeViewId: state.activeViewId === viewId ? finais[0].id : state.activeViewId,
          };
        }),

      duplicateTaskView: (viewId) =>
        set((state) => {
          const origem = state.taskViews.find((v) => v.id === viewId);
          if (!origem) return {};
          const copia: TaskView = {
            ...JSON.parse(JSON.stringify(origem)),
            id: `view_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            name: `${origem.name} (cópia)`,
            isSystem: false,
            createdAt: new Date().toISOString(),
          };
          return { taskViews: [...state.taskViews, copia], activeViewId: copia.id };
        }),

      addCustomProperty: (prop) =>
        set((state) => ({ customProperties: [...state.customProperties, prop], viewsDirty: true })),

      updateCustomProperty: (id, data) =>
        set((state) => ({
          customProperties: state.customProperties.map((p) =>
            p.id === id ? { ...p, ...data } : p
          ),
        })),

      deleteCustomProperty: (id) =>
        set((state) => ({
          customProperties: state.customProperties.filter((p) => p.id !== id),
          // A coluna some de todas as visões, senão ficam referências órfãs.
          taskViews: state.taskViews.map((v) => ({
            ...v,
            visibleColumns: v.visibleColumns.filter((c) => c !== `custom:${id}`),
            columnOrder: v.columnOrder.filter((c) => c !== `custom:${id}`),
            filter: {
              ...v.filter,
              conditions: v.filter.conditions.filter((c) => c.field !== `custom:${id}`),
            },
            colorRules: v.colorRules.map((r) => ({
              ...r,
              filter: {
                ...r.filter,
                conditions: r.filter.conditions.filter((c) => c.field !== `custom:${id}`),
              },
            })),
          })),
        })),

      setTaskCustomField: (taskId, propertyId, value) => {
        let updated: Task | undefined;
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id !== taskId) return t;
            updated = {
              ...t,
              customFields: { ...(t.customFields || {}), [propertyId]: value },
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },

      // Appearance defaults (clean light mode with linear gradient by default)
      darkMode: false,
      agencyName: 'BeeWave',
      logoDataUrl: null,
      iconDataUrl: null,
      mascotImages: [],
      dashboardPhrases: FRASES_PADRAO,

      addMascotImages: (dataUrls) => {
        // Teto de 12: são imagens em base64 e há limite tanto no navegador
        // quanto no documento do Firestore.
        const proximas = [...get().mascotImages, ...dataUrls].slice(0, 12);
        set({ mascotImages: proximas });
        return syncMascotToCloud(proximas);
      },

      setDashboardPhrases: (frases) => {
        // Sem frase cadastrada, o Início ficaria com uma linha vazia sob a
        // saudação. Lista vazia volta ao padrão em vez de virar buraco.
        const limpas = frases.map((f) => f.trim()).filter(Boolean);
        const proximas = limpas.length > 0 ? limpas : FRASES_PADRAO;
        set({ dashboardPhrases: proximas });
        return syncDashboardPhrasesToCloud(proximas);
      },

      removeMascotImage: (index) => {
        const proximas = get().mascotImages.filter((_, i) => i !== index);
        set({ mascotImages: proximas });
        return syncMascotToCloud(proximas);
      },


      toggleDarkMode: () => {
        const next = !get().darkMode;
        set({ darkMode: next });
        if (typeof document !== 'undefined') {
          if (next) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      setDarkMode: (enabled: boolean) => {
        set({ darkMode: enabled });
        if (typeof document !== 'undefined') {
          if (enabled) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      setAgencyName: (agencyName) => set({ agencyName }),
      setLogo: (logoDataUrl) => set({ logoDataUrl }),
      setIcon: (iconDataUrl) => set({ iconDataUrl }),

      // Auth - Default to null so new visitors or clients are never auto-logged as admin
      currentUserId: null as string | null,
      users: DEFAULT_USERS,
      login: (email, password) => {
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPass = (password || '').trim();
        
        // 1. Direct match in users array
        let user = get().users.find(
          (u) =>
            u.email.trim().toLowerCase() === cleanEmail &&
            (u.password || '').trim() === cleanPass
        );

        // 2. Fallback: match in clients array (portalEmail or email + portalPassword)
        if (!user) {
          const client = get().clients.find(
            (c) =>
              ((c.portalEmail || c.email || '').trim().toLowerCase() === cleanEmail) &&
              ((c.portalPassword || '1234').trim() === cleanPass)
          );
          if (client) {
            // Ensure clientUser exists in users list
            user = get().users.find((u) => u.clientId === client.id);
            if (!user) {
              const newClientUser: User = {
                id: `u_cli_${client.id}`,
                name: client.company || client.name || 'Cliente',
                email: client.portalEmail || client.email || cleanEmail,
                password: client.portalPassword || '1234',
                role: 'cliente',
                clientId: client.id,
                color: '#f59e0b',
                permissions: {},
              };
              set((state) => ({ users: [...state.users, newClientUser] }));
              user = newClientUser;
            }
          }
        }

        if (user) {
          set({ currentUserId: user.id });
          return { ok: true, user };
        }
        return { ok: false, error: 'E-mail ou senha incorretos.' };
      },
      logout: () => {
        set({ currentUserId: null });
        try {
          localStorage.removeItem('beewave_active_client_id');
        } catch {}
      },
      currentUser: () => get().users.find((u) => u.id === get().currentUserId) || null,
      can: (permKey) => {
        const u = get().currentUser();
        if (!u) return false;
        if (u.role === 'admin' || !permKey) return true;
        return !!(u.permissions as any)?.[permKey];
      },
      addUser: (data) => {
        const newUser: User = {
          id: `u_${Date.now().toString(36)}`,
          role: 'colaborador',
          name: 'Novo Colaborador',
          email: 'novo@beewave.com',
          password: '1234',
          phone: '',
          jobTitle: 'Colaborador',
          status: 'active',
          joinedAt: new Date().toISOString().split('T')[0],
          permissions: { tarefas: true, clientes: true, equipe: true, prompts: true },
          color: '#0ea5e9',
          ...data,
        };
        set((state) => ({ users: [...state.users, newUser] }));
        syncUserToCloud(newUser);
        return newUser;
      },
      updateUser: (id, data) => {
        let updatedUser: User | undefined;
        set((state) => {
          const nextUsers = state.users.map((u) => {
            if (u.id === id) {
              updatedUser = { ...u, ...data };
              return updatedUser;
            }
            return u;
          });
          return { users: nextUsers };
        });
        if (updatedUser) {
          syncUserToCloud(updatedUser);
        }
      },
      deleteUser: (id) => {
        set((state) => ({
          users: state.users.filter((u) => u.id !== id),
        }));
        deleteUserFromCloud(id);
      },
      togglePermission: (userId, permKey) => {
        let updatedUser: User | undefined;
        set((state) => {
          const nextUsers = state.users.map((u) => {
            if (u.id === userId) {
              updatedUser = {
                ...u,
                permissions: {
                  ...u.permissions,
                  [permKey]: !(u.permissions as any)?.[permKey],
                },
              };
              return updatedUser;
            }
            return u;
          });
          return { users: nextUsers };
        });
        if (updatedUser) {
          syncUserToCloud(updatedUser);
        }
      },

      // Clients
      clients: DEFAULT_CLIENTS,
      addClient: (data) => {
        const newClientId = `c_${Date.now().toString(36)}`;
        const cleanName = (data.company || 'cliente').toLowerCase().replace(/[^a-z0-9]/g, '');
        const portalEmail = data.portalEmail || data.email || `${cleanName}@cliente.com`;
        const portalPassword = data.portalPassword || '1234';

        const newClient: Client = {
          id: newClientId,
          company: 'Novo Cliente',
          name: 'Responsável',
          email: '',
          portalEmail,
          portalPassword,
          whatsapp: '',
          country: 'Brasil',
          planId: 'plan_pro',
          mensalidade: 1890,
          postsPerWeek: 5,
          dueDay: 10,
          about: '',
          niche: '',
          targetAudience: '',
          toneOfVoice: ['Acolhedor', 'Profissional'],
          files: [],
          createdAt: new Date().toISOString().split('T')[0],
          ...data,
        };

        const clientUser: User = {
          id: `u_cli_${newClient.id}`,
          name: newClient.company || newClient.name || 'Cliente',
          email: portalEmail,
          password: portalPassword,
          role: 'cliente',
          clientId: newClient.id,
          color: '#f59e0b',
          permissions: {},
        };

        set((state) => ({
          clients: [newClient, ...state.clients],
          users: [...state.users.filter((u) => u.clientId !== newClient.id), clientUser],
        }));
        syncClientToCloud(newClient);
        syncUserToCloud(clientUser);
        return newClient;
      },
      updateClient: (id, data) => {
        let updatedItem: Client | undefined;
        let updatedClientUser: User | undefined;
        set((state) => {
          const nextClients = state.clients.map((c) => {
            if (c.id === id) {
              updatedItem = { ...c, ...data };
              return updatedItem;
            }
            return c;
          });

          let nextUsers = state.users;
          if (updatedItem) {
            const pEmail = updatedItem.portalEmail || updatedItem.email;
            const pPass = updatedItem.portalPassword || '1234';
            const userExists = nextUsers.some((u) => u.clientId === id);
            if (userExists) {
              nextUsers = nextUsers.map((u) => {
                if (u.clientId === id) {
                  updatedClientUser = {
                    ...u,
                    name: updatedItem!.company || updatedItem!.name || u.name,
                    email: pEmail || u.email,
                    password: pPass || u.password,
                  };
                  return updatedClientUser;
                }
                return u;
              });
            } else if (pEmail) {
              updatedClientUser = {
                id: `u_cli_${id}`,
                name: updatedItem.company || updatedItem.name || 'Cliente',
                email: pEmail,
                password: pPass,
                role: 'cliente',
                clientId: id,
                color: '#f59e0b',
                permissions: {},
              };
              nextUsers = [...nextUsers, updatedClientUser];
            }
          }

          return { clients: nextClients, users: nextUsers };
        });
        if (updatedItem) syncClientToCloud(updatedItem);
        if (updatedClientUser) syncUserToCloud(updatedClientUser);
      },
      updateClientStrategy: (clientId, strategy) => {
        let updatedItem: Client | undefined;
        set((state) => {
          const nextClients = state.clients.map((c) => {
            if (c.id === clientId) {
              updatedItem = { ...c, strategyDocument: strategy };
              return updatedItem;
            }
            return c;
          });
          return { clients: nextClients };
        });
        if (updatedItem) syncClientToCloud(updatedItem);
      },
      deleteClient: (id) => {
        const clientToDelete = get().clients.find((c) => c.id === id);
        if (clientToDelete) {
          get().moveToTrash({
            type: 'client',
            title: clientToDelete.company || clientToDelete.name || 'Cliente',
            subtitle: `Nicho: ${clientToDelete.niche || 'Geral'} • Mensalidade: R$ ${clientToDelete.mensalidade || 0}`,
            data: clientToDelete,
          });
        }
        set((state) => ({
          clients: state.clients.filter((c) => c.id !== id),
          tasks: state.tasks.filter((t) => t.clientId !== id),
          users: state.users.filter((u) => !(u.role === 'cliente' && u.clientId === id)),
        }));
        deleteClientFromCloud(id);
        deleteUserFromCloud(`u_cli_${id}`);
      },
      addClientFiles: (clientId, files) => {
        let updated: Client | undefined;
        set((state) => {
          const next = state.clients.map((c) => {
            if (c.id === clientId) {
              updated = { ...c, files: [...(c.files || []), ...files] };
              return updated;
            }
            return c;
          });
          return { clients: next };
        });
        if (updated) syncClientToCloud(updated);
      },
      removeClientFile: (clientId, fileId) => {
        let updated: Client | undefined;
        set((state) => {
          const next = state.clients.map((c) => {
            if (c.id === clientId) {
              updated = { ...c, files: (c.files || []).filter((f) => f.id !== fileId) };
              return updated;
            }
            return c;
          });
          return { clients: next };
        });
        if (updated) syncClientToCloud(updated);
      },

      // Timer Dock
      dockedTimerTaskId: null,
      dismissedTimerTaskId: null,

      dismissTimerWidget: (taskId) =>
        set((state) => ({
          dismissedTimerTaskId: taskId,
          dockedTimerTaskId: state.dockedTimerTaskId === taskId ? null : state.dockedTimerTaskId,
          // Zera o cronômetro localmente mesmo que a nuvem não confirme.
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, timerStartedAt: null } : t
          ),
        })),
      setDockedTimerTaskId: (id) => set({ dockedTimerTaskId: id }),
      resetTimer: (id) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, timeSpent: 0, timerStartedAt: null } : t
          ),
        })),

      // Tasks
      tasks: DEFAULT_TASKS,
      addTask: (data) => {
        const defaultAssignee = get().currentUserId || 'u_admin';
        const assigneeIds = data.assigneeIds && data.assigneeIds.length > 0
          ? data.assigneeIds
          : data.assigneeId
          ? [data.assigneeId]
          : [defaultAssignee];

        const catModeMap: Record<string, string> = {
          roteiro: 'cat_reels',
          carrossel: 'cat_carrossel',
          legenda: 'cat_post',
          none: 'cat_stories',
        };
        const modeCatMap: Record<string, 'roteiro' | 'carrossel' | 'legenda' | 'none'> = {
          cat_reels: 'roteiro',
          cat_carrossel: 'carrossel',
          cat_post: 'legenda',
          cat_stories: 'none',
        };

        const resolvedCategory = data.categoryId || (data.copyMode ? catModeMap[data.copyMode] : get().categories[0]?.id) || 'cat_carrossel';
        const resolvedCopyMode = data.copyMode || (resolvedCategory ? modeCatMap[resolvedCategory] : undefined) || 'carrossel';

        const newTask: Task = {
          id: `task_${Date.now().toString(36)}`,
          clientId: data.clientId || '',
          title: data.title || 'Nova tarefa',
          categoryId: data.categoryId || '',
          copyMode: data.copyMode || undefined,
          assigneeId: (data.assigneeIds && data.assigneeIds[0]) || data.assigneeId || '',
          assigneeIds: data.assigneeIds || (data.assigneeId ? [data.assigneeId] : []),
          funnelStage: data.funnelStage || undefined,
          channel: data.channel || 'instagram',
          postDate: data.postDate || '',
          status: data.status || 'nao_iniciado',
          driveLink: data.driveLink || '',
          currentStep: 'briefing',
          briefingText: data.briefingText || '',
          headlineOptions: [],
          caption: data.caption || '',
          carouselSlides: [],
          scriptText: '',
          approvedCopySections: {},
          files: data.files || [],
          briefingFiles: data.briefingFiles || [],
          timeSpent: 0,
          timerStartedAt: null,
          activity: [
            {
              ts: new Date().toISOString(),
              type: 'create',
              by: get().currentUser()?.name || 'Equipe',
              text: 'Criou a tarefa',
            },
          ],
          clientRequest: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data,
        };
        set((state) => ({ tasks: [newTask, ...state.tasks] }));
        syncTaskToCloud(newTask);
        return newTask;
      },
      duplicateTask: (taskId) => {
        const source = get().tasks.find((t) => t.id === taskId);
        if (!source) return undefined;
        const newId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const duplicated: Task = {
          ...source,
          id: newId,
          title: `${source.title} (Cópia)`,
          status: 'nao_iniciado',
          currentStep: 'briefing',
          timeSpent: 0,
          timerStartedAt: null,
          activity: [
            {
              ts: new Date().toISOString(),
              type: 'create',
              by: get().currentUser()?.name || 'Equipe',
              text: `Duplicou a partir de "${source.title}"`,
            },
          ],
          clientRequest: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({ tasks: [duplicated, ...state.tasks] }));
        syncTaskToCloud(duplicated);
        return duplicated;
      },
      updateTask: (id, data) => {
        let updated: Task | undefined;
        set((state) => {
          const nextTasks = state.tasks.map((t) => {
            if (t.id === id) {
              const patchedData = { ...data };
              if (data.assigneeIds !== undefined && data.assigneeId === undefined) {
                patchedData.assigneeId = data.assigneeIds[0] || '';
              } else if (data.assigneeId !== undefined && data.assigneeIds === undefined) {
                patchedData.assigneeIds = data.assigneeId ? [data.assigneeId] : [];
              }

              // Synchronize format category and copyMode
              if (data.categoryId !== undefined && data.copyMode === undefined) {
                const foundCategory = get().categories.find((c) => c.id === data.categoryId);
                const catNameLower = (foundCategory?.name || '').toLowerCase();
                if (catNameLower.includes('reels') || catNameLower.includes('vídeo') || catNameLower.includes('video') || data.categoryId === 'cat_reels') {
                  patchedData.copyMode = 'roteiro';
                } else if (catNameLower.includes('carrossel') || data.categoryId === 'cat_carrossel') {
                  patchedData.copyMode = 'carrossel';
                } else if (catNameLower.includes('stories') || data.categoryId === 'cat_stories') {
                  patchedData.copyMode = 'none';
                } else {
                  patchedData.copyMode = 'legenda';
                }
              } else if (data.copyMode !== undefined && data.categoryId === undefined) {
                // Keep existing categoryId if it exists; only fallback to defaults if task has none
                if (!t.categoryId) {
                  const catModeMap: Record<string, string> = {
                    roteiro: 'cat_reels',
                    carrossel: 'cat_carrossel',
                    legenda: 'cat_post',
                    none: 'cat_stories',
                  };
                  patchedData.categoryId = catModeMap[data.copyMode] || get().categories[0]?.id || 'cat_carrossel';
                }
              }

              updated = {
                ...t,
                ...patchedData,
                updatedAt: new Date().toISOString(),
              };
              return updated;
            }
            return t;
          });
          return { tasks: nextTasks };
        });
        if (updated) syncTaskToCloud(updated);
      },
      deleteTask: (id) => {
        const taskToDelete = get().tasks.find((t) => t.id === id);
        if (taskToDelete) {
          const clientName = get().clients.find((c) => c.id === taskToDelete.clientId)?.company || 'Cliente';
          get().moveToTrash({
            type: 'task',
            title: taskToDelete.title || 'Tarefa',
            subtitle: `Cliente: ${clientName} • Status: ${taskToDelete.status}`,
            data: taskToDelete,
          });
        }
        set((state) => ({
          dockedTimerTaskId: state.dockedTimerTaskId === id ? null : state.dockedTimerTaskId,
          tasks: state.tasks.filter((t) => t.id !== id),
        }));
        deleteTaskFromCloud(id);
      },
      setTaskStatus: (id, status) => {
        let updated: Task | undefined;
        set((state) => {
          const nextTasks = state.tasks.map((t) => {
            if (t.id === id) {
              updated = {
                ...t,
                status,
                clientRequest: status === 'alterar' ? t.clientRequest : false,
                updatedAt: new Date().toISOString(),
                activity: [
                  ...(t.activity || []),

                  {
                    ts: new Date().toISOString(),
                    type: 'status_change',
                    by: get().currentUser()?.name || 'Equipe',
                    text: `Alterou status para: ${status}`,
                  },
                ],
              };
              return updated;
            }
            return t;
          });
          return { tasks: nextTasks };
        });
        if (updated) syncTaskToCloud(updated);
      },
      setTaskWorkflowStep: (id, currentStep) => {
        let updated: Task | undefined;
        set((state) => {
          const nextTasks = state.tasks.map((t) => {
            if (t.id === id) {
              let nextStatus = t.status;
              if (currentStep === 'em_aprovacao') {
                nextStatus = 'em_aprovacao';
              } else if (currentStep === 'aprovado') {
                nextStatus = 'aprovado';
              } else if (t.status === 'nao_iniciado' && currentStep !== 'briefing') {
                nextStatus = 'em_andamento';
              }
              updated = {
                ...t,
                currentStep,
                status: nextStatus,
                updatedAt: new Date().toISOString(),
                activity: [
                  ...(t.activity || []),

                  {
                    ts: new Date().toISOString(),
                    type: 'status_change',
                    by: get().currentUser()?.name || 'Equipe',
                    text: `Avançou etapa para: ${currentStep} (Status: ${nextStatus})`,
                  },
                ],
              };
              return updated;
            }
            return t;
          });
          return { tasks: nextTasks };
        });
        if (updated) syncTaskToCloud(updated);
      },
      startTimer: (id) => {
        let updated: Task | undefined;
        set((state) => ({
          dockedTimerTaskId: id,
          dismissedTimerTaskId:
            state.dismissedTimerTaskId === id ? null : state.dismissedTimerTaskId,
          tasks: state.tasks.map((t) => {
            if (t.id === id) {
              updated = { ...t, timerStartedAt: Date.now(), updatedAt: new Date().toISOString() };
              return updated;
            }
            return t;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },
      stopTimer: (id) => {
        let updated: Task | undefined;
        set((state) => ({
          dockedTimerTaskId: id,
          tasks: state.tasks.map((t) => {
            if (t.id !== id || !t.timerStartedAt) return t;
            const delta = Math.round((Date.now() - t.timerStartedAt) / 1000);
            updated = {
              ...t,
              timeSpent: (t.timeSpent || 0) + delta,
              timerStartedAt: null,
              updatedAt: new Date().toISOString(),
            };
            return updated;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },
      addTaskFiles: (taskId, files) => {
        let updated: Task | undefined;
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId) {
              updated = { ...t, files: [...t.files, ...files], updatedAt: new Date().toISOString() };
              return updated;
            }
            return t;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },
      removeTaskFile: (taskId, fileId) => {
        let updated: Task | undefined;
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId) {
              updated = { ...t, files: t.files.filter((f) => f.id !== fileId), updatedAt: new Date().toISOString() };
              return updated;
            }
            return t;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },
      clientApprove: (taskId, clientName) => {
        let updated: Task | undefined;
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId) {
              updated = {
                ...t,
                status: 'aprovado',
                currentStep: 'aprovado',
                clientRequest: false,
                updatedAt: new Date().toISOString(),
                activity: [
                  ...(t.activity || []),

                  {
                    ts: new Date().toISOString(),
                    type: 'client_approve',
                    by: clientName,
                    text: 'Aprovou a arte e conteúdo no portal.',
                  },
                ],
              };
              return updated;
            }
            return t;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },
      clientRequestChange: (taskId, clientName, reason) => {
        let updated: Task | undefined;
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId) {
              updated = {
                ...t,
                status: 'alterar',
                currentStep: 'arte',
                clientRequest: true,
                updatedAt: new Date().toISOString(),
                activity: [
                  ...(t.activity || []),

                  {
                    ts: new Date().toISOString(),
                    type: 'client_change',
                    by: clientName,
                    text: reason || 'Solicitou alteração no conteúdo.',
                  },
                ],
              };
              return updated;
            }
            return t;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },
      clientRequestMultipleChanges: (taskId, clientName, reasons) => {
        if (!reasons || reasons.length === 0) return;
        let updated: Task | undefined;
        const now = new Date().toISOString();
        const newActivities: TaskActivity[] = reasons.map((reason, idx) => ({
          ts: new Date(Date.now() + idx * 25).toISOString(),
          type: 'client_change',
          by: clientName,
          text: reason,
        }));
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId) {
              updated = {
                ...t,
                status: 'alterar',
                currentStep: 'arte',
                clientRequest: true,
                updatedAt: now,
                activity: [
                  ...(t.activity || []),
                  ...newActivities,
                ],
              };
              return updated;
            }
            return t;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },
      addTaskComment: (taskId, authorName, text, type = 'comment') => {
        let updated: Task | undefined;
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.id === taskId) {
              updated = {
                ...t,
                status: type === 'client_change' ? 'alterar' : t.status,
                updatedAt: new Date().toISOString(),
                activity: [
                  ...(t.activity || []),

                  {
                    ts: new Date().toISOString(),
                    type,
                    by: authorName,
                    text,
                  },
                ],
              };
              return updated;
            }
            return t;
          }),
        }));
        if (updated) syncTaskToCloud(updated);
      },
      setTaskLiveEditing: (taskId, user) => {
        const liveEditing: TaskLiveEditing = {
          userId: user.id,
          userName: user.name,
          userColor: user.color,
          updatedAt: new Date().toISOString(),
        };
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, editingBy: liveEditing } : t
          ),
        }));
        syncTaskLiveEditingToCloud(taskId, liveEditing);
      },
      clearTaskLiveEditing: (taskId) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, editingBy: null } : t
          ),
        }));
        syncTaskLiveEditingToCloud(taskId, null);
      },

      // Notícias & Trends
      news: DEFAULT_NEWS,
      toggleBookmarkNews: (id) =>
        set((state) => ({
          news: state.news.map((n) => (n.id === id ? { ...n, bookmarked: !n.bookmarked } : n)),
        })),
      addNewsItem: (item) =>
        set((state) => ({
          news: [
            {
              id: `news_${Date.now()}`,
              title: 'Nova Notícia',
              summary: '',
              category: 'Geral',
              date: 'Hoje',
              source: 'Agência',
              contentIdea: '',
              bookmarked: false,
              ...item,
            },
            ...state.news,
          ],
        })),
      deleteNewsItem: (id) =>
        set((state) => ({
          news: state.news.filter((n) => n.id !== id),
        })),
      refreshNewsFromAI: async () => {
        try {
          const res = await fetch('/api/ai/news-trends', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'todas', niche: 'social media' }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.news && Array.isArray(data.news)) {
              set({ news: data.news });
            }
          }
        } catch (e) {
          console.error('Failed to refresh news:', e);
        }
      },

      // Notes & Focus
      notes: [],
      addNote: (userId, text) =>
        set((state) => ({
          notes: [
            {
              id: `note_${Date.now()}`,
              userId,
              text,
              done: false,
              createdAt: new Date().toISOString(),
            },
            ...state.notes,
          ],
        })),
      toggleNote: (id) =>
        set((state) => ({
          notes: state.notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)),
        })),
      deleteNote: (id) =>
        set((state) => ({
          notes: state.notes.filter((n) => n.id !== id),
        })),

      // Prompts
      promptFolders: [
        { id: 'pf_conteudo', name: 'Conteúdo & Social', color: '#f59e0b' },
        { id: 'pf_design', name: 'Design & Midjourney', color: '#0ea5e9' },
        { id: 'pf_estrategia', name: 'Estratégia & Copywriting', color: '#10b981' },
      ],
      prompts: [
        {
          id: 'p-1',
          folderId: 'pf_conteudo',
          title: 'Legenda magnética de alta conversão',
          body: 'Você é um estrategista de conteúdo. Escreva uma legenda para {rede_social} sobre o tema {tema} para o cliente {cliente} (nicho: {nicho}). Crie um gancho de 1 linha instigante, 3 pontos de valor rápido e termine com um CTA convidativo para {objetivo}.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'p-2',
          folderId: 'pf_conteudo',
          title: 'Carrossel de 7 lâminas que retém',
          body: 'Estruture um carrossel educativo em 7 slides sobre {tema}. Slide 1 = Promessa clara. Slides 2 a 5 = Dicas práticas diretas. Slide 6 = Erro comum a evitar. Slide 7 = Salve e compartilhe.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'p-3',
          folderId: 'pf_design',
          title: 'Prompt de imagem hiper-realista para anúncio',
          body: 'commercial studio photography of {produto}, clean neutral background, soft natural lighting, 8k resolution, minimalist luxury aesthetic, cinematic depth of field',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      addPromptFolder: (data) => {
        set((state) => ({
          promptFolders: [
            ...state.promptFolders,
            { id: `pf_${Date.now()}`, name: 'Nova Pasta', color: '#f59e0b', ...data },
          ],
        }));
        syncPromptsConfigToCloud(get().promptFolders, get().prompts);
      },
      deletePromptFolder: (id) => {
        set((state) => ({
          promptFolders: state.promptFolders.filter((f) => f.id !== id),
          prompts: state.prompts.filter((p) => p.folderId !== id),
        }));
        syncPromptsConfigToCloud(get().promptFolders, get().prompts);
      },
      addPrompt: (data) => {
        set((state) => ({
          prompts: [
            {
              id: `p_${Date.now()}`,
              folderId: data.folderId || state.promptFolders[0]?.id || 'pf_conteudo',
              title: 'Novo Prompt',
              body: '',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              ...data,
            },
            ...state.prompts,
          ],
        }));
        syncPromptsConfigToCloud(get().promptFolders, get().prompts);
      },
      updatePrompt: (id, data) => {
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        }));
        syncPromptsConfigToCloud(get().promptFolders, get().prompts);
      },
      deletePrompt: (id) => {
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        }));
        syncPromptsConfigToCloud(get().promptFolders, get().prompts);
      },

      // Custom tabs
      customTabs: [],
      addCustomTab: (data) =>
        set((state) => ({
          customTabs: [
            ...state.customTabs,
            { id: `tab_${Date.now()}`, name: 'Novo Espaço', notes: [], ...data },
          ],
        })),
      updateCustomTab: (id, data) =>
        set((state) => ({
          customTabs: state.customTabs.map((t) => (t.id === id ? { ...t, ...data } : t)),
        })),
      deleteCustomTab: (id) =>
        set((state) => ({
          customTabs: state.customTabs.filter((t) => t.id !== id),
        })),

      // Plans, Categories & Statuses
      plans: DEFAULT_PLANS,
      categories: DEFAULT_CATEGORIES,
      statuses: INITIAL_STATUSES,
      addPlan: (p) =>
        set((state) => ({
          plans: [...state.plans, { id: `plan_${Date.now()}`, name: 'Novo Plano', price: 990, postsPerWeek: 3, description: '', ...p }],
        })),
      updatePlan: (id, p) =>
        set((state) => ({
          plans: state.plans.map((x) => (x.id === id ? { ...x, ...p } : x)),
        })),
      deletePlan: (id) =>
        set((state) => ({
          plans: state.plans.filter((x) => x.id !== id),
        })),
      addCategory: (c) =>
        set((state) => ({
          categories: [...state.categories, { id: `cat_${Date.now()}`, name: 'Nova Categoria', color: '#f59e0b', ...c }],
        })),
      updateCategory: (id, c) =>
        set((state) => ({
          categories: state.categories.map((x) => (x.id === id ? { ...x, ...c } : x)),
        })),
      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((x) => x.id !== id),
        })),
      addStatus: (s) =>
        set((state) => ({
          statuses: [...state.statuses, { key: `st_${Date.now()}` as any, label: 'Novo Status', color: '#64748b', group: 'progress', ...s }],
        })),
      updateStatus: (key, s) =>
        set((state) => ({
          statuses: state.statuses.map((x) => (x.key === key ? { ...x, ...s } : x)),
        })),
      deleteStatus: (key) =>
        set((state) => ({
          statuses: state.statuses.filter((x) => x.key !== key),
          tasks: state.tasks.map((t) => (t.status === key ? { ...t, status: 'nao_iniciado' } : t)),
        })),
      moveStatus: (key, direction) =>
        set((state) => {
          const list = [...state.statuses];
          const idx = list.findIndex((x) => x.key === key);
          const target = idx + direction;
          if (idx < 0 || target < 0 || target >= list.length) return {};
          const temp = list[idx];
          list[idx] = list[target];
          list[target] = temp;
          return { statuses: list };
        }),
      reorderStatuses: (newStatuses) =>
        set(() => ({ statuses: newStatuses })),

      // Campaigns
      campaigns: DEFAULT_CAMPAIGNS,
      addCampaign: (data) => {
        const newCamp: Campaign = {
          id: `camp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          clientId: data.clientId || '',
          title: data.title || 'Nova Campanha',
          description: data.description || '',
          startDate: data.startDate || new Date().toISOString().slice(0, 10),
          endDate: data.endDate || '',
          status: data.status || 'planejamento',
          color: data.color || '#f59e0b',
          folderEmoji: data.folderEmoji || '📁',
          createdAt: new Date().toISOString(),
          ...data,
        };
        set((state) => ({ campaigns: [newCamp, ...state.campaigns] }));
        return newCamp;
      },
      updateCampaign: (id, data) => {
        set((state) => ({
          campaigns: state.campaigns.map((c) => (c.id === id ? { ...c, ...data } : c)),
        }));
      },
      deleteCampaign: (id) => {
        set((state) => ({
          campaigns: state.campaigns.filter((c) => c.id !== id),
          // Unlink tasks that belonged to this campaign
          tasks: state.tasks.map((t) => (t.campaignId === id ? { ...t, campaignId: undefined } : t)),
        }));
      },

      // Contract Services & Recurring Flow
      addContractService: (clientId, service) => {
        const newService: ContractService = {
          id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: service.name || 'Posts de redes sociais',
          frequency: service.frequency || 'semanal',
          quantity: service.quantity || 3,
          defaultAssigneeId: service.defaultAssigneeId || 'u_joao',
          defaultFormat: service.defaultFormat || 'Post único',
          daysOfWeek: service.daysOfWeek || [1, 3, 5],
          active: service.active !== false,
        };
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? { ...c, contractServices: [...(c.contractServices || []), newService] }
              : c
          ),
        }));
        const target = get().clients.find((c) => c.id === clientId);
        if (target) syncClientToCloud(target);
      },
      updateContractService: (clientId, serviceId, data) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  contractServices: (c.contractServices || []).map((s) =>
                    s.id === serviceId ? { ...s, ...data } : s
                  ),
                }
              : c
          ),
        }));
        const target = get().clients.find((c) => c.id === clientId);
        if (target) syncClientToCloud(target);
      },
      deleteContractService: (clientId, serviceId) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  contractServices: (c.contractServices || []).filter((s) => s.id !== serviceId),
                }
              : c
          ),
        }));
        const target = get().clients.find((c) => c.id === clientId);
        if (target) syncClientToCloud(target);
      },
      generateMonthlyTasksFromContract: (clientId, monthDateStr) => {
        const client = get().clients.find((c) => c.id === clientId);
        if (!client || !client.contractServices || client.contractServices.length === 0) return 0;

        const baseDate = monthDateStr ? new Date(monthDateStr) : new Date();
        const year = baseDate.getFullYear();
        const month = baseDate.getMonth(); // 0-indexed
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const newTasksToCreate: Task[] = [];

        client.contractServices.forEach((service) => {
          if (!service.active) return;

          if (service.frequency === 'semanal') {
            const targetDays = service.daysOfWeek || [1, 3, 5];
            for (let day = 1; day <= daysInMonth; day++) {
              const testDate = new Date(year, month, day);
              const dayOfWeek = testDate.getDay();
              if (targetDays.includes(dayOfWeek)) {
                const dayPadded = String(day).padStart(2, '0');
                const monthPadded = String(month + 1).padStart(2, '0');
                const dateIso = `${year}-${monthPadded}-${dayPadded}`;

                // Check if task already exists for this client on this date with this service name
                const alreadyExists = get().tasks.some(
                  (t) => t.clientId === clientId && t.postDate === dateIso && t.title.includes(service.name)
                );

                if (!alreadyExists) {
                  newTasksToCreate.push({
                    id: `task_rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    clientId,
                    title: `${service.name} · ${dayPadded}/${monthPadded}`,
                    categoryId: service.defaultFormat?.toLowerCase().includes('reels') ? 'cat_reels' : service.defaultFormat?.toLowerCase().includes('carrossel') ? 'cat_carrossel' : 'cat_post',
                    assigneeId: service.defaultAssigneeId || 'u_joao',
                    assigneeIds: [service.defaultAssigneeId || 'u_joao'],
                    postDate: dateIso,
                    date: dateIso,
                    format: service.defaultFormat || 'Post único',
                    status: 'planejamento',
                    currentStep: 'briefing',
                    briefingText: `Pauta recorrente de contrato (${service.name}). Entrega programada para ${dayPadded}/${monthPadded}.`,
                    headlineOptions: [],
                    caption: '',
                    carouselSlides: [],
                    scriptText: '',
                    approvedCopySections: {},
                    files: [],
                    timeSpent: 0,
                    timerStartedAt: null,
                    clientRequest: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  });
                }
              }
            }
          } else if (service.frequency === 'mensal') {
            const dayPadded = '15';
            const monthPadded = String(month + 1).padStart(2, '0');
            const dateIso = `${year}-${monthPadded}-${dayPadded}`;
            const alreadyExists = get().tasks.some(
              (t) => t.clientId === clientId && t.postDate === dateIso && t.title.includes(service.name)
            );
            if (!alreadyExists) {
              newTasksToCreate.push({
                id: `task_rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                clientId,
                title: `${service.name} · ${monthPadded}/${year}`,
                categoryId: 'cat_design',
                assigneeId: service.defaultAssigneeId || 'u_admin',
                assigneeIds: [service.defaultAssigneeId || 'u_admin'],
                postDate: dateIso,
                date: dateIso,
                format: service.defaultFormat || 'Tablóide impresso',
                status: 'planejamento',
                currentStep: 'briefing',
                briefingText: `Entrega mensal de contrato (${service.name}).`,
                headlineOptions: [],
                caption: '',
                carouselSlides: [],
                scriptText: '',
                approvedCopySections: {},
                files: [],
                timeSpent: 0,
                timerStartedAt: null,
                clientRequest: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              });
            }
          }
        });

        if (newTasksToCreate.length > 0) {
          set((state) => ({ tasks: [...newTasksToCreate, ...state.tasks] }));
          newTasksToCreate.forEach((t) => syncTaskToCloud(t));
        }

        return newTasksToCreate.length;
      },

      // Custom Client Services (Avulsos / Extras)
      addCustomService: (clientId, service) => {
        const newService: CustomService = {
          id: `srv_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          ...service,
        };
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? { ...c, customServices: [...(c.customServices || []), newService] }
              : c
          ),
        }));
        const target = get().clients.find((c) => c.id === clientId);
        if (target) syncClientToCloud(target);
      },
      updateCustomService: (clientId, serviceId, data) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  customServices: (c.customServices || []).map((s) =>
                    s.id === serviceId ? { ...s, ...data } : s
                  ),
                }
              : c
          ),
        }));
        const target = get().clients.find((c) => c.id === clientId);
        if (target) syncClientToCloud(target);
      },
      deleteCustomService: (clientId, serviceId) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? {
                  ...c,
                  customServices: (c.customServices || []).filter((s) => s.id !== serviceId),
                }
              : c
          ),
        }));
        const target = get().clients.find((c) => c.id === clientId);
        if (target) syncClientToCloud(target);
      },

      // 30-Day Trash & Recycle Bin
      trash: [],
      moveToTrash: (item) => {
        const trashItem: TrashItem = {
          id: `trash_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          deletedAt: new Date().toISOString(),
          deletedBy: get().currentUser()?.name || 'Equipe',
          ...item,
        };
        set((state) => ({
          trash: [trashItem, ...state.trash],
        }));
      },
      restoreFromTrash: (trashId) => {
        const item = get().trash.find((t) => t.id === trashId);
        if (!item) return;

        if (item.type === 'task' && item.data) {
          const restoredTask: Task = item.data;
          set((state) => ({
            tasks: [restoredTask, ...state.tasks.filter((t) => t.id !== restoredTask.id)],
            trash: state.trash.filter((t) => t.id !== trashId),
          }));
          syncTaskToCloud(restoredTask);
        } else if (item.type === 'client' && item.data) {
          const restoredClient: Client = item.data;
          set((state) => ({
            clients: [restoredClient, ...state.clients.filter((c) => c.id !== restoredClient.id)],
            trash: state.trash.filter((t) => t.id !== trashId),
          }));
          syncClientToCloud(restoredClient);
        } else if (item.type === 'note' && item.data) {
          const restoredNote: NoteItem = item.data;
          set((state) => ({
            notes: [restoredNote, ...state.notes.filter((n) => n.id !== restoredNote.id)],
            trash: state.trash.filter((t) => t.id !== trashId),
          }));
        } else if (item.type === 'news' && item.data) {
          const restoredNews: NewsItem = item.data;
          set((state) => ({
            news: [restoredNews, ...state.news.filter((n) => n.id !== restoredNews.id)],
            trash: state.trash.filter((t) => t.id !== trashId),
          }));
        } else if (item.type === 'prompt' && item.data) {
          const restoredPrompt: PromptItem = item.data;
          set((state) => ({
            prompts: [restoredPrompt, ...state.prompts.filter((p) => p.id !== restoredPrompt.id)],
            trash: state.trash.filter((t) => t.id !== trashId),
          }));
        } else {
          set((state) => ({
            trash: state.trash.filter((t) => t.id !== trashId),
          }));
        }
      },
      permanentlyDeleteFromTrash: (trashId) => {
        set((state) => ({
          trash: state.trash.filter((t) => t.id !== trashId),
        }));
      },
      emptyTrash: () => {
        set({ trash: [] });
      },
      purgeExpiredTrash: () => {
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();
        set((state) => ({
          trash: state.trash.filter((item) => {
            const itemTime = new Date(item.deletedAt).getTime();
            return now - itemTime < thirtyDaysMs;
          }),
        }));
      },

      // Admin Hidden System Prompts
      adminPrompts: DEFAULT_ADMIN_PROMPTS,
      updateAdminPrompts: (prompts) => {
        const nextPrompts = { ...get().adminPrompts, ...prompts };
        set({ adminPrompts: nextPrompts });
        syncAdminPromptsToCloud(nextPrompts);
      },
      resetAdminPrompts: () => {
        set({ adminPrompts: DEFAULT_ADMIN_PROMPTS });
        syncAdminPromptsToCloud(DEFAULT_ADMIN_PROMPTS);
      },

      // News Niches
      newsNiches: DEFAULT_NICHES,
      addNewsNiche: (niche) => {
        const clean = niche.trim();
        if (!clean) return;
        set((state) => {
          if (state.newsNiches.includes(clean)) return {};
          return { newsNiches: [...state.newsNiches, clean] };
        });
      },
      removeNewsNiche: (niche) => {
        set((state) => ({
          newsNiches: state.newsNiches.filter((n) => n !== niche),
        }));
      },

      // Sidebar Order
      sidebarOrder: DEFAULT_SIDEBAR_ORDER,
      setSidebarOrder: (sidebarOrder) => set({ sidebarOrder }),

      // Cloud Services
      cloudSync: {
        connected: true,
        provider: 'BeeCloud Sync & Storage',
        status: 'online',
        lastSync: new Date().toISOString(),
        autoSync: true,
        itemCount: 14,
      },
      syncWithCloud: async () => {
        set((state) => ({ cloudSync: { ...state.cloudSync, status: 'syncing' } }));
        try {
          const res = await fetch('/api/cloud/status');
          if (res.ok) {
            const data = await res.json();
            set((state) => ({
              cloudSync: {
                ...state.cloudSync,
                connected: data.connected,
                status: 'online',
                lastSync: new Date().toISOString(),
                itemCount: state.tasks.length + state.clients.length,
              },
            }));
          }
        } catch {
          set((state) => ({
            cloudSync: {
              ...state.cloudSync,
              status: 'online',
              lastSync: new Date().toISOString(),
            },
          }));
        }
      },
      exportBackupJson: () => {
        const state = get();
        const exportData = {
          agencyName: state.agencyName,
          clients: state.clients,
          tasks: state.tasks,
          plans: state.plans,
          categories: state.categories,
          statuses: state.statuses,
          news: state.news,
          prompts: state.prompts,
          promptFolders: state.promptFolders,
          notes: state.notes,
          users: state.users,
          exportedAt: new Date().toISOString(),
        };
        return JSON.stringify(exportData, null, 2);
      },
      importBackupJson: (jsonString) => {
        try {
          const parsed = JSON.parse(jsonString);
          if (parsed.clients && parsed.tasks) {
            set({
              clients: parsed.clients,
              tasks: parsed.tasks,
              plans: parsed.plans || get().plans,
              categories: parsed.categories || get().categories,
              statuses: parsed.statuses || get().statuses,
              news: parsed.news || get().news,
              prompts: parsed.prompts || get().prompts,
              notes: parsed.notes || get().notes,
            });
            return true;
          }
          return false;
        } catch (e) {
          console.error('Import error:', e);
          return false;
        }
      },

      resetAllData: () => {
        set({
          darkMode: false,
          agencyName: 'BeeWave',
          logoDataUrl: null,
          iconDataUrl: null,
          currentUserId: null,
          users: DEFAULT_USERS,
          clients: DEFAULT_CLIENTS,
          tasks: DEFAULT_TASKS,
          plans: DEFAULT_PLANS,
          categories: DEFAULT_CATEGORIES,
          statuses: INITIAL_STATUSES,
          news: DEFAULT_NEWS,
          notes: [],
          customTabs: [],
        });
      },
    }),
    {
      name: 'beewave-studio-v2',
      storage: createJSONStorage(() => ({
        getItem: (name: string): string | null => {
          if (typeof window === 'undefined') return null;
          try {
            return window.localStorage.getItem(name);
          } catch (e) {
            console.warn('Storage read error:', e);
            return null;
          }
        },
        setItem: (name: string, value: string): void => {
          if (typeof window === 'undefined') return;
          try {
            window.localStorage.setItem(name, value);
          } catch (e) {
            console.warn('LocalStorage quota or write error, trimming oversized image caches:', e);
            try {
              const parsed = JSON.parse(value);
              if (parsed?.state?.tasks) {
                // If quota exceeded, sanitize images in tasks that might be too large
                parsed.state.tasks = parsed.state.tasks.map((t: any) => ({
                  ...t,
                  files: (t.files || []).map((f: any) => ({
                    ...f,
                    dataUrl: f.dataUrl && f.dataUrl.length > 150000 ? '' : f.dataUrl,
                  })),
                }));
              }
              window.localStorage.setItem(name, JSON.stringify(parsed));
            } catch (innerErr) {
              console.error('Storage fallback failed:', innerErr);
            }
          }
        },
        removeItem: (name: string): void => {
          if (typeof window === 'undefined') return;
          try {
            window.localStorage.removeItem(name);
          } catch (e) {
            console.warn('Storage remove error:', e);
          }
        },
      })),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Lido uma vez, antes de qualquer semeadura: os blocos de conteúdo
          // de demonstração abaixo dependem disso e um preenche o que o
          // outro checaria.
          const primeiraCarga = !state.tasks || state.tasks.length === 0;

          // Clientes de demonstração entram só na primeira carga, quando
          // não existe cliente nenhum.
          //
          // Antes c_emely, c_perfetto e c_melatti eram reinseridos a cada
          // rehydrate se não estivessem na lista. Como o Vinicius cadastrou
          // o Perfetto e o Melatti de verdade com outros ids, a agência ficou
          // com duas pastas de cada — e as versões de demonstração voltavam
          // sozinhas toda vez que ele apagava, arrastando junto as pautas
          // fictícias para as contas do painel.
          if (!state.clients || state.clients.length === 0) {
            state.clients = DEFAULT_CLIENTS;
          } else {
            // Numa base que já existe, só completamos o que ficou faltando
            // em clientes que continuam lá. Nada é criado de volta.
            state.clients = state.clients.map((c) => {
              if (c.id === 'c_emely' && !c.strategyDocument) {
                return { ...c, strategyDocument: EMELY_STRATEGY_DOCUMENT };
              }
              if (c.id === 'c_perfetto' && !c.contractServices?.length) {
                const perf = DEFAULT_CLIENTS.find((x) => x.id === 'c_perfetto');
                return { ...c, contractServices: perf?.contractServices, name: 'Branca' };
              }
              if (c.id === 'c_melatti' && !c.contractServices?.length) {
                const mel = DEFAULT_CLIENTS.find((x) => x.id === 'c_melatti');
                return { ...c, contractServices: mel?.contractServices };
              }
              return c;
            });
          }

          // Mesma regra dos clientes e das pautas: conteúdo de demonstração
          // só numa base vazia.
          if (primeiraCarga && (!state.campaigns || state.campaigns.length === 0)) {
            state.campaigns = DEFAULT_CAMPAIGNS;
          }

          // Pautas de demonstração: mesma regra dos clientes. Só entram numa
          // base vazia. Enquanto a checagem era "existe alguma pauta do
          // c_perfetto?", apagar todas elas trazia todas de volta no reload.
          if (primeiraCarga && state.tasks) {
            state.tasks = DEFAULT_TASKS.filter(
              (t) => t.clientId === 'c_perfetto' || t.clientId === 'c_melatti'
            );
          }

          // Ensure Emely approval tasks exist for demo/testing.
          //
          // A checagem é por ID, não por status. Quando era por status
          // ('nenhuma pauta da Emely em aprovação'), aprovar a pauta e
          // recarregar a página reinseria a MESMA tarefa com o mesmo id fixo —
          // duplicando a pauta no portal, quebrando as keys do React e, com a
          // sync ligada, empurrando a duplicata para o Firestore.
          if (primeiraCarga && state.tasks) {
            const existingIds = new Set(state.tasks.map((t) => t.id));
            const hasEmelyTask = existingIds.has('task-emely-aprov-1');
            if (!hasEmelyTask) {
              const sampleApprovalTasks: Task[] = [
                {
                  id: 'task-emely-aprov-1',
                  title: 'Carrossel: Os 4 Erros mais comuns ao escolher o Vestido de Noiva',
                  headline: 'Não cometa o erro nº 3 antes de visitar uma loja especializada 👰‍♀️',
                  selectedHeadline: 'Não cometa o erro nº 3 antes de visitar uma loja especializada 👰‍♀️',
                  caption: `O vestido dos seus sonhos não precisa ser uma fonte de estresse ou de surpresas desagradáveis.\n\nDepois de vestir centenas de noivas, reunimos os 4 erros que você DEVE evitar:\n\n1️⃣ Deixar a escolha para a última hora (o ideal é 6 a 8 meses antes para ajustes perfeitos).\n2️⃣ Provar modelos apenas pela foto de catálogo sem testar o conforto e caimento real no seu corpo.\n3️⃣ Levar opiniões demais na primeira prova (leia quem realmente te apoia e te conhece).\n4️⃣ Esquecer de considerar o local e o horário da cerimônia.\n\n✨ Na Emely Moda Festa, você conta com consultoria acolhedora e ateliê próprio de ajustes para você se sentir deslumbrante e segura no seu grande dia.\n\n👉 Agende seu horário pelo link da bio e venha viver essa experiência única!`,
                  channel: 'instagram',
                  format: 'Carrossel',
                  status: 'em_aprovacao',
                  currentStep: 'em_aprovacao',
                  clientId: 'c_emely',
                  categoryId: 'cat_carrossel',
                  copyMode: 'carrossel',
                  date: '2026-09-24',
                  postDate: '2026-09-24',
                  briefingText: 'Post educativo voltado a noivas que estão no momento de decisão do vestido.',
                  headlineOptions: ['Não cometa o erro nº 3 antes de visitar uma loja especializada 👰‍♀️'],
                  scriptText: '',
                  approvedCopySections: { caption: true, carousel: true },
                  timeSpent: 1800,
                  timerStartedAt: null,
                  clientRequest: false,
                  carouselSlides: [
                    { slideNumber: 1, title: 'Capa', content: 'Os 4 Maiores Erros ao Escolher seu Vestido de Noiva' },
                    { slideNumber: 2, title: 'Erro 01', content: 'Deixar para a última hora: ajustes finos exigem tempo e calma.' },
                    { slideNumber: 3, title: 'Erro 02', content: 'Escolher apenas pela foto de revista sem provar no corpo real.' },
                    { slideNumber: 4, title: 'Erro 03', content: 'Ignorar o clima e o estilo da festa (campo, praia, igreja).' },
                    { slideNumber: 5, title: 'Final / CTA', content: 'Agende seu horário com nossas consultoras exclusivas na Emely!' }
                  ],
                  files: [
                    {
                      id: 'f-emely-post-1',
                      name: 'Capa_Carrossel_Noiva.jpg',
                      url: 'https://images.unsplash.com/photo-1594552072238-b8a33785b261?auto=format&fit=crop&w=800&q=80',
                      type: 'image/jpeg',
                      size: 420000,
                    }
                  ],
                  activity: [
                    {
                      ts: new Date().toISOString(),
                      type: 'status_change',
                      by: 'Agência BeeWave',
                      text: 'Pauta e carrossel finalizados e enviados para aprovação da Emely.',
                    }
                  ],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                {
                  id: 'task-emely-aprov-2',
                  title: 'Reels: Nova Coleção Debutantes 2026 - O Brilho dos 15 Anos',
                  headline: 'O momento que você esperou a vida inteira merece um vestido inesquecível ✨',
                  selectedHeadline: 'O momento que você esperou a vida inteira merece um vestido inesquecível ✨',
                  caption: `15 anos não se repetem! A nossa nova coleção de debutantes chegou com saias fluidas, corpetes estruturados sob medida e opções clássicas ou modernas que acompanham a valsa e a balada.\n\nMarca a sua melhor amiga debutante que precisa ver isso! 👇`,
                  channel: 'instagram',
                  format: 'Reels',
                  status: 'em_aprovacao',
                  currentStep: 'em_aprovacao',
                  clientId: 'c_emely',
                  categoryId: 'cat_reels',
                  copyMode: 'roteiro',
                  date: '2026-09-28',
                  postDate: '2026-09-28',
                  briefingText: 'Apresentar os vestidos de 15 anos com dinamismo e elegância.',
                  headlineOptions: ['O momento que você esperou a vida inteira merece um vestido inesquecível ✨'],
                  scriptText: 'Cena 1: Close nos detalhes do bordado...\nCena 2: Giro com a saia fluida...',
                  approvedCopySections: { caption: true, script: true },
                  timeSpent: 1200,
                  timerStartedAt: null,
                  clientRequest: false,
                  carouselSlides: [],
                  files: [
                    {
                      id: 'f-emely-post-2',
                      name: 'Debutante_Preview.jpg',
                      url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
                      type: 'image/jpeg',
                      size: 380000,
                    }
                  ],
                  activity: [
                    {
                      ts: new Date().toISOString(),
                      type: 'status_change',
                      by: 'Agência BeeWave',
                      text: 'Vídeo editado e enviado para conferência e aprovação.',
                    }
                  ],
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                }
              ];
              state.tasks = [
                ...sampleApprovalTasks.filter((t) => !existingIds.has(t.id)),
                ...state.tasks,
              ];
            }
          }

          // Central de Tarefas: garante ao menos uma visão e uma visão ativa
          // válida. Sem isso a tabela não teria o que renderizar depois de uma
          // atualização vinda de versão anterior do app.
          if (!state.taskViews || state.taskViews.length === 0) {
            state.taskViews = buildDefaultViews();
          }
          if (!state.customProperties) {
            state.customProperties = [];
          }
          if (!Array.isArray(state.mascotImages)) {
            state.mascotImages = [];
          }
          if (!state.activeViewId || !state.taskViews.some((v) => v.id === state.activeViewId)) {
            state.activeViewId = state.taskViews[0].id;
          }

          // Rede de segurança: remove duplicatas de id que versões anteriores
          // deste hook possam ter deixado no armazenamento local.
          if (state.tasks) {
            const seen = new Set<string>();
            state.tasks = state.tasks.filter((t) => {
              if (seen.has(t.id)) return false;
              seen.add(t.id);
              return true;
            });
          }
          // Ensure no task timer is left running indefinitely across page reloads/sessions
          state.dockedTimerTaskId = null;
          const DEMO_TASK_IDS = new Set(['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6', 'task-7', 'task-8']);
          if (state.tasks && state.tasks.length > 0) {
            state.tasks = state.tasks
              .filter((t) => !DEMO_TASK_IDS.has(t.id))
              .map((t) => {
                const safeTimeSpent = t.timeSpent && t.timeSpent > 36000 ? 0 : t.timeSpent || 0;
                return {
                  ...t,
                  timeSpent: safeTimeSpent,
                  timerStartedAt: null,
                };
              });
          } else {
            state.tasks = [];
          }
          const DEMO_NOTE_IDS = new Set(['n-1', 'n-2']);
          if (state.notes && state.notes.length > 0) {
            state.notes = state.notes.filter((n) => !DEMO_NOTE_IDS.has(n.id));
          } else {
            state.notes = [];
          }
          if (!state.taskFilters) {
            state.taskFilters = INITIAL_TASK_FILTERS;
          }
          if (!state.adminPrompts) {
            state.adminPrompts = DEFAULT_ADMIN_PROMPTS;
          }
          if (!state.newsNiches || state.newsNiches.length === 0) {
            state.newsNiches = DEFAULT_NICHES;
          }
          if (!state.sidebarOrder || state.sidebarOrder.length === 0) {
            state.sidebarOrder = DEFAULT_SIDEBAR_ORDER;
          }
          if (!state.trash) {
            state.trash = [];
          } else {
            // Auto purge items older than 30 days
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            const now = Date.now();
            state.trash = state.trash.filter((item) => {
              const itemTime = new Date(item.deletedAt).getTime();
              return now - itemTime < thirtyDaysMs;
            });
          }
          if (typeof document !== 'undefined') {
            if (state.darkMode) {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          }
        }
      },
    }
  )
);

export const useCurrentUser = (): User | null => {
  const currentUserId = useAppStore((s) => s.currentUserId);
  const users = useAppStore((s) => s.users);
  return users.find((u) => u.id === currentUserId) || null;
};
