import React, { useRef, useState } from 'react';
import { Paperclip, Check } from 'lucide-react';
import { Task, TaskView, CustomProperty } from '../../types';
import {
  EvalContext,
  TaskColor,
  allFields,
  customPropertyId,
  findField,
  getColor,
  hexToColorKey,
  isCustomField,
  readField,
  readLabel,
  resolveRowColor,
} from '../../lib/taskViews';
import { formatFriendlyDate, isDateBeforeToday } from '../../utils/dateFormatter';
import { EmptyState } from '../ui';

interface TaskTableProps {
  tasks: Task[];
  view: TaskView;
  ctx: EvalContext;
  onOpenTask: (taskId: string) => void;
  onResizeColumn: (columnId: string, width: number) => void;
  onSetCustomField: (taskId: string, propertyId: string, value: any) => void;
  emptyTitle: string;
  emptyHint: string;
}

/**
 * A tabela da Central de Tarefas.
 *
 * Não sabe nada sobre "atrasada é amarela": pergunta ao motor de regras qual a
 * cor de cada linha e desenha. Quem decide as cores é a visão, que quem decide
 * é o usuário.
 */
export const TaskTable: React.FC<TaskTableProps> = ({
  tasks,
  view,
  ctx,
  onOpenTask,
  onResizeColumn,
  onSetCustomField,
  emptyTitle,
  emptyHint,
}) => {
  const fields = allFields(ctx.properties);
  const columns = view.columnOrder
    .filter((id) => view.visibleColumns.includes(id))
    .map((id) => fields.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => !!f);

  const widthOf = (colId: string, fallback?: number) =>
    view.columnWidths[colId] || fallback || 150;

  const totalWidth = columns.reduce((sum, c) => sum + widthOf(c.id, c.defaultWidth), 0);

  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} hint={emptyHint} />;
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table
        className="w-full border-collapse"
        /* `fixed` faz a largura arrastada valer de verdade: sem isso o navegador
           reexpande a coluna para caber o texto e a quebra nunca acontece. */
        style={{ tableLayout: 'fixed', minWidth: totalWidth }}
      >
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            {columns.map((col) => (
              <HeaderCell
                key={col.id}
                label={col.label}
                width={widthOf(col.id, col.defaultWidth)}
                minWidth={col.minWidth || 80}
                onResize={(w) => onResizeColumn(col.id, w)}
              />
            ))}
          </tr>
        </thead>

        <tbody>
          {tasks.map((task) => {
            const color = resolveRowColor(task, view.colorRules, ctx);
            return (
              <tr
                key={task.id}
                onClick={() => onOpenTask(task.id)}
                className={`group border-b border-slate-100 dark:border-slate-800/70 cursor-pointer transition-colors ${
                  color ? color.row : ''
                } hover:bg-slate-100/80 dark:hover:bg-slate-800/50`}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className="px-3 py-2.5 align-top t-meta text-slate-700 dark:text-slate-300 break-words"
                    style={{ width: widthOf(col.id, col.defaultWidth) }}
                  >
                    <Cell
                      task={task}
                      fieldId={col.id}
                      ctx={ctx}
                      onSetCustomField={onSetCustomField}
                    />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

/* ========================================================================== */

const HeaderCell: React.FC<{
  label: string;
  width: number;
  minWidth: number;
  onResize: (w: number) => void;
}> = ({ label, width, minWidth, onResize }) => {
  const startX = useRef(0);
  const startW = useRef(0);
  const [dragging, setDragging] = useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    startX.current = e.clientX;
    startW.current = width;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const next = Math.max(minWidth, startW.current + (ev.clientX - startX.current));
      onResize(next);
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  return (
    <th
      className="relative px-3 py-2 text-left t-label text-slate-500 dark:text-slate-400 select-none"
      style={{ width }}
    >
      {label}
      <span
        onPointerDown={onPointerDown}
        role="separator"
        aria-orientation="vertical"
        aria-label={`Redimensionar coluna ${label}`}
        className={`absolute top-0 right-0 h-full w-1.5 cursor-col-resize ${
          dragging ? 'bg-slate-900 dark:bg-white' : 'hover:bg-slate-300 dark:hover:bg-slate-600'
        }`}
      />
    </th>
  );
};

/* ---------------------------------- Células -------------------------------- */

const Cell: React.FC<{
  task: Task;
  fieldId: string;
  ctx: EvalContext;
  onSetCustomField: (taskId: string, propertyId: string, value: any) => void;
}> = ({ task, fieldId, ctx, onSetCustomField }) => {
  if (isCustomField(fieldId)) {
    const prop = ctx.properties.find((p) => p.id === customPropertyId(fieldId));
    if (!prop) return null;
    return (
      <CustomCell
        task={task}
        prop={prop}
        onChange={(v) => onSetCustomField(task.id, prop.id, v)}
      />
    );
  }

  switch (fieldId) {
    case 'client': {
      const client = ctx.clients.find((c) => c.id === task.clientId);
      if (!client) return <Muted>Sem cliente</Muted>;
      return <span className="text-slate-800 dark:text-slate-200">{client.company}</span>;
    }

    case 'title':
      return (
        <span className="block font-medium text-slate-900 dark:text-white group-hover:underline underline-offset-4 decoration-slate-300">
          {task.selectedHeadline || task.headline || task.title}
        </span>
      );

    case 'attachments': {
      const n = (task.files || []).length;
      const first = task.files?.find((f) => f.dataUrl || f.url);
      if (!n) return <Muted>—</Muted>;
      return (
        <span className="flex items-center gap-1.5">
          {first ? (
            <img
              src={first.dataUrl || first.url}
              alt=""
              className="h-7 w-7 rounded object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <Paperclip className="h-3.5 w-3.5 text-slate-400" />
          )}
          {n > 1 && <span className="text-slate-400 tabular-nums">{n}</span>}
        </span>
      );
    }

    case 'status': {
      const status = ctx.statuses.find((s) => s.key === task.status);
      // A cor vem do cadastro de status do admin — antes era um switch fixo no
      // código e mudar a cor no admin não surtia efeito nenhum aqui.
      const color = getColor(hexToColorKey(status?.color));
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${color.chip} ${color.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${color.solid}`} aria-hidden="true" />
          <span>{status?.label || task.status}</span>
        </span>
      );
    }

    case 'assignee': {
      const ids = task.assigneeIds?.length
        ? task.assigneeIds
        : task.assigneeId
          ? [task.assigneeId]
          : [];
      const people = ids
        .map((id) => ctx.users.find((u) => u.id === id))
        .filter((u): u is NonNullable<typeof u> => !!u);
      if (people.length === 0) return <Muted>Sem responsável</Muted>;
      return (
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-white text-[11px] font-semibold"
            style={{ backgroundColor: people[0].color || '#64748b' }}
            aria-hidden="true"
          >
            {people[0].name.charAt(0).toUpperCase()}
          </span>
          <span className="text-slate-700 dark:text-slate-300">
            {people[0].name.split(' ')[0]}
            {people.length > 1 && ` +${people.length - 1}`}
          </span>
        </span>
      );
    }

    case 'postDate':
    case 'artDate': {
      const raw = fieldId === 'postDate' ? task.postDate || task.date : task.artDate;
      const day = raw?.split('T')[0];
      if (!day) return <Muted>Sem data</Muted>;
      const late =
        fieldId === 'postDate' &&
        isDateBeforeToday(day) &&
        !['aprovado', 'postado'].includes(task.status);
      return (
        <span className={late ? 'text-amber-700 dark:text-amber-400 font-medium' : ''}>
          {formatFriendlyDate(day)}
        </span>
      );
    }

    case 'clientRequest':
      return task.clientRequest ? (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
          <Check className="h-3 w-3" />
          Do cliente
        </span>
      ) : (
        <Muted>—</Muted>
      );

    case 'timeSpent': {
      const min = Math.round((task.timeSpent || 0) / 60);
      return min > 0 ? <span className="tabular-nums">{min} min</span> : <Muted>—</Muted>;
    }

    default: {
      const label = readLabel(task, fieldId, ctx);
      return label ? <span className="block">{label}</span> : <Muted>—</Muted>;
    }
  }
};

const Muted: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="text-slate-300 dark:text-slate-600">{children}</span>
);

/**
 * Célula de coluna criada pelo usuário — editável na própria tabela, para não
 * obrigar a abrir a tarefa só para marcar uma caixa.
 */
const CustomCell: React.FC<{
  task: Task;
  prop: CustomProperty;
  onChange: (value: any) => void;
}> = ({ task, prop, onChange }) => {
  const value = task.customFields?.[prop.id] ?? null;
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  if (prop.type === 'checkbox') {
    return (
      <button
        onClick={(e) => {
          stop(e);
          onChange(!value);
        }}
        aria-label={prop.name}
        className={`grid h-4 w-4 place-items-center rounded border transition-colors cursor-pointer ${
          value
            ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-950'
            : 'border-slate-300 dark:border-slate-600 hover:border-slate-500'
        }`}
      >
        {!!value && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
      </button>
    );
  }

  if (prop.type === 'select') {
    const opt = prop.options?.find((o) => o.id === value);
    return (
      <select
        value={String(value ?? '')}
        onClick={stop}
        onChange={(e) => {
          onChange(e.target.value || null);
        }}
        className={`max-w-full rounded-md px-1.5 py-0.5 t-meta border-0 cursor-pointer focus:outline-none focus:ring-1 focus:ring-slate-400 ${
          opt ? `${getColor(opt.color).chip} ${getColor(opt.color).text}` : 'text-slate-300 dark:text-slate-600 bg-transparent'
        }`}
        aria-label={prop.name}
      >
        <option value="">—</option>
        {prop.options?.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (prop.type === 'multiSelect') {
    const selected = Array.isArray(value) ? value : [];
    const labels = selected
      .map((id) => prop.options?.find((o) => o.id === id))
      .filter((o): o is NonNullable<typeof o> => !!o);
    return (
      <span className="flex items-center gap-1 flex-wrap">
        {labels.length === 0 && <Muted>—</Muted>}
        {labels.map((o) => {
          const c = getColor(o.color);
          return (
            <span key={o.id} className={`px-1.5 py-0.5 rounded ${c.chip} ${c.text}`}>
              {o.label}
            </span>
          );
        })}
      </span>
    );
  }

  if (prop.type === 'date') {
    return (
      <input
        type="date"
        value={String(value ?? '')}
        onClick={stop}
        onChange={(e) => onChange(e.target.value || null)}
        className="w-full bg-transparent t-meta text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
        aria-label={prop.name}
      />
    );
  }

  if (prop.type === 'url') {
    return value ? (
      <a
        href={String(value)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={stop}
        className="truncate block text-sky-700 dark:text-sky-400 hover:underline"
      >
        {String(value)}
      </a>
    ) : (
      <InlineText value="" prop={prop} onChange={onChange} />
    );
  }

  return <InlineText value={value === null ? '' : String(value)} prop={prop} onChange={onChange} />;
};

const InlineText: React.FC<{
  value: string;
  prop: CustomProperty;
  onChange: (v: any) => void;
}> = ({ value, prop, onChange }) => {
  const [draft, setDraft] = useState(value);
  React.useEffect(() => setDraft(value), [value]);

  return (
    <input
      type={prop.type === 'number' ? 'number' : 'text'}
      value={draft}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft === value) return;
        onChange(prop.type === 'number' ? (draft === '' ? null : Number(draft)) : draft || null);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') setDraft(value);
      }}
      placeholder="—"
      className="w-full bg-transparent t-meta text-slate-700 dark:text-slate-300 placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-400 rounded px-1 -mx-1"
      aria-label={prop.name}
    />
  );
};
