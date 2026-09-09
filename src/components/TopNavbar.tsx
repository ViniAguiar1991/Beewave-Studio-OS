import React, { useState } from 'react';
import {
  Search,
  Plus,
  Cloud,
  Moon,
  Sun,
  Bell,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  FileCheck,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';

interface TopNavbarProps {
  onNewTask: () => void;
  onOpenCloudModal: () => void;
  onSelectClient?: (clientId: string) => void;
  onSelectTab: (tab: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  onNewTask,
  onOpenCloudModal,
  onSelectClient,
  onSelectTab,
}) => {
  const currentUser = useCurrentUser();
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.tasks);
  const cloudSync = useAppStore((s) => s.cloudSync);
  const darkMode = useAppStore((s) => s.darkMode);
  const toggleDarkMode = useAppStore((s) => s.toggleDarkMode);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const filteredClients = searchQuery
    ? clients.filter((c) =>
        (c.company + ' ' + c.name + ' ' + (c.niche || '')).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredTasks = searchQuery
    ? tasks.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <header
      id="top-navbar"
      className="sticky top-0 z-30 flex items-center justify-between border-b border-[rgba(160,160,160,0.18)] bg-white/80 dark:bg-[#131922]/80 px-6 md:px-10 py-4 backdrop-blur-xl transition-colors duration-200"
    >
      <div className="flex items-center gap-4">
        {/* Global Search Bar */}
        <div className="relative w-64 md:w-80">
          <div className="clean-input flex h-10 items-center gap-2.5 px-3.5 text-sm">
            <Search className="h-4 w-4 text-[#a0a0a0]" />
            <input
              id="global-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(true);
              }}
              onFocus={() => setShowSearchResults(true)}
              placeholder="Buscar cliente, tarefa ou nicho..."
              className="w-full bg-transparent text-xs placeholder:text-[#a0a0a0] outline-none text-[#242f40] dark:text-[#f4faff]"
            />
          </div>

          {/* Search Dropdown */}
          {showSearchResults && searchQuery.trim().length > 0 && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowSearchResults(false)}
              />
              <div className="clean-card absolute left-0 top-12 z-50 max-h-80 w-96 overflow-y-auto p-2 shadow-2xl">
                {filteredClients.length === 0 && filteredTasks.length === 0 && (
                  <p className="p-4 text-center text-xs text-[#a0a0a0]">
                    Nenhum resultado para "{searchQuery}".
                  </p>
                )}

                {filteredClients.length > 0 && (
                  <div className="mb-2">
                    <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#a0a0a0]">
                      Clientes ({filteredClients.length})
                    </p>
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery('');
                          onSelectClient?.(client.id);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-[#f0f6fc] dark:hover:bg-white/5"
                      >
                        <span className="text-lg">{client.emoji || '🏢'}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-[#242f40] dark:text-[#f4faff]">
                            {client.company}
                          </p>
                          <p className="truncate text-[11px] text-[#a0a0a0]">{client.name} • {client.niche || 'Geral'}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {filteredTasks.length > 0 && (
                  <div>
                    <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#a0a0a0]">
                      Tarefas ({filteredTasks.length})
                    </p>
                    {filteredTasks.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          setShowSearchResults(false);
                          setSearchQuery('');
                          onSelectTab('tarefas');
                        }}
                        className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-xs transition-colors hover:bg-[#f0f6fc] dark:hover:bg-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-[#242f40] dark:text-[#f4faff]">
                            {task.title}
                          </p>
                          <p className="text-[11px] text-[#a0a0a0]">Etapa: {task.currentStep}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right Action Icons & Controls */}
      <div className="flex items-center gap-3">
        {/* Cloud Status Pill */}
        <button
          id="btn-navbar-cloud"
          onClick={onOpenCloudModal}
          className="hidden sm:flex items-center gap-2 rounded-full border border-[rgba(160,160,160,0.22)] bg-white/70 dark:bg-[#1a2332]/70 px-3.5 py-1.5 text-xs font-semibold text-[#242f40] dark:text-[#f4faff] shadow-sm backdrop-blur transition-colors hover:border-[#242f40] dark:hover:border-[#f4faff]"
        >
          <Cloud className={`h-3.5 w-3.5 ${cloudSync.status === 'syncing' ? 'animate-spin text-[#a0a0a0]' : 'text-emerald-500'}`} />
          <span>{cloudSync.status === 'online' ? 'Nuvem Conectada' : 'Sincronizando...'}</span>
        </button>

        {/* Quick New Task Button */}
        <button
          id="btn-quick-new-task"
          onClick={onNewTask}
          className="flex items-center gap-2 rounded-xl bg-[#242f40] hover:bg-[#17202d] dark:bg-[#f4faff] dark:hover:bg-white dark:text-[#242f40] active:scale-95 px-4 py-2 text-xs md:text-sm font-bold text-white shadow-sm transition-all"
        >
          <Plus className="h-4 w-4" strokeWidth={2.6} />
          <span>Nova Tarefa</span>
        </button>

        {/* Dark Mode Icon */}
        <button
          id="btn-navbar-theme"
          onClick={toggleDarkMode}
          className="grid h-9 w-9 place-items-center rounded-xl border border-[rgba(160,160,160,0.2)] bg-white dark:bg-[#1a2332] text-[#4a5568] dark:text-[#f4faff] transition-transform active:scale-90 shadow-sm"
          title={darkMode ? 'Mudar para claro' : 'Mudar para escuro'}
        >
          {darkMode ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User Profile Avatar / Menu */}
        <div className="relative">
          <button
            id="btn-user-profile-menu"
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2.5 rounded-full border border-[rgba(160,160,160,0.2)] p-0.5 pr-2.5 bg-white dark:bg-[#1a2332] shadow-sm transition-colors hover:border-[#242f40]"
          >
            <div className="grid h-8 w-8 place-items-center rounded-full bg-[#242f40] dark:bg-[#f4faff] font-bold text-xs text-white dark:text-[#242f40]">
              {currentUser?.name?.slice(0, 2).toUpperCase() || 'BW'}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-[#242f40] dark:text-[#f4faff]">
              {currentUser?.name?.split(' ')[0]}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-[#a0a0a0]" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="clean-card absolute right-0 top-12 z-50 w-56 p-2 shadow-2xl">
                <div className="px-3 py-2 border-b border-[rgba(160,160,160,0.15)]">
                  <p className="font-semibold text-xs text-[#242f40] dark:text-[#f4faff]">
                    {currentUser?.name}
                  </p>
                  <p className="text-[11px] text-[#a0a0a0] truncate">{currentUser?.email}</p>
                  <span className="mt-1 inline-block rounded-md bg-[#f4faff] dark:bg-[#1e2736] border border-[rgba(160,160,160,0.2)] px-1.5 py-0.5 text-[10px] font-bold text-[#242f40] dark:text-[#f4faff] uppercase">
                    {currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'cliente' ? 'Cliente' : 'Colaborador'}
                  </span>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSelectTab('admin');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#4a5568] dark:text-[#cbd5e1] hover:bg-[#f0f6fc] dark:hover:bg-white/5"
                  >
                    <span>Configurações da Agência</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSelectTab('portal');
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#4a5568] dark:text-[#cbd5e1] hover:bg-[#f0f6fc] dark:hover:bg-white/5"
                  >
                    <span>Ver Portal do Cliente</span>
                    <ExternalLink className="h-3 w-3 text-[#a0a0a0] ml-auto" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
