import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  FolderKanban,
  Building2,
  Users,
  FileText,
  Trash2,
  Settings,
  Cloud,
  Sun,
  Moon,
  LogOut,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';

interface AppSidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCloudModal: () => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  perm?: string;
}

/**
 * Navegação principal da agência.
 *
 * Era um trilho de 72px só com ícones: os nomes apareciam apenas no hover, e
 * "Tarefas", "Campanhas" e "Clientes" viravam três ícones parecidos que o time
 * tinha de decorar. Agora o rótulo está sempre visível — navegação usada o dia
 * inteiro não se esconde atrás de tooltip. Recolher virou escolha de quem usa,
 * não o padrão.
 *
 * Calendário não está aqui: virou um modo de visualização dentro de Tarefas,
 * ao lado de Lista e Quadro. Como tela separada ele repetia a mesma pergunta
 * com filtros próprios.
 *
 * Lixeira, configurações, nuvem e tema ficam no rodapé, colados em quem está
 * logado — são ferramentas da sessão, não lugares de trabalho. E sem contador
 * em lugar nenhum: número no menu cobra atenção o tempo todo, e a fila real
 * já aparece no Início e na própria Central de Tarefas.
 */
export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCloudModal,
}) => {
  const currentUser = useCurrentUser();
  const logout = useAppStore((s) => s.logout);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const cloudSync = useAppStore((s) => s.cloudSync);
  const iconDataUrl = useAppStore((s) => s.iconDataUrl);
  const agencyName = useAppStore((s) => s.agencyName);
  const can = useAppStore((s) => s.can);
  const recolhido = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  const [mobileOpen, setMobileOpen] = useState(false);

  // Navegar fecha o menu no celular — senão o painel cobre o destino.
  useEffect(() => {
    setMobileOpen(false);
  }, [currentTab]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const navItems: NavItem[] = (
    [
      { id: 'inicio', label: 'Início', icon: LayoutDashboard },
      { id: 'tarefas', label: 'Tarefas', icon: ListChecks, perm: 'tarefas' },
      { id: 'campanhas', label: 'Campanhas', icon: FolderKanban, perm: 'tarefas' },
      { id: 'clientes', label: 'Clientes', icon: Building2, perm: 'clientes' },
      { id: 'colaboradores', label: 'Equipe', icon: Users, perm: 'equipe' },
      { id: 'prompts', label: 'Prompts', icon: FileText, perm: 'prompts' },
    ] as NavItem[]
  ).filter((item) => (item.perm ? can(item.perm) : true));

  const utilities: NavItem[] = [
    { id: 'lixeira', label: 'Lixeira', icon: Trash2 },
    ...(currentUser?.role === 'admin'
      ? [{ id: 'admin', label: 'Configurações', icon: Settings } as NavItem]
      : []),
  ];

  /**
   * O painel do celular nunca abre recolhido: lá o espaço já é escasso e a
   * gaveta some assim que você escolhe o destino.
   */
  const montarCorpo = (compacto: boolean) => (
    <>
      {/* Marca */}
      <div
        className={`flex items-center h-16 shrink-0 ${compacto ? 'justify-center px-2' : 'gap-2.5 px-3'}`}
      >
        {iconDataUrl ? (
          <img src={iconDataUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-display font-bold text-[13px]">
            {(agencyName || 'BW').slice(0, 2).toUpperCase()}
          </span>
        )}
        {!compacto && (
          <span className="font-display font-semibold tracking-tight text-slate-950 dark:text-white truncate">
            {agencyName || 'Beewave Studio'}
          </span>
        )}
      </div>

      {/* Destinos */}
      <nav
        className={`flex-1 overflow-y-auto no-scrollbar pt-2 ${compacto ? 'px-2' : 'px-2'}`}
        aria-label="Navegação principal"
      >
        <ul className="space-y-0.5">
          {navItems.map((item) => (
            <li key={item.id}>
              <NavButton
                item={item}
                compacto={compacto}
                isActive={currentTab === item.id}
                onClick={() => onSelectTab(item.id)}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* ---------------------------------------------------------------
          Rodapé: utilitários colados em quem está logado
         --------------------------------------------------------------- */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 pt-2 px-2 pb-2">
        <ul className="space-y-0.5">
          {utilities.map((item) => (
            <li key={item.id}>
              <NavButton
                item={item}
                compacto={compacto}
                isActive={currentTab === item.id}
                onClick={() => onSelectTab(item.id)}
                muted
              />
            </li>
          ))}

          <li>
            <button
              onClick={onOpenCloudModal}
              title={compacto ? 'Nuvem' : undefined}
              aria-label={compacto ? 'Nuvem' : undefined}
              className={`relative w-full flex items-center rounded-lg t-ui text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                compacto ? 'justify-center h-9 px-0' : 'gap-3 px-3 py-2'
              }`}
            >
              <Cloud className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              {!compacto && <span className="min-w-0 truncate">Nuvem</span>}
              <span
                className={`rounded-full shrink-0 ${
                  cloudSync.connected ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                } ${compacto ? 'absolute top-1.5 right-2 h-1.5 w-1.5' : 'ml-auto h-1.5 w-1.5'}`}
                title={cloudSync.connected ? 'Sincronizado' : 'Desconectado'}
              />
            </button>
          </li>

          <li>
            <button
              onClick={toggleDarkMode}
              title={compacto ? (darkMode ? 'Modo claro' : 'Modo escuro') : undefined}
              aria-label={compacto ? (darkMode ? 'Modo claro' : 'Modo escuro') : undefined}
              className={`w-full flex items-center rounded-lg t-ui text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                compacto ? 'justify-center h-9 px-0' : 'gap-3 px-3 py-2'
              }`}
            >
              {darkMode ? (
                <Sun className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              ) : (
                <Moon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              )}
              {!compacto && (
                <span className="min-w-0 truncate">{darkMode ? 'Modo claro' : 'Modo escuro'}</span>
              )}
            </button>
          </li>

          {/* Recolher só existe no desktop: no celular a gaveta já fecha. */}
          <li className="hidden md:block">
            <button
              onClick={toggleSidebar}
              title={recolhido ? 'Expandir menu' : 'Recolher menu'}
              aria-label={recolhido ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!recolhido}
              className={`w-full flex items-center rounded-lg t-ui text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                compacto ? 'justify-center h-9 px-0' : 'gap-3 px-3 py-2'
              }`}
            >
              {recolhido ? (
                <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              ) : (
                <PanelLeftClose className="h-[18px] w-[18px] shrink-0" strokeWidth={1.8} />
              )}
              {!compacto && <span className="min-w-0 truncate">Recolher menu</span>}
            </button>
          </li>
        </ul>
      </div>

      {/* Quem está usando */}
      <div className="shrink-0 border-t border-slate-200 dark:border-slate-800 p-3">
        <div className={`flex items-center ${compacto ? 'justify-center' : 'gap-2.5'}`}>
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white font-semibold t-meta"
            style={{ backgroundColor: currentUser?.color || '#0f172a' }}
            title={compacto ? currentUser?.name : undefined}
            aria-hidden={!compacto}
          >
            {(currentUser?.name || '?').charAt(0).toUpperCase()}
          </span>

          {!compacto && (
            <>
              <span className="min-w-0 flex-1">
                <span className="block t-ui font-medium text-slate-900 dark:text-white truncate">
                  {currentUser?.name}
                </span>
                <span className="block t-meta text-slate-500 dark:text-slate-400 truncate">
                  {currentUser?.role === 'admin'
                    ? 'Administrador'
                    : currentUser?.jobTitle || 'Colaborador'}
                </span>
              </span>
              <button
                onClick={logout}
                aria-label="Encerrar sessão"
                title="Encerrar sessão"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {compacto && (
          <button
            onClick={logout}
            aria-label="Encerrar sessão"
            title="Encerrar sessão"
            className="mt-1 w-full grid h-8 place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={`hidden md:flex fixed inset-y-0 left-0 flex-col bg-white dark:bg-[#0d0f12] border-r border-slate-200 dark:border-slate-800 z-40 transition-[width] duration-200 ${
          recolhido ? 'w-[60px]' : 'w-[232px]'
        }`}
      >
        {montarCorpo(recolhido)}
      </aside>

      {/* Mobile: barra fina no topo + painel completo.
          Uma barra inferior com oito ícones não é navegação, é um teclado. */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between gap-3 h-14 px-4 bg-white/95 dark:bg-[#0d0f12]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir navegação"
          aria-expanded={mobileOpen}
          className="grid h-9 w-9 place-items-center -ml-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        <span className="font-display font-semibold tracking-tight text-slate-950 dark:text-white truncate">
          {navItems.find((i) => i.id === currentTab)?.label ||
            utilities.find((i) => i.id === currentTab)?.label ||
            agencyName ||
            'Beewave'}
        </span>

        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-white font-semibold t-meta"
          style={{ backgroundColor: currentUser?.color || '#0f172a' }}
          aria-hidden="true"
        >
          {(currentUser?.name || '?').charAt(0).toUpperCase()}
        </span>
      </header>

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Navegação"
            className="relative flex w-[268px] max-w-[82vw] flex-col bg-white dark:bg-[#0d0f12] border-r border-slate-200 dark:border-slate-800"
            style={{ animation: 'portal-fade-in 180ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Fechar navegação"
              className="absolute top-4 right-3 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
            {montarCorpo(false)}
          </div>
        </div>
      )}
    </>
  );
};

const NavButton: React.FC<{
  item: NavItem;
  isActive: boolean;
  onClick: () => void;
  muted?: boolean;
  compacto?: boolean;
}> = ({ item, isActive, onClick, muted, compacto }) => {
  const Icon = item.icon;
  return (
    <button
      id={`nav-${item.id}`}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      title={compacto ? item.label : undefined}
      aria-label={compacto ? item.label : undefined}
      className={`w-full flex items-center rounded-lg t-ui transition-colors duration-150 cursor-pointer ${
        compacto ? 'justify-center h-9 px-0' : 'gap-3 px-3 py-2'
      } ${
        isActive
          ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-medium'
          : muted
            ? 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={isActive ? 2.1 : 1.8} />
      {!compacto && <span className="min-w-0 truncate">{item.label}</span>}
    </button>
  );
};
