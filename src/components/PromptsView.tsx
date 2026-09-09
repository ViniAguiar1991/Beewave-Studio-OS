import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  Plus,
  Trash2,
  X,
  Pencil,
  FolderPlus,
  Search,
} from 'lucide-react';
import { useAppStore } from '../store';
import { PromptItem } from '../types';

export const PromptsView: React.FC = () => {
  const promptFolders = useAppStore((s) => s.promptFolders);
  const prompts = useAppStore((s) => s.prompts);
  const addPrompt = useAppStore((s) => s.addPrompt);
  const updatePrompt = useAppStore((s) => s.updatePrompt);
  const deletePrompt = useAppStore((s) => s.deletePrompt);
  const addPromptFolder = useAppStore((s) => s.addPromptFolder);
  const deletePromptFolder = useAppStore((s) => s.deletePromptFolder);

  const [activeFolderId, setActiveFolderId] = useState<string>(promptFolders[0]?.id || 'pf_conteudo');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Prompt Create / Edit Modal State
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<PromptItem | null>(null);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptBody, setPromptBody] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>(activeFolderId);

  // New Folder Modal State
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Delete Folder Confirmation Modal State
  const [folderToDelete, setFolderToDelete] = useState<{ id: string; name: string } | null>(null);

  // Ensure activeFolderId is valid
  useEffect(() => {
    if (promptFolders.length > 0 && !promptFolders.some((f) => f.id === activeFolderId)) {
      setActiveFolderId(promptFolders[0].id);
    }
  }, [promptFolders, activeFolderId]);

  useEffect(() => {
    if (!showPromptModal && !showNewFolderModal && !folderToDelete) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPromptModal(false);
        setShowNewFolderModal(false);
        setFolderToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPromptModal, showNewFolderModal, folderToDelete]);

  const filteredPrompts = prompts.filter(
    (p) =>
      p.folderId === activeFolderId &&
      (p.title + ' ' + p.body).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenCreateModal = () => {
    setEditingPrompt(null);
    setPromptTitle('');
    setPromptBody('');
    setSelectedFolderId(activeFolderId);
    setShowPromptModal(true);
  };

  const handleOpenEditModal = (item: PromptItem) => {
    setEditingPrompt(item);
    setPromptTitle(item.title);
    setPromptBody(item.body);
    setSelectedFolderId(item.folderId);
    setShowPromptModal(true);
  };

  const handleSavePrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promptTitle.trim()) return;

    if (editingPrompt) {
      updatePrompt(editingPrompt.id, {
        title: promptTitle.trim(),
        body: promptBody,
        folderId: selectedFolderId,
      });
    } else {
      addPrompt({
        folderId: selectedFolderId,
        title: promptTitle.trim(),
        body: promptBody,
      });
    }

    setActiveFolderId(selectedFolderId);
    setShowPromptModal(false);
    setEditingPrompt(null);
    setPromptTitle('');
    setPromptBody('');
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name) return;

    const newId = `pf_${Date.now()}`;
    addPromptFolder({ id: newId, name });
    setActiveFolderId(newId);
    setSelectedFolderId(newId);
    setNewFolderName('');
    setShowNewFolderModal(false);
  };

  const handleConfirmDeleteFolder = () => {
    if (!folderToDelete) return;
    const idToDelete = folderToDelete.id;
    deletePromptFolder(idToDelete);

    // Switch to another folder
    const remaining = promptFolders.filter((f) => f.id !== idToDelete);
    if (remaining.length > 0) {
      setActiveFolderId(remaining[0].id);
    }
    setFolderToDelete(null);
  };

  return (
    <div id="prompts-view" className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div className="clean-card p-6 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
              Biblioteca de Prompts e Estratégia
            </h1>
            <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5">
              Modelos de comandos testados para redação, briefing, roteiros e geração de imagem.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar prompt..."
                className="clean-input h-9 pl-9 pr-3 text-xs w-44 sm:w-56"
              />
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-4 py-2.5 text-xs shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4" strokeWidth={2.4} />
              <span>Novo Prompt</span>
            </button>
          </div>
        </div>

        {/* Folders tabs with Add and Delete Category */}
        <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800 mt-4">
          {promptFolders.map((f) => {
            const isActive = activeFolderId === f.id;
            return (
              <div
                key={f.id}
                className={`group relative flex items-center rounded-xl transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setActiveFolderId(f.id)}
                  className="px-3.5 py-2 text-xs font-semibold cursor-pointer"
                >
                  {f.name}
                </button>

                {/* Delete Category Button */}
                {promptFolders.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFolderToDelete({ id: f.id, name: f.name });
                    }}
                    title={`Excluir categoria "${f.name}"`}
                    className={`mr-2 p-1 rounded-lg transition-colors cursor-pointer ${
                      isActive
                        ? 'text-slate-400 hover:text-red-300 dark:hover:text-red-600'
                        : 'text-slate-400 hover:text-red-500 opacity-60 group-hover:opacity-100'
                    }`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add Category Button */}
          <button
            type="button"
            onClick={() => setShowNewFolderModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            title="Adicionar nova categoria"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            <span>+ Nova Categoria</span>
          </button>
        </div>
      </div>

      {/* Prompts Cards Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="clean-card p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Nenhum prompt nesta categoria
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Clique no botão acima para adicionar um novo modelo de prompt ou nota nesta categoria.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold px-4 py-2 text-xs cursor-pointer mt-2"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Criar Prompt</span>
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {filteredPrompts.map((item) => (
            <div
              key={item.id}
              className="clean-card p-6 space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={item.title}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      className="text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white p-1 rounded-md transition-colors"
                      title="Editar prompt"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deletePrompt(item.id)}
                      className="text-slate-400 dark:text-slate-300 hover:text-red-500 p-1 rounded-md transition-colors"
                      title="Excluir prompt"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3.5 text-xs font-mono text-slate-900 dark:text-slate-100 leading-relaxed max-h-44 overflow-y-auto border border-slate-200 dark:border-slate-800">
                  {item.body}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-medium">
                  {promptFolders.find((f) => f.id === item.folderId)?.name || 'Geral'}
                </span>
                <button
                  onClick={() => handleCopy(item.body, item.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  {copiedId === item.id ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" />
                      <span>Copiar Prompt</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT PROMPT MODAL WITH CATEGORY SELECTOR */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-lg p-6 md:p-8 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingPrompt ? 'Editar Prompt' : 'Criar Novo Prompt'}
              </h3>
              <button
                type="button"
                onClick={() => setShowPromptModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSavePrompt} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Categoria / Pasta
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="clean-input h-10 w-full px-3 text-xs flex-1 cursor-pointer bg-white dark:bg-slate-900"
                  >
                    {promptFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowNewFolderModal(true)}
                    className="rounded-xl border border-slate-300 dark:border-slate-700 px-3 h-10 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 cursor-pointer"
                    title="Criar nova categoria"
                  >
                    + Nova
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  required
                  value={promptTitle}
                  onChange={(e) => setPromptTitle(e.target.value)}
                  placeholder="Ex: Roteiro Reels com Gancho Contraintuitivo"
                  className="clean-input h-10 w-full px-3 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Conteúdo do Prompt
                </label>
                <textarea
                  rows={5}
                  required
                  value={promptBody}
                  onChange={(e) => setPromptBody(e.target.value)}
                  placeholder="Instruções para a IA com placeholders como {cliente}, {tema}, {publico}..."
                  className="clean-input w-full p-3 text-xs resize-none font-mono leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPromptModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-5 py-2.5 text-xs shadow-sm cursor-pointer"
                >
                  {editingPrompt ? 'Salvar Alterações' : 'Salvar Prompt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW CATEGORY MODAL */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-sm p-6 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Nova Categoria de Prompts
              </h3>
              <button
                type="button"
                onClick={() => setShowNewFolderModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                  Nome da Categoria
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ex: Anúncios & Tráfego Pago"
                  className="clean-input h-10 w-full px-3 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-4 py-2 text-xs shadow-sm cursor-pointer"
                >
                  Criar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE CATEGORY MODAL */}
      {folderToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-sm p-6 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Excluir Categoria
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir a categoria <strong>"{folderToDelete.name}"</strong>? Todos os prompts desta categoria também serão removidos.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setFolderToDelete(null)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFolder}
                className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 text-xs shadow-sm cursor-pointer"
              >
                Excluir Categoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
