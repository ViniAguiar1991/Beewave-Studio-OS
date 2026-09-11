import React, { useState } from 'react';
import { Client, ClientStrategyDocument, StrategyChapter } from '../../types';
import { EMELY_STRATEGY_DOCUMENT } from '../../data/emelyStrategy';
import { StrategyImportModal } from './StrategyImportModal';
import {
  Sparkles,
  FileUp,
  Printer,
  ChevronRight,
  Target,
  Users,
  Compass,
  FileText,
  Radio,
  BarChart2,
  Calendar,
  Layers,
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface ClientStrategyTabProps {
  currentClient: Client;
  onUpdateStrategy?: (strategy: ClientStrategyDocument) => void;
}

export const ClientStrategyTab: React.FC<ClientStrategyTabProps> = ({
  currentClient,
  onUpdateStrategy,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Strategy document priority: client custom strategy -> Emely default strategy
  const strategy: ClientStrategyDocument =
    currentClient.strategyDocument || EMELY_STRATEGY_DOCUMENT;

  const [activeChapterId, setActiveChapterId] = useState<string>(
    strategy.chapters[0]?.id || 'chap-01'
  );

  const activeChapter: StrategyChapter | undefined =
    strategy.chapters.find((ch) => ch.id === activeChapterId) || strategy.chapters[0];

  const handleSaveStrategy = (newStrat: ClientStrategyDocument) => {
    if (onUpdateStrategy) {
      onUpdateStrategy(newStrat);
    }
    if (newStrat.chapters.length > 0) {
      setActiveChapterId(newStrat.chapters[0].id);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const chapterIcons: Record<string, any> = {
    '01': Target,
    '02': Users,
    '03': Compass,
    '04': FileText,
    '05': Radio,
    '06': Layers,
    '07': BarChart2,
    '08': Calendar,
    '09': Layers,
    '10': HelpCircle,
  };

  return (
    <div id="notion-style-strategy-view" className="w-full space-y-10 animate-fade-in">
      {/* 1. Notion-Style Document Header (Free, unbounded by heavy nested containers) */}
      <div className="space-y-6 pt-2">
        {/* Cycle Meta Tag & Action Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase">
              {strategy.cycleMeta || 'PLANO DE MARCA, CONTEÚDO E AQUISIÇÃO • SETEMBRO 2026'}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 transition-colors cursor-pointer shadow-2xs"
            >
              <FileUp className="h-3.5 w-3.5" />
              <span>Importar / Interpretar Documento</span>
            </button>

            <button
              onClick={handlePrint}
              title="Imprimir plano de estratégia"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Exportar / Imprimir</span>
            </button>
          </div>
        </div>

        {/* Brand Main Title & Subtitle */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white">
            {strategy.title || currentClient.company}
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 font-normal max-w-3xl leading-relaxed">
            {strategy.subtitle || 'Estratégia para ampliar a presença e transformar procura em vendas.'}
          </p>
        </div>

        {/* 3 Key Decision Highlights (Screenshot 1 Layout: Pure text, generous whitespace, emerald uppercase tags) */}
        {strategy.keyDecisions && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 pb-4 border-y border-slate-200/80 dark:border-slate-800/80">
            <div className="space-y-1.5">
              <span className="text-[11px] font-black tracking-wider text-emerald-700 dark:text-emerald-400 uppercase">
                DECISÃO CENTRAL
              </span>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                {strategy.keyDecisions.centralDecision}
              </p>
            </div>

            <div className="space-y-1.5 md:border-l md:border-slate-200/80 dark:md:border-slate-800/80 md:pl-6">
              <span className="text-[11px] font-black tracking-wider text-emerald-700 dark:text-emerald-400 uppercase">
                POSICIONAMENTO
              </span>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                {strategy.keyDecisions.positioning}
              </p>
            </div>

            <div className="space-y-1.5 md:border-l md:border-slate-200/80 dark:md:border-slate-800/80 md:pl-6">
              <span className="text-[11px] font-black tracking-wider text-emerald-700 dark:text-emerald-400 uppercase">
                PRIORIDADE DO CICLO
              </span>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                {strategy.keyDecisions.cyclePriority}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Notion-Style Two-Column Strategy Canvas (No excessive card containers) */}
      <div className="flex flex-col lg:flex-row items-start gap-8 lg:gap-12 pt-2">
        {/* Left Sticky Sidebar Index (Chapters 01 to 10) */}
        <div className="w-full lg:w-72 shrink-0 space-y-2 sticky top-6">
          <div className="px-2 pb-2">
            <p className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
              CAPÍTULOS DO PLANO
            </p>
          </div>

          <nav className="space-y-0.5">
            {strategy.chapters.map((chap) => {
              const isActive = chap.id === activeChapterId;
              const Icon = chapterIcons[chap.number] || Target;
              return (
                <button
                  key={chap.id}
                  onClick={() => setActiveChapterId(chap.id)}
                  className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`text-[11px] font-bold shrink-0 ${
                        isActive ? 'text-emerald-400 dark:text-emerald-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {chap.number}
                    </span>
                    <span className="truncate">{chap.title}</span>
                  </div>
                  <ChevronRight
                    className={`h-3.5 w-3.5 shrink-0 transition-transform ${
                      isActive ? 'opacity-100 translate-x-0.5' : 'opacity-0 group-hover:opacity-50'
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          {/* Quick Action Hint */}
          <div className="pt-4 px-3">
            <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
              Dica: Você pode enviar novos documentos e notas para reinterpretar os capítulos a qualquer momento.
            </p>
          </div>
        </div>

        {/* Right Notion Main Document Body */}
        <div className="flex-1 min-w-0 space-y-10 pb-16">
          {activeChapter && (
            <div className="space-y-8 animate-fade-in">
              {/* Chapter Header */}
              <div className="space-y-2 border-b border-slate-100 dark:border-slate-800/80 pb-6">
                <span className="text-xs font-extrabold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase">
                  {activeChapter.tag}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {activeChapter.title}
                </h2>
                {activeChapter.subtitle && (
                  <p className="text-base text-slate-600 dark:text-slate-300 font-normal">
                    {activeChapter.subtitle}
                  </p>
                )}
              </div>

              {/* Callout Quote with Green Left Border (As in Screenshot 1) */}
              {activeChapter.callout && (
                <div className="border-l-4 border-emerald-500 pl-5 py-3 space-y-1 my-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-r-xl">
                  <p className="text-base sm:text-lg font-serif italic text-slate-800 dark:text-slate-200 leading-relaxed">
                    "{activeChapter.callout.quote}"
                  </p>
                  {activeChapter.callout.caption && (
                    <span className="text-[10px] font-bold tracking-widest text-emerald-700 dark:text-emerald-400 uppercase block pt-1">
                      {activeChapter.callout.caption}
                    </span>
                  )}
                </div>
              )}

              {/* Portfolio Items List (As in Screenshot 2: Clean list with emerald tags) */}
              {activeChapter.portfolioItems && activeChapter.portfolioItems.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    PORTFÓLIO DE PRODUTOS & PAPEL NA RECEITA
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {activeChapter.portfolioItems.map((item, idx) => (
                      <div key={idx} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3 group">
                        <div className="flex items-start gap-3.5">
                          <span className="text-2xl select-none">{item.icon || '✨'}</span>
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {item.tag && (
                          <div className="sm:text-right shrink-0">
                            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
                              {item.tag}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Occasions Segmentation (Screenshot 2) */}
              {activeChapter.occasions && activeChapter.occasions.length > 0 && (
                <div className="space-y-4 pt-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    SEGMENTAÇÃO POR OCASIÃO
                  </h3>
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {activeChapter.occasions.map((occ, idx) => (
                      <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900">
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {occ.role}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {occ.description}
                          </p>
                        </div>
                        {occ.priority && (
                          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 self-start sm:self-auto">
                            Prioridade: {occ.priority}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 7-Step Journey (Screenshot 3 Layout) */}
              {activeChapter.journeySteps && activeChapter.journeySteps.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    JORNADA DA CLIENTE (DA OCASIÃO AO PÓS-EVENTO)
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
                    {activeChapter.journeySteps.map((j) => (
                      <div key={j.step} className="py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-6 w-6 place-items-center rounded bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {j.step}
                          </span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {j.name}
                          </span>
                          <span className="text-xs italic text-slate-500 dark:text-slate-400 hidden sm:inline">
                            {j.quote}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400 md:text-right">
                          <span className="text-[11px] text-slate-400 block sm:inline sm:mr-1">Pontos de contato:</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">{j.touchpoints}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Commercial Process: Do WhatsApp à Visita (Screenshot 3) */}
              {activeChapter.commercialSteps && activeChapter.commercialSteps.length > 0 && (
                <div className="space-y-4 pt-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    DO WHATSAPP À VISITA (PROCESSO COMERCIAL)
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {activeChapter.commercialSteps.map((step) => (
                      <div key={step.step} className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold">
                            {step.step}
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                            {step.title}
                          </h4>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Critical Bottleneck Alert (Screenshot 3 Layout: Subtle warm background, refined typography) */}
              {activeChapter.bottleneck && (
                <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      {activeChapter.bottleneck.title}
                    </h4>
                  </div>
                  {activeChapter.bottleneck.subtitle && (
                    <p className="text-xs font-bold text-slate-900 dark:text-white">
                      {activeChapter.bottleneck.subtitle}
                    </p>
                  )}
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {activeChapter.bottleneck.description}
                  </p>
                </div>
              )}

              {/* SWOT Matrix (Chapter 06) */}
              {activeChapter.swot && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    ANÁLISE SWOT ESTRATÉGICA
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-emerald-200/80 dark:border-emerald-800/80 bg-emerald-50/30 dark:bg-emerald-950/10 space-y-2">
                      <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                        Forças (Strengths)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {activeChapter.swot.strengths.map((s, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-emerald-600 font-bold">•</span>
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-rose-200/80 dark:border-rose-800/80 bg-rose-50/30 dark:bg-rose-950/10 space-y-2">
                      <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                        Fraquezas (Weaknesses)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {activeChapter.swot.weaknesses.map((w, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-sky-200/80 dark:border-sky-800/80 bg-sky-50/30 dark:bg-sky-950/10 space-y-2">
                      <h4 className="text-xs font-bold text-sky-800 dark:text-sky-400 uppercase tracking-wider">
                        Oportunidades (Opportunities)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {activeChapter.swot.opportunities.map((o, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-sky-600 font-bold">•</span>
                            <span>{o}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/80 bg-amber-50/30 dark:bg-amber-950/10 space-y-2">
                      <h4 className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                        Ameaças (Threats)
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                        {activeChapter.swot.threats.map((t, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-600 font-bold">•</span>
                            <span>{t}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* KPIs & Metrics Table (Chapter 07) */}
              {activeChapter.kpis && activeChapter.kpis.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    METAS & INDICADORES DE PERFORMANCE
                  </h3>
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {activeChapter.kpis.map((kpi, idx) => (
                      <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900">
                        <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {kpi.metric}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {kpi.why}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[11px] text-slate-400">Frequência: {kpi.frequency}</span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                            {kpi.target}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quarter Plan: 90 Days (Chapter 08) */}
              {activeChapter.quarterPlan && activeChapter.quarterPlan.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    CRONOGRAMA DE 90 DIAS
                  </h3>
                  <div className="space-y-4">
                    {activeChapter.quarterPlan.map((plan, idx) => (
                      <div key={idx} className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                            {plan.month}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Foco: {plan.focus}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {plan.title}
                        </h4>
                        <ul className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          {plan.actions.map((act, aIdx) => (
                            <li key={aIdx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{act}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Responsibilities Matrix (Chapter 09) */}
              {activeChapter.responsibilities && activeChapter.responsibilities.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    MATRIZ DE RESPONSABILIDADES
                  </h3>
                  <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {activeChapter.responsibilities.map((resp, idx) => (
                      <div key={idx} className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 bg-white dark:bg-slate-900 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {resp.category}
                        </div>
                        <div className="space-y-1 text-slate-700 dark:text-slate-300">
                          <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 block">Agência BeeWave</span>
                          {resp.agency.map((a, i) => <p key={i}>{a}</p>)}
                        </div>
                        <div className="space-y-1 text-slate-700 dark:text-slate-300">
                          <span className="text-[10px] font-bold uppercase text-slate-500 block">Cliente ({currentClient.company})</span>
                          {resp.client.map((c, i) => <p key={i}>{c}</p>)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Glossary (Chapter 10) */}
              {activeChapter.glossary && activeChapter.glossary.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    GLOSSÁRIO DE TERMOS & CONCEITOS
                  </h3>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border-y border-slate-100 dark:border-slate-800">
                    {activeChapter.glossary.map((item, idx) => (
                      <div key={idx} className="py-3.5 space-y-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                          {item.term}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.definition}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Free Markdown Content Rendering if present */}
              {activeChapter.contentMarkdown && (
                <div className="prose dark:prose-invert max-w-none text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-4 whitespace-pre-line pt-2">
                  {activeChapter.contentMarkdown}
                </div>
              )}

              {/* Bottom Pagination to Next Chapter */}
              <div className="pt-10 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                {(() => {
                  const currentIndex = strategy.chapters.findIndex((c) => c.id === activeChapterId);
                  const nextChapter = strategy.chapters[currentIndex + 1];
                  const prevChapter = strategy.chapters[currentIndex - 1];

                  return (
                    <>
                      {prevChapter ? (
                        <button
                          onClick={() => setActiveChapterId(prevChapter.id)}
                          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                        >
                          <span>← {prevChapter.number} {prevChapter.title}</span>
                        </button>
                      ) : <div />}

                      {nextChapter && (
                        <button
                          onClick={() => setActiveChapterId(nextChapter.id)}
                          className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer ml-auto"
                        >
                          <span>Próximo: {nextChapter.number} {nextChapter.title} →</span>
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Import Modal */}
      <StrategyImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        clientName={currentClient.company}
        onSaveStrategy={handleSaveStrategy}
      />
    </div>
  );
};
