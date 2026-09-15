import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAtualizacao } from '../lib/atualizacao';

/**
 * Aviso de versão nova, para quem está no meio de uma edição e por isso não
 * teve a recarga automática. Fica em todas as telas: app, login e portal.
 */
export const AvisoNovaVersao: React.FC = () => {
  const disponivel = useAtualizacao((s) => s.disponivel);
  if (!disponivel) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 rounded-lg bg-slate-950 dark:bg-white pl-4 pr-2 py-2 shadow-lg"
      style={{ animation: 'portal-toast-in 180ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      <span className="t-ui text-white dark:text-slate-950">Nova versão do app</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/15 hover:bg-white/25 dark:bg-slate-950/10 dark:hover:bg-slate-950/20 t-ui font-medium text-white dark:text-slate-950 cursor-pointer"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Atualizar
      </button>
    </div>
  );
};
