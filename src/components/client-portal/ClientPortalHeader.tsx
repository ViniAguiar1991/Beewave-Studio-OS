import React, { useState } from 'react';
import { Client } from '../../types';
import { ChevronLeft, LogOut, Link2, Check } from 'lucide-react';

export type PortalTabKey =
  | 'resumo'
  | 'aprovacoes'
  | 'estrategia'
  | 'campanhas'
  | 'calendario'
  | 'arquivos'
  | 'resultados';

interface PortalTab {
  key: PortalTabKey;
  label: string;
  /** Contagem só aparece quando exige ação do cliente. */
  badge?: number;
}

interface ClientPortalHeaderProps {
  client?: Client;
  allClients: Client[];
  activeTab: PortalTabKey;
  onSelectTab: (tab: PortalTabKey) => void;
  onSwitchClient: (id: string) => void;
  isClientLocked: boolean;
  onBackToApp?: () => void;
  onLogout: () => void;
  pendingCount: number;
  /** A aba Resultados só existe quando há relatório para ler. */
  hasReports: boolean;
  /** Idem Campanhas: sem campanha montada, a aba não aparece vazia. */
  hasCampaigns: boolean;
  /** Frase única de situação, calculada pelo Resumo. */
  statusLine: string;
}

/**
 * Cabeçalho do Portal do Cliente.
 *
 * Responde, nesta ordem, às três perguntas do modo Operate:
 *   1. De quem é este espaço?   → identidade do cliente
 *   2. Como está a situação?    → uma frase concreta, com números reais
 *   3. Onde eu estou?           → aba ativa marcada sem ambiguidade
 *
 * Os rótulos são deliberadamente literais. "Aprovações" e "Arquivos" navegam
 * melhor que "Central criativa" ou "Hub de marca".
 */
export const ClientPortalHeader: React.FC<ClientPortalHeaderProps> = ({
  client,
  allClients,
  activeTab,
  onSelectTab,
  onSwitchClient,
  isClientLocked,
  onBackToApp,
  onLogout,
  pendingCount,
  hasReports,
  hasCampaigns,
  statusLine,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);

  const tabs: PortalTab[] = [
    { key: 'resumo', label: 'Resumo' },
    { key: 'aprovacoes', label: 'Aprovações', badge: pendingCount },
    { key: 'estrategia', label: 'Estratégia' },
    ...(hasCampaigns ? [{ key: 'campanhas' as PortalTabKey, label: 'Campanhas' }] : []),
    { key: 'calendario', label: 'Calendário' },
    { key: 'arquivos', label: 'Arquivos' },
    ...(hasReports ? [{ key: 'resultados' as PortalTabKey, label: 'Resultados' }] : []),
  ];

  const handleCopyPortalLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      /* clipboard bloqueado pelo navegador — o link segue visível na barra de endereços */
    }
  };

  return (
    <header className="w-full border-b border-slate-200 dark:border-slate-800">
      {/* Barra utilitária: contexto de sessão, nunca conteúdo. */}
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
        {isClientLocked ? (
          <span className="t-meta text-slate-500 dark:text-slate-400">
            Portal Beewave
          </span>
        ) : (
          <button
            onClick={onBackToApp}
            className="group inline-flex items-center gap-1.5 t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Voltar ao Studio
          </button>
        )}

        <div className="flex items-center gap-5">
          {!isClientLocked && allClients.length > 0 && (
            <label className="flex items-center gap-2 t-meta">
              <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                Visualizando como
              </span>
              <select
                value={client?.id || ''}
                onChange={(e) => onSwitchClient(e.target.value)}
                className="bg-transparent font-medium text-slate-900 dark:text-white border-b border-slate-300 dark:border-slate-700 pb-0.5 focus:outline-none focus:border-slate-900 dark:focus:border-white cursor-pointer"
              >
                {allClients.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    {c.company}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button
            onClick={handleCopyPortalLink}
            className="inline-flex items-center gap-1.5 t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400">Link copiado</span>
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Copiar link</span>
              </>
            )}
          </button>

          <button
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>

      {/* Identidade do cliente + situação em uma frase. */}
      <div className="mx-auto max-w-6xl px-5 sm:px-8 pt-7 pb-6">
        <div className="flex items-center gap-4">
          <ClientMark client={client} />
          <div className="min-w-0">
            <h1 className="font-display text-[26px] sm:text-[32px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight truncate">
              {client?.company || 'Portal do cliente'}
            </h1>
            {/* A frase mais importante da tela: lida em tamanho de leitura. */}
            <p className="t-body text-slate-600 dark:text-slate-400 mt-1">{statusLine}</p>
          </div>
        </div>
      </div>

      {/* Navegação. Uma aba leva a um lugar — nenhuma aba executa uma ação. */}
      <nav
        className="mx-auto max-w-6xl px-5 sm:px-8 flex items-center gap-7 overflow-x-auto no-scrollbar"
        aria-label="Seções do portal"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              id={`tab-portal-${tab.key}`}
              onClick={() => onSelectTab(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-2 pb-3 -mb-px border-b-2 t-ui whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {!!tab.badge && tab.badge > 0 && (
                <span
                  className={`grid place-items-center h-[18px] min-w-[18px] px-1 rounded-full t-meta font-semibold leading-none ${
                    isActive
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-amber-500 text-slate-950'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </header>
  );
};

/** Logo do cliente quando existe; iniciais como reserva estável. */
const ClientMark: React.FC<{ client?: Client }> = ({ client }) => {
  const initials = (client?.company || 'BW')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (client?.logoUrl) {
    return (
      <img
        src={client.logoUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-full object-cover border border-slate-200 dark:border-slate-800"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-display font-semibold t-meta"
    >
      {initials}
    </span>
  );
};
