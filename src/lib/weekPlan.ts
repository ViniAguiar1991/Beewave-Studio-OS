import { Client, Task, ContractService } from '../types';

/* ============================================================================
 * Quanto o contrato prevê para a semana, e quanto já existe.
 *
 * A conta responde uma pergunta que ninguém conseguia responder sem abrir
 * cliente por cliente: "o que ainda falta entregar até domingo?".
 * ========================================================================== */

const EM_PRODUCAO = ['nao_iniciado', 'em_andamento', 'planejamento', 'aguardar', 'urgencia'];
const CONCLUIDAS = ['aprovado', 'postado'];

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

export interface ResumoCliente {
  clientId: string;
  nome: string;
  /** Quantas entregas o contrato prevê para esta semana. */
  contratado: number;
  /** Pautas já criadas com data dentro da semana. */
  planejado: number;
  /** Criadas mas ainda não enviadas ao cliente. */
  emProducao: number;
  /** Enviadas e esperando o cliente. */
  comCliente: number;
  /** Aprovadas ou publicadas. */
  concluido: number;
  /** Contratado menos planejado — o que ainda nem virou pauta. */
  faltaPlanejar: number;
  /** O cliente tem serviços recorrentes cadastrados? */
  temContrato: boolean;
}

export interface ResumoSemana {
  inicio: Date;
  fim: Date;
  clientes: ResumoCliente[];
  contratado: number;
  planejado: number;
  emProducao: number;
  comCliente: number;
  concluido: number;
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

    const emProducao = daSemana.filter((t) => EM_PRODUCAO.includes(t.status)).length;
    const comCliente = daSemana.filter(
      (t) => t.status === 'em_aprovacao' || t.status === 'alterar'
    ).length;
    const concluido = daSemana.filter((t) => CONCLUIDAS.includes(t.status)).length;

    return {
      clientId: client.id,
      nome: client.company || client.name || 'Cliente',
      contratado,
      planejado: daSemana.length,
      emProducao,
      comCliente,
      concluido,
      faltaPlanejar: Math.max(0, contratado - daSemana.length),
      temContrato: servicos.length > 0,
    };
  });

  const soma = (campo: keyof ResumoCliente) =>
    clientes.reduce((acc, c) => acc + (c[campo] as number), 0);

  const contratado = soma('contratado');
  const faltaPlanejar = soma('faltaPlanejar');
  const emProducao = soma('emProducao');
  const comCliente = soma('comCliente');

  return {
    inicio,
    fim,
    clientes,
    contratado,
    planejado: soma('planejado'),
    emProducao,
    comCliente,
    concluido: soma('concluido'),
    faltaPlanejar,
    semContratos: clientes.every((c) => !c.temContrato),
    tudoEmDia: faltaPlanejar === 0 && emProducao === 0 && comCliente === 0,
  };
};

/* ---------------------------------------------------------------------------
 * Saudação
 * ------------------------------------------------------------------------- */

export const saudacao = (hora = new Date().getHours()): string => {
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

const FRASES = [
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
export const fraseDoDia = (data = new Date()): string => {
  const diaDoAno = Math.floor(
    (data.getTime() - new Date(data.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return FRASES[diaDoAno % FRASES.length];
};

/** Mesma lógica para a pose do mascote: uma por dia, estável. */
export const mascoteDoDia = (imagens: string[], data = new Date()): string | null => {
  if (!imagens.length) return null;
  const diaDoAno = Math.floor(
    (data.getTime() - new Date(data.getFullYear(), 0, 0).getTime()) / 86400000
  );
  return imagens[diaDoAno % imagens.length];
};
