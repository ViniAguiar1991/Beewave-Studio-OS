import React, { useState } from 'react';
import { Client } from '../../types';
import { ChevronLeft, LogOut, Link2, Check, GripVertical, Eye, EyeOff, SlidersHorizontal } from 'lucide-react';

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
  /** Frase única de situação, calculada pelo Resumo. */
  statusLine: string;
  /** Salva a ordem e as abas ocultas deste cliente. Só existe na visão da agência. */
  onSavePortalConfig?: (config: { tabOrder: string[]; hiddenTabs: string[] }) => void;
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
  statusLine,
  onSavePortalConfig,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [personalizando, setPersonalizando] = useState(false);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [sobre, setSobre] = useState<string | null>(null);

  // Planejamento vem logo depois do Resumo por padrão: é a pergunta mais
  // frequente do cliente ("o que sai esta semana?"). A chave interna segue
  // 'calendario' para não perder a aba salva de quem já usava o portal.
  //
  // Campanhas aparece sempre. Escondida quando vazia, ela sumia e reaparecia
  // conforme a agência cadastrava, e parecia defeito.
  const padrao: PortalTab[] = [
    { key: 'resumo', label: 'Resumo' },
    { key: 'calendario', label: 'Planejamento' },
    { key: 'aprovacoes', label: 'Aprovações', badge: pendingCount },
    { key: 'estrategia', label: 'Estratégia' },
    { key: 'campanhas', label: 'Campanhas' },
    { key: 'arquivos', label: 'Arquivos' },
    ...(hasReports ? [{ key: 'resultados' as PortalTabKey, label: 'Resultados' }] : []),
  ];

  /**
   * A agência escolhe a ordem e quais abas o cliente vê, por cliente. Aba
   * nova (que ainda não estava na ordem salva) entra no fim, na posição
   * padrão — assim criar uma aba no futuro não some com ela de ninguém.
   */
  const ordemSalva = client?.portalConfig?.tabOrder || [];
  const ocultas = client?.portalConfig?.hiddenTabs || [];
  const ordenadas = [...padrao].sort((a, b) => {
    const ia = ordemSalva.indexOf(a.key);
    const ib = ordemSalva.indexOf(b.key);
    if (ia === -1 && ib === -1) return padrao.indexOf(a) - padrao.indexOf(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  const tabs = personalizando ? ordenadas : ordenadas.filter((t) => !ocultas.includes(t.key));

  const salvarConfig = (tabOrder: string[], hiddenTabs: string[]) =>
    onSavePortalConfig?.({ tabOrder, hiddenTabs });

  const soltarEm = (alvo: string) => {
    if (!arrastando || arrastando === alvo) return;
    const chaves = ordenadas.map((t) => t.key as string);
    const de = chaves.indexOf(arrastando);
    const para = chaves.indexOf(alvo);
    chaves.splice(de, 1);
    chaves.splice(para, 0, arrastando);
    salvarConfig(chaves, ocultas);
  };

  const alternarOculta = (key: string) => {
    const visiveis = ordenadas.filter((t) => !ocultas.includes(t.key));
    const vaiOcultar = !ocultas.includes(key);
    // Pelo menos uma aba fica visível, senão o portal abre em branco.
    if (vaiOcultar && visiveis.length <= 1) return;
    salvarConfig(
      ordenadas.map((t) => t.key as string),
      vaiOcultar ? [...ocultas, key] : ocultas.filter((k) => k !== key)
    );
  };

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
    <header className="w-full">
      {/* Barra utilitária: contexto de sessão, nunca conteúdo. */}
      <div className="w-full bg-slate-950">
      <div className="mx-auto max-w-6xl px-5 sm:px-8 h-14 flex items-center justify-between gap-4">
        {isClientLocked ? (
          <span className="inline-flex items-center gap-2.5 t-ui text-white">
            <MarcaBeewave />
            Portal Beewave
          </span>
        ) : (
          <button
            onClick={onBackToApp}
            className="group inline-flex items-center gap-1.5 t-ui text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
            Voltar ao Studio
          </button>
        )}

        <div className="flex items-center gap-5">
          {!isClientLocked && allClients.length > 0 && (
            <label className="flex items-center gap-2 t-meta">
              <span className="text-slate-400 hidden sm:inline">Visualizando como</span>
              <select
                value={client?.id || ''}
                onChange={(e) => onSwitchClient(e.target.value)}
                className="bg-transparent font-medium text-white border-b border-slate-600 pb-0.5 focus:outline-none focus:border-white cursor-pointer"
              >
                {allClients.map((c) => (
                  <option key={c.id} value={c.id} className="dark:bg-slate-900">
                    {c.company}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!isClientLocked && onSavePortalConfig && (
            <button
              onClick={() => setPersonalizando((v) => !v)}
              aria-pressed={personalizando}
              className={`inline-flex items-center gap-1.5 t-ui transition-colors cursor-pointer ${
                personalizando
                  ? 'text-amber-400 font-medium'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{personalizando ? 'Concluir' : 'Personalizar menu'}</span>
            </button>
          )}

          <button
            onClick={handleCopyPortalLink}
            className="inline-flex items-center gap-1.5 t-ui text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Link copiado</span>
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
            className="inline-flex items-center gap-1.5 t-ui text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </div>
      </div>
      </div>

      {/* Faixa de identidade: separa o espaço do cliente do conteúdo abaixo. */}
      <div className="w-full bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
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

      {/* Navegação. Uma aba leva a um lugar — nenhuma aba executa uma ação.
          No modo personalizar (só a agência vê), as abas se arrastam para os
          lados e o olho esconde ou mostra cada uma para este cliente. */}
      {personalizando && (
        <div className="mx-auto max-w-6xl px-5 sm:px-8 pb-3">
          <p className="t-meta text-amber-800 dark:text-amber-300">
            Arraste as abas para mudar a ordem. O olho mostra ou esconde a aba para {client?.company || 'este cliente'}. Salva na hora.
          </p>
        </div>
      )}
      <nav
        className="mx-auto max-w-6xl px-5 sm:px-8 flex items-center gap-7 overflow-x-auto no-scrollbar"
        aria-label="Seções do portal"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const oculta = ocultas.includes(tab.key);
          const alvoDoArraste = personalizando && sobre === tab.key && arrastando !== tab.key;
          return (
            <span
              key={tab.key}
              draggable={personalizando}
              onDragStart={(e) => {
                setArrastando(tab.key);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                if (!personalizando) return;
                e.preventDefault();
                setSobre(tab.key);
              }}
              onDragLeave={() => setSobre((s) => (s === tab.key ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                soltarEm(tab.key);
                setArrastando(null);
                setSobre(null);
              }}
              onDragEnd={() => {
                setArrastando(null);
                setSobre(null);
              }}
              className={`relative flex items-center gap-1.5 ${
                personalizando ? 'cursor-grab active:cursor-grabbing' : ''
              } ${arrastando === tab.key ? 'opacity-40' : ''} ${
                alvoDoArraste ? 'before:absolute before:-left-3.5 before:top-0 before:bottom-3 before:w-0.5 before:bg-amber-500' : ''
              }`}
            >
            {personalizando && <GripVertical className="h-3.5 w-3.5 text-slate-400 shrink-0" aria-hidden="true" />}
            <button
              id={`tab-portal-${tab.key}`}
              onClick={() => onSelectTab(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex items-center gap-2 pb-3 -mb-px border-b-2 t-ui whitespace-nowrap transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              } ${oculta ? 'line-through opacity-50' : ''}`}
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
            {personalizando && (
              <button
                type="button"
                onClick={() => alternarOculta(tab.key)}
                aria-label={oculta ? `Mostrar ${tab.label} para o cliente` : `Esconder ${tab.label} do cliente`}
                title={oculta ? 'Mostrar para o cliente' : 'Esconder do cliente'}
                className="grid h-6 w-6 -mb-3 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {oculta ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}
            </span>
          );
        })}
      </nav>
      </div>
    </header>
  );
};

/** Marca da Beewave na barra do portal: hexágono com o recorte claro. */
const MarcaBeewave: React.FC = () => (
  <svg viewBox="0 0 24 26" aria-hidden="true" className="h-5 w-5 shrink-0">
    <path
      d="M12 0.8 22.4 6.9v12.2L12 25.2 1.6 19.1V6.9z"
      fill="#F9AE3F"
    />
    <path
      d="M13.6 5.6 19 8.8a1.6 1.6 0 0 1 .8 1.4v6.1a1 1 0 0 1-1.5.9l-5.4-3.2a1.6 1.6 0 0 1-.8-1.4V6.5a1 1 0 0 1 1.5-.9z"
      fill="#ffffff"
    />
  </svg>
);

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
