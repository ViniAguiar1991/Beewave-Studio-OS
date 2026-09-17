import React, { useMemo, useState } from 'react';
import {
  LayoutGrid,
  Rows3,
  CalendarDays,
  Plus,
  Search,
  X,
  Settings2,
  Copy,
  Trash2,
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
import { semanaDe } from '../lib/weekPlan';
import { ViewToolbar } from './tasks/ViewToolbar';
import { TaskTable } from './tasks/TaskTable';
import { TaskKanban } from './tasks/TaskKanban';
import { TaskCalendar } from './tasks/TaskCalendar';
import { Button } from './ui';

interface TasksListViewProps {
  onSelectTask: (taskId: string) => void;
  onNewTask: (prefill?: Partial<Task>) => void;
  onSelectClient: (clientId: string) => void;
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

type FiltroData =
  | 'all'
  | 'hoje'
  | 'amanha'
  | 'esta_semana'
  | 'este_mes'
  | 'atrasados'
  | 'sem_data'
  | 'personalizado';

const OPCOES_DATA: { value: FiltroData; label: string }[] = [
  { value: 'all', label: 'Qualquer data' },
  { value: 'hoje', label: 'Hoje' },
  { value: 'amanha', label: 'Amanhã' },
  { value: 'esta_semana', label: 'Esta semana' },
  { value: 'este_mes', label: 'Este mês' },
  { value: 'atrasados', label: 'Atrasados' },
  { value: 'sem_data', label: 'Sem data' },
  { value: 'personalizado', label: 'Personalizado' },
];

const chaveDia = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Filtro de período sobre a data de publicação.
 *
 * Voltou como era antes da reescrita da Central de Tarefas, com as mesmas
 * opções. Uma decisão mantida de propósito: "Esta semana" e "Este mês" vão de
 * hoje até o fim do período. O que ficou para trás e não saiu está em
 * "Atrasados" — misturar os dois esconderia o atraso no meio do planejado.
 *
 * A semana é de segunda a domingo, a mesma do painel inicial. O filtro
 * antigo começava no domingo, então o domingo nunca entrava em "esta semana"
 * enquanto o Início contava ele.
 */
const passaNoPeriodo = (
  t: Task,
  filtro: FiltroData,
  de: string,
  ate: string
): boolean => {
  if (filtro === 'all') return true;
  const dia = (t.postDate || t.date || '').split('T')[0];

  if (filtro === 'sem_data') return !dia;
  if (!dia) return false;

  const hoje = new Date();
  const hojeK = chaveDia(hoje);

  switch (filtro) {
    case 'hoje':
      return dia === hojeK;
    case 'amanha': {
      const amanha = new Date(hoje);
      amanha.setDate(hoje.getDate() + 1);
      return dia === chaveDia(amanha);
    }
    case 'esta_semana':
      return dia >= hojeK && dia <= semanaDe(hoje).fimChave;
    case 'este_mes': {
      const fim = chaveDia(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0));
      return dia >= hojeK && dia <= fim;
    }
    case 'atrasados':
      return dia < hojeK && t.status !== 'aprovado' && t.status !== 'postado';
    case 'personalizado':
      if (de && dia < de) return false;
      if (ate && dia > ate) return false;
      return true;
    default:
      return true;
  }
};

export const TasksListView: React.FC<TasksListViewProps> = ({
  onSelectTask,
  onNewTask,
  onSelectClient,
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
  const currentUser = useCurrentUser();

  const setActiveView = useAppStore((s) => s.setActiveView);
  const addTaskView = useAppStore((s) => s.addTaskView);
  const resetTaskViews = useAppStore((s) => s.resetTaskViews);
  const updateTaskView = useAppStore((s) => s.updateTaskView);
  const deleteTaskView = useAppStore((s) => s.deleteTaskView);
  const duplicateTaskView = useAppStore((s) => s.duplicateTaskView);
  const addCustomProperty = useAppStore((s) => s.addCustomProperty);
  const deleteCustomProperty = useAppStore((s) => s.deleteCustomProperty);
  const setTaskCustomField = useAppStore((s) => s.setTaskCustomField);
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const updateTask = useAppStore((s) => s.updateTask);
  const duplicateTask = useAppStore((s) => s.duplicateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  /** Tarefas marcadas para uma ação em lote. Vazio = nenhuma seleção em curso. */
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);

  const viewsDirty = useAppStore((s) => s.viewsDirty);
  const publishTaskViews = useAppStore((s) => s.publishTaskViews);

  const handlePublish = async () => {
    setPublishing(true);
    setPublishError(null);
    try {
      await publishTaskViews();
    } catch {
      // A cota de escrita do Firestore pode estar esgotada; sem aviso, o
      // usuário acharia que salvou.
      setPublishError('Não foi possível salvar para a equipe. Tente de novo em instantes.');
    } finally {
      setPublishing(false);
    }
  };

  /* ---------------------------------------------------------------------
   * Atalhos de filtro. Vários podem estar ligados ao mesmo tempo:
   * "Minhas tarefas" + "Não iniciado" + "Em andamento" é uma combinação
   * normal do dia a dia, e exigir montar isso no construtor de condições
   * seria burocracia para algo de um clique.
   * ------------------------------------------------------------------- */
  /**
   * Os atalhos ficam salvos por usuário e sobrevivem ao logout: quem trabalha
   * filtrando "minhas, não iniciadas" não quer remontar isso toda manhã.
   */
  const chaveFiltros = `beewave_quick_filters_${currentUser?.id || 'anon'}`;

  const [quickStatuses, setQuickStatuses] = useState<string[]>(() => {
    try {
      const salvo = localStorage.getItem(chaveFiltros);
      return salvo ? JSON.parse(salvo) : [];
    } catch {
      return [];
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(chaveFiltros, JSON.stringify(quickStatuses));
    } catch {
      /* sem persistência; não é crítico */
    }
  }, [chaveFiltros, quickStatuses]);

  const toggleStatus = (key: string) =>
    setQuickStatuses((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  // Cliente escolhido também sobrevive ao logout, pelo mesmo motivo dos
  // atalhos: quem atende a Perfetto de manhã não quer escolher de novo.
  const chaveCliente = `beewave_client_filter_${currentUser?.id || 'anon'}`;
  const [clienteFiltro, setClienteFiltro] = useState<string>(() => {
    try {
      return localStorage.getItem(chaveCliente) || 'all';
    } catch {
      return 'all';
    }
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(chaveCliente, clienteFiltro);
    } catch {
      /* sem persistência; não é crítico */
    }
  }, [chaveCliente, clienteFiltro]);

  // Cliente excluído não pode deixar a lista presa num filtro que zera tudo.
  React.useEffect(() => {
    if (clienteFiltro !== 'all' && !clients.some((c) => c.id === clienteFiltro)) {
      setClienteFiltro('all');
    }
  }, [clients, clienteFiltro]);

  // Período também atravessa sessões, junto dos outros filtros.
  const chaveData = `beewave_date_filter_${currentUser?.id || 'anon'}`;
  const [periodo, setPeriodo] = useState<{ filtro: FiltroData; de: string; ate: string }>(() => {
    try {
      const salvo = localStorage.getItem(chaveData);
      if (salvo) return { filtro: 'all', de: '', ate: '', ...JSON.parse(salvo) };
    } catch {}
    return { filtro: 'all', de: '', ate: '' };
  });

  React.useEffect(() => {
    try {
      localStorage.setItem(chaveData, JSON.stringify(periodo));
    } catch {
      /* sem persistência; não é crítico */
    }
  }, [chaveData, periodo]);

  const clientesOrdenados = useMemo(
    () =>
      [...clients].sort((a, b) =>
        (a.company || a.name || '').localeCompare(b.company || b.name || '', 'pt-BR')
      ),
    [clients]
  );

  const clearQuick = () => setQuickStatuses([]);
  const quickActive = quickStatuses.length > 0;

  const view: TaskView = useMemo(
    () => taskViews.find((v) => v.id === activeViewId) || taskViews[0],
    [taskViews, activeViewId]
  );

  // Trocar de visão troca o conjunto de tarefas na tela: a seleção anterior
  // deixaria marcadas linhas que nem estão mais listadas.
  React.useEffect(() => setSelecionadas([]), [view.id, view.mode]);

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
      if (clienteFiltro !== 'all' && t.clientId !== clienteFiltro) return false;
      if (!passaNoPeriodo(t, periodo.filtro, periodo.de, periodo.ate)) return false;

      if (!term) return true;
      const client = clients.find((c) => c.id === t.clientId);
      return (
        (t.selectedHeadline || t.headline || t.title || '').toLowerCase().includes(term) ||
        (client?.company || '').toLowerCase().includes(term) ||
        (t.briefingText || '').toLowerCase().includes(term)
      );
    });

    return sortTasks(filtered, view.sort, ctx);
  }, [tasks, view, ctx, search, clients, quickStatuses, clienteFiltro, periodo]);

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
        dirty={viewsDirty}
        publishing={publishing}
        onPublish={handlePublish}
        onUpdateView={(data) => updateTaskView(view.id, data)}
        onSelectView={setActiveView}
        onCreateView={() => addTaskView(newView(`Visão ${taskViews.length + 1}`))}
        onDuplicateView={() => duplicateTaskView(view.id)}
        onDeleteView={() => {
          if (window.confirm(`Excluir a visão "${view.name}"?`)) deleteTaskView(view.id);
        }}
        onResetViews={resetTaskViews}
        onAddProperty={addCustomProperty}
        onDeleteProperty={deleteCustomProperty}
      />

      {publishError && (
        <p role="alert" className="t-ui text-rose-700 dark:text-rose-400">
          {publishError}
        </p>
      )}

      {/* Atalhos de filtro: um clique, acumulam entre si */}
      <div className="flex items-center gap-2 flex-wrap">
        {statuses.map((st) => (
          <Chip
            key={st.key}
            label={st.label}
            active={quickStatuses.includes(st.key)}
            onClick={() => toggleStatus(st.key)}
          />
        ))}

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

        {/* Cliente ao lado da busca: é o recorte mais comum do dia, "o que
            tem da Daxx?", e antes exigia montar uma condição na engrenagem. */}
        <select
          value={clienteFiltro}
          onChange={(e) => setClienteFiltro(e.target.value)}
          aria-label="Filtrar por cliente"
          className={`h-9 rounded-lg border bg-transparent pl-3 pr-8 t-ui cursor-pointer focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors ${
            clienteFiltro !== 'all'
              ? 'border-slate-900 dark:border-white text-slate-950 dark:text-white font-medium'
              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <option value="all">Todos os clientes</option>
          {clientesOrdenados.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company || c.name}
            </option>
          ))}
        </select>

        <select
          value={periodo.filtro}
          onChange={(e) => setPeriodo((p) => ({ ...p, filtro: e.target.value as FiltroData }))}
          aria-label="Filtrar por data de publicação"
          className={`h-9 rounded-lg border bg-transparent pl-3 pr-8 t-ui cursor-pointer focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors ${
            periodo.filtro !== 'all'
              ? 'border-slate-900 dark:border-white text-slate-950 dark:text-white font-medium'
              : 'border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {OPCOES_DATA.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {periodo.filtro === 'personalizado' && (
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 t-meta text-slate-500 dark:text-slate-400">
              de
              <input
                type="date"
                value={periodo.de}
                onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))}
                className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 t-ui text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </label>
            <label className="flex items-center gap-1.5 t-meta text-slate-500 dark:text-slate-400">
              até
              <input
                type="date"
                value={periodo.ate}
                min={periodo.de || undefined}
                onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))}
                className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2 t-ui text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </label>
          </div>
        )}

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

      {/* Barra de seleção: só existe enquanto houver tarefa marcada. */}
      {selecionadas.length > 0 && view.mode === 'list' && (
        <div className="flex items-center gap-3 flex-wrap rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-3.5 py-2.5">
          <span className="t-ui font-medium text-slate-900 dark:text-white tabular-nums">
            {selecionadas.length}{' '}
            {selecionadas.length === 1 ? 'tarefa selecionada' : 'tarefas selecionadas'}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Copy}
              onClick={() => {
                selecionadas.forEach((id) => duplicateTask(id));
                setSelecionadas([]);
              }}
            >
              Duplicar
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Trash2}
              onClick={() => {
                const quantas = selecionadas.length;
                if (
                  !window.confirm(
                    quantas === 1
                      ? 'Mover 1 tarefa para a lixeira?'
                      : `Mover ${quantas} tarefas para a lixeira?`
                  )
                )
                  return;
                selecionadas.forEach((id) => deleteTask(id));
                setSelecionadas([]);
              }}
            >
              Excluir
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelecionadas([])}>
              Limpar
            </Button>
          </div>
        </div>
      )}

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
          onDuplicateTask={duplicateTask}
          onDeleteTask={(id) => {
            const t = tasks.find((x) => x.id === id);
            if (window.confirm(`Mover "${t?.title || 'esta tarefa'}" para a lixeira?`)) {
              deleteTask(id);
            }
          }}
          onReorderColumns={(columnOrder) => updateTaskView(view.id, { columnOrder })}
          selecionadas={selecionadas}
          onAlternarSelecao={(id) =>
            setSelecionadas((atuais) =>
              atuais.includes(id) ? atuais.filter((x) => x !== id) : [...atuais, id]
            )
          }
          onSelecionarTodas={(marcar) =>
            setSelecionadas(marcar ? visibleTasks.map((t) => t.id) : [])
          }
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
  onClick: () => void;
}> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-full t-ui transition-colors duration-150 cursor-pointer border ${
      active
        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 border-slate-950 dark:border-white font-medium'
        : 'bg-transparent text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
    }`}
  >
    {label}
  </button>
);
