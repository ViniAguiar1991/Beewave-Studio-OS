import React, { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2, X } from 'lucide-react';
import { StrategyBlock, StrategyBlockCor, StrategyBlockItem, StrategyBlockType } from '../../../types';
import { ESTILOS, novaCelula, novoItem, trocarEstilo } from './blocos';
import { COR_DO_QUADRO } from './BlocoView';

/**
 * Campo de texto que cresce com o conteúdo e tem a cara do texto final.
 *
 * Editar a estratégia não deve parecer preencher formulário: o campo usa a
 * tipografia do que vai aparecer para o cliente, e só a borda ao passar o
 * mouse denuncia que dá para escrever ali.
 */
export const TextoEditavel: React.FC<{
  valor: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
  linhaUnica?: boolean;
}> = ({ valor, onChange, placeholder, className = '', linhaUnica = false }) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${el.scrollHeight}px`;
  }, [valor]);

  return (
    <textarea
      ref={ref}
      rows={1}
      value={valor}
      placeholder={placeholder}
      onChange={(e) => onChange(linhaUnica ? e.target.value.replace(/\n/g, ' ') : e.target.value)}
      onKeyDown={(e) => {
        if (linhaUnica && e.key === 'Enter') e.preventDefault();
      }}
      className={`block w-full resize-none overflow-hidden bg-transparent rounded-md -mx-2 px-2 py-1 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-900 dark:focus:border-white focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 transition-colors ${className}`}
    />
  );
};

const CORES: StrategyBlockCor[] = ['neutro', 'verde', 'vermelho', 'azul', 'ambar'];
const PONTO_DA_COR: Record<StrategyBlockCor, string> = {
  neutro: 'bg-slate-400',
  verde: 'bg-emerald-500',
  vermelho: 'bg-rose-500',
  azul: 'bg-sky-500',
  ambar: 'bg-amber-500',
};

const MARCADORES: { valor: NonNullable<StrategyBlock['marcador']>; simbolo: string; nome: string }[] = [
  { valor: 'ponto', simbolo: '•', nome: 'Marcador de ponto' },
  { valor: 'check', simbolo: '✓', nome: 'Marcador de confirmação — o que a marca é ou faz' },
  { valor: 'x', simbolo: '✕', nome: 'Marcador de negação — o que a marca não é ou não faz' },
];

const SIMBOLO_DO_MARCADOR = { ponto: '•', check: '✓', x: '✕' } as const;

const BotaoIcone: React.FC<{
  rotulo: string;
  onClick: () => void;
  disabled?: boolean;
  perigo?: boolean;
  children: React.ReactNode;
}> = ({ rotulo, onClick, disabled, perigo, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={rotulo}
    title={rotulo}
    className={`grid h-7 w-7 place-items-center rounded-md transition-colors cursor-pointer disabled:opacity-25 disabled:pointer-events-none ${
      perigo
        ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {children}
  </button>
);

/** Escolha de estilo: lista curta, com o nome e para que serve. */
export const SeletorDeEstilo: React.FC<{
  atual?: StrategyBlockType;
  onEscolher: (tipo: StrategyBlockType) => void;
  onFechar: () => void;
}> = ({ atual, onEscolher, onFechar }) => (
  <>
    <span className="fixed inset-0 z-20" onClick={onFechar} aria-hidden="true" />
    <div
      role="menu"
      className="absolute z-30 mt-1 w-64 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0f1114] shadow-xl p-1"
    >
      {ESTILOS.map((e) => (
        <button
          key={e.tipo}
          type="button"
          role="menuitem"
          onClick={() => {
            onEscolher(e.tipo);
            onFechar();
          }}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors cursor-pointer ${
            atual === e.tipo
              ? 'bg-slate-100 dark:bg-slate-800'
              : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
          }`}
        >
          <span className="block t-ui font-medium text-slate-900 dark:text-white">{e.nome}</span>
          <span className="block t-meta text-slate-500 dark:text-slate-400">{e.descricao}</span>
        </button>
      ))}
    </div>
  </>
);

/**
 * Um bloco em modo edição: barra de ações por cima, conteúdo editável
 * embaixo, com a mesma forma que terá na leitura.
 */
export const EditorBloco: React.FC<{
  bloco: StrategyBlock;
  primeiro: boolean;
  ultimo: boolean;
  onChange: (b: StrategyBlock) => void;
  onMover: (direcao: -1 | 1) => void;
  onExcluir: () => void;
}> = ({ bloco, primeiro, ultimo, onChange, onMover, onExcluir }) => {
  const [escolhendo, setEscolhendo] = useState(false);
  const nomeDoEstilo = ESTILOS.find((e) => e.tipo === bloco.tipo)?.nome || bloco.tipo;
  const set = (dados: Partial<StrategyBlock>) => onChange({ ...bloco, ...dados });

  const itens = bloco.itens || [];
  const setItem = (id: string, dados: Partial<StrategyBlockItem>) =>
    set({ itens: itens.map((i) => (i.id === id ? { ...i, ...dados } : i)) });
  const removerItem = (id: string) => set({ itens: itens.filter((i) => i.id !== id) });

  return (
    <div
      className={`group/bloco relative rounded-xl border px-4 pt-2 pb-4 transition-colors ${
        bloco.oculto
          ? 'border-dashed border-slate-300 dark:border-slate-700 opacity-55'
          : 'border-transparent hover:border-slate-200 dark:hover:border-slate-800'
      }`}
    >
      {/* Barra do bloco */}
      <div className="flex items-center justify-between gap-2 -mx-1 mb-1">
        <div className="relative">
          <button
            type="button"
            onClick={() => setEscolhendo(true)}
            className="inline-flex items-center gap-1 h-7 px-2 rounded-md t-meta text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Trocar o estilo deste bloco"
          >
            Estilo: <span className="font-medium text-slate-700 dark:text-slate-200">{nomeDoEstilo}</span>
          </button>
          {escolhendo && (
            <SeletorDeEstilo
              atual={bloco.tipo}
              onEscolher={(tipo) => onChange(trocarEstilo(bloco, tipo))}
              onFechar={() => setEscolhendo(false)}
            />
          )}
          {bloco.oculto && <span className="ml-1 t-meta text-slate-400">· oculto para o cliente</span>}
        </div>

        {bloco.tipo === 'lista' && (
          <div className="mr-auto flex items-center gap-0.5" role="group" aria-label="Marcador da lista">
            {MARCADORES.map((m) => (
              <button
                key={m.valor}
                type="button"
                onClick={() => set({ marcador: m.valor === 'ponto' ? undefined : m.valor })}
                aria-pressed={(bloco.marcador || 'ponto') === m.valor}
                title={m.nome}
                className={`h-7 min-w-7 px-1.5 rounded-md t-meta transition-colors cursor-pointer ${
                  (bloco.marcador || 'ponto') === m.valor
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                    : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {m.simbolo}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-0.5 opacity-60 group-hover/bloco:opacity-100 focus-within:opacity-100 transition-opacity">
          <BotaoIcone rotulo="Subir bloco" onClick={() => onMover(-1)} disabled={primeiro}>
            <ArrowUp className="h-3.5 w-3.5" />
          </BotaoIcone>
          <BotaoIcone rotulo="Descer bloco" onClick={() => onMover(1)} disabled={ultimo}>
            <ArrowDown className="h-3.5 w-3.5" />
          </BotaoIcone>
          <BotaoIcone
            rotulo={bloco.oculto ? 'Mostrar para o cliente' : 'Ocultar do cliente'}
            onClick={() => set({ oculto: !bloco.oculto })}
          >
            {bloco.oculto ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </BotaoIcone>
          <BotaoIcone rotulo="Excluir bloco" onClick={onExcluir} perigo>
            <Trash2 className="h-3.5 w-3.5" />
          </BotaoIcone>
        </div>
      </div>

      {/* Rótulo do bloco — todo estilo menos o subtítulo, que já é um título */}
      {bloco.tipo !== 'subtitulo' && (
        <TextoEditavel
          valor={bloco.titulo || ''}
          onChange={(v) => set({ titulo: v })}
          placeholder={bloco.tipo === 'alerta' ? 'Ponto de atenção' : 'Rótulo (opcional)'}
          linhaUnica
          className="t-label text-slate-400 dark:text-slate-500 mb-1"
        />
      )}

      {/* ---- conteúdo por estilo ---- */}
      {bloco.tipo === 'subtitulo' && (
        <TextoEditavel
          valor={bloco.texto || ''}
          onChange={(v) => set({ texto: v })}
          placeholder="Subtítulo"
          linhaUnica
          className="font-display text-[20px] font-semibold tracking-tight text-slate-950 dark:text-white"
        />
      )}

      {bloco.tipo === 'texto' && (
        <TextoEditavel
          valor={bloco.texto || ''}
          onChange={(v) => set({ texto: v })}
          placeholder="Escreva o parágrafo…"
          className="t-body text-slate-700 dark:text-slate-300"
        />
      )}

      {bloco.tipo === 'destaque' && (
        <div className="border-l-2 border-amber-500 pl-5">
          <TextoEditavel
            valor={bloco.texto || ''}
            onChange={(v) => set({ texto: v })}
            placeholder="A frase que merece destaque…"
            className={`text-[19px] leading-relaxed text-slate-800 dark:text-slate-200 ${
              bloco.titulo ? 'font-medium' : 'italic'
            }`}
          />
          <TextoEditavel
            valor={bloco.legenda || ''}
            onChange={(v) => set({ legenda: v })}
            placeholder="Legenda (opcional)"
            linhaUnica
            className="t-label text-slate-500 mt-1"
          />
        </div>
      )}

      {bloco.tipo === 'alerta' && (
        <div className="border-l-2 border-rose-500 pl-5">
          <TextoEditavel
            valor={bloco.legenda || ''}
            onChange={(v) => set({ legenda: v })}
            placeholder="Frase forte (opcional)"
            linhaUnica
            className="t-lead font-semibold text-slate-900 dark:text-white"
          />
          <TextoEditavel
            valor={bloco.texto || ''}
            onChange={(v) => set({ texto: v })}
            placeholder="Explique o ponto de atenção…"
            className="t-body text-slate-700 dark:text-slate-300"
          />
        </div>
      )}

      {(bloco.tipo === 'lista' || bloco.tipo === 'etapas' || bloco.tipo === 'itens') && (
        <ul className="space-y-2 mt-1">
          {itens.map((i, n) => (
            <li key={i.id} className="group/item flex items-start gap-2">
              <span className="shrink-0 pt-1.5 t-meta tabular-nums text-slate-400 w-5 text-right select-none">
                {bloco.tipo === 'etapas'
                  ? String(n + 1).padStart(2, '0')
                  : bloco.tipo === 'lista'
                    ? SIMBOLO_DO_MARCADOR[bloco.marcador || 'ponto']
                    : '•'}
              </span>

              <div className="min-w-0 flex-1">
                {bloco.tipo === 'lista' ? (
                  <TextoEditavel
                    valor={i.texto || ''}
                    onChange={(v) => setItem(i.id, { texto: v })}
                    placeholder="Tópico"
                    className="t-body text-slate-700 dark:text-slate-300"
                  />
                ) : (
                  <div className={bloco.tipo === 'itens' ? 'grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-x-4' : ''}>
                    <div className="min-w-0">
                      <TextoEditavel
                        valor={i.titulo || ''}
                        onChange={(v) => setItem(i.id, { titulo: v })}
                        placeholder="Título"
                        linhaUnica
                        className="t-lead font-medium text-slate-900 dark:text-white"
                      />
                      <TextoEditavel
                        valor={i.texto || ''}
                        onChange={(v) => setItem(i.id, { texto: v })}
                        placeholder="Descrição"
                        className="t-body text-slate-600 dark:text-slate-400"
                      />
                      {bloco.tipo === 'etapas' && (
                        <TextoEditavel
                          valor={i.detalhe || ''}
                          onChange={(v) => setItem(i.id, { detalhe: v })}
                          placeholder="Detalhe (opcional)"
                          linhaUnica
                          className="t-meta text-slate-500"
                        />
                      )}
                    </div>
                    {bloco.tipo === 'itens' && (
                      <div className="sm:text-right">
                        <TextoEditavel
                          valor={i.valor || ''}
                          onChange={(v) => setItem(i.id, { valor: v })}
                          placeholder="Valor"
                          linhaUnica
                          className="t-lead font-semibold text-slate-950 dark:text-white sm:text-right"
                        />
                        <TextoEditavel
                          valor={i.detalhe || ''}
                          onChange={(v) => setItem(i.id, { detalhe: v })}
                          placeholder="Detalhe"
                          linhaUnica
                          className="t-meta text-slate-500 sm:text-right"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <span className="shrink-0 pt-0.5 opacity-0 group-hover/item:opacity-100 focus-within:opacity-100 transition-opacity">
                <BotaoIcone rotulo="Remover" onClick={() => removerItem(i.id)} perigo>
                  <X className="h-3.5 w-3.5" />
                </BotaoIcone>
              </span>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() =>
                set({
                  itens: [
                    ...itens,
                    bloco.tipo === 'lista' ? novoItem({ texto: '' }) : novoItem({ titulo: '', texto: '' }),
                  ],
                })
              }
              className="ml-7 inline-flex items-center gap-1 t-meta text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <Plus className="h-3 w-3" />
              {bloco.tipo === 'lista' ? 'tópico' : bloco.tipo === 'etapas' ? 'etapa' : 'item'}
            </button>
          </li>
        </ul>
      )}

      {bloco.tipo === 'quadro' && (
        <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
          {(bloco.celulas || []).map((c) => {
            const setCelula = (dados: Partial<typeof c>) =>
              set({ celulas: (bloco.celulas || []).map((x) => (x.id === c.id ? { ...x, ...dados } : x)) });
            return (
              <div key={c.id} className="group/cel rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1" role="group" aria-label="Cor da coluna">
                    {CORES.map((cor) => (
                      <button
                        key={cor}
                        type="button"
                        onClick={() => setCelula({ cor })}
                        aria-label={`Cor ${cor}`}
                        aria-pressed={(c.cor || 'neutro') === cor}
                        className={`h-3 w-3 rounded-full ${PONTO_DA_COR[cor]} cursor-pointer ${
                          (c.cor || 'neutro') === cor ? 'ring-2 ring-offset-1 ring-slate-400 dark:ring-offset-[#0f1114]' : 'opacity-40 hover:opacity-100'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="ml-auto opacity-0 group-hover/cel:opacity-100 focus-within:opacity-100 transition-opacity">
                    <BotaoIcone
                      rotulo="Remover coluna"
                      onClick={() => set({ celulas: (bloco.celulas || []).filter((x) => x.id !== c.id) })}
                      perigo
                    >
                      <X className="h-3.5 w-3.5" />
                    </BotaoIcone>
                  </span>
                </div>
                <TextoEditavel
                  valor={c.titulo}
                  onChange={(v) => setCelula({ titulo: v })}
                  placeholder="Título da coluna"
                  linhaUnica
                  className={`t-label ${COR_DO_QUADRO[c.cor || 'neutro']}`}
                />
                <ul className="space-y-1 mt-1">
                  {c.itens.map((t, idx) => (
                    <li key={idx} className="group/top flex items-start gap-2">
                      <span className="text-slate-400 select-none pt-1">•</span>
                      <TextoEditavel
                        valor={t}
                        onChange={(v) => setCelula({ itens: c.itens.map((x, j) => (j === idx ? v : x)) })}
                        placeholder="Tópico"
                        className="t-body text-slate-700 dark:text-slate-300"
                      />
                      <span className="opacity-0 group-hover/top:opacity-100 focus-within:opacity-100 transition-opacity">
                        <BotaoIcone
                          rotulo="Remover tópico"
                          onClick={() => setCelula({ itens: c.itens.filter((_, j) => j !== idx) })}
                          perigo
                        >
                          <X className="h-3 w-3" />
                        </BotaoIcone>
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setCelula({ itens: [...c.itens, ''] })}
                  className="ml-4 mt-1 inline-flex items-center gap-1 t-meta text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <Plus className="h-3 w-3" />
                  tópico
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={() =>
              set({ celulas: [...(bloco.celulas || []), novaCelula({ titulo: `Coluna ${(bloco.celulas || []).length + 1}` })] })
            }
            className="self-start inline-flex items-center gap-1 t-meta text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            coluna
          </button>
        </div>
      )}
    </div>
  );
};
