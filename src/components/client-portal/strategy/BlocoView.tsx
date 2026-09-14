import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';
import { StrategyBlock, StrategyBlockCor } from '../../../types';
import { semNegrito } from './blocos';

export const COR_DO_QUADRO: Record<StrategyBlockCor, string> = {
  neutro: 'text-slate-600 dark:text-slate-300',
  verde: 'text-emerald-700 dark:text-emerald-400',
  vermelho: 'text-rose-700 dark:text-rose-400',
  azul: 'text-sky-700 dark:text-sky-400',
  ambar: 'text-amber-700 dark:text-amber-500',
};

const Rotulo: React.FC<{ children: string }> = ({ children }) => (
  <h3 className="t-label text-slate-400 dark:text-slate-500 mb-4">{semNegrito(children)}</h3>
);

/** **negrito** dentro de uma linha. */
const Negrito: React.FC<{ texto: string }> = ({ texto }) => (
  <>
    {texto.split(/(\*\*[^*]+?\*\*)/g).map((parte, i) =>
      /^\*\*[^*]+\*\*$/.test(parte) ? (
        <strong key={i} className="font-semibold text-slate-950 dark:text-white">
          {parte.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={i}>{parte}</React.Fragment>
      )
    )}
  </>
);

/**
 * Texto com parágrafos (linha em branco) e negrito. Parágrafos seguidos ficam
 * num bloco só, com respiro de parágrafo — três blocos soltos davam um vão
 * grande demais entre frases do mesmo raciocínio.
 */
const TextoRico: React.FC<{ texto: string; className?: string }> = ({ texto, className = '' }) => {
  const paragrafos = texto.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={`space-y-4 ${className}`}>
      {paragrafos.map((p, i) => (
        <p key={i} className="whitespace-pre-line">
          <Negrito texto={p} />
        </p>
      ))}
    </div>
  );
};

/** Valor com cara de status: ✔ confirmado em verde, pendente em âmbar, ✘ em vermelho. */
const corDoValor = (v: string) => {
  if (/^(✔|✓|✅|☑)/u.test(v) || /^confirmad/i.test(v)) return 'text-emerald-700 dark:text-emerald-400';
  if (/^(✘|✗|❌|✖|✕)/u.test(v)) return 'text-rose-700 dark:text-rose-400';
  if (/^(n[aã]o (informad|confirmad|definid)|pendente|a (confirmar|validar|definir))/i.test(v))
    return 'text-amber-700 dark:text-amber-500';
  return 'text-slate-950 dark:text-white';
};

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
          <TextoRico texto={bloco.texto} className="t-body text-slate-700 dark:text-slate-300" />
        </div>
      ) : null;

    case 'destaque':
      return bloco.texto ? (
        <blockquote className="border-l-2 border-amber-500 pl-6">
          {bloco.titulo ? (
            // Com rótulo ("Objetivo", "Insight") é afirmação da agência, não
            // citação: sem aspas e sem itálico.
            <>
              <span className="t-label text-amber-700 dark:text-amber-500 block mb-2">{semNegrito(bloco.titulo)}</span>
              <TextoRico
                texto={bloco.texto}
                className="text-[19px] leading-relaxed font-medium text-slate-900 dark:text-slate-100"
              />
            </>
          ) : (
            <p className="text-[19px] leading-relaxed text-slate-800 dark:text-slate-200 italic whitespace-pre-line">
              “<Negrito texto={bloco.texto} />”
            </p>
          )}
          {bloco.legenda && <span className="t-label text-slate-500 block mt-3">{bloco.legenda}</span>}
        </blockquote>
      ) : null;

    case 'alerta':
      return bloco.texto || bloco.legenda ? (
        <div className="border-l-2 border-rose-500 pl-6">
          <span className="t-label text-rose-700 dark:text-rose-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            {semNegrito(bloco.titulo || 'Ponto de atenção')}
          </span>
          {bloco.legenda && (
            <p className="t-lead font-semibold text-slate-900 dark:text-white mt-2">{bloco.legenda}</p>
          )}
          {bloco.texto && (
            <TextoRico texto={bloco.texto} className="t-body text-slate-700 dark:text-slate-300 mt-1" />
          )}
        </div>
      ) : null;

    case 'lista':
      return itens.length ? (
        <div>
          {bloco.titulo && <Rotulo>{bloco.titulo}</Rotulo>}
          <ul className={bloco.marcador && bloco.marcador !== 'ponto' ? 'space-y-3' : 'space-y-2'}>
            {itens.map((i) => (
              <li key={i.id} className="flex gap-3 t-body text-slate-700 dark:text-slate-300">
                {bloco.marcador === 'check' ? (
                  <span className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : bloco.marcador === 'x' ? (
                  <span className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                    <X className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : (
                  <span className="text-slate-400 select-none">•</span>
                )}
                <span>
                  <Negrito texto={i.texto || ''} />
                </span>
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
                    <p className="t-body text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-line">
                      <Negrito texto={i.texto} />
                    </p>
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
                    <p className="t-body text-slate-600 dark:text-slate-400 mt-0.5 whitespace-pre-line">
                      <Negrito texto={i.texto} />
                    </p>
                  )}
                </div>
                {(i.valor || i.detalhe) && (
                  <div className="shrink-0 sm:text-right">
                    {i.valor && (
                      <p className={`t-lead font-semibold tabular-nums ${corDoValor(i.valor)}`}>{i.valor}</p>
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
                      <span>
                        <Negrito texto={t} />
                      </span>
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
