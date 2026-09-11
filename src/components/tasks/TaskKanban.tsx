import React, { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Task, TaskView, TaskStatusKey } from '../../types';
import {
  EvalContext,
  customPropertyId,
  getColor,
  hexToColorKey,
  isCustomField,
  readField,
  resolveRowColor,
} from '../../lib/taskViews';
import { formatFriendlyDate } from '../../utils/dateFormatter';
import { EmptyState } from '../ui';

interface TaskKanbanProps {
  tasks: Task[];
  view: TaskView;
  ctx: EvalContext;
  onOpenTask: (taskId: string) => void;
  /** Só é possível arrastar quando o quadro está agrupado por status. */
  onChangeStatus: (taskId: string, status: TaskStatusKey) => void;
  onNewTask: () => void;
}

interface Column {
  id: string;
  label: string;
  colorKey: string;
}

/**
 * Kanban da visão atual.
 *
 * As colunas saem do campo escolhido em "Agrupar por" — status, cliente,
 * responsável, formato ou qualquer coluna de seleção criada pelo usuário. As
 * cores dos cartões vêm das mesmas regras da tabela, então as duas
 * visualizações contam a mesma história.
 */
export const TaskKanban: React.FC<TaskKanbanProps> = ({
  tasks,
  view,
  ctx,
  onOpenTask,
  onChangeStatus,
  onNewTask,
}) => {
  const groupBy = view.groupBy || 'status';
  const [dragTaskId, setDragTaskId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<string | null>(null);

  const canDrag = groupBy === 'status';

  const columns: Column[] = useMemo(() => {
    if (isCustomField(groupBy)) {
      const prop = ctx.properties.find((p) => p.id === customPropertyId(groupBy));
      return [
        ...(prop?.options || []).map((o) => ({ id: o.id, label: o.label, colorKey: o.color })),
        { id: '', label: 'Sem valor', colorKey: 'slate' },
      ];
    }
    switch (groupBy) {
      case 'status':
        return ctx.statuses.map((s) => ({
          id: s.key,
          label: s.label,
          colorKey: hexToColorKey(s.color),
        }));
      case 'client':
        return ctx.clients.map((c) => ({ id: c.id, label: c.company, colorKey: 'slate' }));
      case 'assignee':
        return [
          ...ctx.users
            .filter((u) => u.role !== 'cliente')
            .map((u) => ({ id: u.id, label: u.name, colorKey: 'slate' })),
          { id: '', label: 'Sem responsável', colorKey: 'slate' },
        ];
      case 'category':
        return ctx.categories.map((c) => ({ id: c.id, label: c.name, colorKey: 'slate' }));
      case 'campaign':
        return [
          ...ctx.campaigns.map((c) => ({ id: c.id, label: c.title, colorKey: 'slate' })),
          { id: '', label: 'Sem campanha', colorKey: 'slate' },
        ];
      default:
        return [{ id: '', label: 'Todas', colorKey: 'slate' }];
    }
  }, [groupBy, ctx]);

  const byColumn = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const col of columns) map.set(col.id, []);
    for (const task of tasks) {
      const raw = readField(task, groupBy, ctx);
      const key = raw === null || raw === undefined ? '' : String(raw);
      if (map.has(key)) map.get(key)!.push(task);
      else if (map.has('')) map.get('')!.push(task);
    }
    return map;
  }, [tasks, columns, groupBy, ctx]);

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nenhuma tarefa nesta visão"
        hint="Ajuste os filtros da visão ou crie uma tarefa nova."
      />
    );
  }

  return (
    <div className="overflow-x-auto pb-3 -mx-1 px-1">
      <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
        {columns.map((col) => {
          const list = byColumn.get(col.id) || [];
          const color = getColor(col.colorKey);
          const isOver = overColumn === col.id;

          return (
            <section
              key={col.id || 'sem-valor'}
              onDragOver={(e) => {
                if (!canDrag) return;
                e.preventDefault();
                setOverColumn(col.id);
              }}
              onDragLeave={() => setOverColumn(null)}
              onDrop={(e) => {
                e.preventDefault();
                setOverColumn(null);
                if (!canDrag || !dragTaskId) return;
                onChangeStatus(dragTaskId, col.id as TaskStatusKey);
                setDragTaskId(null);
              }}
              className={`w-[290px] shrink-0 rounded-lg transition-colors ${
                isOver ? 'bg-slate-100 dark:bg-slate-800/60' : ''
              }`}
            >
              <header className="flex items-center gap-2 px-1 pb-2.5 border-b border-slate-200 dark:border-slate-800">
                <span className={`h-2 w-2 rounded-full shrink-0 ${color.solid}`} aria-hidden="true" />
                <h3 className="t-ui font-medium text-slate-800 dark:text-slate-200 truncate">
                  {col.label}
                </h3>
                <span className="t-meta text-slate-400 dark:text-slate-500 tabular-nums ml-auto">
                  {list.length}
                </span>
              </header>

              <div className="space-y-2 pt-2.5 min-h-[80px]">
                {list.map((task) => {
                  const ruleColor = resolveRowColor(task, view.colorRules, ctx);
                  const client = ctx.clients.find((c) => c.id === task.clientId);
                  const day = (task.postDate || task.date || '').split('T')[0];

                  return (
                    <article
                      key={task.id}
                      draggable={canDrag}
                      onDragStart={() => setDragTaskId(task.id)}
                      onDragEnd={() => {
                        setDragTaskId(null);
                        setOverColumn(null);
                      }}
                      onClick={() => onOpenTask(task.id)}
                      className={`relative rounded-lg border border-slate-200 dark:border-slate-800 p-3 pl-4 cursor-pointer transition-colors hover:border-slate-300 dark:hover:border-slate-700 ${
                        ruleColor ? ruleColor.row : 'bg-white dark:bg-slate-900/60'
                      } ${dragTaskId === task.id ? 'opacity-40' : ''}`}
                    >
                      {ruleColor && (
                        <span
                          className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${ruleColor.solid}`}
                          aria-hidden="true"
                        />
                      )}

                      {client && (
                        <p className="t-meta text-slate-500 dark:text-slate-400 truncate">
                          {client.company}
                        </p>
                      )}

                      <p className="t-ui font-medium text-slate-900 dark:text-white mt-0.5 line-clamp-2">
                        {task.selectedHeadline || task.headline || task.title}
                      </p>

                      {day && (
                        <p className="t-meta text-slate-400 dark:text-slate-500 mt-1.5">
                          {formatFriendlyDate(day)}
                        </p>
                      )}
                    </article>
                  );
                })}

                {list.length === 0 && (
                  <p className="t-meta text-slate-300 dark:text-slate-700 px-1 py-3">Vazio</p>
                )}
              </div>
            </section>
          );
        })}

        <button
          onClick={onNewTask}
          className="w-[290px] shrink-0 self-start mt-9 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 py-3 t-ui text-slate-500 hover:text-slate-900 hover:border-slate-400 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova tarefa
        </button>
      </div>
    </div>
  );
};
