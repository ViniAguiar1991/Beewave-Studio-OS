import React, { useState } from 'react';
import { Client, ContractService } from '../types';
import { useAppStore } from '../store';
import {
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Sparkles,
  Layers,
  Clock,
  User,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClientRecurrenceTabProps {
  client: Client;
}

export const ClientRecurrenceTab: React.FC<ClientRecurrenceTabProps> = ({ client }) => {
  const users = useAppStore((s) => s.users);
  const addContractService = useAppStore((s) => s.addContractService);
  const updateContractService = useAppStore((s) => s.updateContractService);
  const deleteContractService = useAppStore((s) => s.deleteContractService);
  const generateMonthlyTasksFromContract = useAppStore((s) => s.generateMonthlyTasksFromContract);

  const staffUsers = users.filter((u) => u.role !== 'cliente');

  const [showAddModal, setShowAddModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [frequency, setFrequency] = useState<'semanal' | 'quinzenal' | 'mensal'>('semanal');
  const [quantity, setQuantity] = useState(3);
  const [defaultFormat, setDefaultFormat] = useState('Post único');
  const [defaultAssigneeId, setDefaultAssigneeId] = useState(staffUsers[0]?.id || '');
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 3, 5]); // Mon, Wed, Fri
  const [notice, setNotice] = useState<string | null>(null);

  const dayLabels = [
    { day: 0, label: 'Dom' },
    { day: 1, label: 'Seg' },
    { day: 2, label: 'Ter' },
    { day: 3, label: 'Qua' },
    { day: 4, label: 'Qui' },
    { day: 5, label: 'Sex' },
    { day: 6, label: 'Sáb' },
  ];

  const handleToggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    addContractService(client.id, {
      name: serviceName.trim(),
      frequency,
      quantity: Number(quantity) || 1,
      defaultAssigneeId: defaultAssigneeId || staffUsers[0]?.id || '',
      defaultFormat,
      daysOfWeek: selectedDays,
      active: true,
    });

    setServiceName('');
    setShowAddModal(false);
    setNotice('Serviço recorrente cadastrado com sucesso!');
    setTimeout(() => setNotice(null), 3500);
  };

  const handleGenerate = () => {
    const count = generateMonthlyTasksFromContract(client.id);
    if (count > 0) {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
      });
      setNotice(`Foram criadas ${count} novas pautas automáticas para ${client.company}!`);
    } else {
      setNotice('Nenhum novo serviço recorrente ativo para gerar neste mês.');
    }
    setTimeout(() => setNotice(null), 4000);
  };

  const services = client.contractServices || [];

  return (
    <div id="client-recurrence-tab" className="space-y-6 animate-fade-in">
      {/* Top Banner Notice */}
      {notice && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-2xs">
          <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Hero Action Card */}
      <div className="clean-card p-6 md:p-8 space-y-4 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              <Zap className="h-3.5 w-3.5" />
              <span>Automação de Pautas & Entregas</span>
            </div>
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white">
              Recorrência de Contrato • {client.company}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Configure as entregas fixas deste contrato. Com 1 clique, o sistema gera todo o fluxo de produção do mês distribuído nos dias certos.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="h-4 w-4" />
              <span>Novo Serviço Recorrente</span>
            </button>

            <button
              onClick={handleGenerate}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <RotateCw className="h-4 w-4" />
              <span>Gerar Pautas do Mês</span>
            </button>
          </div>
        </div>
      </div>

      {/* Services List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Serviços Recorrentes Cadastrados ({services.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            {client.postsPerWeek || 3} publicações/semana contratadas
          </span>
        </div>

        {services.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 space-y-2">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
              Nenhum serviço recorrente configurado para este cliente ainda.
            </p>
            <p className="text-[11px] text-slate-400">
              Clique no botão "Novo Serviço Recorrente" acima para cadastrar a frequência de posts e gerar tarefas automáticas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {services.map((srv) => {
              const assignee = staffUsers.find((u) => u.id === srv.defaultAssigneeId);

              return (
                <div
                  key={srv.id}
                  className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-3 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                          {srv.name}
                        </h4>
                        <span className="inline-block text-[11px] font-semibold text-amber-600 dark:text-amber-400 capitalize">
                          {srv.frequency} • {srv.quantity} {srv.quantity === 1 ? 'entrega' : 'entregas'}
                        </span>
                      </div>

                      <button
                        onClick={() => deleteContractService(client.id, srv.id)}
                        className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer"
                        title="Remover serviço"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Layers className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{srv.defaultFormat || 'Post único'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <User className="h-3.5 w-3.5 text-slate-400" />
                        <span className="truncate">{assignee?.name || 'Não atribuído'}</span>
                      </div>
                    </div>

                    {/* Days tags */}
                    {srv.daysOfWeek && srv.daysOfWeek.length > 0 && (
                      <div className="flex items-center gap-1 pt-1">
                        <span className="text-[10px] text-slate-400 mr-1">Dias:</span>
                        {dayLabels.map(({ day, label }) => {
                          const isSelected = srv.daysOfWeek.includes(day);
                          return (
                            <span
                              key={day}
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isSelected
                                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                                  : 'text-slate-300 dark:text-slate-700'
                              }`}
                            >
                              {label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={srv.active}
                        onChange={(e) =>
                          updateContractService(client.id, srv.id, { active: e.target.checked })
                        }
                        className="rounded border-slate-300 dark:border-slate-700 text-slate-900 focus:ring-slate-900 dark:focus:ring-white h-3.5 w-3.5 cursor-pointer"
                      />
                      <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        {srv.active ? 'Ativo na automação' : 'Pausado'}
                      </span>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Recurring Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-md p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-2xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Cadastrar Serviço Recorrente
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Serviço / Entrega
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Posts para Feed, Tablóide de Ofertas..."
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="clean-input h-10 w-full px-3 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Frequência
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="clean-input h-10 w-full px-3 text-xs font-semibold cursor-pointer"
                  >
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Quantidade por ciclo
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="clean-input h-10 w-full px-3 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Formato Padrão
                  </label>
                  <select
                    value={defaultFormat}
                    onChange={(e) => setDefaultFormat(e.target.value)}
                    className="clean-input h-10 w-full px-3 text-xs cursor-pointer"
                  >
                    <option value="Post único">Post único</option>
                    <option value="Carrossel">Carrossel</option>
                    <option value="Reels / Vídeo">Reels / Vídeo</option>
                    <option value="Stories">Stories</option>
                    <option value="Tablóide impresso">Tablóide impresso</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Responsável Padrão
                  </label>
                  <select
                    value={defaultAssigneeId}
                    onChange={(e) => setDefaultAssigneeId(e.target.value)}
                    className="clean-input h-10 w-full px-3 text-xs cursor-pointer"
                  >
                    {staffUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {frequency === 'semanal' && (
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Dias da Semana Preferenciais
                  </label>
                  <div className="flex items-center gap-1.5">
                    {dayLabels.map(({ day, label }) => {
                      const isSelected = selectedDays.includes(day);
                      return (
                        <button
                          type="button"
                          key={day}
                          onClick={() => handleToggleDay(day)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white text-xs font-bold transition-all cursor-pointer shadow-2xs"
                >
                  Salvar Serviço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
