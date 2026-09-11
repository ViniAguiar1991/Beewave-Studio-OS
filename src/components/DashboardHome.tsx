import React, { useMemo, useState } from 'react';
import {
  Plus,
  ArrowRight,
  Check,
  Trash2,
  RotateCw,
  MessageSquareWarning,
  Lightbulb,
  Clock,
} from 'lucide-react';
import { startOfWeek, endOfWeek, parseISO, isWithinInterval, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore, useCurrentUser } from '../store';
import { Task, Client, TaskStatus } from '../types';
import { getColor, hexToColorKey } from '../lib/taskViews';
import { formatFriendlyDate, isTaskDelayed } from '../utils/dateFormatter';
import { Button, BlockHeader, EmptyState } from './ui';

interface DashboardHomeProps {
  onSelectTask: (taskId: string) => void;
  onNewTask: () => void;
  onSelectClient: (clientId: string) => void;
  onSelectTab: (tab: string) => void;
}

const IN_PRODUCTION = ['nao_iniciado', 'em_andamento', 'planejamento', 'aguardar', 'urgencia'];

const getDay = (t: Task) => (t.postDate || t.date || '').split('T')[0] || null;

/**
 * Início — o painel de operação da agência.
 *
 * A tela responde, nesta ordem: o que trava agora, o que sai esta semana e
 * como está cada cliente. Antes ela abria com dois cards de "ritmo de produção"
 * contendo caixas de métrica dentro de caixas, barra de progresso e um grid de
 * cards de cliente com mais caixas dentro — muito container, pouca decisão.
 *
 * O bloco "Precisa de você" existia como necessidade e não como tela: pedidos
 * de ajuste e sugestões de pauta enviadas pelo cliente chegavam na lista geral
 * de tarefas sem nenhuma marca, misturados com pauta criada pela equipe.
 */
export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onSelectTask,
  onNewTask,
  onSelectClient,
  onSelectTab,
}) => {
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.tasks);
  const statuses = useAppStore((s) => s.statuses);
  const notes = useAppStore((s) => s.notes);
  const addNote = useAppStore((s) => s.addNote);
  const toggleNote = useAppStore((s) => s.toggleNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const generateMonthlyTasksFromContract = useAppStore((s) => s.generateMonthlyTasksFromContract);
  const currentUser = useCurrentUser();

  const [newNoteText, setNewNoteText] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h >= 5 && h < 12) return 'Bom dia';
    if (h >= 12 && h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);
  const firstName = currentUser?.name?.split(' ')[0] || 'Criativo';

  const clientById = useMemo(() => new Map(clients.map((c) => [c.id, c])), [clients]);

  /* ------------------------------------------------------------------------
   * A fila da equipe: o que está parado esperando alguém da Beewave.
   * ---------------------------------------------------------------------- */
  const queue = useMemo(() => {
    const changeRequests = tasks.filter((t) => t.status === 'alterar');
    const suggestions = tasks.filter(
      (t) => t.clientRequest && t.status === 'nao_iniciado'
    );
    const late = tasks.filter(
      (t) => isTaskDelayed(t) && t.status !== 'alterar' && !t.clientRequest
    );
    return { changeRequests, suggestions, late };
  }, [tasks]);

  const queueTotal = queue.changeRequests.length + queue.suggestions.length + queue.late.length;

  /* ------------------------------------------------------------------------
   * A semana corrente.
   * ---------------------------------------------------------------------- */
  const week = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const inWeek = tasks.filter((t) => {
      const d = getDay(t);
      if (!d) return false;
      try {
        return isWithinInterval(parseISO(d), { start, end });
      } catch {
        return false;
      }
    });

    return {
      start,
      end,
      total: inWeek.length,
      toProduce: inWeek.filter((t) => IN_PRODUCTION.includes(t.status)).length,
      awaitingClient: inWeek.filter((t) => t.status === 'em_aprovacao').length,
      done: inWeek.filter((t) => t.status === 'aprovado' || t.status === 'postado').length,
    };
  }, [tasks]);

  const totalAwaitingClient = tasks.filter((t) => t.status === 'em_aprovacao').length;

  const headline = useMemo(() => {
    const parts: string[] = [];
    if (queueTotal > 0) {
      parts.push(`${queueTotal} ${queueTotal === 1 ? 'pauta precisa' : 'pautas precisam'} da equipe`);
    }
    if (totalAwaitingClient > 0) {
      parts.push(`${totalAwaitingClient} na mão do cliente`);
    }
    if (parts.length === 0) {
      return week.total > 0
        ? `Nada travado. ${week.total} ${week.total === 1 ? 'publicação' : 'publicações'} programadas para esta semana.`
        : 'Nada travado e nenhuma publicação programada para esta semana.';
    }
    return `${parts.join(' · ')}.`;
  }, [queueTotal, totalAwaitingClient, week.total]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !currentUser) return;
    addNote(currentUser.id, newNoteText.trim());
    setNewNoteText('');
  };

  const handleGenerate = (client: Client) => {
    const count = generateMonthlyTasksFromContract(client.id);
    setNotice(
      count > 0
        ? `${count} ${count === 1 ? 'pauta criada' : 'pautas criadas'} para ${client.company} a partir do contrato.`
        : `Nenhum serviço recorrente pendente para ${client.company} neste mês.`
    );
    window.setTimeout(() => setNotice(null), 5000);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-12 pb-16">
      {/* 1. Onde estou, como está, o que faço */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] sm:text-[34px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
            {greeting}, {firstName}
          </h1>
          <p className="t-body text-slate-600 dark:text-slate-400 mt-1.5">{headline}</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={onNewTask} className="shrink-0 self-start sm:self-auto">
          Nova tarefa
        </Button>
      </header>

      {notice && (
        <p role="status" className="t-body text-emerald-700 dark:text-emerald-400 -mt-6">
          {notice}
        </p>
      )}

      {/* 2. A fila da equipe. Único bloco que pede ação. */}
      <section className="space-y-5">
        <BlockHeader
          title="Precisa de você"
          count={queueTotal > 0 ? `${queueTotal} ${queueTotal === 1 ? 'pauta' : 'pautas'}` : undefined}
          action={
            queueTotal > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => onSelectTab('tarefas')}>
                Abrir tarefas
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        />

        {queueTotal === 0 ? (
          <EmptyState
            title="Nada travado no momento"
            hint="Pedidos de ajuste, sugestões enviadas pelos clientes e pautas atrasadas aparecem aqui assim que surgirem."
          />
        ) : (
          <div className="space-y-8">
            <QueueGroup
              label="Ajustes pedidos pelo cliente"
              hint="O cliente devolveu — refazer e reenviar."
              tone="text-rose-700 dark:text-rose-400"
              icon={MessageSquareWarning}
              tasks={queue.changeRequests}
              clientById={clientById}
              statuses={statuses}
              onSelectTask={onSelectTask}
            />
            <QueueGroup
              label="Sugestões de pauta do cliente"
              hint="Chegaram pelo portal e ainda não foram avaliadas."
              tone="text-amber-700 dark:text-amber-500"
              icon={Lightbulb}
              tasks={queue.suggestions}
              clientById={clientById}
              statuses={statuses}
              onSelectTask={onSelectTask}
            />
            <QueueGroup
              label="Atrasadas"
              hint="A data de publicação já passou."
              tone="text-slate-700 dark:text-slate-300"
              icon={Clock}
              tasks={queue.late}
              clientById={clientById}
              statuses={statuses}
              onSelectTask={onSelectTask}
            />
          </div>
        )}
      </section>

      {/* 3. A semana, em texto. Sem caixa dentro de caixa, sem barra decorativa. */}
      <section className="space-y-5">
        <BlockHeader
          title="Esta semana"
          count={`${format(week.start, "d 'de' MMM", { locale: ptBR })} a ${format(week.end, "d 'de' MMM", { locale: ptBR })}`}
          action={
            <button
              onClick={() => onSelectTab('tarefas')}
              className="t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white underline underline-offset-4 cursor-pointer"
            >
              Abrir tarefas
            </button>
          }
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
          <Stat value={week.total} label="Publicações na semana" />
          <Stat value={week.toProduce} label="Ainda para produzir" />
          <Stat value={week.awaitingClient} label="Na mão do cliente" />
          <Stat value={week.done} label="Aprovadas" />
        </div>
      </section>

      {/* 4. Situação por cliente. Uma linha por cliente, não um card. */}
      <section className="space-y-5">
        <BlockHeader
          title="Clientes"
          count={`${clients.length} ${clients.length === 1 ? 'conta ativa' : 'contas ativas'}`}
          action={
            <button
              onClick={() => onSelectTab('clientes')}
              className="t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white underline underline-offset-4 cursor-pointer"
            >
              Ver todos
            </button>
          }
        />

        {clients.length === 0 ? (
          <EmptyState
            title="Nenhum cliente cadastrado"
            hint="Cadastre o primeiro cliente para começar a programar pautas e liberar o portal de aprovação."
          />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {clients.map((client) => {
              const list = tasks.filter((t) => t.clientId === client.id);
              const producing = list.filter((t) => IN_PRODUCTION.includes(t.status)).length;
              const awaiting = list.filter((t) => t.status === 'em_aprovacao').length;
              const adjusting = list.filter((t) => t.status === 'alterar').length;

              const today = new Date().toISOString().split('T')[0];
              const next = list
                .filter((t) => {
                  const d = getDay(t);
                  return !!d && d >= today && t.status !== 'postado';
                })
                .sort((a, b) => (getDay(a) || '').localeCompare(getDay(b) || ''))[0];

              return (
                <li key={client.id} className="py-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  <button
                    onClick={() => onSelectClient(client.id)}
                    className="flex items-center gap-3 min-w-0 flex-1 text-left group cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block t-lead font-medium text-slate-900 dark:text-white truncate group-hover:underline underline-offset-4 decoration-slate-300">
                        {client.company}
                      </span>
                      <span className="block t-meta text-slate-500 dark:text-slate-400 truncate">
                        {next
                          ? `Próxima publicação ${formatFriendlyDate(getDay(next)).toLowerCase()}`
                          : 'Sem publicação agendada'}
                      </span>
                    </span>
                  </button>

                  <div className="flex items-center gap-5 shrink-0 t-meta tabular-nums">
                    <ClientStat n={producing} label="produzindo" />
                    <ClientStat n={awaiting} label="c/ cliente" highlight={awaiting > 0} />
                    <ClientStat n={adjusting} label="ajuste" alert={adjusting > 0} />
                  </div>

                  <button
                    onClick={() => handleGenerate(client)}
                    title="Cria as pautas do mês a partir dos serviços recorrentes do contrato"
                    className="shrink-0 inline-flex items-center gap-1.5 t-ui text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                    <span className="hidden lg:inline">Gerar pautas</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* 5. Notas rápidas */}
      <section className="space-y-5">
        <BlockHeader
          title="Notas"
          count={
            notes.filter((n) => !n.done).length > 0
              ? `${notes.filter((n) => !n.done).length} em aberto`
              : undefined
          }
        />

        <form onSubmit={handleAddNote} className="flex gap-2.5">
          <input
            type="text"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Anotar um lembrete…"
            className="flex-1 h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
          />
          <Button variant="secondary" type="submit" disabled={!newNoteText.trim()}>
            Adicionar
          </Button>
        </form>

        {notes.length > 0 && (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {notes.map((note) => (
              <li key={note.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggleNote(note.id)}
                  aria-label={note.done ? 'Marcar como pendente' : 'Marcar como feita'}
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded border transition-colors cursor-pointer ${
                    note.done
                      ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-950'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {note.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
                <span
                  className={`min-w-0 flex-1 t-body ${
                    note.done
                      ? 'line-through text-slate-400 dark:text-slate-600'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {note.text}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  aria-label="Excluir nota"
                  className="shrink-0 text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 transition-colors cursor-pointer p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

/* ========================================================================== */

const Stat: React.FC<{ value: number; label: string }> = ({ value, label }) => (
  <div>
    <p className="font-display text-[28px] font-semibold tracking-tight text-slate-950 dark:text-white tabular-nums leading-none">
      {value}
    </p>
    <p className="t-meta text-slate-500 dark:text-slate-400 mt-1.5">{label}</p>
  </div>
);

const ClientStat: React.FC<{
  n: number;
  label: string;
  highlight?: boolean;
  alert?: boolean;
}> = ({ n, label, highlight, alert }) => (
  <span className="hidden sm:flex items-baseline gap-1.5">
    <span
      className={`font-semibold ${
        alert
          ? 'text-rose-700 dark:text-rose-400'
          : highlight
            ? 'text-amber-700 dark:text-amber-500'
            : 'text-slate-900 dark:text-white'
      }`}
    >
      {n}
    </span>
    <span className="text-slate-400 dark:text-slate-500">{label}</span>
  </span>
);

/**
 * Um grupo da fila. Some inteiro quando está vazio — um bloco com "0 itens"
 * ocuparia espaço sem informar nada.
 */
const QueueGroup: React.FC<{
  label: string;
  hint: string;
  tone: string;
  icon: React.ComponentType<{ className?: string }>;
  tasks: Task[];
  clientById: Map<string, Client>;
  statuses: TaskStatus[];
  onSelectTask: (id: string) => void;
}> = ({ label, hint, tone, icon: Icon, tasks, clientById, statuses, onSelectTask }) => {
  if (tasks.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className={`inline-flex items-center gap-2 t-label ${tone}`}>
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        <span className="t-meta text-slate-400 dark:text-slate-500">
          {tasks.length} · {hint}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
        {tasks.map((task) => {
          const client = clientById.get(task.clientId);
          // Mesma cor que a Central de Tarefas usa: a do cadastro de status.
          const status = statuses.find((s) => s.key === task.status);
          const badge = getColor(hexToColorKey(status?.color));
          const day = getDay(task);
          return (
            <li key={task.id}>
              <button
                onClick={() => onSelectTask(task.id)}
                className="w-full flex items-center gap-4 py-3.5 text-left group cursor-pointer"
              >
                <span className="min-w-0 flex-1">
                  <span className="block t-lead font-medium text-slate-900 dark:text-white truncate group-hover:underline underline-offset-4 decoration-slate-300">
                    {task.selectedHeadline || task.headline || task.title}
                  </span>
                  <span className="block t-meta text-slate-500 dark:text-slate-400 truncate">
                    {client?.company || 'Sem cliente'}
                    {day && ` · ${formatFriendlyDate(day)}`}
                  </span>
                </span>
                <span className={`shrink-0 hidden sm:inline-flex items-center gap-1.5 t-meta ${badge.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.solid}`} />
                  {status?.label || task.status}
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
