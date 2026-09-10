import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  Sparkles,
  Save,
  Bot,
  HelpCircle,
  FileCode2,
  Check,
  Zap,
  Activity,
  Sliders,
  MoveUp,
  MoveDown,
  Eye,
  Shield,
  Edit2,
} from 'lucide-react';
import { useAppStore } from '../store';
import { AdminSystemPrompts, TaskStatus } from '../types';
import { TrashView } from './TrashView';

export const AdminSettingsView: React.FC = () => {
  const agencyName = useAppStore((s) => s.agencyName);
  const setAgencyName = useAppStore((s) => s.setAgencyName);
  const plans = useAppStore((s) => s.plans);
  const updatePlan = useAppStore((s) => s.updatePlan);
  const categories = useAppStore((s) => s.categories);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const users = useAppStore((s) => s.users);
  const addCategory = useAppStore((s) => s.addCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const addPlan = useAppStore((s) => s.addPlan);
  const deletePlan = useAppStore((s) => s.deletePlan);
  const statuses = useAppStore((s) => s.statuses);
  const addStatus = useAppStore((s) => s.addStatus);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const deleteStatus = useAppStore((s) => s.deleteStatus);
  const moveStatus = useAppStore((s) => s.moveStatus);
  const togglePermission = useAppStore((s) => s.togglePermission);
  const resetAllData = useAppStore((s) => s.resetAllData);

  // Admin hidden system prompts
  const adminPrompts = useAppStore((s) => s.adminPrompts);
  const updateAdminPrompts = useAppStore((s) => s.updateAdminPrompts);
  const resetAdminPrompts = useAppStore((s) => s.resetAdminPrompts);

  const [activeTab, setActiveTab] = useState<'geral' | 'planos' | 'formatos' | 'status' | 'equipe' | 'prompts' | 'conexao' | 'lixeira'>('geral');
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#242f40');

  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanPrice, setNewPlanPrice] = useState(1200);
  const [newPlanPosts, setNewPlanPosts] = useState(4);

  // Status form state
  const [newStatusLabel, setNewStatusLabel] = useState('');
  const [newStatusColor, setNewStatusColor] = useState('#242f40');
  const [newStatusGroup, setNewStatusGroup] = useState<'todo' | 'progress' | 'review' | 'done'>('progress');
  const [newStatusClientVisible, setNewStatusClientVisible] = useState(true);

  // Gemini Diagnostics State
  const [geminiStatus, setGeminiStatus] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    latencyMs?: number;
    model?: string;
    message?: string;
    details?: string;
  }>({ status: 'idle' });

  const testGeminiConnection = async () => {
    setGeminiStatus({ status: 'testing' });
    const startTime = Date.now();
    try {
      const res = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: "Teste de conexão BeeWave OS" }),
      });
      const data = await res.json().catch(() => null);
      const latencyMs = Date.now() - startTime;
      if (res.ok && data?.success) {
        setGeminiStatus({
          status: 'success',
          latencyMs,
          model: data.model || 'gemini-3.7-flash',
          message: data.message || 'API Conectada e Operando Perfeitamente!',
        });
      } else {
        setGeminiStatus({
          status: 'error',
          latencyMs,
          model: data?.model || 'gemini-3.7-flash',
          message: data?.message || 'Chave ou serviço Gemini indisponível.',
          details: data?.error || data?.details || 'Verifique se a variável GEMINI_API_KEY está configurada.',
        });
      }
    } catch (err: any) {
      setGeminiStatus({
        status: 'error',
        latencyMs: Date.now() - startTime,
        message: 'Erro de rede ou servidor ao contatar o backend.',
        details: err.message,
      });
    }
  };

  // Local state for prompts editing
  const [promptsForm, setPromptsForm] = useState<AdminSystemPrompts>({
    headlinePrompt: adminPrompts?.headlinePrompt || '',
    copyCaptionPrompt: adminPrompts?.copyCaptionPrompt || '',
    copyCarouselPrompt: adminPrompts?.copyCarouselPrompt || '',
    copyScriptPrompt: adminPrompts?.copyScriptPrompt || '',
    chatRefinePrompt: adminPrompts?.chatRefinePrompt || '',
    newsTrendsPrompt: adminPrompts?.newsTrendsPrompt || '',
  });
  const [promptsSaved, setPromptsSaved] = useState(false);

  // Sync if store changes
  React.useEffect(() => {
    if (adminPrompts) {
      setPromptsForm({
        headlinePrompt: adminPrompts.headlinePrompt || '',
        copyCaptionPrompt: adminPrompts.copyCaptionPrompt || '',
        copyCarouselPrompt: adminPrompts.copyCarouselPrompt || '',
        copyScriptPrompt: adminPrompts.copyScriptPrompt || '',
        chatRefinePrompt: adminPrompts.chatRefinePrompt || '',
        newsTrendsPrompt: adminPrompts.newsTrendsPrompt || '',
      });
    }
  }, [adminPrompts]);

  const handleSavePrompts = (e: React.FormEvent) => {
    e.preventDefault();
    updateAdminPrompts(promptsForm);
    setPromptsSaved(true);
    setTimeout(() => setPromptsSaved(false), 3000);
  };

  const handleResetPrompts = () => {
    resetAdminPrompts();
    setPromptsSaved(true);
    setTimeout(() => setPromptsSaved(false), 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory({ name: newCatName.trim(), color: newCatColor });
    setNewCatName('');
  };

  const handleAddPlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;
    addPlan({
      name: newPlanName.trim(),
      price: Number(newPlanPrice),
      postsPerWeek: Number(newPlanPosts),
      description: 'Plano cadastrado nas configurações',
    });
    setNewPlanName('');
  };

  const handleAddStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatusLabel.trim()) return;
    const key = newStatusLabel.trim().toLowerCase().replace(/\s+/g, '_');
    addStatus({
      key: key as any,
      label: newStatusLabel.trim(),
      color: newStatusColor,
      group: newStatusGroup,
      clientVisible: newStatusClientVisible,
    });
    setNewStatusLabel('');
  };

  return (
    <div id="admin-settings-view" className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Header */}
      <div className="clean-card p-6 md:p-8 space-y-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white tracking-tight">
            Configurações da Agência
          </h1>
          <p className="text-xs text-slate-600 dark:text-slate-200 mt-0.5">
            Ajuste identidade visual, planos de serviço, formatos de conteúdo, status do kanban, equipe e prompts ocultos da IA.
          </p>
        </div>

        {/* Settings Tabs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          {[
            { key: 'geral', label: 'Geral e Marca' },
            { key: 'conexao', label: '⚡ Conexão IA (Gemini)' },
            { key: 'planos', label: 'Planos e Mensalidades' },
            { key: 'formatos', label: 'Formatos de Conteúdo' },
            { key: 'status', label: 'Fluxo e Status (Kanban)' },
            { key: 'equipe', label: 'Equipe e Permissões' },
            { key: 'lixeira', label: '🗑️ Lixeira (30 Dias)' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`rounded-xl px-4 py-2 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === t.key
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB CONEXÃO IA (GEMINI) */}
      {activeTab === 'conexao' && (
        <div className="clean-card p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
                  Diagnóstico e Conectividade Gemini AI
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
                Verifique se o seu servidor backend está se comunicando com a API oficial do Google Gemini e teste a geração de resposta em tempo real.
              </p>
            </div>

            <button
              onClick={testGeminiConnection}
              disabled={geminiStatus.status === 'testing'}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-sm transition-all cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Activity className={`h-4 w-4 ${geminiStatus.status === 'testing' ? 'animate-spin' : ''}`} />
              <span>{geminiStatus.status === 'testing' ? 'Testando Conexão...' : 'Testar Conexão Agora'}</span>
            </button>
          </div>

          {/* Diagnostic Status Box */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status da API</span>
              <div className="flex items-center gap-2 pt-1">
                <span
                  className={`h-3 w-3 rounded-full ${
                    geminiStatus.status === 'success'
                      ? 'bg-emerald-500 animate-pulse'
                      : geminiStatus.status === 'error'
                      ? 'bg-rose-500'
                      : geminiStatus.status === 'testing'
                      ? 'bg-amber-500 animate-ping'
                      : 'bg-slate-400'
                  }`}
                />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  {geminiStatus.status === 'success'
                    ? 'Conectado e Ativo'
                    : geminiStatus.status === 'error'
                    ? 'Erro na Conexão'
                    : geminiStatus.status === 'testing'
                    ? 'Consultando API...'
                    : 'Pronto para Teste'}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modelo em Execução</span>
              <p className="text-xs font-bold font-mono text-slate-900 dark:text-white pt-1">
                {geminiStatus.model || 'gemini-2.5-flash'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Latência de Resposta</span>
              <p className="text-xs font-bold font-mono text-slate-900 dark:text-white pt-1">
                {geminiStatus.latencyMs ? `${geminiStatus.latencyMs}ms` : '—'}
              </p>
            </div>
          </div>

          {geminiStatus.message && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed ${
                geminiStatus.status === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300'
              }`}
            >
              <div className="font-bold flex items-center gap-2">
                {geminiStatus.status === 'success' ? <Check className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                <span>{geminiStatus.message}</span>
              </div>
              {geminiStatus.details && (
                <p className="mt-2 font-mono text-[11px] opacity-80 whitespace-pre-wrap">
                  {geminiStatus.details}
                </p>
              )}
            </div>
          )}

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span>Onde a IA atua no Studio:</span>
            </h3>
            <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc list-inside">
              <li><strong>Workflow Criativo:</strong> Gerador de 5 ângulos de Headlines e Copiloto de Chat para refinamento.</li>
              <li><strong>Redação & Copies:</strong> Gerador de Legenda Completa, Roteiro de Carrossel Slide por Slide, Roteiro de Vídeo/Reels e Chat de Ajustes.</li>
              <li><strong>Radar de Tendências:</strong> Curadoria automática de notícias e ganchos em 3 turnos (Manhã, Tarde, Noite).</li>
            </ul>
          </div>
        </div>
      )}

      {/* TAB GERAL */}
      {activeTab === 'geral' && (
        <div className="clean-card p-6 md:p-8 space-y-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">
            Identidade do Sistema
          </h2>

          <div className="max-w-md space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">Nome da Agência / Studio</label>
            <input
              type="text"
              value={agencyName}
              onChange={(e) => setAgencyName(e.target.value)}
              className="clean-input h-10 w-full px-3 text-xs font-bold"
            />
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider">Zona de Restauração</h3>
            <p className="text-xs text-slate-600 dark:text-slate-200 max-w-md">
              Restaura os dados originais do Studio (clientes, tarefas de exemplo e configurações).
            </p>
            <button
              onClick={() => {
                resetAllData();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 px-4 py-2.5 text-xs font-bold text-red-500 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Redefinir Dados de Demonstração</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB PLANOS */}
      {activeTab === 'planos' && (
        <div className="clean-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">
              Planos Recorrentes
            </h2>
            <span className="text-[11px] text-slate-400">Você pode editar os valores e nomes diretamente em cada card</span>
          </div>

          <form onSubmit={handleAddPlan} className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="min-w-[180px]">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">Nome do Plano</label>
              <input
                type="text"
                required
                value={newPlanName}
                onChange={(e) => setNewPlanName(e.target.value)}
                placeholder="Ex: Start Social"
                className="clean-input h-9 text-xs px-3 w-full"
              />
            </div>

            <div className="w-32">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">Valor Mensal (R$)</label>
              <input
                type="number"
                value={newPlanPrice}
                onChange={(e) => setNewPlanPrice(Number(e.target.value))}
                className="clean-input h-9 text-xs px-3 w-full"
              />
            </div>

            <div className="w-32">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">Posts / Semana</label>
              <input
                type="number"
                value={newPlanPosts}
                onChange={(e) => setNewPlanPosts(Number(e.target.value))}
                className="clean-input h-9 text-xs px-3 w-full"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-4 h-9 text-xs shadow-sm cursor-pointer"
            >
              + Adicionar Plano
            </button>
          </form>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((p) => (
              <div
                key={p.id}
                className="clean-card p-5 space-y-3 flex flex-col justify-between border border-slate-200 dark:border-slate-800"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updatePlan(p.id, { name: e.target.value })}
                      className="font-bold text-sm text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-slate-500 focus:outline-hidden w-full mr-2"
                    />
                    <button onClick={() => deletePlan(p.id)} className="text-slate-400 hover:text-red-500 p-1 shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">R$</span>
                    <input
                      type="number"
                      value={p.price}
                      onChange={(e) => updatePlan(p.id, { price: Number(e.target.value) })}
                      className="text-lg font-bold font-display text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-700 w-28 px-1"
                    />
                    <span className="text-xs text-slate-500">/mês</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Posts/Semana:</span>
                    <input
                      type="number"
                      value={p.postsPerWeek}
                      onChange={(e) => updatePlan(p.id, { postsPerWeek: Number(e.target.value) })}
                      className="text-xs font-semibold text-slate-900 dark:text-white bg-transparent border-b border-slate-200 dark:border-slate-700 w-16 px-1"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB FORMATOS */}
      {activeTab === 'formatos' && (
        <div className="clean-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">
              Formatos e Categorias de Conteúdo
            </h2>
            <span className="text-[11px] text-slate-400">Edite nomes e cores diretamente na lista</span>
          </div>

          <form onSubmit={handleAddCategory} className="flex gap-3 max-w-md">
            <input
              type="text"
              required
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="Ex: Infográfico, Podcast..."
              className="clean-input h-10 text-xs px-3.5 flex-1"
            />
            <input
              type="color"
              value={newCatColor}
              onChange={(e) => setNewCatColor(e.target.value)}
              className="h-10 w-12 rounded-xl cursor-pointer bg-transparent border border-slate-300 dark:border-slate-700"
            />
            <button
              type="submit"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-4 h-10 text-xs shadow-sm cursor-pointer"
            >
              + Adicionar
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <div
                key={c.id}
                className="clean-card p-3.5 flex items-center justify-between border border-slate-200 dark:border-slate-800"
              >
                <div className="flex items-center gap-2.5 flex-1 mr-2">
                  <input
                    type="color"
                    value={c.color}
                    onChange={(e) => updateCategory(c.id, { color: e.target.value })}
                    className="h-5 w-5 rounded-full cursor-pointer bg-transparent border-0 shrink-0"
                  />
                  <input
                    type="text"
                    value={c.name}
                    onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                    className="text-xs font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-slate-500 w-full focus:outline-hidden"
                  />
                </div>
                <button onClick={() => deleteCategory(c.id)} className="text-slate-400 dark:text-slate-300 hover:text-red-500 p-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB STATUS & FLUXO DE TRABALHO (KANBAN) */}
      {activeTab === 'status' && (
        <div className="clean-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">
                Colunas do Kanban e Fases do Fluxo
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Personalize os status das tarefas, ordem de visualização e se são visíveis para o cliente
              </p>
            </div>
          </div>

          {/* Add Status Form */}
          <form onSubmit={handleAddStatus} className="flex flex-wrap items-end gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800">
            <div className="min-w-[180px]">
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">Nome do Status</label>
              <input
                type="text"
                required
                value={newStatusLabel}
                onChange={(e) => setNewStatusLabel(e.target.value)}
                placeholder="Ex: Em Gravação, Aguardando Edição..."
                className="clean-input h-9 text-xs px-3 w-full"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">Grupo</label>
              <select
                value={newStatusGroup}
                onChange={(e) => setNewStatusGroup(e.target.value as any)}
                className="clean-input h-9 text-xs px-3"
              >
                <option value="todo">A Fazer (To Do)</option>
                <option value="progress">Em Andamento</option>
                <option value="review">Revisão / Aprovação</option>
                <option value="done">Concluído</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-200 mb-1">Cor</label>
              <input
                type="color"
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="h-9 w-12 rounded-xl cursor-pointer bg-transparent border border-slate-300 dark:border-slate-700"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-4 h-9 text-xs shadow-sm cursor-pointer"
            >
              + Adicionar Status
            </button>
          </form>

          {/* Status List */}
          <div className="space-y-2">
            {statuses.map((st, idx) => (
              <div
                key={st.key}
                className="clean-card p-3 flex items-center justify-between border border-slate-200 dark:border-slate-800 gap-3"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="flex items-center gap-1 text-slate-400">
                    <button
                      onClick={() => moveStatus(st.key, -1)}
                      disabled={idx === 0}
                      className="p-1 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <MoveUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => moveStatus(st.key, 1)}
                      disabled={idx === statuses.length - 1}
                      className="p-1 hover:text-slate-900 dark:hover:text-white disabled:opacity-20 cursor-pointer"
                    >
                      <MoveDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <input
                    type="color"
                    value={st.color}
                    onChange={(e) => updateStatus(st.key, { color: e.target.value })}
                    className="h-5 w-5 rounded-full cursor-pointer bg-transparent border-0 shrink-0"
                  />

                  <input
                    type="text"
                    value={st.label}
                    onChange={(e) => updateStatus(st.key, { label: e.target.value })}
                    className="text-xs font-semibold text-slate-900 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-slate-500 px-1 focus:outline-hidden"
                  />

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {st.group}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={st.clientVisible !== false}
                      onChange={(e) => updateStatus(st.key, { clientVisible: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span>Visível no Portal Cliente</span>
                  </label>

                  <button
                    onClick={() => {
                      deleteStatus(st.key);
                    }}
                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB EQUIPE */}
      {activeTab === 'equipe' && (
        <div className="clean-card p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-200">
                Equipe e Matriz de Permissões
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle quais áreas e módulos cada membro da agência pode acessar
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {users.filter((u) => u.role !== 'cliente').map((u) => (
              <div key={u.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{u.name}</span>
                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-900 dark:text-white uppercase border border-slate-200 dark:border-slate-700">
                      {u.role}
                    </span>
                    {u.jobTitle && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        • {u.jobTitle}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                    {u.email} {u.phone ? `• ${u.phone}` : ''}
                  </p>
                </div>

                {u.role === 'colaborador' && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {['tarefas', 'clientes', 'calendario', 'noticias', 'prompts'].map((pKey) => {
                      const has = (u.permissions as any)?.[pKey];
                      return (
                        <button
                          key={pKey}
                          onClick={() => togglePermission(u.id, pKey)}
                          className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all border ${
                            has
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent font-bold'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {pKey} {has ? '✓' : ''}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB LIXEIRA (30 DIAS) */}
      {activeTab === 'lixeira' && (
        <TrashView />
      )}
    </div>
  );
};
