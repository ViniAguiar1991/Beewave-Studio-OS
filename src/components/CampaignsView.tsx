import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
  MoreVertical,
  Trash2,
  Edit2,
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  Folder,
} from 'lucide-react';
import { useAppStore } from '../store';
import { Campaign, Task } from '../types';
import { getStatusBadgeStyle, getStatusLabel } from '../utils/badgeStyles';
import { formatFriendlyDate } from '../utils/dateFormatter';

interface CampaignsViewProps {
  onSelectTask: (taskId: string) => void;
  onNewTaskForCampaign: (campaignId: string, clientId: string) => void;
  onSelectClient?: (clientId: string) => void;
}

export const CampaignsView: React.FC<CampaignsViewProps> = ({
  onSelectTask,
  onNewTaskForCampaign,
  onSelectClient,
}) => {
  const campaigns = useAppStore((s) => s.campaigns || []);
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.tasks);
  const addCampaign = useAppStore((s) => s.addCampaign);
  const updateCampaign = useAppStore((s) => s.updateCampaign);
  const deleteCampaign = useAppStore((s) => s.deleteCampaign);

  const [selectedClientId, setSelectedClientId] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Form state
  const [newTitle, setNewTitle] = useState('');
  const [newClientId, setNewClientId] = useState(clients[0]?.id || '');
  const [newDescription, setNewDescription] = useState('');
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [newEndDate, setNewEndDate] = useState('');
  const [newEmoji, setNewEmoji] = useState('📁');
  const [newStatus, setNewStatus] = useState<Campaign['status']>('planejamento');

  const filteredCampaigns = campaigns.filter((camp) => {
    if (selectedClientId !== 'all' && camp.clientId !== selectedClientId) return false;
    if (selectedStatus !== 'all' && camp.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const client = clients.find((c) => c.id === camp.clientId);
      const match =
        camp.title.toLowerCase().includes(q) ||
        (camp.description || '').toLowerCase().includes(q) ||
        (client?.company || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newClientId) return;

    if (editingCampaign) {
      updateCampaign(editingCampaign.id, {
        title: newTitle.trim(),
        clientId: newClientId,
        description: newDescription.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
        folderEmoji: newEmoji,
        status: newStatus,
      });
      setEditingCampaign(null);
    } else {
      addCampaign({
        title: newTitle.trim(),
        clientId: newClientId,
        description: newDescription.trim(),
        startDate: newStartDate,
        endDate: newEndDate,
        folderEmoji: newEmoji,
        status: newStatus,
      });
    }

    // Reset
    setNewTitle('');
    setNewDescription('');
    setNewEndDate('');
    setIsNewModalOpen(false);
  };

  const handleOpenEdit = (camp: Campaign) => {
    setEditingCampaign(camp);
    setNewTitle(camp.title);
    setNewClientId(camp.clientId);
    setNewDescription(camp.description || '');
    setNewStartDate(camp.startDate || new Date().toISOString().slice(0, 10));
    setNewEndDate(camp.endDate || '');
    setNewEmoji(camp.folderEmoji || '📁');
    setNewStatus(camp.status);
    setIsNewModalOpen(true);
  };

  const emojiChoices = ['📁', '🎂', '🏷️', '👰‍♀️', '🚀', '🛍️', '💎', '📢', '🌟', '🎯', '📸', '✨'];

  return (
    <div id="campaigns-view" className="mx-auto max-w-6xl space-y-8 pb-20 animate-fade-in">
      {/* Top Header - Notion style: clear, light, free of heavy boxes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <FolderKanban className="h-4 w-4 text-amber-500" />
            <span>Gestão Estratégica & Campanhas</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Campanhas e Pastas Especiais
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Organize entregas sazonais, tablóides mensais, aniversários e lançamentos em pastas com fluxo de produção dedicado.
          </p>
        </div>

        <button
          id="btn-new-campaign"
          onClick={() => {
            setEditingCampaign(null);
            setNewTitle('');
            setNewDescription('');
            setNewClientId(clients[0]?.id || '');
            setNewEmoji('📁');
            setNewStatus('planejamento');
            setIsNewModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer shrink-0 self-start sm:self-center"
        >
          <Plus className="h-4 w-4" />
          <span>Nova Pasta de Campanha</span>
        </button>
      </div>

      {/* Filter Bar - Clean inline controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar campanha por nome ou cliente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="clean-input h-9 w-full pl-9 pr-3 text-xs bg-white dark:bg-slate-900"
          />
        </div>

        {/* Client Filter */}
        <div className="w-48">
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="clean-input h-9 w-full px-2.5 text-xs bg-white dark:bg-slate-900 cursor-pointer"
          >
            <option value="all">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-40">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="clean-input h-9 w-full px-2.5 text-xs bg-white dark:bg-slate-900 cursor-pointer"
          >
            <option value="all">Todos os status</option>
            <option value="planejamento">Planejamento</option>
            <option value="em_producao">Em produção</option>
            <option value="em_aprovacao">Em aprovação</option>
            <option value="concluida">Concluída</option>
            <option value="pausada">Pausada</option>
          </select>
        </div>
      </div>

      {/* Campaigns Listing - Notion-Style Folder Cards with direct task groups */}
      {filteredCampaigns.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40">
          <FolderKanban className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhuma campanha encontrada
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Crie uma pasta de campanha para agrupar as tarefas recorrentes ou pontuais dos seus clientes.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCampaigns.map((camp) => {
            const client = clients.find((c) => c.id === camp.clientId);
            const campTasks = tasks.filter((t) => t.campaignId === camp.id);
            const completedCount = campTasks.filter(
              (t) => t.status === 'aprovado' || t.status === 'postado'
            ).length;
            const progressPercent =
              campTasks.length > 0 ? Math.round((completedCount / campTasks.length) * 100) : 0;

            const statusStyles: Record<string, { label: string; bg: string; text: string }> = {
              planejamento: { label: 'Planejamento', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300' },
              em_producao: { label: 'Em Produção', bg: 'bg-blue-50 dark:bg-blue-950/60', text: 'text-blue-700 dark:text-blue-300' },
              em_aprovacao: { label: 'Em Aprovação', bg: 'bg-amber-50 dark:bg-amber-950/60', text: 'text-amber-800 dark:text-amber-300' },
              concluida: { label: 'Concluída', bg: 'bg-emerald-50 dark:bg-emerald-950/60', text: 'text-emerald-700 dark:text-emerald-300' },
              pausada: { label: 'Pausada', bg: 'bg-rose-50 dark:bg-rose-950/60', text: 'text-rose-700 dark:text-rose-300' },
            };
            const currentStatusStyle = statusStyles[camp.status] || statusStyles.planejamento;

            return (
              <div
                key={camp.id}
                className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-5"
              >
                {/* Folder Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-3.5">
                    <span className="text-3xl p-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700 select-none">
                      {camp.folderEmoji || '📁'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h2 className="text-base md:text-lg font-bold text-slate-900 dark:text-white leading-snug">
                          {camp.title}
                        </h2>
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${currentStatusStyle.bg} ${currentStatusStyle.text}`}>
                          {currentStatusStyle.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                        {client && (
                          <button
                            type="button"
                            onClick={() => onSelectClient && onSelectClient(client.id)}
                            className="font-medium text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:underline cursor-pointer"
                          >
                            {client.company}
                          </button>
                        )}
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {camp.startDate ? formatFriendlyDate(camp.startDate) : 'Início imediato'}
                            {camp.endDate ? ` até ${formatFriendlyDate(camp.endDate)}` : ''}
                          </span>
                        </div>
                      </div>

                      {camp.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-3xl leading-relaxed">
                          {camp.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Progress */}
                  <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {completedCount} de {campTasks.length} concluídas
                      </p>
                      <div className="w-28 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() => onNewTaskForCampaign(camp.id, camp.clientId)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition-colors cursor-pointer"
                      title="Adicionar nova entrega nesta pasta"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Nova Tarefa</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(camp)}
                      className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      title="Editar pasta de campanha"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Deseja remover a pasta "${camp.title}"? As tarefas continuarão salvas sem o vínculo desta campanha.`)) {
                          deleteCampaign(camp.id);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Excluir pasta de campanha"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Grouped Tasks inside this Campaign */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 px-1">
                    <span>Entregas vinculadas ({campTasks.length})</span>
                  </div>

                  {campTasks.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                      Nenhuma tarefa vinculada a esta pasta ainda.{' '}
                      <button
                        onClick={() => onNewTaskForCampaign(camp.id, camp.clientId)}
                        className="text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer ml-1"
                      >
                        Clique para adicionar a primeira tarefa.
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80 border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                      {campTasks.map((t) => {
                        const isDone = t.status === 'aprovado' || t.status === 'postado';
                        return (
                          <div
                            key={t.id}
                            onClick={() => onSelectTask(t.id)}
                            className="flex items-center justify-between gap-3 p-3 bg-white hover:bg-slate-50/80 dark:bg-slate-900/60 dark:hover:bg-slate-800/50 cursor-pointer transition-colors text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="shrink-0 text-slate-400">
                                {isDone ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                ) : (
                                  <Clock className="h-4 w-4 text-amber-500" />
                                )}
                              </span>
                              <div className="min-w-0">
                                <p
                                  className={`font-semibold truncate text-slate-900 dark:text-white ${
                                    isDone ? 'line-through text-slate-400 dark:text-slate-500' : ''
                                  }`}
                                >
                                  {t.title}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  {t.format && (
                                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                                      {t.format}
                                    </span>
                                  )}
                                  {t.postDate && <span>Publicação: {formatFriendlyDate(t.postDate)}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getStatusBadgeStyle(t.status)}`}>
                                {getStatusLabel(t.status)}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New / Edit Campaign Modal */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4 bg-slate-950/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {editingCampaign ? 'Editar Pasta de Campanha' : 'Nova Pasta de Campanha'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCampaign} className="space-y-4 text-xs">
              {/* Emoji Picker */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Ícone da Pasta
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {emojiChoices.map((emo) => (
                    <button
                      type="button"
                      key={emo}
                      onClick={() => setNewEmoji(emo)}
                      className={`text-xl p-2 rounded-xl border transition-all cursor-pointer ${
                        newEmoji === emo
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 scale-110'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título da Campanha / Projeto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Campanha de 15 Anos • Perfetto Uomo"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="clean-input h-10 w-full px-3 text-xs font-semibold"
                />
              </div>

              {/* Client Selector */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cliente Vinculado *
                </label>
                <select
                  required
                  value={newClientId}
                  onChange={(e) => setNewClientId(e.target.value)}
                  className="clean-input h-10 w-full px-3 text-xs cursor-pointer"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    className="clean-input h-10 w-full px-2.5 text-xs cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data de Término
                  </label>
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    className="clean-input h-10 w-full px-2.5 text-xs cursor-pointer"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="clean-input h-10 w-full px-3 text-xs cursor-pointer"
                >
                  <option value="planejamento">Planejamento</option>
                  <option value="em_producao">Em produção</option>
                  <option value="em_aprovacao">Em aprovação</option>
                  <option value="concluida">Concluída</option>
                  <option value="pausada">Pausada</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Descrição e Metas da Campanha
                </label>
                <textarea
                  rows={2}
                  placeholder="Objetivos, mídias envolvidas e orientações gerais..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="clean-input w-full p-2.5 text-xs"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold cursor-pointer shadow-xs"
                >
                  {editingCampaign ? 'Salvar Alterações' : 'Criar Pasta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
