import React, { useEffect, useRef, useState } from 'react';
import { FileUp, X } from 'lucide-react';
import { Button } from '../ui';
import { importarEstrategia, ResultadoImportacao } from './strategy/importar/importarArquivo';

interface StrategyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientName: string;
  /**
   * Recebe o documento lido. Quem chama abre no editor: a importação nunca
   * publica direto, porque nenhum leitor de arquivo acerta 100% — a agência
   * revisa antes de o cliente ver.
   */
  onImported: (resultado: ResultadoImportacao & { arquivo: string }) => void;
}

/**
 * Importar documento — escolhe o arquivo (ou cola o texto) e abre no editor.
 *
 * Tudo acontece no navegador: o PDF e o Word são lidos aqui mesmo, sem
 * servidor e sem IA. A estrutura sai do próprio layout do arquivo — tamanho
 * da fonte vira título, tabela vira cartões, SWOT vira quadro.
 */
export const StrategyImportModal: React.FC<StrategyImportModalProps> = ({
  isOpen,
  onClose,
  clientName,
  onImported,
}) => {
  const [lendo, setLendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [colado, setColado] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setLendo(null);
      setErro(null);
      setColado('');
      setArrastando(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !lendo && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [isOpen, lendo, onClose]);

  if (!isOpen) return null;

  const ler = async (entrada: File | string) => {
    const nome = typeof entrada === 'string' ? 'texto colado' : entrada.name;
    setErro(null);
    setLendo(nome);
    try {
      const resultado = await importarEstrategia(entrada, clientName);
      onImported({ ...resultado, arquivo: nome });
      onClose();
    } catch (e: any) {
      console.error('[estratégia] importação falhou', e);
      setErro(e?.message || 'Não foi possível ler este arquivo.');
    } finally {
      setLendo(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const soltar = (e: React.DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    const arquivo = e.dataTransfer.files?.[0];
    if (arquivo && !lendo) ler(arquivo);
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-slate-950/55"
        onClick={() => !lendo && onClose()}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="importar-estrategia-titulo"
        className="relative w-full max-w-xl bg-white dark:bg-[#0f1114] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between gap-4 px-6 h-14 border-b border-slate-200 dark:border-slate-800">
          <h2 id="importar-estrategia-titulo" className="t-ui font-semibold text-slate-950 dark:text-white">
            Importar estratégia · {clientName}
          </h2>
          <button
            onClick={onClose}
            disabled={!!lendo}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={soltar}
            className={[
              'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
              lendo ? 'cursor-wait' : 'cursor-pointer',
              arrastando
                ? 'border-slate-950 bg-slate-50 dark:border-white dark:bg-slate-800/60'
                : 'border-slate-300 hover:border-slate-500 dark:border-slate-700 dark:hover:border-slate-500',
            ].join(' ')}
          >
            {lendo ? (
              <>
                <span className="h-5 w-5 rounded-full border-2 border-slate-400 border-r-transparent animate-spin" />
                <span className="t-ui text-slate-800 dark:text-slate-200">Lendo {lendo}…</span>
              </>
            ) : (
              <>
                <FileUp className="h-6 w-6 text-slate-400" />
                <span className="t-ui font-medium text-slate-900 dark:text-white">
                  Escolher arquivo ou arrastar aqui
                </span>
                <span className="t-meta text-slate-500">PDF, Word (.docx), .txt ou .md</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
              disabled={!!lendo}
              onChange={(e) => {
                const arquivo = e.target.files?.[0];
                if (arquivo) ler(arquivo);
              }}
              className="hidden"
            />
          </label>

          <details className="group">
            <summary className="t-ui text-slate-600 dark:text-slate-400 cursor-pointer select-none hover:text-slate-950 dark:hover:text-white">
              Ou colar o texto
            </summary>
            <div className="mt-3 space-y-3">
              <textarea
                value={colado}
                onChange={(e) => setColado(e.target.value)}
                rows={8}
                placeholder={'# Nome do plano\n\n## Marca\nTexto do capítulo…\n\n## Públicos\n- item\n- item'}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3 t-meta text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:ring-2 focus:ring-slate-950/20 dark:focus:ring-white/20 resize-y font-mono"
              />
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!colado.trim() || !!lendo}
                  onClick={() => ler(colado)}
                >
                  Ler texto
                </Button>
              </div>
            </div>
          </details>

          {erro && (
            <p
              role="alert"
              className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 px-3 py-2.5 t-ui text-rose-700 dark:text-rose-300"
            >
              {erro}
            </p>
          )}

          <p className="t-meta text-slate-500">
            O documento abre no editor para revisar. O cliente só vê depois de salvar.
          </p>
        </div>
      </div>
    </div>
  );
};
