import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  ListChecks,
  FileText,
  Clock,
  User,
  Sparkles,
  ArrowLeft,
  Flame,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { TrashItem } from '../types';

interface TrashViewProps {
  onBackToTasks?: () => void;
}

export const TrashView: React.FC<TrashViewProps> = ({ onBackToTasks }) => {
  const trash = useAppStore((s) => s.trash || []);
  const restoreFromTrash = useAppStore((s) => s.restoreFromTrash);
  const permanentlyDeleteFromTrash = useAppStore((s) => s.permanentlyDeleteFromTrash);
  const emptyTrash = useAppStore((s) => s.emptyTrash);
  const currentUser = useCurrentUser();

  const [filterType, setFilterType] = useState<'all' | 'task' | 'client' | 'prompt' | 'note' | 'news'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [restoredToast, setRestoredToast] = useState<string | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [itemToDeleteDefinitively, setItemToDeleteDefinitively] = useState<string | null>(null);

  const calculateDaysRemaining = (deletedAtStr: string) => {
    const deletedTime = new Date(deletedAtStr).getTime();
    const expiryTime = deletedTime + 30 * 24 * 60 * 60 * 1000;
    const diffMs = expiryTime - Date.now();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  const filteredItems = trash.filter((item) => {
    if (filterType !== 'all' && item.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchSub = item.subtitle?.toLowerCase().includes(q);
      const matchBy = item.deletedBy?.toLowerCase().includes(q);
      if (!matchTitle && !matchSub && !matchBy) return false;
    }
    return true;
  });

  const handleRestore = (item: TrashItem) => {
    restoreFromTrash(item.id);
    setRestoredToast(`"${item.title}" foi restaurado com sucesso!`);
    setTimeout(() => setRestoredToast(null), 4000);
  };

  const handlePermanentDelete = (itemId: string) => {
    permanentlyDeleteFromTrash(itemId);
    setItemToDeleteDefinitively(null);
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'task':
        return {
          label: 'Tarefa / Conteúdo',
          icon: ListChecks,
          bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
        };
      case 'client':
        return {
          label: 'Cliente',
          icon: Building2,
          bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
        };
      case 'prompt':
        return {
          label: 'Prompt IA',
          icon: Sparkles,
          bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        };
      case 'note':
        return {
          label: 'Nota / Rascunho',
          icon: FileText,
          bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        };
      default:
        return {
          label: 'Item',
          icon: FileText,
          bg: 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  return (
    <div id="trash-recycle-bin-view" className="mx-auto max-w-6xl space-y-6 pb-20">
      {/* Toast Notification */}
      {restoredToast && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl bg-emerald-600 text-white px-4 py-3 shadow-2xl animate-bounce">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-xs font-bold">{restoredToast}</span>
        </div>
      )}

      {/* Header Card */}
      <div className="clean-card p-6 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            {onBackToTasks && (
              <button
                id="btn-back-from-trash"
                onClick={onBackToTasks}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                title="Voltar para Tarefas"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60 shadow-xs">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
                  Lixeira e Recuperação
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold border border-slate-200 dark:border-slate-700">
                  {trash.length} {trash.length === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5">
                Itens excluídos são mantidos com segurança por <strong>30 dias</strong> antes da exclusão permanente. Você pode restaurar qualquer tarefa com 1 clique.
              </p>
            </div>
          </div>

          {trash.length > 0 && (
            <div className="flex items-center gap-2">
              {showEmptyConfirm ? (
                <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl px-3 py-1.5">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                    Esvaziar tudo?
                  </span>
                  <button
                    id="btn-confirm-empty-trash"
                    onClick={() => {
                      emptyTrash();
                      setShowEmptyConfirm(false);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    Sim, Esvaziar
                  </button>
                  <button
                    onClick={() => setShowEmptyConfirm(false)}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  id="btn-empty-trash-dialog"
                  onClick={() => setShowEmptyConfirm(true)}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 hover:bg-rose-100 text-rose-600 dark:text-rose-400 px-3.5 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Flame className="h-3.5 w-3.5" />
                  <span>Esvaziar Lixeira</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `Todos (${trash.length})` },
              { id: 'task', label: `Tarefas (${trash.filter((i) => i.type === 'task').length})` },
              { id: 'client', label: `Clientes (${trash.filter((i) => i.type === 'client').length})` },
              { id: 'prompt', label: `Prompts (${trash.filter((i) => i.type === 'prompt').length})` },
              { id: 'note', label: `Notas (${trash.filter((i) => i.type === 'note').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as any)}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  filterType === tab.id
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-slate-700/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar na lixeira..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-slate-400 dark:focus:border-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Items List / Cards */}
      {filteredItems.length === 0 ? (
        <div className="clean-card p-12 text-center space-y-4">
          <div className="grid h-16 w-16 mx-auto place-items-center rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400">
            <Trash2 className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 font-display">
              {searchQuery ? 'Nenhum item correspondente à busca' : 'A lixeira está limpa e vazia'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-200 mt-1 max-w-sm mx-auto">
              Quando você ou sua equipe excluírem tarefas, clientes ou notas, eles aparecerão aqui com opção de restauração instantânea por 30 dias.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const badge = getTypeBadge(item.type);
            const Icon = badge.icon;
            const daysLeft = calculateDaysRemaining(item.deletedAt);

            return (
              <div
                key={item.id}
                className="clean-card p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Left details */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${badge.bg}`}>
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                      <span className="text-[11px] text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {daysLeft > 0 ? `Expira em ${daysLeft} dias` : 'Expirando hoje'}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                      {item.title || 'Item sem título'}
                    </h3>

                    {item.subtitle && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {item.subtitle}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[11px] text-slate-600 dark:text-slate-200 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Excluído em: {formatDate(item.deletedAt)}
                      </span>
                      {item.deletedBy && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Por: {item.deletedBy}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Right */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  {/* Restore Button */}
                  <button
                    id={`btn-restore-item-${item.id}`}
                    onClick={() => handleRestore(item)}
                    className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Restaurar item para o sistema"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restaurar</span>
                  </button>

                  {/* Permanently Delete Button */}
                  {itemToDeleteDefinitively === item.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 rounded-xl px-2 py-1">
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        Certeza?
                      </span>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
                        className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                      >
                        Excluir
                      </button>
                      <button
                        onClick={() => setItemToDeleteDefinitively(null)}
                        className="px-1.5 py-1 text-slate-500 hover:text-slate-700 text-[10px] cursor-pointer"
                      >
                        X
                      </button>
                    </div>
                  ) : (
                    <button
                      id={`btn-delete-perm-${item.id}`}
                      onClick={() => setItemToDeleteDefinitively(item.id)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer"
                      title="Excluir Definitivamente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
