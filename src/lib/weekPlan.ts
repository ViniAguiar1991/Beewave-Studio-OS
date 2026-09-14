import { Client, Task, ContractService, TaskStatus } from '../types';

/* ============================================================================
 * Quanto o contrato prevê para a semana, e quanto já existe.
 *
 * A conta responde uma pergunta que ninguém conseguia responder sem abrir
 * cliente por cliente: "o que ainda falta entregar até domingo?".
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * Etapas da semana
 *
 * O caminho de uma publicação, na ordem em que a agência fala dela:
 *   falta planejar → não iniciada → em andamento → aguardando aprovação
 *   → aprovada → postada.
 *
 * "Falta planejar" não é status de tarefa: é a recorrência pedindo 3 posts
 * e só 2 tarefas lançadas na semana. As outras etapas saem do status.
 * ------------------------------------------------------------------------- */

export type EtapaTarefa =
  | 'naoIniciadas'
  | 'emAndamento'
  | 'aguardandoAprovacao'
  | 'aprovadas'
  | 'postadas';

export const ETAPAS: { key: EtapaTarefa; rotulo: string; detalhe: string }[] = [
  { key: 'naoIniciadas', rotulo: 'Não iniciadas', detalhe: 'tarefa criada, peça não começou' },
  { key: 'emAndamento', rotulo: 'Em andamento', detalhe: 'peça em criação ou ajuste' },
  { key: 'aguardandoAprovacao', rotulo: 'Aguardando aprovação', detalhe: 'com o cliente' },
  { key: 'aprovadas', rotulo: 'Aprovadas', detalhe: 'prontas para postar' },
  { key: 'postadas', rotulo: 'Postadas', detalhe: 'no ar' },
];

const ETAPA_DO_STATUS: Record<string, EtapaTarefa> = {
  nao_iniciado: 'naoIniciadas',
  aguardar: 'naoIniciadas',
  urgencia: 'naoIniciadas',
  planejamento: 'naoIniciadas',
  em_andamento: 'emAndamento',
  // O cliente pediu ajuste: a peça voltou para a mesa da equipe.
  alterar: 'emAndamento',
  em_aprovacao: 'aguardandoAprovacao',
  aprovado: 'aprovadas',
  postado: 'postadas',
};

const ETAPA_DO_GRUPO: Record<TaskStatus['group'], EtapaTarefa> = {
  todo: 'naoIniciadas',
  progress: 'emAndamento',
  review: 'aguardandoAprovacao',
  done: 'aprovadas',
};

/** Etapa da tarefa. Status criado pela agência entra pelo grupo dele. */
export const etapaDaTarefa = (t: Task, statuses: TaskStatus[] = []): EtapaTarefa => {
  const direta = ETAPA_DO_STATUS[t.status];
  if (direta) return direta;
  const grupo = statuses.find((s) => s.key === t.status)?.group;
  return grupo ? ETAPA_DO_GRUPO[grupo] : 'naoIniciadas';
};

type ContagemEtapas = Record<EtapaTarefa, number>;

const contarEtapas = (lista: Task[], statuses: TaskStatus[]): ContagemEtapas => {
  const c: ContagemEtapas = {
    naoIniciadas: 0,
    emAndamento: 0,
    aguardandoAprovacao: 0,
    aprovadas: 0,
    postadas: 0,
  };
  for (const t of lista) c[etapaDaTarefa(t, statuses)]++;
  return c;
};

const diaDe = (t: Task): string | null => (t.postDate || t.date || '').split('T')[0] || null;

const chave = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Segunda a domingo da semana que contém a data. */
export const semanaDe = (base = new Date()) => {
  const inicio = new Date(base);
  const diaSemana = inicio.getDay();
  // getDay(): 0 = domingo. Segunda como primeiro dia da semana de trabalho.
  const recuo = diaSemana === 0 ? 6 : diaSemana - 1;
  inicio.setDate(inicio.getDate() - recuo);
  inicio.setHours(0, 0, 0, 0);

  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim, inicioChave: chave(inicio), fimChave: chave(fim) };
};

/**
 * Quantas entregas um serviço recorrente prevê para uma semana.
 *
 * Mensal e quinzenal não cabem numa semana inteira: um tablóide por mês não
 * é "0,25 por semana". Ele conta na semana em que a data cai — e, sem data
 * definida no contrato, na primeira semana do mês.
 */
export const previstoNaSemana = (servico: ContractService, base = new Date()): number => {
  if (!servico.active) return 0;

  switch (servico.frequency) {
    case 'semanal':
      return servico.quantity;

    case 'diario':
      // Se o contrato diz em quais dias, respeita; senão, todo dia.
      return (servico.daysOfWeek?.length || 7) * servico.quantity;

    case 'quinzenal': {
      // Semanas ímpares do mês recebem a entrega.
      const semanaDoMes = Math.floor((base.getDate() - 1) / 7);
      return semanaDoMes % 2 === 0 ? servico.quantity : 0;
    }

    case 'mensal': {
      const { inicio, fim } = semanaDe(base);
      // Cai na semana que contém o dia 1º do mês.
      const primeiroDoMes = new Date(base.getFullYear(), base.getMonth(), 1);
      return primeiroDoMes >= inicio && primeiroDoMes <= fim ? servico.quantity : 0;
    }

    default:
      return 0;
  }
};

export interface ResumoCliente extends ContagemEtapas {
  clientId: string;
  nome: string;
  /** Quantas publicações a recorrência prevê para esta semana. */
  contratado: number;
  /** Tarefas lançadas com data dentro da semana. */
  planejado: number;
  /** Recorrência menos tarefas lançadas — o que ainda nem virou tarefa. */
  faltaPlanejar: number;
  /** O cliente tem serviços recorrentes cadastrados? */
  temContrato: boolean;
}

export interface ResumoSemana extends ContagemEtapas {
  inicio: Date;
  fim: Date;
  clientes: ResumoCliente[];
  contratado: number;
  planejado: number;
  faltaPlanejar: number;
  /** Nenhum cliente tem serviço recorrente cadastrado. */
  semContratos: boolean;
  /** Nada pendente: nem planejar, nem produzir, nem aprovar. */
  tudoEmDia: boolean;
}

/**
 * Monta o retrato da semana por cliente e no total.
 *
 * Sem serviços recorrentes cadastrados, `contratado` é zero e a tela diz isso
 * em vez de inventar meta — número chutado num painel é pior que número nenhum.
 */
export const resumoDaSemana = (
  clients: Client[],
  tasks: Task[],
  statuses: TaskStatus[] = [],
  base = new Date()
): ResumoSemana => {
  const { inicio, fim, inicioChave, fimChave } = semanaDe(base);

  const clientes: ResumoCliente[] = clients.map((client) => {
    const servicos = (client.contractServices || []).filter((s) => s.active);
    const contratado = servicos.reduce((soma, s) => soma + previstoNaSemana(s, base), 0);

    const daSemana = tasks.filter((t) => {
      if (t.clientId !== client.id) return false;
      const dia = diaDe(t);
      return !!dia && dia >= inicioChave && dia <= fimChave;
    });

    return {
      clientId: client.id,
      nome: client.company || client.name || 'Cliente',
      contratado,
      planejado: daSemana.length,
      ...contarEtapas(daSemana, statuses),
      faltaPlanejar: Math.max(0, contratado - daSemana.length),
      temContrato: servicos.length > 0,
    };
  });

  const soma = (campo: keyof ResumoCliente) =>
    clientes.reduce((acc, c) => acc + (c[campo] as number), 0);

  const faltaPlanejar = soma('faltaPlanejar');
  const naoIniciadas = soma('naoIniciadas');
  const emAndamento = soma('emAndamento');
  const aguardandoAprovacao = soma('aguardandoAprovacao');

  return {
    inicio,
    fim,
    clientes,
    contratado: soma('contratado'),
    planejado: soma('planejado'),
    faltaPlanejar,
    naoIniciadas,
    emAndamento,
    aguardandoAprovacao,
    aprovadas: soma('aprovadas'),
    postadas: soma('postadas'),
    semContratos: clientes.every((c) => !c.temContrato),
    tudoEmDia:
      faltaPlanejar === 0 && naoIniciadas === 0 && emAndamento === 0 && aguardandoAprovacao === 0,
  };
};

export interface DiaDaSemana extends ContagemEtapas {
  /** 'seg', 'ter'… */
  rotulo: string;
  chave: string;
  hoje: boolean;
  total: number;
}

const ROTULOS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'];

/**
 * Carga por dia da semana.
 *
 * Serve para enxergar desequilíbrio: segunda lotada e quinta vazia é problema de
 * distribuição, não de volume — e isso não aparece num número só.
 */
export const cargaPorDia = (
  tasks: Task[],
  statuses: TaskStatus[] = [],
  base = new Date()
): DiaDaSemana[] => {
  const { inicio } = semanaDe(base);
  const hojeChave = chave(new Date());

  return ROTULOS.map((rotulo, i) => {
    const d = new Date(inicio);
    d.setDate(inicio.getDate() + i);
    const k = chave(d);

    const doDia = tasks.filter((t) => diaDe(t) === k);
    return {
      rotulo,
      chave: k,
      hoje: k === hojeChave,
      ...contarEtapas(doDia, statuses),
      total: doDia.length,
    };
  });
};

/* ---------------------------------------------------------------------------
 * Saudação
 * ------------------------------------------------------------------------- */

export const saudacao = (hora = new Date().getHours()): string => {
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

/** Ponto de partida. A agência troca em Configurações › Início. */
export const FRASES_PADRAO = [
  'Vamos fazer boas ideias acontecerem.',
  'Um post bem feito vale por dez apressados.',
  'Hoje é dia de deixar cliente orgulhoso.',
  'Constância ganha de inspiração.',
  'A melhor pauta é a que sai no prazo.',
  'Capricho no detalhe é o que a marca lembra.',
  'Menos reunião, mais entrega.',
  'Cliente feliz é o que renova contrato.',
];

/**
 * Frase do dia. Muda a cada dia e é a mesma para todo mundo da equipe —
 * sorteio a cada renderização deixaria o texto piscando na tela.
 */
export const fraseDoDia = (frases: string[] = FRASES_PADRAO, data = new Date()): string => {
  const lista = frases.length > 0 ? frases : FRASES_PADRAO;
  const diaDoAno = Math.floor(
    (data.getTime() - new Date(data.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return lista[diaDoAno % lista.length];
};

/** Mesma lógica para a pose do mascote: uma por dia, estável. */
export const mascoteDoDia = (imagens: string[], data = new Date()): string | null => {
  if (!imagens.length) return null;
  const diaDoAno = Math.floor(
    (data.getTime() - new Date(data.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return imagens[diaDoAno % imagens.length];
};
