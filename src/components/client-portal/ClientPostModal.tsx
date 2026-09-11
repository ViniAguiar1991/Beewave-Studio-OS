import React, { useEffect, useState } from 'react';
import { X, Check, MessageSquare, Copy, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { Task, Client } from '../../types';
import { formatLongDate, formatTimestamp } from '../../utils/dateFormatter';
import { describeActivity } from './portalStatus';
import { Button, PostImage, StatusPill } from '../ui';

interface ClientPostModalProps {
  task: Task | null;
  client: Client;
  onClose: () => void;
  onApprove: (taskId: string) => void;
  onRequestChanges: (taskId: string, changes: string[]) => void;
}

/**
 * Detalhe da pauta.
 *
 * Permite juntar vários pedidos de ajuste antes de enviar — um pedido por vez
 * gera uma ida e volta por vez, e ninguém quer isso. A lista se acumula na
 * tela e sai num envio só.
 */
export const ClientPostModal: React.FC<ClientPostModalProps> = ({
  task,
  client,
  onClose,
  onApprove,
  onRequestChanges,
}) => {
  const [slideIdx, setSlideIdx] = useState(0);
  const [mode, setMode] = useState<'conteudo' | 'ajustes'>('conteudo');
  const [changes, setChanges] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const files = (task?.files || []).filter((f) => f.dataUrl || f.url);

  useEffect(() => {
    setSlideIdx(0);
    setMode('conteudo');
    setChanges([]);
    setDraft('');
    setNotice(null);
  }, [task?.id]);

  useEffect(() => {
    if (!task) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (files.length > 1) {
        if (e.key === 'ArrowRight') setSlideIdx((i) => (i + 1) % files.length);
        if (e.key === 'ArrowLeft') setSlideIdx((i) => (i - 1 + files.length) % files.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [task, files.length, onClose]);

  if (!task) return null;

  const isAwaiting = task.status === 'em_aprovacao';
  const clientName = client.company || client.name || 'Cliente';
  const activeImg = files[slideIdx]?.dataUrl || files[slideIdx]?.url;

  /** Itens já na lista mais o que estiver sendo digitado agora. */
  const pendingCount = changes.length + (draft.trim() ? 1 : 0);

  const history = (task.activity || [])
    .map((a) => ({ entry: a, label: describeActivity(a, clientName) }))
    .filter((a): a is { entry: typeof a.entry; label: string } => a.label !== null)
    .reverse();

  const addChange = () => {
    const text = draft.trim();
    if (!text) return;
    setChanges((c) => [...c, text]);
    setDraft('');
    setNotice(null);
  };

  const sendChanges = () => {
    const all = [...changes];
    if (draft.trim()) all.push(draft.trim());
    if (all.length === 0) {
      setNotice('Descreva pelo menos um ajuste antes de enviar.');
      return;
    }
    onRequestChanges(task.id, all);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(task.caption || '');
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard bloqueado — a legenda segue selecionável */
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
        className="relative w-full sm:max-w-5xl h-full sm:h-auto sm:max-h-[88vh] overflow-hidden bg-white dark:bg-[#0f1114] sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between gap-4 px-5 sm:px-6 h-14 shrink-0 border-b border-slate-200 dark:border-slate-800">
          <StatusPill status={task.status} long />
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12">
          {/* Arte */}
          <div className="lg:col-span-7 bg-slate-50 dark:bg-[#0a0b0d] p-5 sm:p-7 lg:border-r border-slate-200 dark:border-slate-800">
            <div className="relative">
              <PostImage
                src={activeImg}
                alt={task.title}
                className="w-full aspect-square rounded-xl border border-slate-200 dark:border-slate-800"
              />

              {files.length > 1 && (
                <>
                  <CarouselNav
                    side="left"
                    onClick={() => setSlideIdx((i) => (i - 1 + files.length) % files.length)}
                  />
                  <CarouselNav
                    side="right"
                    onClick={() => setSlideIdx((i) => (i + 1) % files.length)}
                  />
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/75 px-2.5 py-1 t-meta font-medium text-white tabular-nums">
                    {slideIdx + 1} / {files.length}
                  </span>
                </>
              )}
            </div>

            {files.length > 1 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                {files.map((f, i) => (
                  <button
                    key={f.id || i}
                    onClick={() => setSlideIdx(i)}
                    aria-label={`Ver imagem ${i + 1}`}
                    className={`h-12 w-12 shrink-0 rounded-md overflow-hidden border transition-all duration-150 cursor-pointer ${
                      slideIdx === i
                        ? 'border-slate-950 dark:border-white'
                        : 'border-slate-200 dark:border-slate-800 opacity-55 hover:opacity-100'
                    }`}
                  >
                    <img src={f.dataUrl || f.url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Conteúdo */}
          <div className="lg:col-span-5 p-5 sm:p-7 space-y-6">
            <div>
              <h2
                id="post-modal-title"
                className="font-display text-[21px] font-semibold tracking-[-0.015em] text-slate-950 dark:text-white leading-snug"
              >
                {task.selectedHeadline || task.headline || task.title}
              </h2>
              <p className="mt-1.5 t-meta text-slate-500 dark:text-slate-400">
                {task.format || 'Publicação'}
                {(task.postDate || task.date) &&
                  ` · ${formatLongDate((task.postDate || task.date)?.split('T')[0])}`}
              </p>
            </div>

            {mode === 'conteudo' ? (
              <>
                <div>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <span className="t-label text-slate-500">
                      Legenda
                    </span>
                    {task.caption && (
                      <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1.5 t-ui text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700 dark:text-emerald-400">Copiada</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <p className="t-body leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {task.caption || (
                      <span className="text-slate-400 dark:text-slate-500">
                        A legenda ainda está sendo escrita pela equipe.
                      </span>
                    )}
                  </p>
                </div>

                {task.scriptText?.trim() && (
                  <div>
                    <span className="t-label text-slate-500">
                      Roteiro
                    </span>
                    <p className="mt-2 t-body leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                      {task.scriptText}
                    </p>
                  </div>
                )}

                {history.length > 0 && (
                  <div className="pt-2">
                    <span className="t-label text-slate-500">
                      Histórico
                    </span>
                    <ul className="mt-3 space-y-2.5">
                      {history.map(({ entry, label }, i) => (
                        <li key={`${entry.ts}-${i}`} className="t-meta">
                          <span className="text-slate-400 dark:text-slate-500 tabular-nums">
                            {formatTimestamp(entry.ts)}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300"> — {label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="modal-change"
                    className="block t-lead font-medium text-slate-900 dark:text-white"
                  >
                    O que precisa mudar?
                  </label>
                  <p className="mt-1 t-meta text-slate-500 dark:text-slate-400">
                    Adicione um item por ajuste. Todos vão juntos num envio só.
                  </p>
                </div>

                {changes.length > 0 && (
                  <ul className="space-y-2">
                    {changes.map((c, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5"
                      >
                        <span className="t-meta text-slate-400 tabular-nums pt-0.5">{i + 1}</span>
                        <span className="min-w-0 flex-1 t-meta text-slate-800 dark:text-slate-200">
                          {c}
                        </span>
                        <button
                          onClick={() => setChanges((prev) => prev.filter((_, idx) => idx !== i))}
                          aria-label={`Remover ajuste ${i + 1}`}
                          className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <textarea
                  id="modal-change"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addChange();
                  }}
                  placeholder="Ex.: trocar a foto do segundo card."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-3 t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                />

                <Button variant="secondary" size="sm" icon={Plus} onClick={addChange} disabled={!draft.trim()}>
                  Adicionar outro ajuste
                </Button>

                {notice && (
                  <p role="alert" className="t-meta text-rose-700 dark:text-rose-400">
                    {notice}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ação dominante, fixa no rodapé. */}
        {isAwaiting && (
          <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 px-5 sm:px-6 py-4 flex items-center justify-end gap-3">
            {mode === 'conteudo' ? (
              <>
                <Button variant="secondary" icon={MessageSquare} onClick={() => setMode('ajustes')}>
                  Pedir ajuste
                </Button>
                <Button variant="primary" icon={Check} onClick={() => onApprove(task.id)}>
                  Aprovar publicação
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setMode('conteudo')}>
                  Voltar ao conteúdo
                </Button>
                <Button variant="primary" onClick={sendChanges} disabled={pendingCount === 0}>
                  {pendingCount === 0
                    ? 'Enviar ajuste'
                    : `Enviar ${pendingCount} ${pendingCount === 1 ? 'ajuste' : 'ajustes'}`}
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CarouselNav: React.FC<{ side: 'left' | 'right'; onClick: () => void }> = ({ side, onClick }) => (
  <button
    onClick={onClick}
    aria-label={side === 'left' ? 'Imagem anterior' : 'Próxima imagem'}
    className={`absolute top-1/2 -translate-y-1/2 ${
      side === 'left' ? 'left-3' : 'right-3'
    } grid h-9 w-9 place-items-center rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-900 transition-colors cursor-pointer`}
  >
    {side === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
  </button>
);
