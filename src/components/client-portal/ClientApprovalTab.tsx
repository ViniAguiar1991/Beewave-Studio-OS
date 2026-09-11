import React, { useState } from 'react';
import { Task, Client } from '../../types';
import {
  Check,
  Copy,
  MessageSquare,
  Calendar,
  Send,
  Eye,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClientApprovalTabProps {
  tasks: Task[];
  currentClient: Client;
  onApproveTask: (taskId: string) => void;
  onRequestAdjustments: (taskId: string, feedback: string) => void;
  onOpenTaskDetails?: (task: Task) => void;
}

export const ClientApprovalTab: React.FC<ClientApprovalTabProps> = ({
  tasks,
  currentClient,
  onApproveTask,
  onRequestAdjustments,
  onOpenTaskDetails,
}) => {
  const [activeFilter, setActiveFilter] = useState<'pending' | 'adjusted' | 'approved' | 'all'>('pending');
  const [copiedCaptionId, setCopiedCaptionId] = useState<string | null>(null);
  const [adjustingTaskId, setAdjustingTaskId] = useState<string | null>(null);
  const [adjustmentComment, setAdjustmentComment] = useState('');
  const [selectedSlideIndexByTask, setSelectedSlideIndexByTask] = useState<Record<string, number>>({});

  // Filter tasks belonging to current client
  const clientTasks = tasks.filter((t) => t.clientId === currentClient.id);

  const pendingTasks = clientTasks.filter((t) => t.status === 'em_aprovacao');
  const adjustedTasks = clientTasks.filter((t) => t.status === 'alterar');
  const approvedTasks = clientTasks.filter((t) => t.status === 'aprovado');

  const displayedTasks = clientTasks.filter((t) => {
    if (activeFilter === 'pending') return t.status === 'em_aprovacao';
    if (activeFilter === 'adjusted') return t.status === 'alterar';
    if (activeFilter === 'approved') return t.status === 'aprovado';
    return true;
  });

  const handleCopyCaption = (id: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedCaptionId(id);
      setTimeout(() => setCopiedCaptionId(null), 2500);
    } catch {}
  };

  const handleQuickApprove = (taskId: string) => {
    onApproveTask(taskId);
    confetti({
      particleCount: 60,
      spread: 55,
      origin: { y: 0.7 },
    });
  };

  const handleSubmitAdjustment = (taskId: string) => {
    if (!adjustmentComment.trim()) return;
    onRequestAdjustments(taskId, adjustmentComment.trim());
    setAdjustingTaskId(null);
    setAdjustmentComment('');
  };

  return (
    <div id="client-posts-approval-tab" className="w-full space-y-6">
      {/* 1. Clean Filter Tabs Bar (No Redundant Metric Squares, Separated by line) */}
      <div className="flex items-center gap-6 border-b border-slate-200/80 dark:border-slate-800 pb-3 flex-wrap">
        <button
          onClick={() => setActiveFilter('pending')}
          className={`text-xs sm:text-sm transition-colors cursor-pointer ${
            activeFilter === 'pending'
              ? 'text-slate-950 dark:text-white font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-normal'
          }`}
        >
          Aguardando aprovação ({pendingTasks.length})
        </button>

        <button
          onClick={() => setActiveFilter('adjusted')}
          className={`text-xs sm:text-sm transition-colors cursor-pointer ${
            activeFilter === 'adjusted'
              ? 'text-slate-950 dark:text-white font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-normal'
          }`}
        >
          Ajustes solicitados ({adjustedTasks.length})
        </button>

        <button
          onClick={() => setActiveFilter('approved')}
          className={`text-xs sm:text-sm transition-colors cursor-pointer ${
            activeFilter === 'approved'
              ? 'text-slate-950 dark:text-white font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-normal'
          }`}
        >
          Aprovados ({approvedTasks.length})
        </button>

        <button
          onClick={() => setActiveFilter('all')}
          className={`text-xs sm:text-sm transition-colors cursor-pointer ${
            activeFilter === 'all'
              ? 'text-slate-950 dark:text-white font-semibold'
              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white font-normal'
          }`}
        >
          Todas ({clientTasks.length})
        </button>
      </div>

      {/* 2. Posts List Separated by Lines (No Cards, No Containers, Editorial Minimalist Layout) */}
      {displayedTasks.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            Nenhuma publicação nesta categoria no momento
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Novos conteúdos enviados pela equipe para aprovação serão exibidos aqui.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
          {displayedTasks.map((task) => {
            const isPending = task.status === 'em_aprovacao';
            const isApproved = task.status === 'aprovado';
            const isAdjusted = task.status === 'alterar';

            const filesList = task.files?.filter((f) => f.dataUrl || f.url) || [];
            const activeSlideIdx = selectedSlideIndexByTask[task.id] || 0;
            const currentImg = filesList[activeSlideIdx]?.dataUrl || filesList[activeSlideIdx]?.url || filesList[0]?.dataUrl || filesList[0]?.url;

            const formatLabel = task.format || task.copyMode || 'Post';
            const dateStr = task.date || task.postDate;

            // Activity / Adjustments history
            const adjustmentsHistory = task.activity?.filter((a) => a.type === 'client_change' || a.type === 'status_change') || [];

            return (
              <div
                key={task.id}
                className="py-10 first:pt-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
              >
                {/* Column 1: Image / Media Preview (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                  <div
                    onClick={() => onOpenTaskDetails && onOpenTaskDetails(task)}
                    className="relative w-full aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-800 cursor-pointer group"
                  >
                    {currentImg ? (
                      <img
                        src={currentImg}
                        alt={task.title}
                        className="h-full w-full object-cover group-hover:scale-[1.01] transition-transform duration-200"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                        <span className="text-3xl mb-1">🖼️</span>
                        <span className="text-xs font-medium">Prévia da Arte</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-medium transition-opacity">
                      <Eye className="h-4 w-4 mr-1.5" /> Ampliar Detalhes
                    </div>
                  </div>

                  {/* Multi-slide carousel thumbnails if available */}
                  {filesList.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {filesList.map((f, fIdx) => (
                        <button
                          key={fIdx}
                          type="button"
                          onClick={() => setSelectedSlideIndexByTask((prev) => ({ ...prev, [task.id]: fIdx }))}
                          className={`h-12 w-12 shrink-0 rounded-lg overflow-hidden border transition-all cursor-pointer ${
                            activeSlideIdx === fIdx
                              ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/30'
                              : 'border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={f.dataUrl || f.url} alt={`Slide ${fIdx + 1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Column 2: Content, Caption & Approval Actions (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Status Pill */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Em aprovação
                      </span>
                    )}
                    {isApproved && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                        Aprovado
                      </span>
                    )}
                    {isAdjusted && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        <Clock className="h-3 w-3 text-rose-500" />
                        Ajuste solicitado
                      </span>
                    )}
                  </div>

                  {/* Title & Metadata */}
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                      {task.selectedHeadline || task.headline || task.title}
                    </h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {formatLabel} {dateStr ? `• ${dateStr}` : ''}
                    </p>
                  </div>

                  {/* Caption Rendered Directly (No nested container card) */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Legenda
                      </span>
                      {task.caption && (
                        <button
                          type="button"
                          onClick={() => handleCopyCaption(task.id, task.caption || '')}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                        >
                          {copiedCaptionId === task.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span className="text-emerald-600 font-medium">Copiada</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
                      {task.caption || (
                        <span className="text-slate-400 italic">Legenda em desenvolvimento pela equipe.</span>
                      )}
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="pt-3 flex items-center gap-3">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          id={`btn-approve-post-${task.id}`}
                          onClick={() => handleQuickApprove(task.id)}
                          className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 transition-colors cursor-pointer"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Aprovar</span>
                        </button>

                        <button
                          type="button"
                          id={`btn-adjust-post-${task.id}`}
                          onClick={() => setAdjustingTaskId(adjustingTaskId === task.id ? null : task.id)}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Pedir ajuste</span>
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <Check className="h-4 w-4" />
                        Pauta aprovada
                      </span>
                    )}

                    {onOpenTaskDetails && (
                      <button
                        type="button"
                        onClick={() => onOpenTaskDetails(task)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer ml-auto"
                      >
                        Ver detalhes
                      </button>
                    )}
                  </div>

                  {/* Inline Adjustment Input */}
                  {adjustingTaskId === task.id && (
                    <div className="pt-3 space-y-2 border-t border-slate-200/80 dark:border-slate-800 animate-in fade-in">
                      <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
                        O que você gostaria de ajustar nesta publicação?
                      </label>
                      <textarea
                        value={adjustmentComment}
                        onChange={(e) => setAdjustmentComment(e.target.value)}
                        placeholder="Descreva aqui o ajuste na arte ou no texto..."
                        rows={3}
                        className="w-full text-xs p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjustingTaskId(null);
                            setAdjustmentComment('');
                          }}
                          className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSubmitAdjustment(task.id)}
                          disabled={!adjustmentComment.trim()}
                          className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 cursor-pointer disabled:opacity-50"
                        >
                          Enviar ajuste
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Column 3: Histórico de ajustes (3 cols) */}
                <div className="lg:col-span-3 space-y-3 pt-1">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Histórico de ajustes
                  </h4>

                  {adjustmentsHistory.length === 0 && !task.clientFeedback ? (
                    <p className="text-xs text-slate-400">
                      Nenhum ajuste solicitado para esta pauta até o momento.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {task.clientFeedback && (
                        <div className="text-xs space-y-1 pb-2 border-b border-slate-100 dark:border-slate-800">
                          <span className="font-semibold text-rose-600 dark:text-rose-400">
                            Último feedback do cliente:
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 italic">
                            "{task.clientFeedback}"
                          </p>
                        </div>
                      )}

                      {adjustmentsHistory.map((act, aIdx) => (
                        <div key={aIdx} className="text-xs space-y-0.5">
                          <div className="flex items-center justify-between text-slate-400 text-[11px]">
                            <span>{act.userName || 'Estúdio'}</span>
                            <span>{act.createdAt ? new Date(act.createdAt).toLocaleDateString('pt-BR') : ''}</span>
                          </div>
                          <p className="text-slate-700 dark:text-slate-300">
                            {act.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
