import React, { useState, useEffect } from 'react';
import { Play, Pause, ExternalLink, Clock, Square, X, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAppStore } from '../store';

interface GlobalTimerWidgetProps {
  onOpenTask: (taskId: string) => void;
}

export const GlobalTimerWidget: React.FC<GlobalTimerWidgetProps> = ({ onOpenTask }) => {
  const tasks = useAppStore((s) => s.tasks);
  const clients = useAppStore((s) => s.clients);
  const startTimer = useAppStore((s) => s.startTimer);
  const stopTimer = useAppStore((s) => s.stopTimer);
  const resetTimer = useAppStore((s) => s.resetTimer);
  const deleteTask = useAppStore((s) => s.deleteTask);
  const dockedTimerTaskId = useAppStore((s) => s.dockedTimerTaskId);
  const setDockedTimerTaskId = useAppStore((s) => s.setDockedTimerTaskId);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Active or docked task
  const runningTask = tasks.find((t) => !!t.timerStartedAt);
  const targetTaskId = runningTask ? runningTask.id : dockedTimerTaskId;
  const currentTask = tasks.find((t) => t.id === targetTaskId);
  const client = currentTask ? clients.find((c) => c.id === currentTask.clientId) : null;

  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isRunning = !!currentTask?.timerStartedAt;

  useEffect(() => {
    if (!currentTask?.timerStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const diff = Math.round((Date.now() - currentTask.timerStartedAt) / 1000);
    // Sanity check: if elapsed is more than 10 hours from a forgotten background session, reset
    if (diff > 36000) {
      stopTimer(currentTask.id);
      resetTimer(currentTask.id);
      setDockedTimerTaskId(null);
      setElapsedSeconds(0);
      return;
    }

    const update = () => {
      const currentDiff = Math.round((Date.now() - (currentTask.timerStartedAt || Date.now())) / 1000);
      if (currentDiff > 36000) {
        stopTimer(currentTask.id);
        resetTimer(currentTask.id);
        setDockedTimerTaskId(null);
        setElapsedSeconds(0);
      } else {
        setElapsedSeconds(currentDiff);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [currentTask?.timerStartedAt, currentTask?.id, stopTimer, resetTimer, setDockedTimerTaskId]);

  if (!currentTask) return null;

  const totalTimeSpent = (currentTask.timeSpent || 0) + elapsedSeconds;

  const formatTimer = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleDeleteTask = () => {
    if (isRunning) stopTimer(currentTask.id);
    setDockedTimerTaskId(null);
    deleteTask(currentTask.id);
    setShowDeleteConfirm(false);
  };

  return (
    <AnimatePresence>
      {currentTask && (
        <motion.div
          id="global-timer-widget"
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 0.2 } }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl p-3 pl-3.5 backdrop-blur-md"
        >
          {showDeleteConfirm ? (
            <div className="flex items-center gap-2 py-0.5 px-1">
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                Excluir esta tarefa?
              </span>
              <button
                id="btn-confirm-delete-widget-task"
                onClick={handleDeleteTask}
                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
              >
                Sim, Excluir
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              {/* Status Indicator */}
              <div className="relative flex h-3 w-3 items-center justify-center">
                {isRunning ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </>
                ) : (
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" title="Pausado" />
                )}
              </div>

              {/* Task and Client Details */}
              <div className="min-w-0 max-w-[200px]">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate">
                  {client?.emoji && <span>{client.emoji}</span>}
                  <span className="truncate">{client?.company || 'Cliente'}</span>
                  <span className="text-[9px] px-1 py-0.2 rounded font-normal text-slate-400">
                    {isRunning ? '• Rodando' : '• Pausado'}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {currentTask.title || 'Tarefa em andamento'}
                </p>
              </div>

              {/* Realtime Time Display */}
              <div className="flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 px-2.5 py-1 border border-slate-200/70 dark:border-slate-700/60">
                <Clock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                  {formatTimer(totalTimeSpent)}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200 dark:border-slate-800">
                {/* Play / Pause Toggle Button */}
                {isRunning ? (
                  <button
                    id="btn-global-timer-pause"
                    onClick={() => stopTimer(currentTask.id)}
                    title="Pausar cronômetro"
                    className="grid h-7 w-7 place-items-center rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                  >
                    <Pause className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    id="btn-global-timer-resume"
                    onClick={() => startTimer(currentTask.id)}
                    title="Retomar cronômetro"
                    className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </button>
                )}

                {/* Stop / Reset Button */}
                <button
                  id="btn-global-timer-stop-reset"
                  onClick={() => {
                    if (isRunning) stopTimer(currentTask.id);
                    resetTimer(currentTask.id);
                  }}
                  title="Zerar cronômetro"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <Square className="h-3 w-3" />
                </button>

                {/* Open Task Modal Button */}
                <button
                  id="btn-global-timer-open-task"
                  onClick={() => onOpenTask(currentTask.id)}
                  title="Abrir tarefa"
                  className="grid h-7 w-7 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>

                {/* Delete Task Button (Lixeira) */}
                <button
                  id="btn-global-timer-delete-task"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Excluir tarefa (Lixeira)"
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Close / Dismiss Widget Button */}
                <button
                  id="btn-global-timer-close"
                  onClick={() => {
                    if (isRunning) stopTimer(currentTask.id);
                    setDockedTimerTaskId(null);
                  }}
                  title="Fechar (X)"
                  className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

