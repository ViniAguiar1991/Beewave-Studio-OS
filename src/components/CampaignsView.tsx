import React, { useMemo, useState } from 'react';
import { Plus, Search, X, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store';
import { Campaign, Task } from '../types';
import { getColor, hexToColorKey } from '../lib/taskViews';
import { formatFriendlyDate } from '../utils/dateFormatter';
import { FolderCard, FolderAction } from './FolderCard';
import { Button, EmptyState, BlockHeader } from './ui';

interface CampaignsViewProps {
  onSelectTask: (taskId: string) => void;
  onNewTaskForCampaign: (campaignId: string, clientId: string) => void;
  onSelectClient: (clientId: string) => void;
}

const STATUS_CAMPANHA: { key: Campaign['status']; label: string; cor: string }[] = [
  { key: 'planejamento', label: 'Planejamento', cor: 'slate' },
  { key: 'em_producao', label: 'Em produção', cor: 'amber' },
  { key: 'em_aprovacao', label: 'Em aprovação', cor: 'sky' },
  { key: 'concluida', label: 'Concluída', cor: 'emerald' },
  { key: 'pausada', label: 'Pausada', cor: 'rose' },
];

const rotuloStatus = (s: Campaign['status']) =>
  STATUS_CAMPANHA.find((x) => x.key === s) || STATUS_CAMPANHA[0];

/**
 * Campanhas — pastas de pautas com começo, meio e fim.
 *
 * Uma campanha existe para agrupar: "15 anos da Perfetto" reúne dez pautas
 * que só fazem sentido juntas. Por isso o formato de pasta, e por isso cada
 * uma mostra quantas pautas guarda e em que pé estão.
 *
 * A tela abre nas pastas, não num formulário: criar campanha é raro, olhar
 * campanha é diário.
 */
export const CampaignsView: React.FC<CampaignsViewProps> = ({
  onSelectTask,
  onNewTaskForCampaign,
  onSelectClient,
}) => {
  const campaigns = useAppStore((s) => s.campaigns);
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.tasks);
  const statuses = useAppStore((s) => s.statuses);
  const addCampaign = useAppStore((s) => s.addCampaign);
  const updateCampaign = useAppStore((s) => s.updateCampaign);
  const deleteCampaign = useAppStore((s) => s.deleteCampaign);

  const [busca, setBusca] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('all');
  const [editando, setEditando] = useState<Campaign | null>(null);
  const [criando, setCriando] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return campaigns.filter((c) => {
      if (clienteFiltro !== 'all' && c.clientId !== clienteFiltro) return false;
      if (!termo) return true;
      const cliente = clients.find((x) => x.id === c.clientId);
      return (
        c.title.toLowerCase().includes(termo) ||
        (c.description || '').toLowerCase().includes(termo) ||
        (cliente?.company || '').toLowerCase().includes(termo)
      );
    });
  }, [campaigns, clients, busca, clienteFiltro]);

  const campanhaAberta = campaigns.find((c) => c.id === aberta);
  const pautasDaAberta = tasks.filter((t) => t.campaignId === aberta);

  /* ------------------------------ detalhe ------------------------------ */

  if (campanhaAberta) {
    const cliente = clients.find((c) => c.id === campanhaAberta.clientId);
    const st = rotuloStatus(campanhaAberta.status);

    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-16">
        <button
          onClick={() => setAberta(null)}
          className="inline-flex items-center gap-1.5 t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowRight className="h-4 w-4 rotate-180" />
          Voltar para campanhas
        </button>

        <header className="space-y-3 border-b border-slate-200 dark:border-slate-800 pb-6">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 t-meta ${getColor(st.cor).text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${getColor(st.cor).solid}`} />
              {st.label}
            </span>
            {cliente && (
              <button
                onClick={() => onSelectClient(cliente.id)}
                className="t-meta text-slate-500 hover:text-slate-900 dark:hover:text-white underline underline-offset-4 cursor-pointer"
              >
                {cliente.company}
              </button>
            )}
          </div>

          <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
            {campanhaAberta.title}
          </h1>

          {campanhaAberta.description && (
            <p className="t-body text-slate-600 dark:text-slate-400 max-w-2xl">
              {campanhaAberta.description}
            </p>
          )}

          <div className="flex items-center gap-3 flex-wrap pt-2">
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => onNewTaskForCampaign(campanhaAberta.id, campanhaAberta.clientId)}
            >
              Nova pauta na campanha
            </Button>
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditando(campanhaAberta)}>
              Editar campanha
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <BlockHeader
            title="Pautas da campanha"
            count={`${pautasDaAberta.length} ${pautasDaAberta.length === 1 ? 'pauta' : 'pautas'}`}
          />

          {pautasDaAberta.length === 0 ? (
            <EmptyState
              title="Nenhuma pauta nesta campanha ainda"
              hint="Crie a primeira pauta para começar a montar o calendário desta campanha."
            />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
              {pautasDaAberta.map((t) => {
                const status = statuses.find((s) => s.key === t.status);
                const cor = getColor(hexToColorKey(status?.color));
                const dia = (t.postDate || t.date || '').split('T')[0];
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => onSelectTask(t.id)}
                      className="w-full flex items-center gap-4 py-3.5 text-left group cursor-pointer"
                    >
                      <span className="min-w-0 flex-1 t-lead font-medium text-slate-900 dark:text-white truncate group-hover:underline underline-offset-4">
                        {t.selectedHeadline || t.headline || t.title}
                      </span>
                      <span className={`shrink-0 inline-flex items-center gap-1.5 t-meta ${cor.text}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cor.solid}`} />
                        {status?.label || t.status}
                      </span>
                      <span className="shrink-0 t-meta text-slate-400 dark:text-slate-500 w-[130px] text-right">
                        {dia ? formatFriendlyDate(dia) : 'Sem data'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {editando && (
          <FormularioCampanha
            campanha={editando}
            onClose={() => setEditando(null)}
            onSave={(dados) => {
              updateCampaign(editando.id, dados);
              setEditando(null);
            }}
          />
        )}
      </div>
    );
  }

  /* ------------------------------- lista ------------------------------- */

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
            Campanhas
          </h1>
          <p className="t-body text-slate-600 dark:text-slate-400 mt-1">
            Pastas que agrupam pautas com um objetivo e um período em comum.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCriando(true)}>
          Nova campanha
        </Button>
      </header>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar campanha ou cliente…"
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

        <select
          value={clienteFiltro}
          onChange={(e) => setClienteFiltro(e.target.value)}
          aria-label="Filtrar por cliente"
          className="h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 t-ui text-slate-800 dark:text-slate-200 cursor-pointer focus:outline-none focus:border-slate-900 dark:focus:border-white"
        >
          <option value="all">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.company}
            </option>
          ))}
        </select>

        <span className="t-meta text-slate-400 dark:text-slate-500">
          {visiveis.length} {visiveis.length === 1 ? 'campanha' : 'campanhas'}
        </span>
      </div>

      {visiveis.length === 0 ? (
        <EmptyState
          title={
            campaigns.length === 0
              ? 'Nenhuma campanha criada'
              : 'Nenhuma campanha com esse filtro'
          }
          hint={
            campaigns.length === 0
              ? 'Use campanhas para agrupar as pautas de uma ação específica — um aniversário de loja, um lançamento, uma data comemorativa.'
              : 'Tente outro termo ou volte para todos os clientes.'
          }
          action={
            campaigns.length === 0 ? (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setCriando(true)}>
                Criar a primeira campanha
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-7 pt-2">
          {visiveis.map((campanha) => {
            const cliente = clients.find((c) => c.id === campanha.clientId);
            const pautas = tasks.filter((t) => t.campaignId === campanha.id);
            const concluidas = pautas.filter((t) =>
              ['aprovado', 'postado'].includes(t.status)
            ).length;
            const pendentes = pautas.length - concluidas;
            const st = rotuloStatus(campanha.status);

            return (
              <FolderCard
                key={campanha.id}
                tabColor={getColor(st.cor).solid}
                eyebrow={cliente?.company || 'Sem cliente'}
                title={campanha.title}
                onClick={() => setAberta(campanha.id)}
                stats={[
                  { valor: pautas.length, rotulo: 'pautas' },
                  { valor: concluidas, rotulo: 'concluídas' },
                  { valor: pendentes, rotulo: 'pendentes', destaque: pendentes > 0 },
                ]}
                footer={
                  <span className={`inline-flex items-center gap-1.5 t-meta ${getColor(st.cor).text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${getColor(st.cor).solid}`} />
                    {st.label}
                    {campanha.endDate && (
                      <span className="text-slate-400 dark:text-slate-500">
                        · até {formatFriendlyDate(campanha.endDate)}
                      </span>
                    )}
                  </span>
                }
                actions={
                  <>
                    <FolderAction
                      icon={Pencil}
                      label="Editar campanha"
                      onClick={() => setEditando(campanha)}
                    />
                    <FolderAction
                      icon={Trash2}
                      label="Excluir campanha"
                      danger
                      onClick={() => {
                        if (
                          window.confirm(
                            `Excluir a campanha "${campanha.title}"? As pautas continuam existindo, só deixam de ficar agrupadas.`
                          )
                        ) {
                          deleteCampaign(campanha.id);
                        }
                      }}
                    />
                  </>
                }
              />
            );
          })}
        </div>
      )}

      {(criando || editando) && (
        <FormularioCampanha
          campanha={editando}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
          onSave={(dados) => {
            if (editando) updateCampaign(editando.id, dados);
            else addCampaign(dados);
            setCriando(false);
            setEditando(null);
          }}
        />
      )}
    </div>
  );
};

/* ========================================================================== */

const FormularioCampanha: React.FC<{
  campanha: Campaign | null;
  onClose: () => void;
  onSave: (dados: Partial<Campaign>) => void;
}> = ({ campanha, onClose, onSave }) => {
  const clients = useAppStore((s) => s.clients);

  const [title, setTitle] = useState(campanha?.title || '');
  const [clientId, setClientId] = useState(campanha?.clientId || clients[0]?.id || '');
  const [description, setDescription] = useState(campanha?.description || '');
  const [startDate, setStartDate] = useState(campanha?.startDate || '');
  const [endDate, setEndDate] = useState(campanha?.endDate || '');
  const [status, setStatus] = useState<Campaign['status']>(campanha?.status || 'planejamento');

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientId) return;
    onSave({ title: title.trim(), clientId, description: description.trim(), startDate, endDate, status });
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
        aria-label={campanha ? 'Editar campanha' : 'Nova campanha'}
        className="relative w-full sm:max-w-lg bg-white dark:bg-[#0f1114] sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between gap-4 px-6 h-14 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
            {campanha ? 'Editar campanha' : 'Nova campanha'}
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
            <label htmlFor="camp-title" className="block t-label text-slate-500 mb-1.5">
              Nome da campanha
            </label>
            <input
              id="camp-title"
              autoFocus
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: 15 anos da Perfetto Uomo"
              className={campo}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="camp-client" className="block t-label text-slate-500 mb-1.5">
                Cliente
              </label>
              <select
                id="camp-client"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className={`${campo} cursor-pointer`}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="camp-status" className="block t-label text-slate-500 mb-1.5">
                Situação
              </label>
              <select
                id="camp-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as Campaign['status'])}
                className={`${campo} cursor-pointer`}
              >
                {STATUS_CAMPANHA.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="camp-start" className="block t-label text-slate-500 mb-1.5">
                Começa em
              </label>
              <input
                id="camp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${campo} cursor-pointer`}
              />
            </div>
            <div>
              <label htmlFor="camp-end" className="block t-label text-slate-500 mb-1.5">
                Termina em
              </label>
              <input
                id="camp-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${campo} cursor-pointer`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="camp-desc" className="block t-label text-slate-500 mb-1.5">
              Objetivo
            </label>
            <textarea
              id="camp-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="O que esta campanha precisa alcançar?"
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-3 t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={!title.trim()}>
            {campanha ? 'Salvar alterações' : 'Criar campanha'}
          </Button>
        </div>
      </form>
    </div>
  );
};
