import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Task, TaskView } from '../../types';
import { EvalContext, resolveRowColor } from '../../lib/taskViews';

interface TaskCalendarProps {
  tasks: Task[];
  view: TaskView;
  ctx: EvalContext;
  onOpenTask: (taskId: string) => void;
  /** Arrastar um cartão para outro dia reagenda a publicação. */
  onReschedule: (taskId: string, date: string) => void;
  onNewTaskOnDate: (date: string) => void;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const keyOf = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const dayOf = (t: Task) => (t.postDate || t.date || '').split('T')[0] || null;

/**
 * Calendário como terceiro modo da visão — mesmos filtros, mesmas cores.
 *
 * Antes era uma tela separada na navegação com regras próprias. Como modo da
 * visão, ele herda o filtro que já está aplicado: filtrar "só Perfetto, sem
 * postados" e trocar para calendário mostra exatamente aquelas pautas.
 */
export const TaskCalendar: React.FC<TaskCalendarProps> = ({
  tasks,
  view,
  ctx,
  onOpenTask,
  onReschedule,
  onNewTaskOnDate,
}) => {
  const [cursor, setCursor] = useState(() => new Date());
  const [dragId, setDragId] = useState<string | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const today = new Date();
  const todayKey = keyOf(today.getFullYear(), today.getMonth(), today.getDate());

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const d = dayOf(t);
      if (!d) continue;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    }
    return map;
  }, [tasks]);

  const undated = useMemo(() => tasks.filter((t) => !dayOf(t)), [tasks]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const out: (string | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= dayCount; d++) out.push(keyOf(year, month, d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month]);

  const monthCount = useMemo(
    () =>
      tasks.filter((t) => {
        const d = dayOf(t);
        return !!d && d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
      }).length,
    [tasks, year, month]
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCursor(new Date(year, month - 1, 1))}
            aria-label="Mês anterior"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setCursor(new Date(year, month + 1, 1))}
            aria-label="Próximo mês"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <h2 className="font-display text-[19px] font-semibold tracking-tight text-slate-950 dark:text-white">
          {MONTHS[month]} {year}
        </h2>

        <span className="t-meta text-slate-400 dark:text-slate-500">
          {monthCount} {monthCount === 1 ? 'pauta' : 'pautas'}
        </span>

        <button
          onClick={() => setCursor(new Date())}
          className="ml-auto t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white underline underline-offset-4 cursor-pointer"
        >
          Hoje
        </button>
      </div>

      <div>
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 pb-2">
          {WEEKDAYS.map((w) => (
            <span key={w} className="t-label text-slate-400 dark:text-slate-500 text-center">
              {w}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((key, i) => {
            if (!key) {
              return (
                <div
                  key={`pad-${i}`}
                  className="min-h-[124px] border-b border-r border-slate-100 dark:border-slate-800/60 first:border-l bg-slate-50/40 dark:bg-slate-900/20"
                />
              );
            }

            const list = byDay.get(key) || [];
            const isToday = key === todayKey;
            const isOver = overDay === key;
            const dayNumber = Number(key.split('-')[2]);

            return (
              <div
                key={key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverDay(key);
                }}
                onDragLeave={() => setOverDay((d) => (d === key ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverDay(null);
                  if (dragId) onReschedule(dragId, key);
                  setDragId(null);
                }}
                className={`group/day min-h-[124px] border-b border-r border-slate-100 dark:border-slate-800/60 p-1.5 space-y-1 transition-colors ${
                  isOver ? 'bg-slate-100 dark:bg-slate-800/60' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-grid h-6 min-w-6 px-1 place-items-center rounded-full t-meta tabular-nums ${
                      isToday
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {dayNumber}
                  </span>
                  <button
                    onClick={() => onNewTaskOnDate(key)}
                    aria-label={`Nova tarefa em ${dayNumber}`}
                    className="grid h-5 w-5 place-items-center rounded text-slate-300 dark:text-slate-700 opacity-0 group-hover/day:opacity-100 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {list.map((task) => {
                  const color = resolveRowColor(task, view.colorRules, ctx);
                  const client = ctx.clients.find((c) => c.id === task.clientId);
                  return (
                    <button
                      key={task.id}
                      draggable
                      onDragStart={() => setDragId(task.id)}
                      onDragEnd={() => {
                        setDragId(null);
                        setOverDay(null);
                      }}
                      onClick={() => onOpenTask(task.id)}
                      title={task.selectedHeadline || task.title}
                      className={`w-full text-left rounded px-1.5 py-1 t-meta transition-opacity cursor-pointer hover:opacity-80 ${
                        color ? `${color.row} ${color.text}` : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      } ${dragId === task.id ? 'opacity-40' : ''}`}
                    >
                      <span className="block truncate font-medium">
                        {task.selectedHeadline || task.headline || task.title}
                      </span>
                      {client && (
                        <span className="block truncate opacity-70">{client.company}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <section>
          <p className="t-label text-slate-500 pb-2 border-b border-slate-200 dark:border-slate-800">
            Sem data · {undated.length}
          </p>
          <div className="flex flex-wrap gap-2 pt-3">
            {undated.map((task) => {
              const color = resolveRowColor(task, view.colorRules, ctx);
              return (
                <button
                  key={task.id}
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => setDragId(null)}
                  onClick={() => onOpenTask(task.id)}
                  className={`rounded-md px-2.5 py-1.5 t-meta max-w-[280px] truncate cursor-pointer transition-opacity hover:opacity-80 ${
                    color ? `${color.row} ${color.text}` : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {task.selectedHeadline || task.headline || task.title}
                </button>
              );
            })}
          </div>
          <p className="t-meta text-slate-400 dark:text-slate-500 mt-2.5">
            Arraste para um dia do calendário para agendar.
          </p>
        </section>
      )}
    </div>
  );
};
