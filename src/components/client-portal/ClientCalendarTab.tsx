import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { Task } from '../../types';
import { formatLongDate } from '../../utils/dateFormatter';
import { getPortalState, getPostDay, byPostDate } from './portalStatus';
import { Button, EmptyState, SectionLabel, StatusPill } from '../ui';

interface ClientCalendarTabProps {
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onSuggest: () => void;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const toDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Calendário — quando sai o quê.
 *
 * Esta aba deliberadamente NÃO aprova nada. Antes, o antigo "Planejamento"
 * repetia a fila de aprovação com outro visual e outro botão, e a mesma pauta
 * aparecia três vezes na mesma tela. Aqui o calendário responde uma pergunta
 * só — a data — e manda quem precisa decidir para Aprovações.
 */
export const ClientCalendarTab: React.FC<ClientCalendarTabProps> = ({
  tasks,
  onOpenTask,
  onSuggest,
}) => {
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<'mes' | 'lista'>('mes');

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayKey = toDayKey(new Date());

  const byDay = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const day = getPostDay(t);
      if (!day) continue;
      const list = map.get(day) || [];
      list.push(t);
      map.set(day, list);
    }
    return map;
  }, [tasks]);

  const undated = useMemo(() => tasks.filter((t) => !getPostDay(t)), [tasks]);

  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay();
    const dayCount = new Date(year, month + 1, 0).getDate();
    const out: (string | null)[] = Array(firstWeekday).fill(null);
    for (let d = 1; d <= dayCount; d++) {
      out.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    return out;
  }, [year, month]);

  const monthTasks = useMemo(
    () =>
      tasks
        .filter((t) => {
          const day = getPostDay(t);
          return !!day && day.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
        })
        .sort(byPostDate),
    [tasks, year, month]
  );

  return (
    <div className="portal-enter space-y-8">
      {/* Controles do período + a única ação que o cliente inicia aqui. */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCursor(new Date(year, month - 1, 1))}
              aria-label="Mês anterior"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setCursor(new Date(year, month + 1, 1))}
              aria-label="Próximo mês"
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <h2 className="font-display text-[19px] font-semibold tracking-tight text-slate-950 dark:text-white">
            {MONTHS[month]} {year}
          </h2>

          <span className="t-meta text-slate-500 dark:text-slate-400">
            {monthTasks.length === 0
              ? 'nenhuma publicação'
              : `${monthTasks.length} ${monthTasks.length === 1 ? 'publicação' : 'publicações'}`}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 t-meta">
            {(['mes', 'lista'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className={`transition-colors cursor-pointer ${
                  view === v
                    ? 'text-slate-950 dark:text-white font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {v === 'mes' ? 'Mês' : 'Lista'}
              </button>
            ))}
          </div>

          <Button variant="primary" size="sm" icon={Lightbulb} onClick={onSuggest}>
            Sugerir pauta
          </Button>
        </div>
      </div>

      {view === 'mes' ? (
        <div>
          <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 pb-2">
            {WEEKDAYS.map((w) => (
              <span
                key={w}
                className="t-label text-slate-400 dark:text-slate-500 text-center"
              >
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map((key, i) => {
              if (!key) {
                return <div key={`pad-${i}`} className="min-h-[104px] border-b border-r border-slate-100 dark:border-slate-800/60 first:border-l" />;
              }
              const dayTasks = (byDay.get(key) || []).sort(byPostDate);
              const isToday = key === todayKey;
              const dayNumber = Number(key.split('-')[2]);

              return (
                <div
                  key={key}
                  className="min-h-[104px] border-b border-r border-slate-100 dark:border-slate-800/60 p-1.5 space-y-1"
                >
                  <span
                    className={`inline-grid h-6 min-w-6 px-1 place-items-center rounded-full t-meta tabular-nums ${
                      isToday
                        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-semibold'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {dayNumber}
                  </span>

                  {dayTasks.map((t) => {
                    const state = getPortalState(t.status);
                    return (
                      <button
                        key={t.id}
                        onClick={() => onOpenTask(t)}
                        title={t.selectedHeadline || t.title}
                        className="w-full flex items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${state.dot}`} />
                        <span className="min-w-0 truncate t-meta text-slate-700 dark:text-slate-300">
                          {t.selectedHeadline || t.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {monthTasks.length === 0 && (
            <EmptyState
              title={`Nenhuma publicação programada para ${MONTHS[month].toLowerCase()}`}
              hint="Use as setas para ver outros meses, ou envie uma sugestão de pauta para a equipe."
            />
          )}
        </div>
      ) : (
        <div>
          {monthTasks.length === 0 ? (
            <EmptyState
              title={`Nenhuma publicação programada para ${MONTHS[month].toLowerCase()}`}
              hint="Use as setas para ver outros meses, ou envie uma sugestão de pauta para a equipe."
            />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {monthTasks.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => onOpenTask(t)}
                    className="w-full flex items-baseline gap-5 py-4 text-left group cursor-pointer"
                  >
                    <span className="shrink-0 w-[168px] t-meta text-slate-500 dark:text-slate-400">
                      {formatLongDate(getPostDay(t))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block t-lead font-medium text-slate-900 dark:text-white truncate group-hover:underline underline-offset-4 decoration-slate-300">
                        {t.selectedHeadline || t.headline || t.title}
                      </span>
                      <span className="block mt-1">
                        <StatusPill status={t.status} />
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Pautas ainda sem data — informação real, não decoração. */}
      {undated.length > 0 && (
        <section className="space-y-4 pt-2">
          <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
            <SectionLabel>Sem data definida</SectionLabel>
            <p className="t-meta text-slate-500 dark:text-slate-400 mt-1">
              {undated.length} {undated.length === 1 ? 'pauta ainda não entrou' : 'pautas ainda não entraram'} no
              calendário.
            </p>
          </div>
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {undated.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => onOpenTask(t)}
                  className="w-full flex items-center justify-between gap-4 py-3.5 text-left group cursor-pointer"
                >
                  <span className="min-w-0 t-meta text-slate-900 dark:text-white truncate group-hover:underline underline-offset-4 decoration-slate-300">
                    {t.selectedHeadline || t.headline || t.title}
                  </span>
                  <StatusPill status={t.status} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
