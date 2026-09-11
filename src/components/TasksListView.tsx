import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  Rows3,
  CalendarDays,
  Trash2,
  X,
  Settings2,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { Task, TaskStatusKey, TaskView } from '../types';
import {
  EvalContext,
  allFields,
  getColor,
  hexToColorKey,
  matchesFilter,
  newView,
  sortTasks,
} from '../lib/taskViews';
import { ViewToolbar } from './tasks/ViewToolbar';
import { TaskTable } from './tasks/TaskTable';
import { TaskKanban } from './tasks/TaskKanban';
import { TaskCalendar } from './tasks/TaskCalendar';
import { Button } from './ui';

interface TasksListViewProps {
  onSelectTask: (taskId: string) => void;
  onNewTask: (prefill?: Partial<Task>) => void;
  onSelectClient: (clientId: string) => void;
  onOpenTrash: () => void;
}

/**
 * Central de Tarefas.
 *
 * Duas camadas de filtro, de propósito:
 *
 *   1. Os atalhos (Todas, Minhas tarefas, status) — clique único, acumulam
 *      entre si, morrem ao sair da tela. É o filtro do minuto a minuto.
 *   2. O filtro da visão, atrás da engrenagem — salvo, com condições
 *      compostas. É a configuração que se monta uma vez.
 *
 * A configuração fica escondida porque é ajuste, não trabalho: quem abre a
 * tela quer ver tarefa, não seletor de coluna.
 */
export const TasksListView: React.FC<TasksListViewProps> = ({
  onSelectTask,
  onNewTask,
  onSelectClient,
  onOpenTrash,
}) => {
  const tasks = useAppStore((s) => s.tasks);
  const clients = useAppStore((s) => s.clients);
  const users = useAppStore((s) => s.users);
  const categories = useAppStore((s) => s.categories);
  const statuses = useAppStore((s) => s.statuses);
  const campaigns = useAppStore((s) => s.campaigns);
  const customProperties = useAppStore((s) => s.customProperties);
  const taskViews = useAppStore((s) => s.taskViews);
  const activeViewId = useAppStore((s) => s.activeViewId);
  const trash = useAppStore((s) => s.trash || []);
  const currentUser = useCurrentUser();

  const setActiveView = useAppStore((s) => s.setActiveView);
  const addTaskView = useAppStore((s) => s.addTaskView);
  const updateTaskView = useAppStore((s) => s.updateTaskView);
  const deleteTaskView = useAppStore((s) => s.deleteTaskView);
  const duplicateTaskView = useAppStore((s) => s.duplicateTaskView);
  const addCustomProperty = useAppStore((s) => s.addCustomProperty);
  const deleteCustomProperty = useAppStore((s) => s.deleteCustomProperty);
  const setTaskCustomField = useAppStore((s) => s.setTaskCustomField);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const updateTask = useAppStore((s) => s.updateTask);

  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);

  /* ---------------------------------------------------------------------
   * Atalhos de filtro. Vários podem estar ligados ao mesmo tempo:
   * "Minhas tarefas" + "Não iniciado" + "Em andamento" é uma combinação
   * normal do dia a dia, e exigir montar isso no construtor de condições
   * seria burocracia para algo de um clique.
   * ------------------------------------------------------------------- */
  const [quickStatuses, setQuickStatuses] = useState<string[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);

  const toggleStatus = (key: string) =>
    setQuickStatuses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const clearQuick = () => {
    setQuickStatuses([]);
    setOnlyMine(false);
  };

  const quickActive = quickStatuses.length > 0 || onlyMine;

  const view: TaskView = useMemo(
    () => taskViews.find((v) => v.id === activeViewId) || taskViews[0],
    [taskViews, activeViewId]
  );

  const ctx: EvalContext = useMemo(
    () => ({
      clients,
      users,
      categories,
      statuses,
      campaigns,
      properties: customProperties,
      currentUserId: currentUser?.id || null,
    }),
    [clients, users, categories, statuses, campaigns, customProperties, currentUser?.id]
  );

  const visibleTasks = useMemo(() => {
    if (!view) return [];
    const term = search.trim().toLowerCase();

    const filtered = tasks.filter((t) => {
      if (!matchesFilter(t, view.filter, ctx)) return false;

      // Status marcados somam entre si (OU); "minhas" restringe (E).
      if (quickStatuses.length > 0 && !quickStatuses.includes(t.status)) return false;

      if (onlyMine && currentUser) {
        const mine =
          t.assigneeId === currentUser.id || t.assigneeIds?.includes(currentUser.id);
        if (!mine) return false;
      }

      if (!term) return true;
      const client = clients.find((c) => c.id === t.clientId);
      return (
        (t.selectedHeadline || t.headline || t.title || '').toLowerCase().includes(term) ||
        (client?.company || '').toLowerCase().includes(term) ||
        (t.briefingText || '').toLowerCase().includes(term)
      );
    });

    return sortTasks(filtered, view.sort, ctx);
  }, [tasks, view, ctx, search, clients, quickStatuses, onlyMine, currentUser]);

  if (!view) return null;

  const groupableFields = allFields(customProperties).filter((f) => f.groupable);

  const modes: { key: TaskView['mode']; label: string; icon: typeof Rows3 }[] = [
    { key: 'list', label: 'Lista', icon: Rows3 },
    { key: 'kanban', label: 'Quadro', icon: LayoutGrid },
    { key: 'calendar', label: 'Calendário', icon: CalendarDays },
  ];

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 pb-16">
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
            Tarefas
          </h1>
          <p className="t-body text-slate-600 dark:text-slate-400 mt-1">
            {visibleTasks.length} de {tasks.length}{' '}
            {tasks.length === 1 ? 'pauta' : 'pautas'} nesta visão.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {trash.length > 0 && (
            <button
              onClick={onOpenTrash}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg t-ui text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Lixeira
              <span className="tabular-nums text-slate-400">{trash.length}</span>
            </button>
          )}
          <Button variant="primary" icon={Plus} onClick={() => onNewTask()}>
            Nova tarefa
          </Button>
        </div>
      </header>

      {/* Visões salvas e, atrás da engrenagem, a configuração */}
      <ViewToolbar
        view={view}
        views={taskViews}
        ctx={ctx}
        resultCount={visibleTasks.length}
        open={settingsOpen}
        onUpdateView={(data) => updateTaskView(view.id, data)}
        onSelectView={setActiveView}
        onCreateView={() => addTaskView(newView(`Visão ${taskViews.length + 1}`))}
        onDuplicateView={() => duplicateTaskView(view.id)}
        onDeleteView={() => {
          if (window.confirm(`Excluir a visão "${view.name}"?`)) deleteTaskView(view.id);
        }}
        onAddProperty={addCustomProperty}
        onDeleteProperty={deleteCustomProperty}
      />

      {/* Atalhos de filtro: um clique, acumulam entre si */}
      <div className="flex items-center gap-2 flex-wrap">
        <Chip label="Todas" active={!quickActive} onClick={clearQuick} />

        <Chip
          label="Minhas tarefas"
          active={onlyMine}
          onClick={() => setOnlyMine((v) => !v)}
        />

        <span className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" aria-hidden="true" />

        {statuses.map((st) => {
          const color = getColor(hexToColorKey(st.color));
          const active = quickStatuses.includes(st.key);
          return (
            <Chip
              key={st.key}
              label={st.label}
              active={active}
              dot={color.solid}
              onClick={() => toggleStatus(st.key)}
            />
          );
        })}

        {quickActive && (
          <button
            onClick={clearQuick}
            className="inline-flex items-center gap-1 t-meta text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer ml-1"
          >
            <X className="h-3 w-3" />
            limpar
          </button>
        )}
      </div>

      {/* Busca, modo de visualização e engrenagem */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por tarefa, cliente ou briefing…"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 overflow-hidden">
          {modes.map(({ key, label, icon: Icon }) => {
            const isActive = view.mode === key;
            return (
              <button
                key={key}
                onClick={() => updateTaskView(view.id, { mode: key })}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-1.5 h-9 px-3 t-ui transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>

        {view.mode === 'kanban' && (
          <label className="flex items-center gap-2 t-meta text-slate-500">
            Agrupar por
            <select
              value={view.groupBy || 'status'}
              onChange={(e) => updateTaskView(view.id, { groupBy: e.target.value })}
              className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 t-ui text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-slate-900 dark:focus:border-white"
            >
              {groupableFields.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          onClick={() => setSettingsOpen((v) => !v)}
          aria-expanded={settingsOpen}
          aria-label="Configurar visão"
          title="Filtros, cores, colunas e ordenação"
          className={`ml-auto inline-flex items-center gap-1.5 h-9 px-3 rounded-lg t-ui transition-colors cursor-pointer ${
            settingsOpen
              ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700'
          }`}
        >
          <Settings2 className="h-4 w-4" />
          <span className="hidden sm:inline">Configurar</span>
        </button>
      </div>

      {/* Conteúdo */}
      {view.mode === 'list' && (
        <TaskTable
          tasks={visibleTasks}
          view={view}
          ctx={ctx}
          onOpenTask={onSelectTask}
          onResizeColumn={(columnId, width) =>
            updateTaskView(view.id, {
              columnWidths: { ...view.columnWidths, [columnId]: width },
            })
          }
          onSetCustomField={setTaskCustomField}
          emptyTitle={
            search || quickActive
              ? 'Nenhuma tarefa com esses filtros'
              : 'Nenhuma tarefa nesta visão'
          }
          emptyHint={
            search || quickActive
              ? 'Desmarque um atalho ou limpe a busca para ampliar o resultado.'
              : 'Os filtros desta visão não encontraram nenhuma pauta. Ajuste em Configurar ou crie uma tarefa.'
          }
        />
      )}

      {view.mode === 'kanban' && (
        <TaskKanban
          tasks={visibleTasks}
          view={view}
          ctx={ctx}
          onOpenTask={onSelectTask}
          onChangeStatus={(taskId, status) => setTaskStatus(taskId, status as TaskStatusKey)}
          onNewTask={() => onNewTask()}
        />
      )}

      {view.mode === 'calendar' && (
        <TaskCalendar
          tasks={visibleTasks}
          view={view}
          ctx={ctx}
          onOpenTask={onSelectTask}
          onReschedule={(taskId, date) => updateTask(taskId, { postDate: date, date })}
          onNewTaskOnDate={(date) => onNewTask({ postDate: date })}
        />
      )}
    </div>
  );
};

/* ========================================================================== */

const Chip: React.FC<{
  label: string;
  active: boolean;
  dot?: string;
  onClick: () => void;
}> = ({ label, active, dot, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full t-ui transition-colors duration-150 cursor-pointer border ${
      active
        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white font-medium'
        : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
    }`}
  >
    {dot && (
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${active ? 'bg-current opacity-60' : dot}`}
        aria-hidden="true"
      />
    )}
    {label}
  </button>
);
