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
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { getStatusBadgeStyle, getStatusLabel } from '../utils/badgeStyles';
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
  const currentUser = useCurrentUser();

  const [newNoteText, setNewNoteText] = useState('');

  // Dynamic Time-Based Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };
  const userName = currentUser?.name?.split(' ')[0] || 'Criativo';

  // Symmetrical Metrics without demo data
  const DEMO_TASK_IDS = new Set(['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6', 'task-7', 'task-8']);
  const realTasks = tasks.filter((t) => !DEMO_TASK_IDS.has(t.id));
  const realNotes = notes.filter((n) => n.id !== 'n-1' && n.id !== 'n-2');

  const totalClients = clients.length;
  const inProgressTasks = realTasks.filter((t) => t.status === 'em_andamento').length;
  const inApprovalTasks = realTasks.filter((t) => t.status === 'em_aprovacao').length;
  const changeRequestedTasks = realTasks.filter((t) => t.status === 'alterar').length;
  const approvedTasks = realTasks.filter((t) => t.status === 'aprovado' || t.status === 'postado').length;

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !currentUser) return;
    addNote(currentUser.id, newNoteText.trim());
    setNewNoteText('');
  };

  return (
    <div id="dashboard-home" className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Symmetrical Hero Statement with Personalized Greeting */}
      <div className="clean-card p-8 md:p-10 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2 max-w-3xl">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-medium text-slate-900 dark:text-white tracking-tight">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm font-normal text-slate-600 dark:text-slate-200 leading-relaxed">
            Você possui <span className="font-semibold text-slate-900 dark:text-white">{inApprovalTasks} publicações</span> em análise pelos clientes e <span className="font-semibold text-slate-900 dark:text-white">{inProgressTasks} tarefas</span> em produção ativa.
          </p>
        </div>
        <button
          id="btn-home-hero-logout"
          onClick={() => logout()}
          className="self-start sm:self-center flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
          title="Encerrar sessão"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair da conta</span>
        </button>
      </div>

      {/* Symmetrical 4-Column Balanced Grid with Pure Glassmorphism */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Clients */}
        <div
          onClick={() => onSelectTab('clientes')}
          className="clean-card clean-card-hover p-6 cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider">Clientes Ativos</span>
            <Users className="h-4 w-4 text-slate-700 dark:text-white" />
          </div>
          <div>
            <p className="text-3xl font-display font-semibold text-slate-900 dark:text-white">
              {totalClients}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Contratos em gestão</p>
          </div>
        </div>

        {/* Card 2: In Production */}
        <div
          onClick={() => onSelectTab('tarefas')}
          className="clean-card clean-card-hover p-6 cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider">Em Produção</span>
            <Clock className="h-4 w-4 text-slate-700 dark:text-white" />
          </div>
          <div>
            <p className="text-3xl font-display font-semibold text-slate-900 dark:text-white">
              {inProgressTasks}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">Redação e design</p>
          </div>
        </div>

        {/* Card 3: In Approval */}
        <div
          onClick={() => onSelectTab('tarefas')}
          className="clean-card clean-card-hover p-6 cursor-pointer flex flex-col justify-between space-y-4"
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider">Em Aprovação</span>
            <ListChecks className="h-4 w-4 text-slate-700 dark:text-white" />
          </div>
          <div>
            <p className="text-3xl font-display font-semibold text-slate-900 dark:text-white">
              {inApprovalTasks}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">No portal do cliente</p>
          </div>
        </div>

        {/* Card 4: Adjustments / Approved */}
        <div
          onClick={() => onSelectTab('tarefas')}
          className={`clean-card clean-card-hover p-6 cursor-pointer flex flex-col justify-between space-y-4 ${
            changeRequestedTasks > 0
              ? 'border-rose-500/50 bg-rose-500/10 dark:bg-rose-500/15'
              : ''
          }`}
        >
          <div className="flex items-center justify-between text-slate-600 dark:text-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider">
              {changeRequestedTasks > 0 ? 'Ajustes Pendentes' : 'Aprovados'}
            </span>
            {changeRequestedTasks > 0 ? (
              <AlertCircle className="h-4 w-4 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>
          <div>
            <p
              className={`text-3xl font-display font-semibold ${
                changeRequestedTasks > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {changeRequestedTasks > 0 ? changeRequestedTasks : approvedTasks}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
              {changeRequestedTasks > 0 ? 'Requer revisão imediata' : 'Prontos para postagem'}
            </p>
          </div>
        </div>
      </div>

      {/* Symmetrical 2-Section Content: Fluxo Recente de Tarefas + Lembretes e anotações */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Production Flow */}
        <div className="clean-card p-6 md:p-8 space-y-5 lg:col-span-7">
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-4">
            <div className="flex items-center gap-2.5">
              <ListChecks className="h-4 w-4 text-slate-700 dark:text-slate-200" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Fluxo Recente de Tarefas
              </h2>
            </div>
            <button
              onClick={() => onSelectTab('tarefas')}
              className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="space-y-3">
            {realTasks.length > 0 ? (
              realTasks.slice(0, 5).map((task) => {
                const client = clients.find((c) => c.id === task.clientId);
                const isAlert = task.status === 'alterar';
                const badge = getStatusBadgeStyle(task.status);

                return (
                  <div
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className={`clean-glass-subtle p-4 flex items-center justify-between gap-3.5 cursor-pointer transition-all ${
                      isAlert ? 'border-rose-500/40 bg-rose-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-2xl shrink-0">{client?.emoji || '🏢'}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {task.title}
                        </p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                          {client?.company} • Canal: <span className="capitalize">{task.channel || 'Instagram'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                      <TaskStatusButton taskId={task.id} status={task.status} size="sm" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center border border-dashed border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2">
                <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma tarefa recente no momento.</p>
                <button
                  onClick={onNewTask}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Criar Tarefa</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lembretes e anotações (Renamed from Bloco de Foco) */}
        <div className="clean-card p-6 md:p-8 space-y-4 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/10 pb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Lembretes e anotações
            </h2>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Anotações rápidas</span>
          </div>

          <form onSubmit={handleAddNote} className="flex gap-2">
            <input
              type="text"
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="Anotar novo lembrete..."
              className="clean-input h-9 text-xs px-3 flex-1 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-3.5 text-xs shadow-sm transition-all cursor-pointer"
            >
              +
            </button>
          </form>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {realNotes.length > 0 ? (
              realNotes.map((note) => (
                <div
                  key={note.id}
                  className="clean-glass-subtle flex items-center justify-between gap-2 p-2.5 text-xs rounded-xl"
                >
                  <button
                    onClick={() => toggleNote(note.id)}
                    className="flex items-center gap-2.5 text-left min-w-0 flex-1 cursor-pointer"
                  >
                    <div
                      className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                        note.done
                          ? 'border-slate-800 bg-slate-800 text-white dark:border-white dark:bg-white dark:text-slate-900'
                          : 'border-slate-400 dark:border-slate-500 bg-transparent'
                      }`}
                    >
                      {note.done && <Check className="h-3 w-3" strokeWidth={3} />}
                    </div>
                    <span
                      className={`truncate text-xs ${
                        note.done
                          ? 'line-through text-slate-400 dark:text-slate-500'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {note.text}
                    </span>
                  </button>

                  <button
                    onClick={() => deleteNote(note.id)}
                    className="text-slate-400 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 p-1 cursor-pointer"
                    title="Excluir anotação"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center py-5">
                Nenhum lembrete registrado ainda.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

