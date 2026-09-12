import React, { useEffect, useId, useMemo, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronUp,
  Download,
  ImagePlus,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAppStore } from '../store';
import { compressImage } from '../utils/imageCompressor';
import { AdminSystemPrompts, TaskStatus } from '../types';
import { FRASES_PADRAO, fraseDoDia } from '../lib/weekPlan';
import { Button, BlockHeader, EmptyState, Toast } from './ui';

type Secao = 'marca' | 'inicio' | 'tarefas' | 'ia' | 'dados';

const SECOES: { key: Secao; label: string }[] = [
  { key: 'marca', label: 'Marca' },
  { key: 'inicio', label: 'Início' },
  { key: 'tarefas', label: 'Tarefas' },
  { key: 'ia', label: 'Inteligência artificial' },
  { key: 'dados', label: 'Dados' },
];

const GRUPOS: { key: TaskStatus['group']; label: string }[] = [
  { key: 'todo', label: 'A fazer' },
  { key: 'progress', label: 'Em andamento' },
  { key: 'review', label: 'Com o cliente' },
  { key: 'done', label: 'Concluído' },
];

const CORES = ['#242f40', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#ec4899', '#64748b'];

const campoBase =
  'w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors';

/**
 * Configurações da agência.
 *
 * Cinco seções, cada uma respondendo a uma pergunta inteira: como a agência
 * se chama, o que o Início mostra, como as pautas são classificadas, como a
 * IA escreve e o que fazer com os dados.
 *
 * Saíram três abas: Planos e Mensalidades (mensalidade não é assunto desta
 * ferramenta), Equipe e Permissões (mora na própria tela de Equipe, junto de
 * quem elas afetam) e Lixeira, que estava aqui dentro e também no menu
 * lateral — duas portas para a mesma sala.
 */
export const AdminSettingsView: React.FC = () => {
  const [secao, setSecao] = useState<Secao>('marca');
  const [aviso, setAviso] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-16">
      <header>
        <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
          Configurações
        </h1>
        <p className="t-body text-slate-600 dark:text-slate-400 mt-1">
          O que vale para a agência inteira. Acessos de cada pessoa ficam em Equipe.
        </p>
      </header>

      <nav
        className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 overflow-x-auto"
        aria-label="Seções das configurações"
      >
        {SECOES.map((s) => {
          const ativa = secao === s.key;
          return (
            <button
              key={s.key}
              id={`tab-config-${s.key}`}
              onClick={() => setSecao(s.key)}
              aria-current={ativa ? 'page' : undefined}
              className={`relative pb-2.5 t-ui whitespace-nowrap transition-colors cursor-pointer ${
                ativa
                  ? 'text-slate-950 dark:text-white font-medium'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {s.label}
              {ativa && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-slate-950 dark:bg-white" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="pt-2">
        {secao === 'marca' && <SecaoMarca onAviso={setAviso} />}
        {secao === 'inicio' && <SecaoInicio onAviso={setAviso} />}
        {secao === 'tarefas' && <SecaoTarefas onAviso={setAviso} />}
        {secao === 'ia' && <SecaoIA onAviso={setAviso} />}
        {secao === 'dados' && <SecaoDados onAviso={setAviso} />}
      </div>

      <Toast message={aviso} onDismiss={() => setAviso(null)} />
    </div>
  );
};

/* ==========================================================================
 * Marca
 * ========================================================================== */
const SecaoMarca: React.FC<{ onAviso: (m: string) => void }> = ({ onAviso }) => {
  const agencyName = useAppStore((s) => s.agencyName);
  const setAgencyName = useAppStore((s) => s.setAgencyName);
  const iconDataUrl = useAppStore((s) => s.iconDataUrl);
  const setIcon = useAppStore((s) => s.setIcon);

  const [nome, setNome] = useState(agencyName);
  useEffect(() => setNome(agencyName), [agencyName]);

  const enviarIcone = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      setIcon(await compressImage(file, 128, 128, 1, true));
      onAviso('Ícone atualizado.');
    } catch {
      onAviso('Não foi possível ler essa imagem.');
    }
  };

  return (
    <section className="space-y-6">
      <BlockHeader title="Identidade" />

      <div className="max-w-sm">
        <label htmlFor="cfg-nome" className="block t-label text-slate-500 mb-1.5">
          Nome da agência
        </label>
        <input
          id="cfg-nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onBlur={() => nome.trim() && nome !== agencyName && setAgencyName(nome.trim())}
          className={campoBase}
        />
        <p className="t-meta text-slate-400 dark:text-slate-500 mt-1.5">
          Aparece no menu lateral e no convite que você manda para a equipe.
        </p>
      </div>

      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="t-label text-slate-500">Ícone</h3>
        <div className="flex items-center gap-4">
          {iconDataUrl ? (
            <img
              src={iconDataUrl}
              alt=""
              className="h-12 w-12 rounded-lg object-contain border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <span className="grid h-12 w-12 place-items-center rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-display font-bold">
              {(agencyName || 'BW').slice(0, 2).toUpperCase()}
            </span>
          )}

          <label className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 t-ui font-medium text-slate-900 dark:text-white hover:border-slate-900 dark:hover:border-white transition-colors cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            {iconDataUrl ? 'Trocar' : 'Enviar ícone'}
            <input type="file" accept="image/*" className="hidden" onChange={enviarIcone} />
          </label>

          {iconDataUrl && (
            <button
              onClick={() => {
                setIcon(null);
                onAviso('Ícone removido.');
              }}
              className="t-ui text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
            >
              Remover
            </button>
          )}
        </div>
        <p className="t-meta text-slate-400 dark:text-slate-500">
          PNG quadrado com fundo transparente funciona melhor.
        </p>
      </div>
    </section>
  );
};

/* ==========================================================================
 * Início — mascote e frases
 * ========================================================================== */
const SecaoInicio: React.FC<{ onAviso: (m: string) => void }> = ({ onAviso }) => {
  const mascotImages = useAppStore((s) => s.mascotImages);
  const addMascotImages = useAppStore((s) => s.addMascotImages);
  const removeMascotImage = useAppStore((s) => s.removeMascotImage);
  const dashboardPhrases = useAppStore((s) => s.dashboardPhrases);
  const setDashboardPhrases = useAppStore((s) => s.setDashboardPhrases);

  const [erroMascote, setErroMascote] = useState<string | null>(null);
  const [nova, setNova] = useState('');
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [rascunho, setRascunho] = useState('');

  const frases = dashboardPhrases.length > 0 ? dashboardPhrases : FRASES_PADRAO;
  const deHoje = useMemo(() => fraseDoDia(frases), [frases]);

  // Comparação por conteúdo: a lista que vem do armazenamento é outra
  // instância, então `!==` acusaria alteração em toda carga.
  const noPadrao = useMemo(
    () =>
      frases.length === FRASES_PADRAO.length &&
      frases.every((f, i) => f === FRASES_PADRAO[i]),
    [frases]
  );

  /**
   * As poses são comprimidas antes de entrar: PNG de render 3D chega com
   * vários MB e estouraria o armazenamento local do navegador.
   */
  const enviarPoses = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const escolhidas = Array.from(e.target.files || []) as File[];
    e.target.value = '';
    if (escolhidas.length === 0) return;
    setErroMascote(null);

    const naoImagem = escolhidas.find((f) => !f.type.startsWith('image/'));
    if (naoImagem) {
      setErroMascote(`"${naoImagem.name}" não é uma imagem.`);
      return;
    }

    try {
      const prontas = await Promise.all(
        escolhidas.map((f) => compressImage(f, 560, 560, 1, true))
      );
      await addMascotImages(prontas);
      onAviso(`${prontas.length === 1 ? 'Pose enviada' : `${prontas.length} poses enviadas`}.`);
    } catch {
      // Sem aviso, o usuário acharia que salvou para todo mundo.
      setErroMascote(
        'As poses ficaram salvas neste navegador, mas não foi possível publicar para a equipe. Tente de novo mais tarde.'
      );
    }
  };

  const salvarFrases = async (proximas: string[], mensagem: string) => {
    try {
      await setDashboardPhrases(proximas);
      onAviso(mensagem);
    } catch {
      onAviso('Salvo neste navegador, mas não foi possível publicar para a equipe.');
    }
  };

  const adicionar = () => {
    const texto = nova.trim();
    if (!texto) return;
    setNova('');
    salvarFrases([...frases, texto], 'Frase adicionada.');
  };

  return (
    <div className="space-y-10">
      {/* ---------------------------------------------------------------- */}
      <section className="space-y-4">
        <BlockHeader
          title="Frases da saudação"
          count={`${frases.length} ${frases.length === 1 ? 'frase' : 'frases'} · uma por dia`}
        />

        <p className="t-body text-slate-600 dark:text-slate-400 max-w-xl">
          Aparecem sob o "bom dia" no Início. O sistema escolhe uma por dia e mostra a mesma
          para toda a equipe — sorteio a cada carregamento deixaria o texto piscando.
        </p>

        <p className="t-meta text-slate-500 dark:text-slate-400">
          Hoje está mostrando: <span className="text-slate-900 dark:text-white">{deHoje}</span>
        </p>

        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {frases.map((f, i) => (
            <li key={`${f}-${i}`} className="flex items-center gap-3 py-2.5 group">
              {editandoIdx === i ? (
                <>
                  <input
                    autoFocus
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setEditandoIdx(null);
                    }}
                    onBlur={() => {
                      const texto = rascunho.trim();
                      setEditandoIdx(null);
                      if (texto && texto !== f) {
                        salvarFrases(
                          frases.map((x, j) => (j === i ? texto : x)),
                          'Frase atualizada.'
                        );
                      }
                    }}
                    className={`${campoBase} h-9`}
                  />
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setEditandoIdx(i);
                      setRascunho(f);
                    }}
                    className="min-w-0 flex-1 text-left t-body text-slate-900 dark:text-white truncate hover:underline underline-offset-4 cursor-pointer"
                    title="Clique para editar"
                  >
                    {f}
                  </button>
                  <button
                    onClick={() =>
                      salvarFrases(
                        frases.filter((_, j) => j !== i),
                        'Frase removida.'
                      )
                    }
                    aria-label={`Remover "${f}"`}
                    title="Remover"
                    className="shrink-0 grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5 max-w-xl">
          <input
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && adicionar()}
            placeholder="Escreva uma frase nova…"
            className={campoBase}
          />
          <Button variant="secondary" icon={Plus} onClick={adicionar} disabled={!nova.trim()}>
            Adicionar
          </Button>
        </div>

        {!noPadrao && (
          <button
            onClick={() => salvarFrases(FRASES_PADRAO, 'Frases voltaram ao padrão.')}
            className="t-meta text-slate-500 hover:text-slate-900 dark:hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Voltar às frases originais
          </button>
        )}
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="space-y-4">
        <BlockHeader
          title="Mascote"
          count={mascotImages.length > 0 ? `${mascotImages.length} de 12 poses` : undefined}
        />

        <p className="t-body text-slate-600 dark:text-slate-400 max-w-xl">
          PNG com fundo transparente. Uma pose por dia, alternando — a mesma para a equipe toda.
        </p>

        {mascotImages.length > 0 && (
          <ul className="flex flex-wrap gap-3">
            {mascotImages.map((img, i) => (
              <li key={i} className="relative group">
                <img
                  src={img}
                  alt={`Pose ${i + 1}`}
                  className="h-24 w-24 rounded-lg object-contain bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  onClick={() => removeMascotImage(i)}
                  aria-label={`Remover pose ${i + 1}`}
                  className="absolute -top-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-slate-950 text-white border-2 border-white dark:border-slate-900 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 t-ui font-medium text-slate-900 dark:text-white hover:border-slate-900 dark:hover:border-white transition-colors cursor-pointer">
            <ImagePlus className="h-3.5 w-3.5" />
            {mascotImages.length === 0 ? 'Enviar poses' : 'Enviar mais'}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={enviarPoses}
            />
          </label>
          {erroMascote && (
            <span role="alert" className="t-meta text-rose-700 dark:text-rose-400 max-w-md">
              {erroMascote}
            </span>
          )}
        </div>
      </section>
    </div>
  );
};

/* ==========================================================================
 * Tarefas — formatos e fluxo
 * ========================================================================== */
const SecaoTarefas: React.FC<{ onAviso: (m: string) => void }> = ({ onAviso }) => {
  const categories = useAppStore((s) => s.categories);
  const addCategory = useAppStore((s) => s.addCategory);
  const updateCategory = useAppStore((s) => s.updateCategory);
  const deleteCategory = useAppStore((s) => s.deleteCategory);
  const statuses = useAppStore((s) => s.statuses);
  const addStatus = useAppStore((s) => s.addStatus);
  const updateStatus = useAppStore((s) => s.updateStatus);
  const deleteStatus = useAppStore((s) => s.deleteStatus);
  const moveStatus = useAppStore((s) => s.moveStatus);
  const tasks = useAppStore((s) => s.tasks);

  const [novoFormato, setNovoFormato] = useState('');
  const [corFormato, setCorFormato] = useState(CORES[0]);
  const [novoStatus, setNovoStatus] = useState('');
  const [corStatus, setCorStatus] = useState(CORES[1]);
  const [grupoStatus, setGrupoStatus] = useState<TaskStatus['group']>('progress');

  return (
    <div className="space-y-10">
      {/* ------------------------------ formatos ------------------------- */}
      <section className="space-y-4">
        <BlockHeader
          title="Formatos de conteúdo"
          count={`${categories.length} ${categories.length === 1 ? 'formato' : 'formatos'}`}
        />
        <p className="t-body text-slate-600 dark:text-slate-400 max-w-xl">
          O que aparece no campo Formato de cada pauta: carrossel, reels, post único.
        </p>

        {categories.length === 0 ? (
          <EmptyState
            title="Nenhum formato cadastrado"
            hint="Sem formato, o campo da pauta fica vazio e ninguém sabe o que produzir."
          />
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
            {categories.map((cat) => {
              const emUso = tasks.filter((t) => t.categoryId === cat.id).length;
              return (
                <li key={cat.id} className="flex items-center gap-3 py-2.5 group">
                  <SeletorDeCor
                    valor={cat.color}
                    onChange={(color) => updateCategory(cat.id, { color })}
                    rotulo={`Cor de ${cat.name}`}
                  />
                  <CampoInline
                    valor={cat.name}
                    onCommit={(name) => name && updateCategory(cat.id, { name })}
                  />
                  <span className="shrink-0 t-meta text-slate-400 dark:text-slate-500 w-[92px] text-right">
                    {emUso === 0 ? 'sem uso' : `${emUso} ${emUso === 1 ? 'pauta' : 'pautas'}`}
                  </span>
                  <button
                    onClick={() => {
                      deleteCategory(cat.id);
                      onAviso(
                        emUso > 0
                          ? `"${cat.name}" removido. ${emUso} ${emUso === 1 ? 'pauta ficou' : 'pautas ficaram'} sem formato.`
                          : `"${cat.name}" removido.`
                      );
                    }}
                    aria-label={`Remover ${cat.name}`}
                    title="Remover"
                    className="shrink-0 grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-2.5 max-w-xl">
          <SeletorDeCor valor={corFormato} onChange={setCorFormato} rotulo="Cor do novo formato" />
          <input
            value={novoFormato}
            onChange={(e) => setNovoFormato(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && novoFormato.trim()) {
                addCategory({ name: novoFormato.trim(), color: corFormato });
                setNovoFormato('');
              }
            }}
            placeholder="Ex.: Tablóide impresso"
            className={campoBase}
          />
          <Button
            variant="secondary"
            icon={Plus}
            disabled={!novoFormato.trim()}
            onClick={() => {
              addCategory({ name: novoFormato.trim(), color: corFormato });
              setNovoFormato('');
              onAviso('Formato adicionado.');
            }}
          >
            Adicionar
          </Button>
        </div>
      </section>

      {/* -------------------------------- fluxo -------------------------- */}
      <section className="space-y-4">
        <BlockHeader
          title="Fluxo das pautas"
          count={`${statuses.length} ${statuses.length === 1 ? 'etapa' : 'etapas'}`}
        />
        <p className="t-body text-slate-600 dark:text-slate-400 max-w-xl">
          A ordem aqui é a ordem das colunas no quadro. "Com o cliente" é o grupo que o portal
          usa para saber o que mostrar para ele.
        </p>

        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {statuses.map((st, i) => {
            const emUso = tasks.filter((t) => t.status === st.key).length;
            return (
              <li key={st.key} className="flex items-center gap-3 py-2.5 group">
                <span className="shrink-0 flex flex-col">
                  <button
                    onClick={() => moveStatus(st.key, -1)}
                    disabled={i === 0}
                    aria-label={`Subir ${st.label}`}
                    className="grid h-4 w-5 place-items-center text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveStatus(st.key, 1)}
                    disabled={i === statuses.length - 1}
                    aria-label={`Descer ${st.label}`}
                    className="grid h-4 w-5 place-items-center text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-25 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronDown className="h-3 w-3" />
                  </button>
                </span>

                <SeletorDeCor
                  valor={st.color}
                  onChange={(color) => updateStatus(st.key, { color })}
                  rotulo={`Cor de ${st.label}`}
                />

                <CampoInline
                  valor={st.label}
                  onCommit={(label) => label && updateStatus(st.key, { label })}
                />

                <select
                  value={st.group}
                  onChange={(e) =>
                    updateStatus(st.key, { group: e.target.value as TaskStatus['group'] })
                  }
                  aria-label={`Grupo de ${st.label}`}
                  className="shrink-0 h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-meta text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none focus:border-slate-900 dark:focus:border-white"
                >
                  {GRUPOS.map((g) => (
                    <option key={g.key} value={g.key}>
                      {g.label}
                    </option>
                  ))}
                </select>

                <span className="shrink-0 hidden sm:block t-meta text-slate-400 dark:text-slate-500 w-[80px] text-right">
                  {emUso === 0 ? 'sem uso' : `${emUso}`}
                </span>

                <button
                  onClick={() => {
                    if (emUso > 0) {
                      onAviso(
                        `"${st.label}" está em ${emUso} ${emUso === 1 ? 'pauta' : 'pautas'}. Mova essas pautas antes de remover a etapa.`
                      );
                      return;
                    }
                    deleteStatus(st.key);
                    onAviso(`Etapa "${st.label}" removida.`);
                  }}
                  aria-label={`Remover ${st.label}`}
                  title={emUso > 0 ? 'Ainda tem pauta nesta etapa' : 'Remover'}
                  className="shrink-0 grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2.5 flex-wrap max-w-xl">
          <SeletorDeCor valor={corStatus} onChange={setCorStatus} rotulo="Cor da nova etapa" />
          <input
            value={novoStatus}
            onChange={(e) => setNovoStatus(e.target.value)}
            placeholder="Ex.: Revisão interna"
            className={`${campoBase} flex-1 min-w-[160px]`}
          />
          <select
            value={grupoStatus}
            onChange={(e) => setGrupoStatus(e.target.value as TaskStatus['group'])}
            aria-label="Grupo da nova etapa"
            className={`${campoBase} w-[150px] cursor-pointer`}
          >
            {GRUPOS.map((g) => (
              <option key={g.key} value={g.key}>
                {g.label}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            icon={Plus}
            disabled={!novoStatus.trim()}
            onClick={() => {
              addStatus({ label: novoStatus.trim(), color: corStatus, group: grupoStatus });
              setNovoStatus('');
              onAviso('Etapa adicionada.');
            }}
          >
            Adicionar
          </Button>
        </div>
      </section>
    </div>
  );
};

/* ==========================================================================
 * Inteligência artificial
 * ========================================================================== */
const SecaoIA: React.FC<{ onAviso: (m: string) => void }> = ({ onAviso }) => {
  const adminPrompts = useAppStore((s) => s.adminPrompts);
  const updateAdminPrompts = useAppStore((s) => s.updateAdminPrompts);
  const resetAdminPrompts = useAppStore((s) => s.resetAdminPrompts);

  const [teste, setTeste] = useState<{
    estado: 'parado' | 'testando' | 'ok' | 'erro';
    latencia?: number;
    modelo?: string;
    mensagem?: string;
    detalhe?: string;
  }>({ estado: 'parado' });

  const [form, setForm] = useState<AdminSystemPrompts>({
    headlinePrompt: adminPrompts?.headlinePrompt || '',
    copyCaptionPrompt: adminPrompts?.copyCaptionPrompt || '',
    copyCarouselPrompt: adminPrompts?.copyCarouselPrompt || '',
    copyScriptPrompt: adminPrompts?.copyScriptPrompt || '',
    chatRefinePrompt: adminPrompts?.chatRefinePrompt || '',
    newsTrendsPrompt: adminPrompts?.newsTrendsPrompt || '',
  });

  useEffect(() => {
    if (adminPrompts) setForm({ ...adminPrompts });
  }, [adminPrompts]);

  const testar = async () => {
    setTeste({ estado: 'testando' });
    const inicio = Date.now();
    try {
      const res = await fetch('/api/gemini/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Teste de conexão Beewave Studio' }),
      });
      const latencia = Date.now() - inicio;

      // 404 aqui não é "chave errada": é o servidor de IA não existir neste
      // endereço. Dizer "erro na API" mandaria o usuário caçar a chave à toa.
      if (res.status === 404) {
        setTeste({
          estado: 'erro',
          latencia,
          mensagem: 'O servidor de IA não está publicado neste endereço.',
          detalhe:
            'As rotas /api/* rodam no servidor Express, que existe no desenvolvimento local mas não na versão publicada. Enquanto isso, gerar textos com IA só funciona rodando o projeto na sua máquina.',
        });
        return;
      }

      const dados = await res.json().catch(() => null);
      if (res.ok && dados?.success) {
        setTeste({
          estado: 'ok',
          latencia,
          modelo: dados.model,
          mensagem: 'Conectado e respondendo.',
        });
      } else {
        setTeste({
          estado: 'erro',
          latencia,
          modelo: dados?.model,
          mensagem: dados?.message || 'O serviço respondeu, mas recusou o pedido.',
          detalhe: dados?.error || dados?.details || 'Confira a variável GEMINI_API_KEY.',
        });
      }
    } catch (err: any) {
      setTeste({
        estado: 'erro',
        latencia: Date.now() - inicio,
        mensagem: 'Não foi possível falar com o servidor.',
        detalhe: err?.message,
      });
    }
  };

  const campos: { key: keyof AdminSystemPrompts; label: string; ajuda: string }[] = [
    { key: 'headlinePrompt', label: 'Sugerir headlines', ajuda: 'Usado no botão de gerar títulos da pauta.' },
    { key: 'copyCaptionPrompt', label: 'Escrever legenda', ajuda: 'Legenda de post único e reels.' },
    { key: 'copyCarouselPrompt', label: 'Escrever carrossel', ajuda: 'Roteiro slide a slide.' },
    { key: 'copyScriptPrompt', label: 'Escrever roteiro', ajuda: 'Roteiro de vídeo e reels.' },
    { key: 'chatRefinePrompt', label: 'Refinar no chat', ajuda: 'Quando você pede ajuste na conversa.' },
    { key: 'newsTrendsPrompt', label: 'Tendências', ajuda: 'Busca de pautas quentes.' },
  ];

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <BlockHeader
          title="Conexão"
          action={
            <Button
              variant="secondary"
              size="sm"
              icon={Activity}
              onClick={testar}
              pending={teste.estado === 'testando'}
              pendingLabel="Testando…"
            >
              Testar conexão
            </Button>
          }
        />

        {teste.estado === 'parado' ? (
          <p className="t-body text-slate-600 dark:text-slate-400 max-w-xl">
            O teste manda uma frase curta para o modelo e mostra se ele respondeu. Use quando
            gerar texto parar de funcionar.
          </p>
        ) : teste.estado === 'testando' ? (
          <p className="t-body text-slate-500 dark:text-slate-400">Consultando…</p>
        ) : (
          <div className="space-y-2 max-w-xl">
            <p
              className={`t-lead font-medium ${
                teste.estado === 'ok'
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {teste.mensagem}
            </p>
            {teste.detalhe && (
              <p className="t-body text-slate-600 dark:text-slate-400">{teste.detalhe}</p>
            )}
            <p className="t-meta text-slate-400 dark:text-slate-500">
              {teste.modelo ? `${teste.modelo} · ` : ''}
              {teste.latencia}ms
            </p>
          </div>
        )}
      </section>

      <section className="space-y-4">
        <BlockHeader
          title="Instruções do sistema"
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={() => {
                resetAdminPrompts();
                onAviso('Instruções voltaram ao padrão.');
              }}
            >
              Voltar ao padrão
            </Button>
          }
        />
        <p className="t-body text-slate-600 dark:text-slate-400 max-w-xl">
          O que a IA lê antes de cada pedido. Mexa aqui para mudar o tom de tudo que ela escreve,
          em vez de corrigir texto por texto.
        </p>

        <div className="space-y-6">
          {campos.map((c) => (
            <CampoPrompt
              key={c.key}
              label={c.label}
              ajuda={c.ajuda}
              valor={form[c.key]}
              onCommit={(v) => {
                if (v !== adminPrompts?.[c.key]) {
                  updateAdminPrompts({ ...form, [c.key]: v });
                  onAviso(`"${c.label}" salvo.`);
                }
              }}
              onChange={(v) => setForm((f) => ({ ...f, [c.key]: v }))}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

/* ==========================================================================
 * Dados
 * ========================================================================== */
const SecaoDados: React.FC<{ onAviso: (m: string) => void }> = ({ onAviso }) => {
  const exportBackupJson = useAppStore((s) => s.exportBackupJson);
  const importBackupJson = useAppStore((s) => s.importBackupJson);
  const resetAllData = useAppStore((s) => s.resetAllData);
  const [confirmando, setConfirmando] = useState(false);

  const baixar = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `beewave-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    onAviso('Backup baixado.');
  };

  const importar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const texto = await file.text();
    onAviso(
      importBackupJson(texto)
        ? 'Backup restaurado.'
        : 'Esse arquivo não parece um backup do Beewave.'
    );
  };

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <BlockHeader title="Backup" />
        <p className="t-body text-slate-600 dark:text-slate-400 max-w-xl">
          Baixa um arquivo com clientes, pautas, formatos e fluxo. Serve para guardar fora do
          navegador ou levar para outra conta.
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="secondary" icon={Download} onClick={baixar}>
            Baixar backup
          </Button>
          <label className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 t-ui font-medium text-slate-900 dark:text-white hover:border-slate-900 dark:hover:border-white transition-colors cursor-pointer">
            <Upload className="h-3.5 w-3.5" />
            Restaurar de um arquivo
            <input type="file" accept="application/json" className="hidden" onChange={importar} />
          </label>
        </div>
      </section>

      <section className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <h2 className="t-label text-slate-500">Recomeçar do zero</h2>
        <p className="t-body text-slate-600 dark:text-slate-400 max-w-xl">
          Apaga tudo deste navegador e volta ao estado de fábrica. Clientes e pautas guardados na
          nuvem voltam sozinhos no próximo carregamento — o que some de vez é o que só existe
          aqui.
        </p>
        <Button variant="danger" onClick={() => setConfirmando(true)}>
          Apagar dados locais
        </Button>
      </section>

      {confirmando && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/55"
            onClick={() => setConfirmando(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Apagar dados locais"
            className="relative w-full max-w-md bg-white dark:bg-[#0f1114] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
            style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
              Apagar tudo deste navegador?
            </h2>
            <p className="t-body text-slate-600 dark:text-slate-400">
              Baixe um backup antes se tiver qualquer dúvida. Campanhas e poses do mascote vivem
              só aqui e não voltam da nuvem.
            </p>
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button variant="ghost" onClick={() => setConfirmando(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  resetAllData();
                  setConfirmando(false);
                }}
              >
                Apagar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ==========================================================================
 * Peças pequenas
 * ========================================================================== */

/** Texto que vira campo ao clicar e grava ao sair. */
const CampoInline: React.FC<{ valor: string; onCommit: (v: string) => void }> = ({
  valor,
  onCommit,
}) => {
  const [rascunho, setRascunho] = useState(valor);
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    if (!editando) setRascunho(valor);
  }, [valor, editando]);

  return (
    <input
      value={rascunho}
      onFocus={() => setEditando(true)}
      onChange={(e) => setRascunho(e.target.value)}
      onBlur={() => {
        setEditando(false);
        if (rascunho.trim() !== valor) onCommit(rascunho.trim());
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        if (e.key === 'Escape') {
          setRascunho(valor);
          setEditando(false);
          (e.target as HTMLInputElement).blur();
        }
      }}
      className="min-w-0 flex-1 h-8 px-2 -mx-2 rounded-lg bg-transparent t-body text-slate-900 dark:text-white border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
    />
  );
};

/** Bolinha de cor que abre a paleta no clique. */
const SeletorDeCor: React.FC<{
  valor: string;
  onChange: (cor: string) => void;
  rotulo: string;
}> = ({ valor, onChange, rotulo }) => {
  const [aberto, setAberto] = useState(false);

  return (
    <span className="relative shrink-0">
      <button
        onClick={() => setAberto(!aberto)}
        aria-label={rotulo}
        title={rotulo}
        className="grid h-6 w-6 place-items-center rounded-md border border-slate-200 dark:border-slate-700 cursor-pointer"
        style={{ backgroundColor: valor }}
      />
      {aberto && (
        <>
          <span className="fixed inset-0 z-10" onClick={() => setAberto(false)} aria-hidden="true" />
          <span className="absolute left-0 top-8 z-20 flex items-center gap-1.5 p-2 rounded-lg bg-white dark:bg-[#0f1114] border border-slate-200 dark:border-slate-700 shadow-xl">
            {CORES.map((c) => (
              <button
                key={c}
                onClick={() => {
                  onChange(c);
                  setAberto(false);
                }}
                aria-label={`Cor ${c}`}
                className="h-5 w-5 rounded hover:scale-110 transition-transform cursor-pointer"
                style={{ backgroundColor: c }}
              />
            ))}
          </span>
        </>
      )}
    </span>
  );
};

/** Instrução de sistema: grava ao sair do campo. */
const CampoPrompt: React.FC<{
  label: string;
  ajuda: string;
  valor: string;
  onChange: (v: string) => void;
  onCommit: (v: string) => void;
}> = ({ label, ajuda, valor, onChange, onCommit }) => {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block t-label text-slate-500">
        {label}
      </label>
      <p className="t-meta text-slate-400 dark:text-slate-500 mb-1.5">{ajuda}</p>
      <textarea
        id={id}
        rows={3}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent font-mono text-[13px] leading-relaxed text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors resize-y"
      />
    </div>
  );
};
