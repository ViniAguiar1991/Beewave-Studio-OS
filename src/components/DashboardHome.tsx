import React, { useState } from 'react';
import {
  Users,
  ListChecks,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Check,
  Trash2,
  Calendar,
  AlertCircle,
  Sparkles,
  ExternalLink,
  LogOut,
  FolderKanban,
  Zap,
  TrendingUp,
  CalendarDays,
  Play,
  RotateCw,
} from 'lucide-react';
import {
  startOfWeek,
  endOfWeek,
  addWeeks,
  parseISO,
  isWithinInterval,
  format,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore, useCurrentUser } from '../store';
import { getStatusBadgeStyle, getStatusLabel } from '../utils/badgeStyles';
import { formatFriendlyDate } from '../utils/dateFormatter';
import { TaskStatusButton } from './TaskStatusButton';

interface DashboardHomeProps {
  onSelectTask: (taskId: string) => void;
  onNewTask: () => void;
  onSelectClient: (clientId: string) => void;
  onSelectTab: (tab: string) => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onSelectTask,
  onNewTask,
  onSelectClient,
  onSelectTab,
}) => {
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.tasks);
  const notes = useAppStore((s) => s.notes);
  const addNote = useAppStore((s) => s.addNote);
  const toggleNote = useAppStore((s) => s.toggleNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const logout = useAppStore((s) => s.logout);
  const generateMonthlyTasksFromContract = useAppStore((s) => s.generateMonthlyTasksFromContract);
  const currentUser = useCurrentUser();

  const [newNoteText, setNewNoteText] = useState('');
  const [generationNotice, setGenerationNotice] = useState<string | null>(null);

  // Dynamic Time-Based Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };
  const userName = currentUser?.name?.split(' ')[0] || 'Criativo';

  // Real production metrics calculation
  const now = new Date();
  const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const thisWeekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });
  const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 1 });

  // Helpers to categorize tasks by production stage
  const isToProduce = (status: string) =>
    status === 'nao_iniciado' ||
    status === 'em_andamento' ||
    status === 'planejamento' ||
    status === 'aguardar' ||
    status === 'urgencia';

  const isInApproval = (status: string) =>
    status === 'em_aprovacao' || status === 'alterar';

  const isApproved = (status: string) =>
    status === 'aprovado' || status === 'postado';

  // Tasks in this week
  const thisWeekTasks = tasks.filter((t) => {
    if (!t.postDate) return false;
    try {
      const pDate = parseISO(t.postDate);
      return isWithinInterval(pDate, { start: thisWeekStart, end: thisWeekEnd });
    } catch {
      return false;
    }
  });

  const thisWeekToProduce = thisWeekTasks.filter((t) => isToProduce(t.status));
  const thisWeekInApproval = thisWeekTasks.filter((t) => isInApproval(t.status));
  const thisWeekApproved = thisWeekTasks.filter((t) => isApproved(t.status));

  // Tasks in next week
  const nextWeekTasks = tasks.filter((t) => {
    if (!t.postDate) return false;
    try {
      const pDate = parseISO(t.postDate);
      return isWithinInterval(pDate, { start: nextWeekStart, end: nextWeekEnd });
    } catch {
      return false;
    }
  });

  const nextWeekToProduce = nextWeekTasks.filter((t) => isToProduce(t.status));
  const nextWeekInApproval = nextWeekTasks.filter((t) => isInApproval(t.status));
  const nextWeekApproved = nextWeekTasks.filter((t) => isApproved(t.status));

  // Overall counts
  const totalInApproval = tasks.filter((t) => isInApproval(t.status)).length;
  const totalInProduction = tasks.filter((t) => isToProduce(t.status)).length;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !currentUser) return;
    addNote(currentUser.id, newNoteText.trim());
    setNewNoteText('');
  };

  const handleGenerateForClient = (clientId: string, clientName: string) => {
    const count = generateMonthlyTasksFromContract(clientId);
    setGenerationNotice(
      count > 0
        ? `Criadas ${count} tarefas automáticas para ${clientName} no mês atual!`
        : `Nenhum novo serviço recorrente pendente para ${clientName}.`
    );
    setTimeout(() => setGenerationNotice(null), 4000);
  };

  return (
    <div id="dashboard-home" className="mx-auto max-w-6xl space-y-10 pb-20 animate-fade-in">
      {/* 1. Notion-Style Clean Header (Spacious, Unboxed, High Contrast) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Painel de Operações da Agência</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Você tem <strong className="text-slate-900 dark:text-white font-semibold">{totalInApproval} publicações</strong> em aprovação e <strong className="text-slate-900 dark:text-white font-semibold">{totalInProduction} pautas</strong> em produção ativa.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          <button
            onClick={onNewTask}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs shadow-xs transition-all cursor-pointer active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Tarefa</span>
          </button>

          <button
            id="btn-home-hero-logout"
            onClick={() => logout()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
            title="Encerrar sessão"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {generationNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{generationNotice}</span>
        </div>
      )}

      {/* 2. RITMO DE PRODUÇÃO: Esta Semana vs Próxima Semana (Requested by user) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Ritmo de Produção Semanal
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Acompanhamento de entregas programadas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card: Esta Semana */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Esta Semana
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {format(thisWeekStart, 'dd/MM')} a {format(thisWeekEnd, 'dd/MM')}
                </h3>
              </div>
              <span className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                {thisWeekTasks.length} <span className="text-xs font-normal text-slate-500">posts</span>
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Faltam Produzir</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {thisWeekToProduce.length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60">
                <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 uppercase">Em Aprovação</p>
                <p className="text-lg font-bold text-amber-900 dark:text-amber-300 mt-0.5">
                  {thisWeekInApproval.length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60">
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">Aprovados</p>
                <p className="text-lg font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">
                  {thisWeekApproved.length}
                </p>
              </div>
            </div>

            {/* Quick progress bar */}
            <div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
                <span>Conclusão da semana</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {thisWeekTasks.length > 0
                    ? Math.round((thisWeekApproved.length / thisWeekTasks.length) * 100)
                    : 0}%
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${
                      thisWeekTasks.length > 0
                        ? (thisWeekApproved.length / thisWeekTasks.length) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card: Próxima Semana */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 md:p-6 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Próxima Semana
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {format(nextWeekStart, 'dd/MM')} a {format(nextWeekEnd, 'dd/MM')}
                </h3>
              </div>
              <span className="text-2xl font-display font-bold text-slate-900 dark:text-white">
                {nextWeekTasks.length} <span className="text-xs font-normal text-slate-500">posts</span>
              </span>
            </div>

            {/* Metrics Breakdown */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Faltam Produzir</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                  {nextWeekToProduce.length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/60">
                <p className="text-[10px] font-bold text-blue-800 dark:text-blue-400 uppercase">Em Aprovação</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-300 mt-0.5">
                  {nextWeekInApproval.length}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/60">
                <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">Adiantados</p>
                <p className="text-lg font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">
                  {nextWeekApproved.length}
                </p>
              </div>
            </div>

            {/* Antecipation info */}
            <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 text-[11px] text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>Produção antecipada:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {nextWeekTasks.length > 0 ? `${nextWeekApproved.length} de ${nextWeekTasks.length} já prontos` : 'Nenhuma pauta agendada'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. FLUXO POR CLIENTE & CONTRATO (Recorrência + Automação) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Contratos & Entregas Recorrentes
            </h2>
          </div>
          <button
            onClick={() => onSelectTab('campanhas')}
            className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <FolderKanban className="h-3.5 w-3.5" />
            <span>Ver Pastas de Campanhas</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clients.map((client) => {
            const clientTasks = tasks.filter((t) => t.clientId === client.id);
            const pendingClientApproval = clientTasks.filter((t) => t.status === 'em_aprovacao').length;
            const inProdClient = clientTasks.filter((t) => isToProduce(t.status)).length;
            const recurringServices = client.contractServices || [];

            return (
              <div
                key={client.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        {client.emoji || '🏢'}
                      </span>
                      <div>
                        <h3
                          onClick={() => onSelectClient(client.id)}
                          className="font-bold text-sm text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                        >
                          {client.company}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate max-w-[170px]">
                          {client.niche || 'Cliente Recorrente'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {client.postsPerWeek || 3} posts/sem
                    </span>
                  </div>

                  {/* Stats Mini Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      <span className="text-[10px] text-slate-400 block">Em Produção</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {inProdClient} pautas
                      </span>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 block">Para Aprovar</span>
                      <span className="font-bold text-amber-800 dark:text-amber-300">
                        {pendingClientApproval} posts
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recurrence Trigger Button */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onSelectClient(client.id)}
                    className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Ver perfil
                  </button>

                  <button
                    onClick={() => handleGenerateForClient(client.id, client.company)}
                    title="Gera automaticamente as pautas do mês baseadas nos serviços recorrentes cadastrados"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <RotateCw className="h-3 w-3" />
                    <span>Gerar Pautas do Mês</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. NOTAS RÁPIDAS & LEMBRETES (Clean Notion list, no heavy box) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Bloco de Notas Rápidas & Foco
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {notes.filter((n) => !n.done).length} anotações pendentes
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs">
          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              placeholder="Adicionar nota rápida ou lembrete de produção..."
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              className="clean-input h-10 flex-1 px-3 text-xs bg-slate-50 dark:bg-slate-800/60"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold transition-all cursor-pointer shrink-0"
            >
              Adicionar
            </button>
          </form>

          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {notes.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">
                Nenhuma nota salva. Use este espaço para lembretes diários.
              </p>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="flex items-center justify-between py-2.5 gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      onClick={() => toggleNote(note.id)}
                      className={`h-4 w-4 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                        note.done
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {note.done && <Check className="h-3 w-3" />}
                    </button>
                    <span
                      className={`truncate ${
                        note.done
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {note.text}
                    </span>
                  </div>

                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer p-1"
                    title="Excluir nota"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
