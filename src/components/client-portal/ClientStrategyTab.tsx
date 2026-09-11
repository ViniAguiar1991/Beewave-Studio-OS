import React, { useEffect, useMemo, useState } from 'react';
import { Client, ClientStrategyDocument, StrategyChapter } from '../../types';
import { StrategyImportModal } from './StrategyImportModal';
import { Button, EmptyState } from '../ui';
import { FileUp, Printer, AlertTriangle } from 'lucide-react';

interface ClientStrategyTabProps {
  currentClient: Client;
  onUpdateStrategy?: (strategy: ClientStrategyDocument) => void;
  /**
   * Importar e reinterpretar o documento é ferramenta da agência.
   * No portal do cliente esses controles não existem: o cliente lê a estratégia
   * e pede alteração — não reescreve o próprio plano.
   */
  isAgencyView?: boolean;
  /** Abre o pedido de alteração. Só no portal do cliente. */
  onRequestChange?: () => void;
}

/**
 * Estratégia — um documento só, do começo ao fim.
 *
 * Antes cada capítulo era uma aba: para ler o plano inteiro o cliente tinha de
 * clicar dez vezes e nunca via o conjunto. Agora o plano é texto corrido e o
 * índice lateral serve para pular, não para trocar de tela — que é como se lê
 * um documento.
 *
 * O índice acompanha a rolagem com altura limitada e scroll próprio, então não
 * passa por cima do texto por mais longo que o capítulo seja.
 */
export const ClientStrategyTab: React.FC<ClientStrategyTabProps> = ({
  currentClient,
  onUpdateStrategy,
  isAgencyView = false,
  onRequestChange,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  /**
   * A estratégia exibida é SEMPRE a do cliente atual.
   *
   * Não existe documento padrão de reserva. Havia um: quando o cliente não
   * tinha plano próprio, o portal caía no documento da Emely Moda Festa — e
   * qualquer outro cliente logado via o posicionamento, a SWOT e o plano de
   * 90 dias de uma marca concorrente. Se não há documento, não há o que ler.
   */
  const strategy: ClientStrategyDocument | undefined = currentClient.strategyDocument;
  const chapters: StrategyChapter[] = useMemo(() => strategy?.chapters || [], [strategy]);

  const [activeId, setActiveId] = useState<string>('');

  /**
   * Marca no índice o capítulo que está sendo lido: o último cujo título já
   * passou pela linha de leitura (um quarto abaixo do topo da janela).
   *
   * IntersectionObserver não serve bem aqui — capítulos longos continuam
   * cruzando a faixa de observação depois que o próximo já apareceu na tela, e
   * o índice fica marcando o capítulo anterior.
   */
  useEffect(() => {
    if (chapters.length === 0) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.25;
      let current = chapters[0]?.id || '';

      for (const ch of chapters) {
        const el = document.getElementById(ch.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= readingLine) current = ch.id;
        else break;
      }

      setActiveId(current);
    };

    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [chapters]);

  const handleSaveStrategy = (newStrat: ClientStrategyDocument) => {
    onUpdateStrategy?.(newStrat);
  };

  const goToChapter = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  // Sem documento próprio, o portal diz isso com todas as letras — e nunca
  // mostra a estratégia de outra marca no lugar.
  if (!strategy || chapters.length === 0) {
    return (
      <div className="portal-enter">
        <EmptyState
          title={`A estratégia de ${currentClient.company} ainda não foi publicada aqui`}
          hint={
            isAgencyView
              ? 'Importe o documento do plano para que o cliente possa lê-lo por este portal.'
              : 'Assim que a Beewave publicar o plano de marca e conteúdo, ele aparece nesta aba, capítulo por capítulo.'
          }
          action={
            isAgencyView ? (
              <Button variant="primary" size="sm" icon={FileUp} onClick={() => setIsImportModalOpen(true)}>
                Importar documento
              </Button>
            ) : undefined
          }
        />
        <StrategyImportModal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          clientName={currentClient.company}
          onSaveStrategy={handleSaveStrategy}
        />
      </div>
    );
  }

  return (
    <div className="portal-enter">
      {/* Capa do documento */}
      <header className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <span className="t-label text-slate-500">
            {strategy.cycleMeta || 'Plano de marca, conteúdo e aquisição'}
          </span>

          <div className="flex items-center gap-3 flex-wrap">
            {isAgencyView && (
              <Button variant="secondary" size="sm" icon={FileUp} onClick={() => setIsImportModalOpen(true)}>
                Importar documento
              </Button>
            )}
            <Button variant="ghost" size="sm" icon={Printer} onClick={() => window.print()}>
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            {!isAgencyView && onRequestChange && (
              <Button variant="secondary" size="sm" onClick={onRequestChange}>
                Pedir alteração
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white leading-[1.05]">
            {strategy.title || currentClient.company}
          </h1>
          {strategy.subtitle && (
            <p className="text-[18px] sm:text-[20px] text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {strategy.subtitle}
            </p>
          )}
        </div>

        {strategy.keyDecisions && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 pt-5 pb-6 border-y border-slate-200 dark:border-slate-800">
            <KeyDecision label="Decisão central" text={strategy.keyDecisions.centralDecision} />
            <KeyDecision label="Posicionamento" text={strategy.keyDecisions.positioning} bordered />
            <KeyDecision label="Prioridade do ciclo" text={strategy.keyDecisions.cyclePriority} bordered />
          </div>
        )}
      </header>

      {/* Índice + documento corrido.
          Sem `items-start`: o <nav> precisa esticar até o fim do documento,
          senão ele tem só a altura do próprio conteúdo e o sticky não tem
          espaço para grudar — o índice simplesmente sobe junto com a página. */}
      <div className="flex gap-10 xl:gap-16 pt-12">
        <nav aria-label="Capítulos do plano" className="hidden lg:block w-60 xl:w-64 shrink-0">
          {/* Altura limitada e rolagem própria: o índice nunca cobre o texto. */}
          <div className="sticky top-6 max-h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar pb-6">
            <p className="t-label text-slate-400 dark:text-slate-500 px-3 pb-3">Neste plano</p>
            <ul className="space-y-0.5">
              {chapters.map((ch) => {
                const isActive = activeId === ch.id;
                return (
                  <li key={ch.id}>
                    <button
                      onClick={() => goToChapter(ch.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full text-left flex gap-2.5 px-3 py-2 rounded-lg t-ui transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span
                        className={`shrink-0 tabular-nums ${
                          isActive
                            ? 'text-amber-600 dark:text-amber-500'
                            : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {ch.number}
                      </span>
                      <span className="min-w-0">{ch.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <article className="min-w-0 flex-1 max-w-3xl">
          {chapters.map((ch, i) => (
            <ChapterBlock
              key={ch.id}
              chapter={ch}
              clientName={currentClient.company}
              isFirst={i === 0}
            />
          ))}
        </article>
      </div>

      <StrategyImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        clientName={currentClient.company}
        onSaveStrategy={handleSaveStrategy}
      />
    </div>
  );
};

/* ========================================================================== */

const KeyDecision: React.FC<{ label: string; text: string; bordered?: boolean }> = ({
  label,
  text,
  bordered,
}) => (
  <div className={bordered ? 'md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-8' : ''}>
    <span className="t-label text-slate-500">{label}</span>
    <p className="t-body text-slate-800 dark:text-slate-200 mt-2">{text}</p>
  </div>
);

const SubHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="t-label text-slate-400 dark:text-slate-500 mt-10 mb-4">{children}</h3>
);

/**
 * Um capítulo do plano. Cada bloco opcional só aparece quando o documento
 * importado trouxe aquele conteúdo.
 */
const ChapterBlock: React.FC<{
  chapter: StrategyChapter;
  clientName: string;
  isFirst: boolean;
}> = ({ chapter, clientName, isFirst }) => (
  <section
    id={chapter.id}
    data-chapter
    className={isFirst ? '' : 'mt-20 pt-14 border-t border-slate-200 dark:border-slate-800'}
  >
    <span className="t-label text-slate-400 dark:text-slate-500">{chapter.tag}</span>
    <h2 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight mt-2">
      {chapter.title}
    </h2>
    {chapter.subtitle && (
      <p className="t-body text-slate-600 dark:text-slate-300 mt-3">{chapter.subtitle}</p>
    )}

    {chapter.callout && (
      <blockquote className="border-l-2 border-amber-500 pl-6 my-8">
        <p className="text-[19px] leading-relaxed text-slate-800 dark:text-slate-200 italic">
          “{chapter.callout.quote}”
        </p>
        {chapter.callout.caption && (
          <span className="t-label text-slate-500 block mt-3">{chapter.callout.caption}</span>
        )}
      </blockquote>
    )}

    {!!chapter.portfolioItems?.length && (
      <>
        <SubHeading>Portfólio e papel na receita</SubHeading>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {chapter.portfolioItems.map((item, i) => (
            <li key={i} className="py-5 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-4 min-w-0">
                <span className="text-[22px] select-none leading-none pt-0.5">{item.icon || '•'}</span>
                <div className="min-w-0">
                  <h4 className="t-lead font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                  <p className="t-body text-slate-600 dark:text-slate-300 mt-1">{item.description}</p>
                </div>
              </div>
              {item.tag && (
                <span className="shrink-0 self-start t-meta text-slate-500 dark:text-slate-400 sm:text-right">
                  {item.tag}
                </span>
              )}
            </li>
          ))}
        </ul>
      </>
    )}

    {!!chapter.occasions?.length && (
      <>
        <SubHeading>Segmentação por ocasião</SubHeading>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {chapter.occasions.map((occ, i) => (
            <li key={i} className="py-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="t-lead font-medium text-slate-900 dark:text-white">{occ.role}</p>
                <p className="t-body text-slate-600 dark:text-slate-400 mt-0.5">{occ.description}</p>
              </div>
              {occ.priority && (
                <span className="shrink-0 t-meta text-slate-500 dark:text-slate-400">
                  Prioridade {occ.priority}
                </span>
              )}
            </li>
          ))}
        </ul>
      </>
    )}

    {!!chapter.journeySteps?.length && (
      <>
        <SubHeading>Jornada da cliente</SubHeading>
        <ol className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {chapter.journeySteps.map((j) => (
            <li key={j.step} className="py-4 flex items-baseline gap-3">
              <span className="shrink-0 t-meta tabular-nums text-slate-400 dark:text-slate-600">
                {String(j.step).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="t-lead font-medium text-slate-900 dark:text-white">{j.name}</p>
                {j.quote && (
                  <p className="t-body text-slate-500 dark:text-slate-400 italic mt-0.5">“{j.quote}”</p>
                )}
                {j.touchpoints && (
                  <p className="t-meta text-slate-500 dark:text-slate-400 mt-1.5">
                    Pontos de contato: {j.touchpoints}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </>
    )}

    {!!chapter.commercialSteps?.length && (
      <>
        <SubHeading>Do primeiro contato à visita</SubHeading>
        <ol className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {chapter.commercialSteps.map((step) => (
            <li key={step.step} className="py-4 flex items-baseline gap-3">
              <span className="shrink-0 t-meta tabular-nums text-slate-400 dark:text-slate-600">
                {String(step.step).padStart(2, '0')}
              </span>
              <div className="min-w-0">
                <p className="t-lead font-medium text-slate-900 dark:text-white">{step.title}</p>
                <p className="t-body text-slate-600 dark:text-slate-300 mt-0.5">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </>
    )}

    {chapter.bottleneck && (
      <div className="my-8 border-l-2 border-rose-500 pl-6">
        <span className="t-label text-rose-700 dark:text-rose-400 flex items-center gap-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          {chapter.bottleneck.title}
        </span>
        {chapter.bottleneck.subtitle && (
          <p className="t-lead font-semibold text-slate-900 dark:text-white mt-2">
            {chapter.bottleneck.subtitle}
          </p>
        )}
        <p className="t-body text-slate-700 dark:text-slate-300 mt-1">
          {chapter.bottleneck.description}
        </p>
      </div>
    )}

    {chapter.swot && (
      <>
        <SubHeading>Análise SWOT</SubHeading>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
          <SwotList title="Forças" items={chapter.swot.strengths} accent="text-emerald-700 dark:text-emerald-400" />
          <SwotList title="Fraquezas" items={chapter.swot.weaknesses} accent="text-rose-700 dark:text-rose-400" />
          <SwotList title="Oportunidades" items={chapter.swot.opportunities} accent="text-sky-700 dark:text-sky-400" />
          <SwotList title="Ameaças" items={chapter.swot.threats} accent="text-amber-700 dark:text-amber-500" />
        </div>
      </>
    )}

    {!!chapter.kpis?.length && (
      <>
        <SubHeading>Metas e indicadores</SubHeading>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {chapter.kpis.map((kpi, i) => (
            <li key={i} className="py-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div className="min-w-0">
                <p className="t-lead font-medium text-slate-900 dark:text-white">{kpi.metric}</p>
                <p className="t-body text-slate-600 dark:text-slate-400 mt-0.5">{kpi.why}</p>
              </div>
              <div className="shrink-0 sm:text-right">
                <p className="t-lead font-semibold text-slate-950 dark:text-white tabular-nums">
                  {kpi.target}
                </p>
                <p className="t-meta text-slate-500 dark:text-slate-400">{kpi.frequency}</p>
              </div>
            </li>
          ))}
        </ul>
      </>
    )}

    {!!chapter.quarterPlan?.length && (
      <>
        <SubHeading>Plano de 90 dias</SubHeading>
        <div className="space-y-8 border-t border-slate-200 dark:border-slate-800 pt-6">
          {chapter.quarterPlan.map((plan, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-4 flex-wrap">
                <h4 className="t-lead font-semibold text-slate-950 dark:text-white">
                  {plan.month} · {plan.title}
                </h4>
                <span className="t-meta text-slate-500 dark:text-slate-400">Foco: {plan.focus}</span>
              </div>
              <ul className="mt-3 space-y-2">
                {plan.actions.map((act, ai) => (
                  <li key={ai} className="flex gap-3 t-body text-slate-700 dark:text-slate-300">
                    <span className="text-slate-400 select-none">•</span>
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </>
    )}

    {!!chapter.responsibilities?.length && (
      <>
        <SubHeading>Quem faz o quê</SubHeading>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {chapter.responsibilities.map((resp, i) => (
            <li key={i} className="py-5">
              <p className="t-lead font-semibold text-slate-900 dark:text-white">{resp.category}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mt-3">
                <div>
                  <span className="t-label text-amber-600 dark:text-amber-500">Beewave</span>
                  <div className="mt-1.5 space-y-1">
                    {resp.agency.map((a, ai) => (
                      <p key={ai} className="t-body text-slate-700 dark:text-slate-300">
                        {a}
                      </p>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="t-label text-slate-500">{clientName}</span>
                  <div className="mt-1.5 space-y-1">
                    {resp.client.map((c, ci) => (
                      <p key={ci} className="t-body text-slate-700 dark:text-slate-300">
                        {c}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </>
    )}

    {!!chapter.glossary?.length && (
      <>
        <SubHeading>Glossário</SubHeading>
        <dl className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {chapter.glossary.map((item, i) => (
            <div key={i} className="py-4">
              <dt className="t-lead font-medium text-slate-900 dark:text-white">{item.term}</dt>
              <dd className="t-body text-slate-600 dark:text-slate-400 mt-0.5">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </>
    )}

    {chapter.contentMarkdown && (
      <p className="t-body text-slate-700 dark:text-slate-300 whitespace-pre-line mt-6">
        {chapter.contentMarkdown}
      </p>
    )}
  </section>
);

const SwotList: React.FC<{ title: string; items: string[]; accent: string }> = ({
  title,
  items,
  accent,
}) => (
  <div>
    <span className={`t-label ${accent}`}>{title}</span>
    <ul className="mt-2.5 space-y-2">
      {items.map((s, i) => (
        <li key={i} className="flex gap-3 t-body text-slate-700 dark:text-slate-300">
          <span className="text-slate-400 select-none">•</span>
          <span>{s}</span>
        </li>
      ))}
    </ul>
  </div>
);
