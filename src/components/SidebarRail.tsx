import React, { useState } from 'react';
import {
  LayoutDashboard,
  ListChecks,
  Users,
  Building2,
  CalendarDays,
  Newspaper,
  FileText,
  Wallet,
  Contact,
  Settings,
  Sun,
  Moon,
  Cloud,
  LogOut,
  Sparkles,
  PanelsTopLeft,
  GripVertical,
  Trash2,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarRailProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCloudModal: () => void;
}

export const SidebarRail: React.FC<SidebarRailProps> = ({
  currentTab,
  onSelectTab,
  onOpenCloudModal,
}) => {
  const currentUser = useCurrentUser();
  const logout = useAppStore((s) => s.logout);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);
  const cloudSync = useAppStore((s) => s.cloudSync);
  const customTabs = useAppStore((s) => s.customTabs);
  const iconDataUrl = useAppStore((s) => s.iconDataUrl);
  const can = useAppStore((s) => s.can);
  const trash = useAppStore((s) => s.trash || []);
  const sidebarOrder = useAppStore((s) => s.sidebarOrder || []);
  const setSidebarOrder = useAppStore((s) => s.setSidebarOrder);

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  interface NavItem {
    id: string;
    label: string;
    icon: any;
    perm?: string;
    countBadge?: number;
    badge?: boolean;
    soon?: boolean;
  }

  const rawNavItems: NavItem[] = [
    { id: 'inicio', label: 'Início', icon: LayoutDashboard },
    { id: 'tarefas', label: 'Tarefas', icon: ListChecks, perm: 'tarefas' },
    { id: 'clientes', label: 'Clientes', icon: Building2, perm: 'clientes' },
    { id: 'colaboradores', label: 'Equipe & Colaboradores', icon: Users, perm: 'clientes' },
    { id: 'prompts', label: 'Prompts & Notas', icon: FileText, perm: 'prompts' },
    { id: 'lixeira', label: 'Lixeira (30 Dias)', icon: Trash2, countBadge: trash.length > 0 ? trash.length : undefined },
  ].filter((item) => (item.perm ? can(item.perm) : true));

  // Sort items according to sidebarOrder
  const mainNavItems = [...rawNavItems].sort((a, b) => {
    const idxA = sidebarOrder.indexOf(a.id);
    const idxB = sidebarOrder.indexOf(b.id);
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedId || e.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const currentOrder = mainNavItems.map((item) => item.id);
    const sourceIdx = currentOrder.indexOf(sourceId);
    const targetIdx = currentOrder.indexOf(targetId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      const newOrder = [...currentOrder];
      const [removed] = newOrder.splice(sourceIdx, 1);
      newOrder.splice(targetIdx, 0, removed);
      setSidebarOrder(newOrder);
    }

    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  return (
    <>
    <aside
      id="main-sidebar-rail"
      className="fixed left-4 top-4 bottom-4 z-40 flex w-[72px] flex-col items-center justify-between py-5 floating-rail select-none transition-all duration-300 hidden md:flex"
      aria-label="Navegação Principal"
    >
      {/* Brand Symbol */}
      <div className="flex flex-col items-center gap-4 w-full">
        <button
          id="btn-brand-home"
          onClick={() => onSelectTab('inicio')}
          title="BeeWave Studio"
          className="group relative grid h-11 w-11 place-items-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-95"
        >
          {iconDataUrl ? (
            <img
              src={iconDataUrl}
              alt="Logo"
              className="h-9 w-9 rounded-full object-contain shadow-sm"
            />
          ) : (
            <div className="relative grid h-11 w-11 place-items-center rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm font-display font-black text-sm tracking-tighter">
              BW
            </div>
          )}
        </button>

        {/* Primary Navigation Icons (Draggable & Reorderable) */}
        <nav className="flex flex-col items-center gap-2.5 pt-2 w-full px-2">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const isDragging = draggedId === item.id;
            const isOver = dragOverId === item.id;

            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onDragOver={(e) => handleDragOver(e, item.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, item.id)}
                onDragEnd={handleDragEnd}
                className={`group relative w-full flex justify-center cursor-grab active:cursor-grabbing transition-all ${
                  isDragging ? 'opacity-30 scale-95' : ''
                } ${isOver ? 'scale-110 -translate-y-0.5' : ''}`}
              >
                {/* Drop Indicator Bar */}
                {isOver && (
                  <div className="absolute -top-1 inset-x-2 h-0.5 bg-slate-900 dark:bg-white rounded-full animate-pulse" />
                )}

                <button
                  id={`nav-item-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  aria-label={item.label}
                  className={`rail-icon-btn ${
                    isActive
                      ? 'active'
                      : 'text-slate-500 hover:text-slate-900 dark:text-white dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                  {item.countBadge !== undefined && item.countBadge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white shadow-xs">
                      {item.countBadge}
                    </span>
                  )}
                  {item.badge && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white border border-slate-900/40"></span>
                    </span>
                  )}
                </button>

                {/* Smooth hover tooltip */}
                <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900/95 dark:bg-slate-100/95 px-3 py-1.5 text-xs font-semibold text-white dark:text-slate-900 shadow-xl backdrop-blur-md opacity-0 transition-all duration-200 group-hover:opacity-100 z-50 flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.soon && <span className="text-[10px] text-slate-400 dark:text-slate-600 font-normal">(Em breve)</span>}
                  <span className="text-[9px] text-slate-400 opacity-60 ml-1">⋮⋮ arrastar</span>
                </div>
              </div>
            );
          })}

          {/* Custom Spaces Tabs */}
          {customTabs.map((space) => {
            const isActive = currentTab === `space-${space.id}`;
            return (
              <div key={space.id} className="group relative w-full flex justify-center">
                <button
                  id={`nav-custom-${space.id}`}
                  onClick={() => onSelectTab(`space-${space.id}`)}
                  title={space.name}
                  className={`rail-icon-btn ${
                    isActive
                      ? 'active'
                      : 'text-slate-500 hover:text-slate-900 dark:text-white dark:hover:text-white'
                  }`}
                >
                  <PanelsTopLeft className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
                </button>
                <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 z-50">
                  {space.name}
                </div>
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer / Utilities Icons */}
      <div className="flex flex-col items-center gap-2.5 pt-4">
        {/* Settings Button */}
        {currentUser?.role === 'admin' && (
          <div className="group relative">
            <button
              id="btn-settings-bottom"
              onClick={() => onSelectTab('admin')}
              className={`rail-icon-btn ${
                currentTab === 'admin'
                  ? 'active'
                  : 'text-slate-500 hover:text-slate-900 dark:text-white dark:hover:text-white'
              }`}
              title="Configurações da Agência"
            >
              <Settings className="h-5 w-5" strokeWidth={currentTab === 'admin' ? 2.4 : 2} />
            </button>
            <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 z-50">
              Configurações
            </div>
          </div>
        )}

        {/* Cloud Sync Button */}
        <div className="group relative">
          <button
            id="btn-cloud-sync"
            onClick={onOpenCloudModal}
            className="rail-icon-btn text-slate-500 hover:text-slate-900 dark:text-white dark:hover:text-white"
            title="Sincronização em Nuvem"
          >
            <Cloud className={`h-5 w-5 ${cloudSync.status === 'syncing' ? 'animate-bounce' : ''}`} />
            {cloudSync.connected && (
              <span className="absolute bottom-2 right-2 h-2 w-2 rounded-full bg-white ring-2 ring-slate-900 dark:ring-white" />
            )}
          </button>
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 z-50">
            Nuvem: {cloudSync.status === 'online' ? 'Sincronizado' : 'Atualizando...'}
          </div>
        </div>

        {/* Dark/Light Mode Toggle */}
        <div className="group relative">
          <button
            id="btn-toggle-theme"
            onClick={toggleDarkMode}
            className="rail-icon-btn text-slate-500 hover:text-slate-900 dark:text-white dark:hover:text-white"
            title={darkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
          >
            {darkMode ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5 text-slate-700" />}
          </button>
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 z-50">
            {darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          </div>
        </div>

        {/* Logout button */}
        <div className="group relative">
          <button
            id="btn-logout"
            onClick={logout}
            className="rail-icon-btn text-slate-500 hover:text-rose-500 dark:text-white dark:hover:text-rose-400"
            title="Encerrar sessão"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
          <div className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-xl opacity-0 transition-opacity group-hover:opacity-100 z-50">
            Sair ({currentUser?.name?.split(' ')[0]})
          </div>
        </div>
      </div>
    </aside>

    {/* Mobile Floating Bottom Bar */}
    <nav
      id="mobile-bottom-nav"
      className="fixed bottom-3 left-3 right-3 z-40 flex items-center justify-around py-2.5 px-3 floating-rail md:hidden select-none shadow-xl"
    >
      {mainNavItems.slice(0, 5).map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`rail-icon-btn ${
              isActive
                ? 'active'
                : 'text-slate-500 dark:text-white'
            }`}
            aria-label={item.label}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.4 : 2} />
          </button>
        );
      })}
      {currentUser?.role === 'admin' && (
        <button
          onClick={() => onSelectTab('admin')}
          className={`rail-icon-btn ${
            currentTab === 'admin'
              ? 'active'
              : 'text-slate-500 dark:text-white'
          }`}
          aria-label="Configurações"
        >
          <Settings className="h-5 w-5" strokeWidth={currentTab === 'admin' ? 2.4 : 2} />
        </button>
      )}
      <button
        onClick={toggleDarkMode}
        className="rail-icon-btn text-slate-500 dark:text-white"
        aria-label="Alternar tema"
      >
        {darkMode ? <Sun className="h-5 w-5 text-white" /> : <Moon className="h-5 w-5" />}
      </button>
      <button
        id="btn-mobile-logout"
        onClick={() => logout()}
        className="rail-icon-btn text-rose-500 hover:text-rose-600 dark:text-rose-400"
        aria-label="Sair da conta"
        title="Sair da conta"
      >
        <LogOut className="h-5 w-5" strokeWidth={2.2} />
      </button>
    </nav>
    </>
  );
};

