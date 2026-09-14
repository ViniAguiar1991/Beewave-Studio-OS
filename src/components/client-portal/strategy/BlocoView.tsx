import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { StrategyBlock, StrategyBlockCor } from '../../../types';

export const COR_DO_QUADRO: Record<StrategyBlockCor, string> = {
  neutro: 'text-slate-600 dark:text-slate-300',
  verde: 'text-emerald-700 dark:text-emerald-400',
  vermelho: 'text-rose-700 dark:text-rose-400',
  azul: 'text-sky-700 dark:text-sky-400',
  ambar: 'text-amber-700 dark:text-amber-500',
};

const Rotulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="t-label text-slate-400 dark:text-slate-500 mb-4">{children}</h3>
);

/**
 * Um bloco da estratégia, em modo leitura.
 *
 * Cada estilo tem um jeito só de aparecer, e é o mesmo que a estratégia já
 * usava para o conteúdo equivalente: o destaque é a citação com filete
 * âmbar, o quadro é a SWOT, itens com valor são as metas. Trocar o estilo de
 * um bloco troca o visual, não o texto.
 */
export const BlocoView: React.FC<{ bloco: StrategyBlock }> = ({ bloco }) => {
  const itens = (bloco.itens || []).filter((i) => i.titulo || i.texto || i.valor || i.detalhe);

  switch (bloco.tipo) {
    case 'subtitulo':
      return bloco.texto ? (
        <h3 className="font-display text-[20px] font-semibold tracking-tight text-slate-950 dark:text-white">
          {bloco.texto}
        </h3>
      ) : null;

    case 'texto':
      return bloco.texto ? (
        <div>
          {bloco.titulo && <Rotulo>{bloco.titulo}</Rotulo>}
          <p className="t-body text-slate-700 dark:text-slate-300 whitespace-pre-line">{bloco.texto}</p>
        </div>
      ) : null;

    case 'destaque':
      return bloco.texto ? (
        <blockquote className="border-l-2 border-amber-500 pl-6">
          {bloco.titulo && <span className="t-label text-slate-500 block mb-2">{bloco.titulo}</span>}
          <p className="text-[19px] leading-relaxed text-slate-800 dark:text-slate-200 italic whitespace-pre-line">
            “{bloco.texto}”
          </p>
          {bloco.legenda && <span className="t-label text-slate-500 block mt-3">{bloco.legenda}</span>}
        </blockquote>
      ) : null;

    case 'alerta':
      return bloco.texto || bloco.legenda ? (
        <div className="border-l-2 border-rose-500 pl-6">
          <span className="t-label text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {bloco.titulo || 'Ponto de atenção'}
          </span>
          {bloco.legenda && (
            <p className="t-lead font-semibold text-slate-900 dark:text-white mt-2">{bloco.legenda}</p>
          )}
          {bloco.texto && (
            <p className="t-body text-slate-700 dark:text-slate-300 mt-1 whitespace-pre-line">{bloco.texto}</p>
          )}
        </div>
      ) : null;

    case 'lista':
      return itens.length ? (
        <div>
          {bloco.titulo && <Rotulo>{bloco.titulo}</Rotulo>}
          <ul className="space-y-2">
            {itens.map((i) => (
              <li key={i.id} className="flex gap-3 t-body text-slate-700 dark:text-slate-300">
                <span className="text-slate-400 select-none">•</span>
                <span>{i.texto}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null;

    case 'etapas':
      return itens.length ? (
        <div>
          {bloco.titulo && <Rotulo>{bloco.titulo}</Rotulo>}
          <ol className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {itens.map((i, n) => (
              <li key={i.id} className="py-4 flex items-baseline gap-3">
                <span className="shrink-0 t-meta tabular-nums text-slate-400 dark:text-slate-600">
                  {String(n + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  {i.titulo && <p className="t-lead font-medium text-slate-900 dark:text-white">{i.titulo}</p>}
                  {i.texto && (
                    <p className="t-body text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-line">{i.texto}</p>
                  )}
                  {i.detalhe && <p className="t-meta text-slate-500 dark:text-slate-400 mt-1.5">{i.detalhe}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ) : null;

    case 'itens':
      return itens.length ? (
        <div>
          {bloco.titulo && <Rotulo>{bloco.titulo}</Rotulo>}
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {itens.map((i) => (
              <li key={i.id} className="py-4 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                <div className="min-w-0">
                  {i.titulo && <p className="t-lead font-medium text-slate-900 dark:text-white">{i.titulo}</p>}
                  {i.texto && (
                    <p className="t-body text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-line">{i.texto}</p>
                  )}
                </div>
                {(i.valor || i.detalhe) && (
                  <div className="shrink-0 sm:text-right">
                    {i.valor && (
                      <p className="t-lead font-semibold text-slate-950 dark:text-white tabular-nums">{i.valor}</p>
                    )}
                    {i.detalhe && <p className="t-meta text-slate-500 dark:text-slate-400">{i.detalhe}</p>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null;

    case 'quadro': {
      const celulas = (bloco.celulas || []).filter((c) => c.titulo || c.itens.some(Boolean));
      if (!celulas.length) return null;
      return (
        <div>
          {bloco.titulo && <Rotulo>{bloco.titulo}</Rotulo>}
          <div
            className={`grid grid-cols-1 gap-x-10 gap-y-8 ${
              celulas.length === 1 ? '' : celulas.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            }`}
          >
            {celulas.map((c) => (
              <div key={c.id}>
                <span className={`t-label ${COR_DO_QUADRO[c.cor || 'neutro']}`}>{c.titulo}</span>
                <ul className="mt-2.5 space-y-2">
                  {c.itens.filter(Boolean).map((t, i) => (
                    <li key={i} className="flex gap-3 t-body text-slate-700 dark:text-slate-300">
                      <span className="text-slate-400 select-none">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
