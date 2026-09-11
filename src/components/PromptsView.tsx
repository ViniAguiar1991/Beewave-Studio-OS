import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { useAppStore } from '../store';
import { PromptItem } from '../types';
import { Button, EmptyState, Toast } from './ui';

/**
 * Prompts — os comandos que a agência já validou.
 *
 * A tela existe para uma coisa: achar o prompt certo e levar para o
 * ChatGPT. Por isso copiar é a ação de cada linha e o texto aparece
 * inteiro, sem card intermediário pedindo um clique a mais.
 *
 * As categorias são abas porque navegam. Criar categoria é raro e mora
 * atrás de um botão discreto, não competindo com "Novo prompt".
 */
export const PromptsView: React.FC = () => {
  const promptFolders = useAppStore((s) => s.promptFolders);
  const prompts = useAppStore((s) => s.prompts);
  const addPrompt = useAppStore((s) => s.addPrompt);
  const updatePrompt = useAppStore((s) => s.updatePrompt);
  const deletePrompt = useAppStore((s) => s.deletePrompt);
  const addPromptFolder = useAppStore((s) => s.addPromptFolder);
  const deletePromptFolder = useAppStore((s) => s.deletePromptFolder);

  const [pastaAtiva, setPastaAtiva] = useState<string>(promptFolders[0]?.id || '');
  const [busca, setBusca] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [editando, setEditando] = useState<PromptItem | null>(null);
  const [criando, setCriando] = useState(false);
  const [novaPasta, setNovaPasta] = useState(false);
  const [pastaARemover, setPastaARemover] = useState<{ id: string; name: string } | null>(null);

  // A pasta ativa pode ter sido apagada em outra aba ou por um colega.
  useEffect(() => {
    if (promptFolders.length > 0 && !promptFolders.some((f) => f.id === pastaAtiva)) {
      setPastaAtiva(promptFolders[0].id);
    }
  }, [promptFolders, pastaAtiva]);

  // Buscar atravessa as categorias: quem procura um prompt raramente lembra
  // em qual pasta ele foi parar.
  const buscando = busca.trim().length > 0;

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo) {
      return prompts.filter((p) => `${p.title} ${p.body}`.toLowerCase().includes(termo));
    }
    return prompts.filter((p) => p.folderId === pastaAtiva);
  }, [prompts, pastaAtiva, busca]);

  const copiar = (item: PromptItem) => {
    navigator.clipboard.writeText(item.body);
    setCopiado(item.id);
    setTimeout(() => setCopiado((c) => (c === item.id ? null : c)), 2500);
  };

  const nomeDaPasta = (id: string) => promptFolders.find((f) => f.id === id)?.name || 'Geral';

  return (
    <div id="prompts-view" className="mx-auto max-w-3xl space-y-6 pb-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
            Prompts
          </h1>
          <p className="t-body text-slate-600 dark:text-slate-400 mt-1">
            {prompts.length} {prompts.length === 1 ? 'comando salvo' : 'comandos salvos'} para
            briefing, legenda, roteiro e imagem.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCriando(true)}>
          Novo prompt
        </Button>
      </header>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar em todas as categorias…"
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

      {!buscando && (
        <nav
          className="flex items-center gap-5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto"
          aria-label="Categorias de prompt"
        >
          {promptFolders.map((f) => {
            const ativa = pastaAtiva === f.id;
            const quantos = prompts.filter((p) => p.folderId === f.id).length;
            return (
              <span key={f.id} className="relative shrink-0 group/pasta flex items-center">
                <button
                  onClick={() => setPastaAtiva(f.id)}
                  aria-current={ativa ? 'page' : undefined}
                  className={`relative pb-2.5 t-ui whitespace-nowrap transition-colors cursor-pointer ${
                    ativa
                      ? 'text-slate-950 dark:text-white font-medium'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {f.name}
                  {quantos > 0 && (
                    <span className="ml-1.5 t-meta text-slate-400 tabular-nums">{quantos}</span>
                  )}
                  {ativa && (
                    <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-slate-950 dark:bg-white" />
                  )}
                </button>
                {ativa && promptFolders.length > 1 && (
                  <button
                    onClick={() => setPastaARemover({ id: f.id, name: f.name })}
                    aria-label={`Excluir categoria ${f.name}`}
                    title="Excluir categoria"
                    className="ml-1 mb-2.5 grid h-5 w-5 place-items-center rounded text-slate-300 hover:text-rose-600 opacity-0 group-hover/pasta:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}

          <button
            onClick={() => setNovaPasta(true)}
            className="shrink-0 pb-2.5 t-ui text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            + categoria
          </button>
        </nav>
      )}

      {buscando && (
        <p className="t-meta text-slate-500 dark:text-slate-400">
          {visiveis.length === 0
            ? 'Nenhum prompt com esse termo.'
            : `${visiveis.length} ${visiveis.length === 1 ? 'resultado' : 'resultados'} em todas as categorias.`}
        </p>
      )}

      {visiveis.length === 0 ? (
        !buscando && (
          <EmptyState
            title="Nenhum prompt nesta categoria"
            hint="Guarde aqui o comando que já funcionou — na próxima vez é copiar e colar em vez de reescrever."
            action={
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setCriando(true)}>
                Criar prompt
              </Button>
            }
          />
        )
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
          {visiveis.map((item) => (
            <li key={item.id} className="py-5 group">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="t-lead font-semibold text-slate-950 dark:text-white">
                    {item.title}
                  </h2>
                  {buscando && (
                    <p className="t-meta text-slate-400 dark:text-slate-500 mt-0.5">
                      {nomeDaPasta(item.folderId)}
                    </p>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={copiado === item.id ? Check : Copy}
                    onClick={() => copiar(item)}
                  >
                    {copiado === item.id ? 'Copiado' : 'Copiar'}
                  </Button>
                  <button
                    onClick={() => setEditando(item)}
                    aria-label={`Editar ${item.title}`}
                    title="Editar"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      deletePrompt(item.id);
                      setAviso(`"${item.title}" excluído.`);
                    }}
                    aria-label={`Excluir ${item.title}`}
                    title="Excluir"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <pre className="mt-3 whitespace-pre-wrap break-words font-mono text-[13.5px] leading-relaxed text-slate-600 dark:text-slate-400 max-h-52 overflow-y-auto">
                {item.body}
              </pre>
            </li>
          ))}
        </ul>
      )}

      {(criando || editando) && (
        <FormularioPrompt
          prompt={editando}
          pastas={promptFolders}
          pastaPadrao={editando?.folderId || pastaAtiva}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
          onSave={(dados) => {
            if (editando) {
              updatePrompt(editando.id, dados);
              setAviso(`"${dados.title}" salvo.`);
            } else {
              addPrompt(dados);
              setAviso(`"${dados.title}" entrou em ${nomeDaPasta(dados.folderId!)}.`);
            }
            setCriando(false);
            setEditando(null);
          }}
        />
      )}

      {novaPasta && (
        <FormularioPasta
          onClose={() => setNovaPasta(false)}
          onSave={(nome) => {
            const id = `pf_${Date.now()}`;
            addPromptFolder({ id, name: nome });
            setPastaAtiva(id);
            setNovaPasta(false);
          }}
        />
      )}

      {pastaARemover && (
        <ConfirmarPasta
          nome={pastaARemover.name}
          quantos={prompts.filter((p) => p.folderId === pastaARemover.id).length}
          onClose={() => setPastaARemover(null)}
          onConfirm={() => {
            deletePromptFolder(pastaARemover.id);
            setAviso(`Categoria "${pastaARemover.name}" excluída.`);
            setPastaARemover(null);
          }}
        />
      )}

      <Toast message={aviso} onDismiss={() => setAviso(null)} />
    </div>
  );
};

/* ========================================================================== */

const useEscape = (onClose: () => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
};

const campo =
  'w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors';

const FormularioPrompt: React.FC<{
  prompt: PromptItem | null;
  pastas: { id: string; name: string }[];
  pastaPadrao: string;
  onClose: () => void;
  onSave: (dados: Partial<PromptItem>) => void;
}> = ({ prompt, pastas, pastaPadrao, onClose, onSave }) => {
  const [title, setTitle] = useState(prompt?.title || '');
  const [body, setBody] = useState(prompt?.body || '');
  const [folderId, setFolderId] = useState(prompt?.folderId || pastaPadrao);
  useEscape(onClose);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    onSave({ title: title.trim(), body: body.trim(), folderId });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={prompt ? 'Editar prompt' : 'Novo prompt'}
        className="relative w-full sm:max-w-2xl max-h-[92vh] flex flex-col bg-white dark:bg-[#0f1114] sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between gap-4 px-6 h-14 shrink-0 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
            {prompt ? 'Editar prompt' : 'Novo prompt'}
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

        <div className="min-h-0 overflow-y-auto px-6 py-6 space-y-5">
          <div className="grid sm:grid-cols-[1fr_200px] gap-4">
            <div>
              <label htmlFor="pr-titulo" className="block t-label text-slate-500 mb-1.5">
                Para que serve
              </label>
              <input
                id="pr-titulo"
                autoFocus
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Legenda de carrossel educativo"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="pr-pasta" className="block t-label text-slate-500 mb-1.5">
                Categoria
              </label>
              <select
                id="pr-pasta"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                className={`${campo} cursor-pointer`}
              >
                {pastas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="pr-corpo" className="block t-label text-slate-500 mb-1.5">
              O comando
            </label>
            <textarea
              id="pr-corpo"
              required
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Cole aqui o comando completo, com as instruções e o formato de saída que você espera."
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono text-[13.5px] leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors resize-y"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={!title.trim() || !body.trim()}>
            Salvar prompt
          </Button>
        </div>
      </form>
    </div>
  );
};

const FormularioPasta: React.FC<{
  onClose: () => void;
  onSave: (nome: string) => void;
}> = ({ onClose, onSave }) => {
  const [nome, setNome] = useState('');
  useEscape(onClose);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nome.trim()) onSave(nome.trim());
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Nova categoria"
        className="relative w-full max-w-sm bg-white dark:bg-[#0f1114] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
          Nova categoria
        </h2>
        <input
          autoFocus
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Roteiros de Reels"
          className={campo}
        />
        <div className="flex items-center justify-end gap-3">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={!nome.trim()}>
            Criar
          </Button>
        </div>
      </form>
    </div>
  );
};

const ConfirmarPasta: React.FC<{
  nome: string;
  quantos: number;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ nome, quantos, onClose, onConfirm }) => {
  useEscape(onClose);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Excluir categoria ${nome}`}
        className="relative w-full max-w-md bg-white dark:bg-[#0f1114] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
          Excluir a categoria "{nome}"?
        </h2>
        <p className="t-body text-slate-600 dark:text-slate-400">
          {quantos === 0
            ? 'Ela está vazia, então nada mais se perde.'
            : quantos === 1
              ? 'O prompt guardado nela some junto.'
              : `Os ${quantos} prompts guardados nela somem junto.`}
        </p>
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Excluir
          </Button>
        </div>
      </div>
    </div>
  );
};
