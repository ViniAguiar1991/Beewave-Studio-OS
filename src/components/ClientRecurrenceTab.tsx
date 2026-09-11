import React, { useMemo, useState } from 'react';
import { Plus, RotateCw, Trash2, X } from 'lucide-react';
import { Client, ContractService } from '../types';
import { useAppStore } from '../store';
import { previstoNaSemana } from '../lib/weekPlan';
import { Button, EmptyState, BlockHeader, Toast } from './ui';

interface ClientRecurrenceTabProps {
  client: Client;
}

const DIAS = [
  { dia: 1, label: 'Seg' },
  { dia: 2, label: 'Ter' },
  { dia: 3, label: 'Qua' },
  { dia: 4, label: 'Qui' },
  { dia: 5, label: 'Sex' },
  { dia: 6, label: 'Sáb' },
  { dia: 0, label: 'Dom' },
];

const FREQUENCIAS: { key: ContractService['frequency']; label: string; ciclo: string }[] = [
  { key: 'diario', label: 'Diário', ciclo: 'por dia marcado' },
  { key: 'semanal', label: 'Semanal', ciclo: 'por semana' },
  { key: 'quinzenal', label: 'Quinzenal', ciclo: 'a cada quinzena' },
  { key: 'mensal', label: 'Mensal', ciclo: 'por mês' },
];

const rotuloFrequencia = (f: ContractService['frequency']) =>
  FREQUENCIAS.find((x) => x.key === f) || FREQUENCIAS[1];

/**
 * Recorrência — o que o contrato obriga a entregar.
 *
 * É a fonte do "falta planejar" do painel inicial: sem serviço cadastrado
 * aqui, o sistema não tem como saber que a semana da Daxx está incompleta.
 *
 * O contador de cima é calculado dos serviços, não do campo solto
 * `postsPerWeek` — ele dizia "5 publicações/semana contratadas" logo acima de
 * "nenhum serviço configurado".
 */
export const ClientRecurrenceTab: React.FC<ClientRecurrenceTabProps> = ({ client }) => {
  const users = useAppStore((s) => s.users);
  const addContractService = useAppStore((s) => s.addContractService);
  const updateContractService = useAppStore((s) => s.updateContractService);
  const deleteContractService = useAppStore((s) => s.deleteContractService);
  const generateMonthlyTasksFromContract = useAppStore((s) => s.generateMonthlyTasksFromContract);

  const equipe = users.filter((u) => u.role !== 'cliente');
  const services = client.contractServices || [];

  const [cadastrando, setCadastrando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const porSemana = useMemo(
    () => services.reduce((soma, s) => soma + previstoNaSemana(s), 0),
    [services]
  );
  const ativos = services.filter((s) => s.active).length;

  const gerarPautas = () => {
    const n = generateMonthlyTasksFromContract(client.id);
    setAviso(
      n > 0
        ? `${n} ${n === 1 ? 'pauta criada' : 'pautas criadas'} para ${client.company}.`
        : 'Nenhum serviço ativo para gerar pautas neste mês.'
    );
  };

  const acoes = (
    <div className="flex items-center gap-2.5">
      <Button variant="secondary" size="sm" icon={Plus} onClick={() => setCadastrando(true)}>
        Novo serviço
      </Button>
      <Button
        variant="primary"
        size="sm"
        icon={RotateCw}
        onClick={gerarPautas}
        disabled={ativos === 0}
      >
        Gerar pautas do mês
      </Button>
    </div>
  );

  return (
    <section id="client-recurrence-tab" className="space-y-4">
      <BlockHeader
        title="Serviços recorrentes"
        count={
          services.length === 0
            ? undefined
            : porSemana > 0
              ? `${porSemana} ${porSemana === 1 ? 'entrega prevista' : 'entregas previstas'} esta semana`
              : `${services.length} cadastrados · nada previsto para esta semana`
        }
        action={acoes}
      />

      {services.length === 0 ? (
        <EmptyState
          title="Nenhum serviço recorrente cadastrado"
          hint="Enquanto isso, o painel inicial não consegue dizer quanto falta entregar para esta conta — ele compara o contratado com o que já virou pauta."
          action={
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setCadastrando(true)}>
              Cadastrar o primeiro serviço
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
          {services.map((srv) => {
            const responsavel = equipe.find((u) => u.id === srv.defaultAssigneeId);
            const freq = rotuloFrequencia(srv.frequency);
            const mostraDias =
              (srv.frequency === 'semanal' || srv.frequency === 'diario') &&
              (srv.daysOfWeek?.length || 0) > 0;

            return (
              <li key={srv.id} className="py-4 group flex items-start gap-4">
                <div className="min-w-0 flex-1">
                  <p
                    className={`t-lead font-medium ${
                      srv.active
                        ? 'text-slate-950 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500 line-through'
                    }`}
                  >
                    {srv.name}
                  </p>

                  <p className="t-meta text-slate-500 dark:text-slate-400 mt-1">
                    {srv.quantity} {srv.quantity === 1 ? 'entrega' : 'entregas'} {freq.ciclo}
                    {srv.defaultFormat ? ` · ${srv.defaultFormat}` : ''}
                    {` · ${responsavel?.name || 'sem responsável'}`}
                  </p>

                  {mostraDias && (
                    <div className="flex items-center gap-1 mt-2">
                      {DIAS.map(({ dia, label }) => {
                        const marcado = srv.daysOfWeek.includes(dia);
                        return (
                          <span
                            key={dia}
                            className={`px-1.5 py-0.5 rounded t-label ${
                              marcado
                                ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
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

                <div className="shrink-0 flex items-center gap-3 pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={srv.active}
                      onChange={(e) =>
                        updateContractService(client.id, srv.id, { active: e.target.checked })
                      }
                      className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 text-slate-950 focus:ring-slate-950 dark:focus:ring-white cursor-pointer"
                    />
                    <span className="t-meta text-slate-500 dark:text-slate-400">
                      {srv.active ? 'Ativo' : 'Pausado'}
                    </span>
                  </label>

                  <button
                    onClick={() => deleteContractService(client.id, srv.id)}
                    aria-label={`Remover ${srv.name}`}
                    title="Remover serviço"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {cadastrando && (
        <FormularioServico
          equipe={equipe}
          onClose={() => setCadastrando(false)}
          onSave={(dados) => {
            addContractService(client.id, dados);
            setCadastrando(false);
            setAviso(`"${dados.name}" entrou no contrato de ${client.company}.`);
          }}
        />
      )}

      <Toast message={aviso} onDismiss={() => setAviso(null)} />
    </section>
  );
};

/* ========================================================================== */

const FormularioServico: React.FC<{
  equipe: { id: string; name: string }[];
  onClose: () => void;
  onSave: (dados: Omit<ContractService, 'id'>) => void;
}> = ({ equipe, onClose, onSave }) => {
  const [nome, setNome] = useState('');
  const [frequencia, setFrequencia] = useState<ContractService['frequency']>('semanal');
  const [quantidade, setQuantidade] = useState(3);
  const [formato, setFormato] = useState('Post único');
  const [responsavel, setResponsavel] = useState(equipe[0]?.id || '');
  const [dias, setDias] = useState<number[]>([1, 3, 5]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pedeDias = frequencia === 'semanal' || frequencia === 'diario';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    onSave({
      name: nome.trim(),
      frequency: frequencia,
      quantity: Number(quantidade) || 1,
      defaultAssigneeId: responsavel,
      defaultFormat: formato,
      daysOfWeek: pedeDias ? dias : [],
      active: true,
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
        aria-label="Novo serviço recorrente"
        className="relative w-full sm:max-w-lg bg-white dark:bg-[#0f1114] sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between gap-4 px-6 h-14 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
            Novo serviço recorrente
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
            <label htmlFor="srv-nome" className="block t-label text-slate-500 mb-1.5">
              O que é entregue
            </label>
            <input
              id="srv-nome"
              autoFocus
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Posts para o feed"
              className={campo}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="srv-freq" className="block t-label text-slate-500 mb-1.5">
                Frequência
              </label>
              <select
                id="srv-freq"
                value={frequencia}
                onChange={(e) => setFrequencia(e.target.value as ContractService['frequency'])}
                className={`${campo} cursor-pointer`}
              >
                {FREQUENCIAS.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="srv-qtd" className="block t-label text-slate-500 mb-1.5">
                Quantas por ciclo
              </label>
              <input
                id="srv-qtd"
                type="number"
                min={1}
                max={30}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
                className={campo}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="srv-formato" className="block t-label text-slate-500 mb-1.5">
                Formato padrão
              </label>
              <select
                id="srv-formato"
                value={formato}
                onChange={(e) => setFormato(e.target.value)}
                className={`${campo} cursor-pointer`}
              >
                {['Post único', 'Carrossel', 'Reels / Vídeo', 'Stories', 'Tablóide impresso'].map(
                  (f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label htmlFor="srv-resp" className="block t-label text-slate-500 mb-1.5">
                Responsável padrão
              </label>
              <select
                id="srv-resp"
                value={responsavel}
                onChange={(e) => setResponsavel(e.target.value)}
                className={`${campo} cursor-pointer`}
              >
                {equipe.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {pedeDias && (
            <div>
              <p className="t-label text-slate-500 mb-1.5">Dias da semana</p>
              <div className="flex items-center gap-1.5">
                {DIAS.map(({ dia, label }) => {
                  const marcado = dias.includes(dia);
                  return (
                    <button
                      type="button"
                      key={dia}
                      aria-pressed={marcado}
                      onClick={() =>
                        setDias((prev) =>
                          prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]
                        )
                      }
                      className={`flex-1 h-8 rounded-lg t-ui font-medium transition-colors cursor-pointer ${
                        marcado
                          ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <p className="t-meta text-slate-400 dark:text-slate-500 mt-1.5">
                {frequencia === 'diario'
                  ? `${quantidade} ${quantidade === 1 ? 'entrega' : 'entregas'} em cada dia marcado — ${dias.length * quantidade} por semana.`
                  : 'É onde as pautas geradas caem no calendário.'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={!nome.trim()}>
            Salvar serviço
          </Button>
        </div>
      </form>
    </div>
  );
};
