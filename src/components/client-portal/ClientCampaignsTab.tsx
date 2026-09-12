import React, { useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Campaign, Task } from '../../types';
import { formatFriendlyDate } from '../../utils/dateFormatter';
import { FolderCard } from '../FolderCard';
import { BlockHeader, EmptyState, StatusPill } from '../ui';

interface ClientCampaignsTabProps {
  campaigns: Campaign[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
}

const CONCLUIDAS = ['aprovado', 'postado'];

const periodo = (c: Campaign) => {
  const inicio = (c.startDate || '').split('T')[0];
  const fim = (c.endDate || '').split('T')[0];
  if (inicio && fim) return `${formatFriendlyDate(inicio)} a ${formatFriendlyDate(fim)}`;
  if (fim) return `até ${formatFriendlyDate(fim)}`;
  if (inicio) return `a partir de ${formatFriendlyDate(inicio)}`;
  return 'Sem período definido';
};

/**
 * Campanhas — o que a marca tem em andamento, agrupado.
 *
 * O cliente já vê as publicações soltas em Aprovações e no Calendário. Aqui
 * elas aparecem reunidas pelo motivo que as criou: "15 anos da Perfetto" são
 * dez pautas que só fazem sentido juntas, e é assim que o cliente pensa
 * quando pergunta "como está a campanha de aniversário?".
 *
 * Leitura, não decisão: aprovar continua sendo em Aprovações, que é onde o
 * cliente sabe que existe uma fila. Daqui ele abre a publicação e volta.
 */
export const ClientCampaignsTab: React.FC<ClientCampaignsTabProps> = ({
  campaigns,
  tasks,
  onOpenTask,
}) => {
  const [aberta, setAberta] = useState<string | null>(null);

  const comNumeros = useMemo(
    () =>
      campaigns.map((c) => {
        const pautas = tasks.filter((t) => t.campaignId === c.id);
        return {
          campanha: c,
          pautas,
          concluidas: pautas.filter((t) => CONCLUIDAS.includes(t.status)).length,
          aguardando: pautas.filter(
            (t) => t.status === 'em_aprovacao' || t.status === 'alterar'
          ).length,
        };
      }),
    [campaigns, tasks]
  );

  const detalhe = comNumeros.find((x) => x.campanha.id === aberta);

  /* ------------------------------- detalhe ------------------------------- */

  if (detalhe) {
    const { campanha, pautas } = detalhe;
    const ordenadas = [...pautas].sort((a, b) =>
      ((a.postDate || a.date || '') as string).localeCompare(
        (b.postDate || b.date || '') as string
      )
    );

    return (
      <div className="space-y-8">
        <button
          onClick={() => setAberta(null)}
          className="inline-flex items-center gap-1.5 t-ui text-slate-600 hover:text-slate-950 transition-colors cursor-pointer"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Voltar para campanhas
        </button>

        <header className="space-y-3 border-b border-slate-200 pb-6">
          <p className="t-meta text-slate-400">{periodo(campanha)}</p>
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 leading-tight">
            {campanha.title}
          </h1>
          {campanha.description && (
            <p className="t-body text-slate-600 max-w-2xl">{campanha.description}</p>
          )}
        </header>

        <section className="space-y-4">
          <BlockHeader
            title="Publicações da campanha"
            count={`${pautas.length} ${pautas.length === 1 ? 'publicação' : 'publicações'}`}
          />

          {ordenadas.length === 0 ? (
            <EmptyState
              title="Nenhuma publicação nesta campanha ainda"
              hint="Assim que a Beewave programar as primeiras peças, elas aparecem aqui."
            />
          ) : (
            <ul className="divide-y divide-slate-200 border-b border-slate-200">
              {ordenadas.map((t) => {
                const dia = ((t.postDate || t.date || '') as string).split('T')[0];
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => onOpenTask(t)}
                      className="w-full flex items-center gap-4 py-3.5 text-left group cursor-pointer"
                    >
                      <span className="min-w-0 flex-1 t-lead font-medium text-slate-900 truncate group-hover:underline underline-offset-4">
                        {t.selectedHeadline || t.headline || t.title}
                      </span>
                      <span className="shrink-0 hidden sm:block">
                        <StatusPill status={t.status} />
                      </span>
                      <span className="shrink-0 t-meta text-slate-400 w-[120px] text-right">
                        {dia ? formatFriendlyDate(dia) : 'Sem data'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    );
  }

  /* -------------------------------- lista -------------------------------- */

  if (campaigns.length === 0) {
    return (
      <EmptyState
        title="Nenhuma campanha em andamento"
        hint="Quando a Beewave montar uma campanha para a sua marca, ela aparece aqui com todas as publicações reunidas."
      />
    );
  }

  return (
    <section className="space-y-5">
      <BlockHeader
        title="Campanhas"
        count={`${campaigns.length} ${campaigns.length === 1 ? 'campanha' : 'campanhas'}`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-7 pt-2">
        {comNumeros.map(({ campanha, pautas, concluidas, aguardando }) => (
          <FolderCard
            key={campanha.id}
            tabColor={aguardando > 0 ? 'bg-sky-400' : 'bg-slate-300'}
            eyebrow={periodo(campanha)}
            title={campanha.title}
            onClick={() => setAberta(campanha.id)}
            stats={[
              { valor: pautas.length, rotulo: 'publicações' },
              { valor: concluidas, rotulo: 'no ar' },
              {
                valor: aguardando,
                rotulo: 'com você',
                destaque: aguardando > 0,
              },
            ]}
          />
        ))}
      </div>
    </section>
  );
};
