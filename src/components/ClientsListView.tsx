import React, { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { useAppStore } from '../store';
import { Client } from '../types';
import { FolderCard } from './FolderCard';
import { Button, EmptyState } from './ui';

interface ClientsListViewProps {
  onSelectClient: (clientId: string) => void;
}

const iniciais = (nome: string) =>
  nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

/**
 * Clientes — uma pasta por conta.
 *
 * Cada pasta responde o que interessa de relance: quantas pautas estão em
 * produção, quantas esperam o cliente e se falta planejar alguma coisa da
 * semana. Antes a lista mostrava total de tarefas e posts por semana, que
 * não dizem se a conta está em dia.
 */
export const ClientsListView: React.FC<ClientsListViewProps> = ({ onSelectClient }) => {
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.tasks);
  const addClient = useAppStore((s) => s.addClient);

  const [busca, setBusca] = useState('');
  const [criando, setCriando] = useState(false);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return clients;
    return clients.filter(
      (c) =>
        (c.company || '').toLowerCase().includes(termo) ||
        (c.name || '').toLowerCase().includes(termo) ||
        (c.niche || '').toLowerCase().includes(termo)
    );
  }, [clients, busca]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
            Clientes
          </h1>
          <p className="t-body text-slate-600 dark:text-slate-400 mt-1">
            {clients.length} {clients.length === 1 ? 'conta ativa' : 'contas ativas'}. Cada pasta
            guarda estratégia, pautas, arquivos e o acesso ao portal.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCriando(true)}>
          Novo cliente
        </Button>
      </header>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar cliente ou segmento…"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState
          title={clients.length === 0 ? 'Nenhum cliente cadastrado' : 'Nenhum cliente com esse nome'}
          hint={
            clients.length === 0
              ? 'Cadastre o primeiro cliente para começar a programar pautas e liberar o portal de aprovação.'
              : 'Tente outro termo de busca.'
          }
          action={
            clients.length === 0 ? (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setCriando(true)}>
                Cadastrar cliente
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-7 pt-2">
          {visiveis.map((client) => {
            // A única coisa que sobra de status na etiqueta é a cor da aba:
            // azul quando há algo parado esperando resposta do cliente.
            const comCliente = tasks.some(
              (t) =>
                t.clientId === client.id &&
                (t.status === 'em_aprovacao' || t.status === 'alterar')
            );

            return (
              <FolderCard
                key={client.id}
                tabColor={comCliente ? 'bg-sky-400' : 'bg-slate-300 dark:bg-slate-700'}
                eyebrow={client.niche || 'Sem segmento definido'}
                title={client.company || client.name || 'Cliente'}
                onClick={() => onSelectClient(client.id)}
                mark={
                  client.logoUrl ? (
                    <img
                      src={client.logoUrl}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100 dark:bg-slate-800 t-meta font-semibold text-slate-600 dark:text-slate-300">
                      {iniciais(client.company || client.name || '?')}
                    </span>
                  )
                }
              />
            );
          })}
        </div>
      )}

      {criando && (
        <FormularioCliente
          onClose={() => setCriando(false)}
          onSave={(dados) => {
            const novo = addClient(dados);
            setCriando(false);
            // Leva direto para a pasta: um cliente recém-criado ainda precisa
            // de estratégia, recorrência e acesso ao portal.
            if (novo?.id) onSelectClient(novo.id);
          }}
        />
      )}
    </div>
  );
};

/* ========================================================================== */

/**
 * Cadastro em duas partes: o mínimo para existir, e o acesso ao portal.
 *
 * O formulário antigo pedia dez campos de uma vez. O resto mora na pasta do
 * cliente, onde faz mais sentido preencher com calma.
 */
const FormularioCliente: React.FC<{
  onClose: () => void;
  onSave: (dados: Partial<Client>) => void;
}> = ({ onClose, onSave }) => {
  const [company, setCompany] = useState('');
  const [name, setName] = useState('');
  const [niche, setNiche] = useState('');
  const [portalEmail, setPortalEmail] = useState('');
  const [portalPassword, setPortalPassword] = useState('');

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) return;
    onSave({
      company: company.trim(),
      name: name.trim() || company.trim(),
      niche: niche.trim(),
      portalEmail: portalEmail.trim(),
      portalPassword: portalPassword.trim() || undefined,
    });
  };

  const campo =
    'w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />

      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label="Novo cliente"
        className="relative w-full sm:max-w-lg bg-white dark:bg-[#0f1114] sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between gap-4 px-6 h-14 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
            Novo cliente
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div>
            <label htmlFor="cli-company" className="block t-label text-slate-500 mb-1.5">
              Nome da marca
            </label>
            <input
              id="cli-company"
              autoFocus
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex.: Perfetto Uomo"
              className={campo}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="cli-name" className="block t-label text-slate-500 mb-1.5">
                Contato
              </label>
              <input
                id="cli-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Quem responde"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="cli-niche" className="block t-label text-slate-500 mb-1.5">
                Segmento
              </label>
              <input
                id="cli-niche"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="Moda masculina"
                className={campo}
              />
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div>
              <p className="t-label text-slate-500">Acesso ao portal</p>
              <p className="t-meta text-slate-400 dark:text-slate-500 mt-1">
                Opcional agora — dá para configurar depois, na pasta do cliente.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="cli-portal-email" className="block t-label text-slate-500 mb-1.5">
                  E-mail
                </label>
                <input
                  id="cli-portal-email"
                  type="email"
                  value={portalEmail}
                  onChange={(e) => setPortalEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                  className={campo}
                />
              </div>
              <div>
                <label htmlFor="cli-portal-pass" className="block t-label text-slate-500 mb-1.5">
                  Senha
                </label>
                <input
                  id="cli-portal-pass"
                  type="text"
                  value={portalPassword}
                  onChange={(e) => setPortalPassword(e.target.value)}
                  placeholder="Defina uma senha"
                  className={campo}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={!company.trim()}>
            Criar cliente
          </Button>
        </div>
      </form>
    </div>
  );
};
