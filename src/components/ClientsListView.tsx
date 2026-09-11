import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ArrowRight,
  X,
  Building,
} from 'lucide-react';
import { useAppStore } from '../store';

interface ClientsListViewProps {
  onSelectClient: (clientId: string) => void;
}

export const ClientsListView: React.FC<ClientsListViewProps> = ({ onSelectClient }) => {
  const clients = useAppStore((s) => s.clients);
  const plans = useAppStore((s) => s.plans);
  const tasks = useAppStore((s) => s.tasks);
  const addClient = useAppStore((s) => s.addClient);

  const [searchQuery, setSearchQuery] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  useEffect(() => {
    if (!showNewClientModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowNewClientModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showNewClientModal]);

  // New Client Form state
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('1234');
  const [niche, setNiche] = useState('');
  const [emoji, setEmoji] = useState('🏢');
  const [planId, setPlanId] = useState(plans[0]?.id || 'plan_pro');
  const [mensalidade, setMensalidade] = useState(1890);
  const [postsPerWeek, setPostsPerWeek] = useState(5);

  const filteredClients = clients.filter((c) =>
    (c.company + ' ' + c.name + ' ' + (c.niche || '')).toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;

    const cleanSlug = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    const finalPortalEmail = portalEmail.trim() || email.trim() || `${cleanSlug || 'cliente'}@cliente.com`;
    const finalPortalPass = portalPassword.trim() || '1234';

    const newClient = addClient({
      company,
      name,
      whatsapp,
      email: email.trim() || finalPortalEmail,
      portalEmail: finalPortalEmail,
      portalPassword: finalPortalPass,
      niche,
      emoji,
      planId,
      mensalidade: Number(mensalidade),
      postsPerWeek: Number(postsPerWeek),
      toneOfVoice: ['Acolhedor', 'Profissional'],
      about: `${company} é uma empresa do segmento de ${niche || 'serviços'}.`,
    });

    // Reset form
    setCompany('');
    setName('');
    setWhatsapp('');
    setEmail('');
    setPortalEmail('');
    setPortalPassword('1234');
    setNiche('');
    setShowNewClientModal(false);
    onSelectClient(newClient.id);
  };

  return (
    <div id="clients-list-view" className="mx-auto max-w-6xl space-y-8 pb-16 animate-in fade-in">
      {/* Header - Editorial & Unenclosed */}
      <div className="space-y-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Gestão de Clientes e Contas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Gerencie diretrizes de marca, personas, histórico de aprovações e cronogramas de entrega.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full text-xs p-2 pl-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white"
              />
            </div>

            <button
              id="btn-open-new-client-modal"
              onClick={() => setShowNewClientModal(true)}
              className="flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-white font-medium px-4 py-2 text-xs transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="h-4 w-4" strokeWidth={2} />
              <span>Novo Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Editorial List of Clients - Free of Containers, Separated by Clean Lines */}
      {filteredClients.length > 0 ? (
        <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
          {filteredClients.map((client) => {
            const clientTasks = tasks.filter((t) => t.clientId === client.id);

            return (
              <div
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className="py-5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group hover:bg-slate-50/50 dark:hover:bg-slate-900/30 px-2 rounded-xl transition-colors"
              >
                {/* Left: Identity & Info */}
                <div className="flex items-start gap-4 min-w-0 flex-1">
                  <span className="text-2xl select-none shrink-0 pt-0.5">{client.emoji || '🏢'}</span>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:underline">
                        {client.company}
                      </h3>
                      {client.niche && (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
                          {client.niche}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                      {client.about || `Responsável: ${client.name || 'Não informado'}`}
                    </p>
                  </div>
                </div>

                {/* Right: Metrics & Action */}
                <div className="flex items-center gap-6 shrink-0 sm:pl-4">
                  <div className="text-right hidden md:block">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-white">
                      {clientTasks.length} {clientTasks.length === 1 ? 'tarefa' : 'tarefas'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {client.postsPerWeek ? `${client.postsPerWeek} posts/sem` : 'no fluxo'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-slate-900 dark:text-white group-hover:translate-x-0.5 transition-transform">
                    <span>Acessar</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center space-y-4">
          <Building className="h-8 w-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Nenhum cliente encontrado</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery ? `Nenhum resultado para "${searchQuery}".` : 'Cadastre um novo cliente ou limpe a busca.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setShowNewClientModal(true);
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-4 py-2 text-xs font-medium cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Cadastrar Cliente</span>
          </button>
        </div>
      )}

      {/* New Client Modal */}
      {showNewClientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-lg p-6 md:p-8 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Cadastrar Novo Cliente
              </h3>
              <button onClick={() => setShowNewClientModal(false)} className="text-slate-400 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-4 text-xs">
              <div className="grid grid-cols-[3fr_1fr] gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Nome da Empresa</label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="Ex: Boutique Donna"
                    className="clean-input h-10 w-full px-3 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Emoji</label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    maxLength={2}
                    className="clean-input h-10 w-full text-center text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Responsável</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Marcela"
                    className="clean-input h-10 w-full px-3 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">WhatsApp</label>
                  <input
                    type="text"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="clean-input h-10 w-full px-3 text-xs"
                  />
                </div>
              </div>

              {/* Portal Credentials Section */}
              <div className="p-3.5 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 space-y-2.5">
                <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <span>🔑</span> Acesso ao Portal do Cliente (Login & Senha)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      E-mail de Login
                    </label>
                    <input
                      type="email"
                      value={portalEmail}
                      onChange={(e) => setPortalEmail(e.target.value)}
                      placeholder={company ? `${company.toLowerCase().replace(/[^a-z0-9]/g, '')}@cliente.com` : 'cliente@dominio.com'}
                      className="clean-input h-9 w-full px-3 text-xs bg-white dark:bg-slate-800"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                      Senha Inicial
                    </label>
                    <input
                      type="text"
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      placeholder="1234"
                      className="clean-input h-9 w-full px-3 text-xs font-mono bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  O cliente usará esse e-mail e senha na tela inicial para entrar direto no portal dele.
                </p>
              </div>

              <div>
                <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Nicho de Atuação</label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="Ex: Moda Feminina & Acessórios"
                  className="clean-input h-10 w-full px-3 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Plano</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="clean-input h-10 w-full px-3 text-xs font-semibold"
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Mensalidade (R$)</label>
                  <input
                    type="number"
                    value={mensalidade}
                    onChange={(e) => setMensalidade(Number(e.target.value))}
                    className="clean-input h-10 w-full px-3 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewClientModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-5 py-2.5 text-xs shadow-sm"
                >
                  Cadastrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
