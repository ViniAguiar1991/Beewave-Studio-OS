import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, FileUp, Pencil, Plus, Printer, Trash2, X } from 'lucide-react';
import { Client, ClientStrategyDocument, StrategyChapter } from '../../types';
import { StrategyImportModal } from './StrategyImportModal';
import { impedirRecarga } from '../../lib/atualizacao';
import { Button, EmptyState } from '../ui';
import { BlocoView } from './strategy/BlocoView';
import { EditorBloco, SeletorDeEstilo, TextoEditavel } from './strategy/EditorBloco';
import {
  mover,
  normalizarDocumento,
  novoBloco,
  novoCapitulo,
  novoId,
  renumerar,
  rotuloSemNumero,
  sobretituloDoCapitulo,
} from './strategy/blocos';

interface ClientStrategyTabProps {
  currentClient: Client;
  onUpdateStrategy?: (strategy: ClientStrategyDocument) => void;
  /**
   * Importar e editar é ferramenta da agência. No portal do cliente esses
   * controles não existem: o cliente lê a estratégia e pede alteração.
   */
  isAgencyView?: boolean;
  /** Abre o pedido de alteração. Só no portal do cliente. */
  onRequestChange?: () => void;
}

/**
 * Estratégia — um documento só, do começo ao fim, agora editável.
 *
 * A agência edita no próprio portal, vendo o texto com a cara final: cada
 * capítulo é uma sequência de blocos, e cada bloco tem um estilo (texto,
 * destaque, lista, etapas, quadro…) que dá para trocar a qualquer momento.
 * Blocos e capítulos podem ser ocultados — somem para o cliente e continuam
 * guardados.
 *
 * A edição acontece num rascunho e só vai para o cliente ao salvar. Publicar
 * a cada tecla mostraria meia frase para quem estiver com o portal aberto, e
 * gastaria a cota de escrita do Firestore.
 */
export const ClientStrategyTab: React.FC<ClientStrategyTabProps> = ({
  currentClient,
  onUpdateStrategy,
  isAgencyView = false,
  onRequestChange,
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [rascunho, setRascunho] = useState<ClientStrategyDocument | null>(null);
  /** De onde veio o rascunho, quando veio de um arquivo importado. */
  const [importado, setImportado] = useState<string | null>(null);
  const editando = !!rascunho;

  /**
   * A estratégia exibida é SEMPRE a do cliente atual. Não existe documento
   * padrão de reserva: um dia houve, e outros clientes viam o plano da Emely.
   */
  const original = currentClient.strategyDocument;
  const documento = useMemo(
    () => (original ? normalizarDocumento(original, currentClient.company) : undefined),
    [original, currentClient.company]
  );

  // Trocar de cliente no seletor do portal descarta o rascunho do anterior.
  useEffect(() => {
    setRascunho(null);
    setImportado(null);
  }, [currentClient.id]);

  const capitulosVisiveis = useMemo(
    () => (documento?.chapters || []).filter((c) => !c.oculto),
    [documento]
  );

  const [activeId, setActiveId] = useState<string>('');

  /**
   * Marca no índice o capítulo que está sendo lido: o último cujo título já
   * passou pela linha de leitura (um quarto abaixo do topo da janela).
   */
  useEffect(() => {
    if (editando || capitulosVisiveis.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const readingLine = window.innerHeight * 0.25;
      let current = capitulosVisiveis[0]?.id || '';
      for (const ch of capitulosVisiveis) {
        const el = document.getElementById(ch.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top <= readingLine) current = ch.id;
        else break;
      }
      setActiveId(current);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [capitulosVisiveis, editando]);

  const goToChapter = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveId(id);
  };

  const salvar = () => {
    if (!rascunho) return;
    onUpdateStrategy?.({ ...rascunho, updatedAt: new Date().toISOString() });
    setRascunho(null);
    setImportado(null);
  };

  const descartar = () => {
    if (!window.confirm('Descartar as alterações que ainda não foram salvas?')) return;
    setRascunho(null);
    setImportado(null);
  };

  const importadorModal = (
    <StrategyImportModal
      isOpen={isImportModalOpen}
      onClose={() => setIsImportModalOpen(false)}
      clientName={currentClient.company}
      onImported={({ documento: doc, arquivo, capitulos, blocos }) => {
        setRascunho(normalizarDocumento(doc, currentClient.company));
        setImportado(
          `${arquivo} · ${capitulos} ${capitulos === 1 ? 'capítulo' : 'capítulos'}, ${blocos} blocos`
        );
        window.scrollTo({ top: 0 });
      }}
    />
  );

  const comecarDoZero = () =>
    setRascunho({
      title: currentClient.company,
      subtitle: '',
      cycleMeta: 'Plano de marca, conteúdo e aquisição',
      destaques: [],
      chapters: [novoCapitulo(0)],
    });

  /* ----------------------------------------------------------------------
   * Edição
   * -------------------------------------------------------------------- */
  if (rascunho) {
    return (
      <EditorEstrategia
        doc={rascunho}
        nomeCliente={currentClient.company}
        onChange={setRascunho}
        importado={importado}
        onSalvar={salvar}
        onDescartar={descartar}
      />
    );
  }

  /* ----------------------------------------------------------------------
   * Sem documento
   * -------------------------------------------------------------------- */
  if (!documento || (documento.chapters || []).length === 0) {
    return (
      <div className="portal-enter">
        <EmptyState
          title={`A estratégia de ${currentClient.company} ainda não foi publicada aqui`}
          hint={
            isAgencyView
              ? 'Importe o documento do plano ou monte a estratégia direto aqui, bloco por bloco.'
              : 'Assim que a Beewave publicar o plano de marca e conteúdo, ele aparece nesta aba, capítulo por capítulo.'
          }
          action={
            isAgencyView ? (
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <Button variant="primary" size="sm" icon={Pencil} onClick={comecarDoZero}>
                  Montar do zero
                </Button>
                <Button variant="secondary" size="sm" icon={FileUp} onClick={() => setIsImportModalOpen(true)}>
                  Importar documento
                </Button>
              </div>
            ) : undefined
          }
        />
        {importadorModal}
      </div>
    );
  }

  /* ----------------------------------------------------------------------
   * Leitura — o que o cliente vê
   * -------------------------------------------------------------------- */
  const destaques = (documento.destaques || []).filter((d) => d.texto);

  return (
    <div className="portal-enter">
      <header className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <span className="t-label text-slate-500">
            {documento.cycleMeta || 'Plano de marca, conteúdo e aquisição'}
          </span>

          <div className="flex items-center gap-3 flex-wrap">
            {isAgencyView && (
              <>
                <Button
                  variant="primary"
                  size="sm"
                  icon={Pencil}
                  onClick={() => setRascunho(normalizarDocumento(original!, currentClient.company))}
                >
                  Editar estratégia
                </Button>
                <Button variant="ghost" size="sm" icon={FileUp} onClick={() => setIsImportModalOpen(true)}>
                  Importar
                </Button>
              </>
            )}
            <Button variant="ghost" size="sm" icon={Printer} onClick={() => window.print()}>
              <span className="hidden sm:inline">Imprimir</span>
            </Button>
            {!isAgencyView && onRequestChange && (
              <Button variant="secondary" size="sm" onClick={onRequestChange}>
                Pedir alteração
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white leading-[1.05]">
            {documento.title || currentClient.company}
          </h1>
          {documento.subtitle && (
            <p className="text-[18px] sm:text-[20px] text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
              {documento.subtitle}
            </p>
          )}
        </div>

        {destaques.length > 0 && (
          <div
            className={`grid grid-cols-1 gap-6 md:gap-8 pt-5 pb-6 border-y border-slate-200 dark:border-slate-800 ${
              destaques.length >= 3 ? 'md:grid-cols-3' : destaques.length === 2 ? 'md:grid-cols-2' : ''
            }`}
          >
            {destaques.map((d, i) => (
              <div
                key={d.id}
                className={i > 0 ? 'md:border-l md:border-slate-200 dark:md:border-slate-800 md:pl-8' : ''}
              >
                <span className="t-label text-slate-500">{d.rotulo}</span>
                <p className="t-body text-slate-800 dark:text-slate-200 mt-2 whitespace-pre-line">{d.texto}</p>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Índice + documento corrido. Sem `items-start`: o <nav> precisa esticar
          até o fim do documento, senão o sticky não tem onde grudar. */}
      <div className="flex gap-10 xl:gap-16 pt-12">
        <nav aria-label="Capítulos do plano" className="hidden lg:block w-60 xl:w-64 shrink-0">
          <div className="sticky top-6 max-h-[calc(100vh-4rem)] overflow-y-auto no-scrollbar pb-6">
            <p className="t-label text-slate-400 dark:text-slate-500 px-3 pb-3">Neste plano</p>
            <ul className="space-y-0.5">
              {capitulosVisiveis.map((ch) => {
                const isActive = activeId === ch.id;
                return (
                  <li key={ch.id}>
                    <button
                      onClick={() => goToChapter(ch.id)}
                      aria-current={isActive ? 'true' : undefined}
                      className={`w-full text-left flex gap-2.5 px-3 py-2 rounded-lg t-ui transition-colors duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-950 dark:text-white font-semibold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                      }`}
                    >
                      <span
                        className={`shrink-0 tabular-nums ${
                          isActive ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-slate-600'
                        }`}
                      >
                        {ch.number}
                      </span>
                      <span className="min-w-0">{ch.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        <article className="min-w-0 flex-1 max-w-3xl">
          {capitulosVisiveis.map((ch, i) => (
            <section
              key={ch.id}
              id={ch.id}
              data-chapter
              className={i === 0 ? '' : 'mt-20 pt-14 border-t border-slate-200 dark:border-slate-800'}
            >
              <span className="t-label text-slate-400 dark:text-slate-500">{sobretituloDoCapitulo(ch)}</span>
              <h2 className="font-display text-[26px] sm:text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight mt-2">
                {ch.title}
              </h2>
              {ch.subtitle && <p className="t-body text-slate-600 dark:text-slate-300 mt-3">{ch.subtitle}</p>}

              <div className="space-y-10 mt-8">
                {(ch.blocos || [])
                  .filter((b) => !b.oculto)
                  .map((b) => (
                    <BlocoView key={b.id} bloco={b} />
                  ))}
              </div>
            </section>
          ))}
        </article>
      </div>

      {importadorModal}
    </div>
  );
};

/* ==========================================================================
 * Editor
 * ========================================================================== */

const EditorEstrategia: React.FC<{
  doc: ClientStrategyDocument;
  nomeCliente: string;
  onChange: (d: ClientStrategyDocument) => void;
  /** Resumo do arquivo importado, quando o rascunho veio de uma importação. */
  importado?: string | null;
  onSalvar: () => void;
  onDescartar: () => void;
}> = ({ doc, nomeCliente, onChange, importado, onSalvar, onDescartar }) => {
  const capitulos = doc.chapters || [];
  const destaques = doc.destaques || [];
  const [novoBlocoEm, setNovoBlocoEm] = useState<string | null>(null);

  const set = (dados: Partial<ClientStrategyDocument>) => onChange({ ...doc, ...dados });
  const setCapitulos = (lista: StrategyChapter[]) => set({ chapters: renumerar(lista) });
  const setCapitulo = (id: string, dados: Partial<StrategyChapter>) =>
    set({ chapters: capitulos.map((c) => (c.id === id ? { ...c, ...dados } : c)) });

  // Sair da página com rascunho aberto pede confirmação do navegador.
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', aviso);
    // Rascunho aberto também segura a atualização automática de versão.
    const soltar = impedirRecarga();
    return () => {
      window.removeEventListener('beforeunload', aviso);
      soltar();
    };
  }, []);

  return (
    <div className="portal-enter pb-24">
      {/* Barra fixa: onde está e como sair */}
      <div className="sticky top-0 z-30 -mx-5 sm:-mx-8 px-5 sm:px-8 py-3 mb-8 bg-amber-50/95 dark:bg-amber-950/60 backdrop-blur border-b border-amber-200 dark:border-amber-900 flex items-center justify-between gap-4 flex-wrap">
        <p className="t-ui text-amber-900 dark:text-amber-200">
          {importado ? (
            <>
              Importado de {importado}. Revise e salve — o cliente só vê depois de salvar.
            </>
          ) : (
            'Editando a estratégia. O cliente só vê as mudanças depois de salvar.'
          )}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onDescartar}>
            Descartar
          </Button>
          <Button variant="primary" size="sm" onClick={onSalvar}>
            Salvar e publicar
          </Button>
        </div>
      </div>

      {/* Capa */}
      <header className="space-y-4">
        <TextoEditavel
          valor={doc.cycleMeta || ''}
          onChange={(v) => set({ cycleMeta: v })}
          placeholder="Linha de apoio (ex.: plano de marca, setembro 2026)"
          linhaUnica
          className="t-label text-slate-500"
        />
        <TextoEditavel
          valor={doc.title || ''}
          onChange={(v) => set({ title: v })}
          placeholder={nomeCliente}
          className="font-display text-[34px] sm:text-[44px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white leading-[1.05]"
        />
        <TextoEditavel
          valor={doc.subtitle || ''}
          onChange={(v) => set({ subtitle: v })}
          placeholder="Subtítulo do plano (opcional)"
          className="text-[18px] sm:text-[20px] text-slate-600 dark:text-slate-300 leading-relaxed"
        />

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
          <p className="t-label text-slate-400 mb-3">Destaques da capa</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {destaques.map((d) => (
              <div
                key={d.id}
                className="group/dst relative rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => set({ destaques: destaques.filter((x) => x.id !== d.id) })}
                  aria-label="Remover destaque"
                  className="absolute top-2 right-2 grid h-6 w-6 place-items-center rounded-md text-slate-300 hover:text-rose-600 opacity-0 group-hover/dst:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <TextoEditavel
                  valor={d.rotulo}
                  onChange={(v) =>
                    set({ destaques: destaques.map((x) => (x.id === d.id ? { ...x, rotulo: v } : x)) })
                  }
                  placeholder="Rótulo"
                  linhaUnica
                  className="t-label text-slate-500 pr-6"
                />
                <TextoEditavel
                  valor={d.texto}
                  onChange={(v) =>
                    set({ destaques: destaques.map((x) => (x.id === d.id ? { ...x, texto: v } : x)) })
                  }
                  placeholder="Texto do destaque"
                  className="t-body text-slate-800 dark:text-slate-200"
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() => set({ destaques: [...destaques, { id: novoId('dst'), rotulo: '', texto: '' }] })}
              className="min-h-[88px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 t-ui text-slate-500 hover:text-slate-900 hover:border-slate-500 dark:hover:text-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Destaque
            </button>
          </div>
        </div>
      </header>

      {/* Capítulos */}
      <div className="mt-14 max-w-3xl space-y-16">
        {capitulos.map((ch, idx) => {
          const blocos = ch.blocos || [];
          const setBlocos = (lista: typeof blocos) => setCapitulo(ch.id, { blocos: lista });
          const tagSemNumero = rotuloSemNumero(ch.tag);

          return (
            <section
              key={ch.id}
              className={`relative rounded-2xl border p-5 sm:p-6 ${
                ch.oculto
                  ? 'border-dashed border-slate-300 dark:border-slate-700 opacity-60'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="t-meta text-slate-400">
                  Capítulo {ch.number}
                  {ch.oculto && ' · oculto para o cliente'}
                </span>
                <div className="flex items-center gap-0.5">
                  <IconeAcao rotulo="Subir capítulo" onClick={() => setCapitulos(mover(capitulos, idx, idx - 1))} disabled={idx === 0}>
                    <ArrowUp className="h-3.5 w-3.5" />
                  </IconeAcao>
                  <IconeAcao rotulo="Descer capítulo" onClick={() => setCapitulos(mover(capitulos, idx, idx + 1))} disabled={idx === capitulos.length - 1}>
                    <ArrowDown className="h-3.5 w-3.5" />
                  </IconeAcao>
                  <IconeAcao
                    rotulo={ch.oculto ? 'Mostrar capítulo para o cliente' : 'Ocultar capítulo do cliente'}
                    onClick={() => setCapitulo(ch.id, { oculto: !ch.oculto })}
                  >
                    {ch.oculto ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </IconeAcao>
                  <IconeAcao
                    rotulo="Excluir capítulo"
                    perigo
                    onClick={() => {
                      if (window.confirm(`Excluir o capítulo "${ch.title}" e todos os blocos dele?`)) {
                        setCapitulos(capitulos.filter((c) => c.id !== ch.id));
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconeAcao>
                </div>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="t-label text-slate-400 shrink-0">{ch.number} ·</span>
                <TextoEditavel
                  valor={tagSemNumero}
                  onChange={(v) => setCapitulo(ch.id, { tag: `${ch.number} · ${v}` })}
                  placeholder="Rótulo do capítulo"
                  linhaUnica
                  className="t-label text-slate-400"
                />
              </div>
              <TextoEditavel
                valor={ch.title}
                onChange={(v) => setCapitulo(ch.id, { title: v })}
                placeholder="Título do capítulo"
                className="font-display text-[26px] sm:text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight mt-1"
              />
              <TextoEditavel
                valor={ch.subtitle || ''}
                onChange={(v) => setCapitulo(ch.id, { subtitle: v })}
                placeholder="Subtítulo (opcional)"
                className="t-body text-slate-600 dark:text-slate-300"
              />

              <div className="space-y-3 mt-6 -mx-4">
                {blocos.map((b, bi) => (
                  <EditorBloco
                    key={b.id}
                    bloco={b}
                    primeiro={bi === 0}
                    ultimo={bi === blocos.length - 1}
                    onChange={(novo) => setBlocos(blocos.map((x) => (x.id === b.id ? novo : x)))}
                    onMover={(d) => setBlocos(mover(blocos, bi, bi + d))}
                    onExcluir={() => setBlocos(blocos.filter((x) => x.id !== b.id))}
                  />
                ))}
              </div>

              <div className="relative mt-4">
                <button
                  type="button"
                  onClick={() => setNovoBlocoEm(ch.id)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 t-ui text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar bloco
                </button>
                {novoBlocoEm === ch.id && (
                  <SeletorDeEstilo
                    onEscolher={(tipo) => setBlocos([...blocos, novoBloco(tipo)])}
                    onFechar={() => setNovoBlocoEm(null)}
                  />
                )}
              </div>
            </section>
          );
        })}

        <button
          type="button"
          onClick={() => setCapitulos([...capitulos, novoCapitulo(capitulos.length)])}
          className="w-full h-14 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 t-ui text-slate-600 dark:text-slate-300 hover:border-slate-900 dark:hover:border-white transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Novo capítulo
        </button>
      </div>
    </div>
  );
};

const IconeAcao: React.FC<{
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
