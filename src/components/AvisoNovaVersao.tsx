import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { atualizarAgora, chaveDoAviso, dispensarAviso, useAtualizacao } from '../lib/atualizacao';

/**
 * Aviso de versão nova. Fica em todas as telas: app, login e portal.
 *
 * No topo, centralizado e acima dos modais: embaixo ele cobria o rodapé dos
 * modais (onde ficam Salvar e Enviar), o cronômetro flutuante e os toasts.
 * Dá para fechar; volta só quando surgir outra versão.
 */
export const AvisoNovaVersao: React.FC = () => {
  const visivel = useAtualizacao((s) => s.disponivel && s.dispensada !== chaveDoAviso(s.versaoRemota));

  return (
    // data-surface="app" para valerem a escala t-ui e a regra de movimento
    // reduzido. O fundo em degradê que a superfície traz é anulado aqui: sem
    // isso ele pintaria por cima do bg-* do aviso (a regra da superfície fica
    // fora das camadas do Tailwind e ganha das classes).
    <div
      data-surface="app"
      role="status"
      aria-live="polite"
      style={{ background: 'none' }}
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
    >
      {visivel && (
        <div
          className="pointer-events-auto flex items-center gap-1 rounded-full bg-slate-950 dark:bg-white pl-4 pr-1 py-1 shadow-lg whitespace-nowrap"
          style={{ animation: 'portal-fade-in 180ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <span className="t-ui text-white dark:text-slate-950 mr-2">Nova versão do app</span>
          <button
            type="button"
            onClick={atualizarAgora}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 dark:bg-slate-950/10 dark:hover:bg-slate-950/20 t-ui font-medium text-white dark:text-slate-950 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Atualizar
          </button>
          <button
            type="button"
            onClick={dispensarAviso}
            aria-label="Dispensar"
            className="grid h-8 w-8 place-items-center rounded-full text-white/70 hover:text-white hover:bg-white/15 dark:text-slate-950/60 dark:hover:text-slate-950 dark:hover:bg-slate-950/10 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
