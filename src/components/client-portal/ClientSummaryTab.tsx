import React from 'react';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { Client, Task } from '../../types';
import { formatLongDate, formatFriendlyDate, formatTimestamp } from '../../utils/dateFormatter';
import {
  needsClientDecision,
  isBeingRevised,
  getPostDay,
  byPostDate,
  describeActivity,
} from './portalStatus';
import { Button, BlockHeader, EmptyState, PostImage, StatusPill } from '../ui';

interface ClientSummaryTabProps {
  client: Client;
  tasks: Task[];
  onOpenApprovals: () => void;
  onOpenCalendar: () => void;
  onOpenTask: (task: Task) => void;
  onSuggest: () => void;
}

/**
 * Resumo — a primeira tela do portal.
 *
 * O cliente não entra para explorar, entra para resolver. Esta tela responde
 * quatro perguntas e nada mais: o que depende de mim, o que a Beewave está
 * fazendo, quando sai o próximo conteúdo e o que mudou desde a última visita.
 *
 * Há exatamente uma ação dominante. Quando existe pauta parada esperando o
 * cliente, ela é "Ver aprovações". Quando não existe, a única coisa que o
 * cliente pode de fato iniciar é sugerir uma pauta — então é essa.
 */
export const ClientSummaryTab: React.FC<ClientSummaryTabProps> = ({
  client,
  tasks,
  onOpenApprovals,
  onOpenCalendar,
  onOpenTask,
  onSuggest,
}) => {
  const pending = tasks.filter(needsClientDecision).sort(byPostDate);
  const beingRevised = tasks.filter(isBeingRevised).sort(byPostDate);

  const today = new Date().toISOString().split('T')[0];
  const upcoming = tasks
    .filter((t) => {
      const day = getPostDay(t);
      return !!day && day >= today && t.status !== 'postado';
    })
    .sort(byPostDate);
  const nextPost = upcoming[0];

  const clientName = client.company || client.name || 'Cliente';
  const recentActivity = tasks
    .flatMap((t) => (t.activity || []).map((a) => ({ ...a, task: t })))
    .sort((a, b) => (b.ts || '').localeCompare(a.ts || ''))
    .map((a) => ({ entry: a, label: describeActivity(a, clientName) }))
    .filter((a): a is { entry: typeof a.entry; label: string } => a.label !== null)
    .slice(0, 5);

  return (
    <div className="portal-enter space-y-12">
      {/* ------------------------------------------------------------------
          1. O que depende de você. Único bloco com ação primária.
         ------------------------------------------------------------------ */}
      <section className="space-y-5">
        <BlockHeader
          title="Depende de você"
          count={
            pending.length > 0
              ? `${pending.length} ${pending.length === 1 ? 'publicação aguardando' : 'publicações aguardando'}`
              : undefined
          }
          action={
            pending.length > 0 ? (
              <Button variant="primary" size="sm" onClick={onOpenApprovals}>
                Ver aprovações
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        />

        {pending.length === 0 ? (
          <EmptyState
            title="Nada esperando por você agora"
            hint="Assim que a Beewave enviar uma publicação para aprovação, ela aparece aqui e você recebe um aviso."
            action={
              <Button variant="primary" size="sm" icon={Lightbulb} onClick={onSuggest}>
                Sugerir uma pauta
              </Button>
            }
          />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {pending.slice(0, 4).map((task) => (
              <li key={task.id}>
                <button
                  onClick={() => onOpenTask(task)}
                  className="w-full flex items-center gap-4 py-4 text-left group cursor-pointer"
                >
                  <PostImage
                    src={task.files?.[0]?.dataUrl || task.files?.[0]?.url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg border border-slate-200 dark:border-slate-800"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block t-lead font-medium text-slate-900 dark:text-white truncate group-hover:underline underline-offset-4 decoration-slate-300">
                      {task.selectedHeadline || task.headline || task.title}
                    </span>
                    <span className="block t-meta text-slate-500 dark:text-slate-400 mt-0.5">
                      {task.format || 'Publicação'} · prevista para{' '}
                      {formatFriendlyDate(getPostDay(task)).toLowerCase()}
                    </span>
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {pending.length > 4 && (
          <button
            onClick={onOpenApprovals}
            className="t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Ver as {pending.length} publicações
          </button>
        )}
      </section>

      {/* ------------------------------------------------------------------
          2. O que a Beewave está fazendo. Informa, não pede ação.
         ------------------------------------------------------------------ */}
      {beingRevised.length > 0 && (
        <section className="space-y-5">
          <BlockHeader
            title="Em ajuste na Beewave"
            count={`${beingRevised.length} ${beingRevised.length === 1 ? 'pedido seu' : 'pedidos seus'}`}
          />
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {beingRevised.map((task) => {
              const lastRequest = [...(task.activity || [])]
                .reverse()
                .find((a) => a.type === 'client_change');
              return (
                <li key={task.id} className="py-4">
                  <button
                    onClick={() => onOpenTask(task)}
                    className="w-full text-left group cursor-pointer"
                  >
                    <span className="block t-lead font-medium text-slate-900 dark:text-white group-hover:underline underline-offset-4 decoration-slate-300">
                      {task.selectedHeadline || task.headline || task.title}
                    </span>
                    {lastRequest && (
                      <span className="block t-body text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        Você pediu: “{lastRequest.text}”
                      </span>
                    )}
                    <span className="block t-meta text-slate-500 dark:text-slate-500 mt-1.5">
                      {lastRequest?.ts
                        ? `Enviado em ${formatTimestamp(lastRequest.ts)}`
                        : 'Aguardando nova versão'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ------------------------------------------------------------------
          3. O que vem por aí.
         ------------------------------------------------------------------ */}
      <section className="space-y-5">
        <BlockHeader
          title="Próxima publicação"
          action={
            upcoming.length > 1 ? (
              <button
                onClick={onOpenCalendar}
                className="t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white underline underline-offset-4 cursor-pointer"
              >
                Ver calendário
              </button>
            ) : undefined
          }
        />

        {!nextPost ? (
          <EmptyState
            title="Nenhuma publicação agendada"
            hint="Quando a Beewave programar as próximas pautas, as datas aparecem aqui e no calendário."
          />
        ) : (
          /* Empilha no celular: a régua vertical só faz sentido lado a lado. */
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6 py-1">
            <div className="sm:shrink-0">
              <p className="font-display text-[26px] sm:text-[28px] font-semibold tracking-tight text-slate-950 dark:text-white leading-tight sm:whitespace-nowrap">
                {formatFriendlyDate(getPostDay(nextPost))}
              </p>
              <p className="t-meta text-slate-500 dark:text-slate-400 mt-1">
                {formatLongDate(getPostDay(nextPost))}
              </p>
            </div>
            <div className="min-w-0 flex-1 sm:border-l border-slate-200 dark:border-slate-800 sm:pl-6">
              <p className="t-lead font-medium text-slate-900 dark:text-white leading-snug">
                {nextPost.selectedHeadline || nextPost.headline || nextPost.title}
              </p>
              <div className="mt-2">
                <StatusPill status={nextPost.status} long />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------
          4. O que mudou. Histórico curto, com data real.
         ------------------------------------------------------------------ */}
      {recentActivity.length > 0 && (
        <section className="space-y-5">
          <BlockHeader title="Atividade recente" />
          <ul className="space-y-3.5">
            {recentActivity.map(({ entry, label }, i) => (
              <li key={`${entry.ts}-${i}`} className="flex flex-col sm:flex-row sm:gap-4 t-meta">
                <span className="shrink-0 w-[104px] whitespace-nowrap text-slate-400 dark:text-slate-500 tabular-nums">
                  {formatTimestamp(entry.ts)}
                </span>
                <span className="min-w-0 text-slate-700 dark:text-slate-300">
                  {label}
                  <span className="text-slate-400 dark:text-slate-500">
                    {' '}
                    · {entry.task.selectedHeadline || entry.task.title}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
