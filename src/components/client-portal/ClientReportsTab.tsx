import React, { useState } from 'react';
import { MonthlyReport } from '../../types';
import { BlockHeader, EmptyState, SectionLabel } from '../ui';

interface ClientReportsTabProps {
  reports: MonthlyReport[];
}

const formatNumber = (n: number) => n.toLocaleString('pt-BR');

/**
 * Resultados mensais.
 *
 * Sem gráfico decorativo. Os números aparecem como tipografia — grandes,
 * legíveis, com o rótulo embaixo — e só os que existem no relatório. Um
 * gráfico aqui existiria para parecer completo, não para explicar algo.
 */
export const ClientReportsTab: React.FC<ClientReportsTabProps> = ({ reports }) => {
  const [index, setIndex] = useState(0);
  const report = reports[index];

  if (!report) {
    return (
      <EmptyState
        title="Nenhum relatório publicado ainda"
        hint="Ao fechar o primeiro ciclo, a Beewave publica aqui o resumo de alcance, engajamento e o que funcionou."
      />
    );
  }

  const metrics = [
    { label: 'Novos seguidores', value: report.newFollowers },
    { label: 'Alcance', value: report.reachTotal ?? report.reach },
    { label: 'Impressões', value: report.impressions },
    { label: 'Publicações', value: report.postsCount ?? report.postsPublished },
    { label: 'Cliques no link', value: report.linkClicks },
  ].filter((m): m is { label: string; value: number } => typeof m.value === 'number');

  return (
    <div className="portal-enter space-y-12">
      {reports.length > 1 && (
        <div className="flex items-center gap-6 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-3">
          {reports.map((r, i) => (
            <button
              key={r.id || i}
              onClick={() => setIndex(i)}
              aria-pressed={i === index}
              className={`t-ui transition-colors cursor-pointer ${
                i === index
                  ? 'text-slate-950 dark:text-white font-semibold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {r.month}
            </button>
          ))}
        </div>
      )}

      <section>
        <h2 className="font-display text-[28px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white">
          {report.month}
        </h2>

        {(metrics.length > 0 || typeof report.engagementRate === 'number') && (
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-8">
            {typeof report.engagementRate === 'number' && (
              <Metric
                label="Taxa de engajamento"
                value={`${report.engagementRate.toString().replace('.', ',')}%`}
              />
            )}
            {metrics.map((m) => (
              <Metric
                key={m.label}
                label={m.label}
                value={formatNumber(m.value)}
                note={
                  m.label === 'Novos seguidores' && typeof report.followersGrowthPercent === 'number'
                    ? `${report.followersGrowthPercent > 0 ? '+' : ''}${report.followersGrowthPercent}% no mês`
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </section>

      {report.insights?.trim() && (
        <section className="space-y-4">
          <BlockHeader title="Leitura do mês" />
          <p className="t-body leading-relaxed text-slate-700 dark:text-slate-300 max-w-2xl">
            {report.insights}
          </p>
        </section>
      )}

      {(report.highlights?.length || report.improvements?.length) && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {!!report.highlights?.length && (
            <div className="space-y-4">
              <SectionLabel>O que funcionou</SectionLabel>
              <ul className="space-y-2.5">
                {report.highlights.map((h, i) => (
                  <li key={i} className="flex gap-3 t-meta text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 select-none">•</span>
                    <span className="leading-relaxed">{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!!report.improvements?.length && (
            <div className="space-y-4">
              <SectionLabel>O que vamos melhorar</SectionLabel>
              <ul className="space-y-2.5">
                {report.improvements.map((imp, i) => (
                  <li key={i} className="flex gap-3 t-meta text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 select-none">•</span>
                    <span className="leading-relaxed">{imp}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {!!report.topPosts?.length && (
        <section className="space-y-4">
          <BlockHeader title="Publicações de maior desempenho" />
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {report.topPosts.map((p, i) => (
              <li key={i} className="flex items-baseline justify-between gap-6 py-3.5">
                <span className="min-w-0 t-meta text-slate-900 dark:text-white">{p.title}</span>
                <span className="shrink-0 t-meta text-slate-500 dark:text-slate-400 tabular-nums">
                  {p.metric}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string; note?: string }> = ({
  label,
  value,
  note,
}) => (
  <div>
    <p className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white tabular-nums leading-none">
      {value}
    </p>
    <p className="mt-2 t-meta text-slate-500 dark:text-slate-400">{label}</p>
    {note && <p className="mt-0.5 t-meta text-slate-400 dark:text-slate-500">{note}</p>}
  </div>
);
