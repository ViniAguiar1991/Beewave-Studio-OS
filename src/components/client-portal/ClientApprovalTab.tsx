import React, { useState } from 'react';
import { Check, MessageSquare, Copy, Maximize2 } from 'lucide-react';
import { Task, Client } from '../../types';
import { formatLongDate, formatTimestamp } from '../../utils/dateFormatter';
import { getPostDay, byPostDate, describeActivity } from './portalStatus';
import { Button, EmptyState, PostImage, PostListSkeleton, StatusPill } from '../ui';

type ApprovalFilter = 'aguardando' | 'ajuste' | 'aprovados' | 'todas';

interface ClientApprovalTabProps {
  tasks: Task[];
  client: Client;
  onApprove: (taskId: string) => void;
  onRequestAdjustment: (taskId: string, feedback: string) => void;
  onOpenTask: (task: Task) => void;
  /** Filtro inicial, usado quando o Resumo manda o cliente para cá. */
  initialFilter?: ApprovalFilter;
  isHydrating?: boolean;
}

/**
 * Aprovações — a tela que justifica o portal existir.
 *
 * Uma pauta, uma decisão: "Aprovar" é a única ação em tinta cheia. Tudo o mais
 * (pedir ajuste, copiar legenda, ver detalhes) é secundário e pesa menos.
 *
 * O histórico aparece embaixo da pauta e só quando existe. Antes ele ocupava
 * uma coluna fixa de um terço da largura que, na maioria das pautas, estava
 * vazia.
 */
export const ClientApprovalTab: React.FC<ClientApprovalTabProps> = ({
  tasks,
  client,
  onApprove,
  onRequestAdjustment,
  onOpenTask,
  initialFilter = 'aguardando',
  isHydrating = false,
}) => {
  const [filter, setFilter] = useState<ApprovalFilter>(initialFilter);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [adjustmentText, setAdjustmentText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [slideByTask, setSlideByTask] = useState<Record<string, number>>({});

  React.useEffect(() => setFilter(initialFilter), [initialFilter]);

  const awaiting = tasks.filter((t) => t.status === 'em_aprovacao');
  const adjusting = tasks.filter((t) => t.status === 'alterar');
  const approved = tasks.filter((t) => t.status === 'aprovado' || t.status === 'postado');

  const filters: { key: ApprovalFilter; label: string; list: Task[] }[] = [
    { key: 'aguardando', label: 'Aguardando você', list: awaiting },
    { key: 'ajuste', label: 'Em ajuste', list: adjusting },
    { key: 'aprovados', label: 'Aprovados', list: approved },
    { key: 'todas', label: 'Todas', list: tasks },
  ];

  const visible = (filters.find((f) => f.key === filter)?.list || []).sort(byPostDate);
  const clientName = client.company || client.name || 'Cliente';

  const handleCopyCaption = async (task: Task) => {
    try {
      await navigator.clipboard.writeText(task.caption || '');
      setCopiedId(task.id);
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      /* clipboard bloqueado — a legenda segue selecionável na tela */
    }
  };

  const handleSubmitAdjustment = (taskId: string) => {
    const text = adjustmentText.trim();
    if (!text) return;
    onRequestAdjustment(taskId, text);
    setAdjustingId(null);
    setAdjustmentText('');
  };

  const emptyCopy: Record<ApprovalFilter, { title: string; hint: string }> = {
    aguardando: {
      title: 'Nenhuma publicação esperando por você',
      hint: 'Quando a Beewave enviar uma arte para aprovação, ela aparece aqui com a legenda e os botões de decisão.',
    },
    ajuste: {
      title: 'Nenhum ajuste em andamento',
      hint: 'Os ajustes que você pedir ficam listados aqui até a Beewave enviar a nova versão.',
    },
    aprovados: {
      title: 'Nenhuma publicação aprovada ainda',
      hint: 'Tudo que você aprovar fica guardado aqui, com a data da sua aprovação.',
    },
    todas: {
      title: 'Ainda não há publicações neste portal',
      hint: 'As pautas aparecem aqui assim que a Beewave começar a produzir o seu plano de conteúdo.',
    },
  };

  return (
    <div className="portal-enter space-y-8">
      {/* Filtros. Contagem sempre visível — o número é a informação. */}
      <div className="flex items-center gap-6 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-3">
        {filters.map((f) => {
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              aria-pressed={isActive}
              className={`t-ui transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'text-slate-950 dark:text-white font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 tabular-nums ${
                  isActive ? 'text-slate-500 dark:text-slate-400' : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {f.list.length}
              </span>
            </button>
          );
        })}
      </div>

      {isHydrating ? (
        <PostListSkeleton count={2} />
      ) : visible.length === 0 ? (
        <EmptyState title={emptyCopy[filter].title} hint={emptyCopy[filter].hint} />
      ) : (
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {visible.map((task) => {
            const files = (task.files || []).filter((f) => f.dataUrl || f.url);
            const slideIdx = slideByTask[task.id] || 0;
            const activeImg = files[slideIdx]?.dataUrl || files[slideIdx]?.url || files[0]?.dataUrl || files[0]?.url;
            const isAwaiting = task.status === 'em_aprovacao';
            const postDay = getPostDay(task);

            const history = (task.activity || [])
              .map((a) => ({ entry: a, label: describeActivity(a, clientName) }))
              .filter((a): a is { entry: typeof a.entry; label: string } => a.label !== null)
              .reverse()
              .slice(0, 4);

            return (
              <article key={task.id} className="py-9 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Arte */}
                <div className="lg:col-span-4 space-y-2.5">
                  <button
                    onClick={() => onOpenTask(task)}
                    aria-label={`Ampliar arte de ${task.title}`}
                    className="relative block w-full aspect-square rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group cursor-pointer"
                  >
                    <PostImage src={activeImg} alt={task.title} className="h-full w-full" />
                    <span className="absolute inset-0 bg-slate-950/0 group-hover:bg-slate-950/25 transition-colors duration-150 grid place-items-center">
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 inline-flex items-center gap-1.5 t-meta font-medium text-white">
                        <Maximize2 className="h-3.5 w-3.5" />
                        Ampliar
                      </span>
                    </span>
                  </button>

                  {files.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                      {files.map((f, i) => (
                        <button
                          key={f.id || i}
                          onClick={() => setSlideByTask((p) => ({ ...p, [task.id]: i }))}
                          aria-label={`Ver imagem ${i + 1} de ${files.length}`}
                          className={`h-11 w-11 shrink-0 rounded-md overflow-hidden border transition-all duration-150 cursor-pointer ${
                            slideIdx === i
                              ? 'border-slate-950 dark:border-white'
                              : 'border-slate-200 dark:border-slate-800 opacity-55 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={f.dataUrl || f.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Conteúdo e decisão */}
                <div className="lg:col-span-8 min-w-0">
                  <StatusPill status={task.status} long />

                  <h3 className="mt-3 font-display text-[20px] sm:text-[22px] font-semibold tracking-[-0.015em] text-slate-950 dark:text-white leading-snug">
                    {task.selectedHeadline || task.headline || task.title}
                  </h3>

                  <p className="mt-1.5 t-meta text-slate-500 dark:text-slate-400">
                    {task.format || 'Publicação'}
                    {postDay && ` · publicação prevista para ${formatLongDate(postDay)}`}
                  </p>

                  {/* Legenda */}
                  <div className="mt-6">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="t-label text-slate-500">
                        Legenda
                      </span>
                      {task.caption && (
                        <button
                          onClick={() => handleCopyCaption(task)}
                          className="inline-flex items-center gap-1.5 t-ui text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedId === task.id ? (
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

                  {/* Decisão — uma ação dominante */}
                  <div className="mt-7 flex items-center gap-3 flex-wrap">
                    {isAwaiting ? (
                      <>
                        <Button variant="primary" icon={Check} onClick={() => onApprove(task.id)}>
                          Aprovar publicação
                        </Button>
                        <Button
                          variant="secondary"
                          icon={MessageSquare}
                          onClick={() => {
                            setAdjustingId(adjustingId === task.id ? null : task.id);
                            setAdjustmentText('');
                          }}
                        >
                          Pedir ajuste
                        </Button>
                      </>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => onOpenTask(task)}>
                        Ver detalhes
                      </Button>
                    )}

                    {isAwaiting && (
                      <button
                        onClick={() => onOpenTask(task)}
                        className="ml-auto t-ui text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white underline underline-offset-4 cursor-pointer"
                      >
                        Ver detalhes
                      </button>
                    )}
                  </div>

                  {/* Formulário de ajuste */}
                  {adjustingId === task.id && (
                    <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-800 portal-enter">
                      <label
                        htmlFor={`ajuste-${task.id}`}
                        className="block t-lead font-medium text-slate-900 dark:text-white"
                      >
                        O que precisa mudar nesta publicação?
                      </label>
                      <p className="mt-1 t-meta text-slate-500 dark:text-slate-400">
                        Seja específico — quanto mais claro o pedido, menos idas e voltas.
                      </p>
                      <textarea
                        id={`ajuste-${task.id}`}
                        value={adjustmentText}
                        onChange={(e) => setAdjustmentText(e.target.value)}
                        rows={3}
                        autoFocus
                        placeholder="Ex.: trocar a foto do segundo card e tirar o preço da legenda."
                        className="mt-3 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-3 t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
                      />
                      <div className="mt-3 flex items-center justify-end gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAdjustingId(null);
                            setAdjustmentText('');
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={!adjustmentText.trim()}
                          onClick={() => handleSubmitAdjustment(task.id)}
                        >
                          Enviar ajuste
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Histórico — só quando existe */}
                  {history.length > 0 && (
                    <div className="mt-7 pt-5 border-t border-slate-200 dark:border-slate-800">
                      <span className="t-label text-slate-500">
                        Histórico
                      </span>
                      <ul className="mt-3 space-y-2.5">
                        {history.map(({ entry, label }, i) => (
                          <li key={`${entry.ts}-${i}`} className="flex flex-col sm:flex-row sm:gap-4 t-meta">
                            <span className="shrink-0 w-[104px] whitespace-nowrap text-slate-400 dark:text-slate-500 tabular-nums">
                              {formatTimestamp(entry.ts)}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300">{label}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
