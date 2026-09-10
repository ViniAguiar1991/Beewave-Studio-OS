import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore } from '../store';

import { formatFriendlyDate, formatStandardDate, isTaskDelayed } from '../utils/dateFormatter';

interface CalendarViewProps {
  onSelectTask: (taskId: string) => void;
  onNewTaskOnDate?: (dateStr: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onSelectTask,
  onNewTaskOnDate,
}) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedClientId, setSelectedClientId] = useState('all');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const tasks = useAppStore((s) => s.tasks);
  const clients = useAppStore((s) => s.clients);
  const updateTask = useAppStore((s) => s.updateTask);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  const filteredTasks = tasks.filter((t) =>
    selectedClientId === 'all' ? true : t.clientId === selectedClientId
  );

  const handleTaskDragStart = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.setData('task-id', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDayDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (draggedTaskId && dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDayDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const taskId = e.dataTransfer.getData('task-id') || e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      updateTask(taskId, { postDate: targetDateStr });
    }
    setDraggedTaskId(null);
  };

  return (
    <div id="calendar-view" className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Top Controls */}
      <div className="clean-card p-6 md:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h1>

            <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 p-1 bg-slate-50 dark:bg-slate-950/60">
              <button
                onClick={prevMonth}
                className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Hoje
              </button>
              <button
                onClick={nextMonth}
                className="p-1 text-slate-500 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="clean-input h-10 px-3.5 text-xs font-medium cursor-pointer"
            >
              <option value="all">Todos os Clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.emoji ? `${c.emoji} ` : ''}{c.company}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Monthly Grid */}
      <div className="clean-card overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-center text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 py-3.5">
          <span>Dom</span>
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-200 dark:divide-slate-800">
          {days.map((day) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTasks = filteredTasks.filter(
              (t) => t.postDate === dateStr
            );
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDay = isToday(day);
            const isDropTarget = dragOverDate === dateStr;

            return (
              <div
                key={dateStr}
                onDragOver={(e) => handleDayDragOver(e, dateStr)}
                onDrop={(e) => handleDayDrop(e, dateStr)}
                className={`min-h-[130px] p-2.5 transition-colors flex flex-col justify-between ${
                  isDropTarget
                    ? 'bg-slate-900/10 dark:bg-white/10 ring-2 ring-slate-900 dark:ring-white ring-inset'
                    : !isCurrentMonth
                    ? 'bg-slate-50/50 dark:bg-slate-950/30 opacity-40'
                    : 'bg-white dark:bg-slate-900/60'
                } ${isTodayDay ? 'ring-2 ring-slate-900 dark:ring-white ring-inset' : ''}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                      isTodayDay
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>

                  <button
                    onClick={() => onNewTaskOnDate?.(dateStr)}
                    className="opacity-40 hover:opacity-100 text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    title="Adicionar post nesta data"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {/* Day Task Pills */}
                <div className="space-y-1.5 flex-1 overflow-y-auto max-h-24">
                  {dayTasks.map((t) => {
                    const client = clients.find((c) => c.id === t.clientId);
                    const isAlert = t.status === 'alterar';
                    const isApproved = t.status === 'aprovado';
                    const isDelayed = isTaskDelayed(t);
                    const isBeingDragged = draggedTaskId === t.id;

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleTaskDragStart(e, t.id)}
                        onDragEnd={() => setDraggedTaskId(null)}
                        onClick={() => onSelectTask(t.id)}
                        className={`w-full text-left truncate rounded-lg px-2 py-1 text-[10px] font-semibold transition-transform hover:scale-[1.01] cursor-grab active:cursor-grabbing flex items-center gap-1.5 border ${
                          isBeingDragged ? 'opacity-30 scale-95' : ''
                        } ${
                          isAlert
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                            : isDelayed
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40'
                            : isApproved
                            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-500/20'
                            : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                        }`}
                        title={`${client?.company}: ${t.title}${isDelayed ? ' (Atrasado)' : ''}`}
                      >
                        <span>{client?.emoji || '•'}</span>
                        <span className="truncate">{t.title}</span>
                        {isDelayed && (
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0 ml-auto" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
