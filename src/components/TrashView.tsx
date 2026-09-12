import React, { useMemo, useState } from 'react';
import { RotateCcw, Search, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { TrashItem } from '../types';
import { Button, EmptyState, Toast } from './ui';

interface TrashViewProps {
  onBackToTasks?: () => void;
}

const TIPOS: { key: TrashItem['type'] | 'all'; label: string }[] = [
  { key: 'all', label: 'Tudo' },
  { key: 'task', label: 'Pautas' },
  { key: 'client', label: 'Clientes' },
  { key: 'prompt', label: 'Prompts' },
  { key: 'note', label: 'Notas' },
];

const NOME_DO_TIPO: Record<string, string> = {
  task: 'pauta',
  client: 'cliente',
  prompt: 'prompt',
  note: 'nota',
  news: 'notícia',
  file: 'arquivo',
};

const DIAS_ATE_SUMIR = 30;

/** Quantos dias faltam até a exclusão automática. */
const diasRestantes = (deletedAt: string) => {
  const limite = new Date(deletedAt).getTime() + DIAS_ATE_SUMIR * 86400000;
  return Math.max(0, Math.ceil((limite - Date.now()) / 86400000));
};

const quandoFoi = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

/**
 * Lixeira.
 *
 * Rede de segurança, não arquivo: o que está aqui some sozinho em 30 dias, e
 * a tela diz quanto falta em cada linha. A ação principal de cada item é
 * restaurar — excluir de vez é o caso raro e fica no hover, com confirmação.
 *
 * O prazo é real: o store limpa o que passou de 30 dias a cada carregamento.
 */
export const TrashView: React.FC<TrashViewProps> = ({ onBackToTasks }) => {
  const trash = useAppStore((s) => s.trash || []);
  const restoreFromTrash = useAppStore((s) => s.restoreFromTrash);
  const permanentlyDeleteFromTrash = useAppStore((s) => s.permanentlyDeleteFromTrash);
  const emptyTrash = useAppStore((s) => s.emptyTrash);

  const [tipo, setTipo] = useState<TrashItem['type'] | 'all'>('all');
  const [busca, setBusca] = useState('');
  const [aviso, setAviso] = useState<string | null>(null);
  const [aExcluir, setAExcluir] = useState<TrashItem | null>(null);
  const [esvaziando, setEsvaziando] = useState(false);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return trash
      .filter((item) => {
        if (tipo !== 'all' && item.type !== tipo) return false;
        if (!termo) return true;
        return `${item.title} ${item.subtitle || ''} ${item.deletedBy || ''}`
          .toLowerCase()
          .includes(termo);
      })
      .sort((a, b) => (b.deletedAt || '').localeCompare(a.deletedAt || ''));
  }, [trash, tipo, busca]);

  // Só oferece o filtro dos tipos que realmente estão na lixeira.
  const tiposPresentes = useMemo(
    () => TIPOS.filter((t) => t.key === 'all' || trash.some((i) => i.type === t.key)),
    [trash]
  );

  const restaurar = (item: TrashItem) => {
    restoreFromTrash(item.id);
    setAviso(`"${item.title}" voltou para ${NOME_DO_TIPO[item.type] || 'o lugar'}.`);
  };

  return (
    <div id="trash-recycle-bin-view" className="mx-auto max-w-3xl space-y-6 pb-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
            Lixeira
          </h1>
          <p className="t-body text-slate-600 dark:text-slate-400 mt-1">
            {trash.length === 0
              ? 'Vazia. O que você excluir fica aqui por 30 dias antes de sumir de vez.'
              : `${trash.length} ${trash.length === 1 ? 'item excluído' : 'itens excluídos'}. Cada um some sozinho ${DIAS_ATE_SUMIR} dias depois.`}
          </p>
        </div>

        {trash.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setEsvaziando(true)}>
            Esvaziar lixeira
          </Button>
        )}
      </header>

      {trash.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar pelo nome…"
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

          {tiposPresentes.length > 2 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {tiposPresentes.map((t) => {
                const ativo = tipo === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTipo(t.key)}
                    aria-pressed={ativo}
                    className={`h-8 px-3 rounded-lg t-ui transition-colors cursor-pointer ${
                      ativo
                        ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {visiveis.length === 0 ? (
        <EmptyState
          title={trash.length === 0 ? 'Nada na lixeira' : 'Nada com esse filtro'}
          hint={
            trash.length === 0
              ? 'Pauta, cliente ou prompt excluído vem parar aqui e pode voltar com um clique.'
              : 'Tente outro termo ou volte para "Tudo".'
          }
          action={
            trash.length === 0 && onBackToTasks ? (
              <Button variant="secondary" size="sm" onClick={onBackToTasks}>
                Voltar para tarefas
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {visiveis.map((item) => {
            const dias = diasRestantes(item.deletedAt);
            const urgente = dias <= 3;

            return (
              <li key={item.id} className="flex items-center gap-4 py-3.5 group">
                <div className="min-w-0 flex-1">
                  <p className="t-lead font-medium text-slate-950 dark:text-white truncate">
                    {item.title || 'Sem título'}
                  </p>
                  <p className="t-meta text-slate-500 dark:text-slate-400 truncate">
                    {NOME_DO_TIPO[item.type] || 'item'}
                    {item.subtitle ? ` · ${item.subtitle}` : ''} · excluído em{' '}
                    {quandoFoi(item.deletedAt)}
                    {item.deletedBy ? ` por ${item.deletedBy}` : ''}
                  </p>
                </div>

                <span
                  className={`shrink-0 hidden sm:block t-meta w-[112px] text-right ${
                    urgente
                      ? 'text-amber-700 dark:text-amber-500'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {dias === 0
                    ? 'some hoje'
                    : dias === 1
                      ? 'some amanhã'
                      : `${dias} dias restantes`}
                </span>

                <div className="shrink-0 flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={RotateCcw}
                    onClick={() => restaurar(item)}
                  >
                    Restaurar
                  </Button>
                  <button
                    onClick={() => setAExcluir(item)}
                    aria-label={`Excluir "${item.title}" definitivamente`}
                    title="Excluir definitivamente"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {aExcluir && (
        <Confirmacao
          titulo="Excluir definitivamente?"
          corpo={
            <>
              <strong className="text-slate-950 dark:text-white">{aExcluir.title}</strong> some
              agora e não tem como trazer de volta. Se não fizer nada, ele sumiria sozinho em{' '}
              {diasRestantes(aExcluir.deletedAt)} dias.
            </>
          }
          acao="Excluir para sempre"
          onClose={() => setAExcluir(null)}
          onConfirm={() => {
            permanentlyDeleteFromTrash(aExcluir.id);
            setAviso(`"${aExcluir.title}" foi excluído definitivamente.`);
            setAExcluir(null);
          }}
        />
      )}

      {esvaziando && (
        <Confirmacao
          titulo="Esvaziar a lixeira?"
          corpo={
            <>
              {trash.length === 1
                ? 'O item guardado aqui some'
                : `Os ${trash.length} itens guardados aqui somem`}{' '}
              agora, de uma vez, e não tem como trazer de volta.
            </>
          }
          acao="Esvaziar"
          onClose={() => setEsvaziando(false)}
          onConfirm={() => {
            const quantos = trash.length;
            emptyTrash();
            setAviso(`${quantos} ${quantos === 1 ? 'item excluído' : 'itens excluídos'}.`);
            setEsvaziando(false);
          }}
        />
      )}

      <Toast message={aviso} onDismiss={() => setAviso(null)} />
    </div>
  );
};

/* ========================================================================== */

const Confirmacao: React.FC<{
  titulo: string;
  corpo: React.ReactNode;
  acao: string;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ titulo, corpo, acao, onClose, onConfirm }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="relative w-full max-w-md bg-white dark:bg-[#0f1114] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
          {titulo}
        </h2>
        <p className="t-body text-slate-600 dark:text-slate-400">{corpo}</p>
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {acao}
          </Button>
        </div>
      </div>
    </div>
  );
};
