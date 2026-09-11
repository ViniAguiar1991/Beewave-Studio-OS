import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Plus,
  Share2,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { Client, MonthlyReport, Task } from '../types';
import { compressImage } from '../utils/imageCompressor';
import { formatFriendlyDate } from '../utils/dateFormatter';
import { getColor, hexToColorKey } from '../lib/taskViews';
import { ClientRecurrenceTab } from './ClientRecurrenceTab';
import { Button, EmptyState, BlockHeader } from './ui';

interface ClientProfileViewProps {
  clientId: string;
  onBack: () => void;
  onSelectTask: (taskId: string) => void;
  onNewTaskForClient: (clientId: string) => void;
  onOpenPortal?: (clientId: string) => void;
}

type AbaPerfil = 'pautas' | 'recorrencia' | 'relatorios' | 'arquivos' | 'portal' | 'cadastro';

const ABAS: { key: AbaPerfil; label: string }[] = [
  { key: 'pautas', label: 'Pautas' },
  { key: 'recorrencia', label: 'Recorrência' },
  { key: 'relatorios', label: 'Relatórios' },
  { key: 'arquivos', label: 'Arquivos' },
  { key: 'portal', label: 'Portal' },
  { key: 'cadastro', label: 'Cadastro' },
];

const EM_PRODUCAO = ['nao_iniciado', 'em_andamento', 'planejamento', 'aguardar', 'urgencia'];

const iniciais = (nome: string) =>
  nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

const tempoLegivel = (segundos: number) => {
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ''}`;
  if (m > 0) return `${m}min`;
  return `${segundos}s`;
};

/** Número que pode não existir. Inventar métrica é pior que admitir a falta. */
const numero = (v: number | undefined | null, sufixo = '') =>
  v === undefined || v === null ? '—' : `${v.toLocaleString('pt-BR')}${sufixo}`;

/* ==========================================================================
 * Pasta do cliente.
 *
 * A tela existe para responder três coisas: o que está rodando para esta
 * conta, o que o contrato prevê, e como o cliente entra para aprovar. Tudo
 * o mais é cadastro — mora numa aba, não no caminho de quem só quer
 * despachar a semana.
 *
 * Saiu o banner (foto de capa que não dizia nada e ainda tinha controle de
 * enquadramento), saiu o financeiro (mensalidade e serviços avulsos não são
 * assunto desta ferramenta) e saiu "Diretrizes de Marca", que repetia a
 * Estratégia do portal em campos soltos.
 * ========================================================================== */
export const ClientProfileView: React.FC<ClientProfileViewProps> = ({ clientId, onBack, ...rest }) => {
  const client = useAppStore((s) => s.clients.find((c) => c.id === clientId));

  // A busca mora aqui e os hooks moram no corpo: assim nenhum return
  // antecipado passa por cima de hook nenhum.
  if (!client) {
    return (
      <div className="mx-auto max-w-lg">
        <EmptyState
          title="Cliente não encontrado"
          hint="Ele pode ter sido excluído ou o link ficou velho."
          action={
            <Button variant="secondary" size="sm" icon={ArrowLeft} onClick={onBack}>
              Voltar para clientes
            </Button>
          }
        />
      </div>
    );
  }

  return <PerfilDoCliente client={client} onBack={onBack} {...rest} />;
};

/* ========================================================================== */

const PerfilDoCliente: React.FC<Omit<ClientProfileViewProps, 'clientId'> & { client: Client }> = ({
  client,
  onBack,
  onSelectTask,
  onNewTaskForClient,
  onOpenPortal,
}) => {
  const allTasks = useAppStore((s) => s.tasks);
  const statuses = useAppStore((s) => s.statuses);
  const updateClient = useAppStore((s) => s.updateClient);
  const deleteClient = useAppStore((s) => s.deleteClient);
  const addClientFiles = useAppStore((s) => s.addClientFiles);
  const removeClientFile = useAppStore((s) => s.removeClientFile);
  const currentUser = useCurrentUser();

  const [aba, setAba] = useState<AbaPerfil>(() => {
    try {
      const salva = localStorage.getItem('beewave_client_subtab');
      if (salva && ABAS.some((a) => a.key === salva)) return salva as AbaPerfil;
    } catch {}
    return 'pautas';
  });

  useEffect(() => {
    try {
      localStorage.setItem('beewave_client_subtab', aba);
    } catch {}
  }, [aba]);

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [arquivoEmPreview, setArquivoEmPreview] = useState<any | null>(null);
  const [novoRelatorio, setNovoRelatorio] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const tasks = useMemo(
    () => allTasks.filter((t) => t.clientId === client.id),
    [allTasks, client.id]
  );

  const emProducao = tasks.filter((t) => EM_PRODUCAO.includes(t.status)).length;
  const comCliente = tasks.filter(
    (t) => t.status === 'em_aprovacao' || t.status === 'alterar'
  ).length;
  const tempoTotal = tasks.reduce((acc, t) => acc + (t.timeSpent || 0), 0);

  const salvar = (dados: Partial<Client>) => updateClient(client.id, dados);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      salvar({ logoUrl: await compressImage(file, 500, 500, 0.9) });
    } catch {
      const reader = new FileReader();
      reader.onload = () => salvar({ logoUrl: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  /* ---------------------------------------------------------------------- */

  return (
    <div id="client-profile-view" className="mx-auto max-w-5xl pb-16">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        Voltar para clientes
      </button>

      {/* ---------------------------------------------------------------
          Identificação. Sem capa: a marca é o logo e o nome.
         --------------------------------------------------------------- */}
      <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mt-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="group relative grid h-16 w-16 shrink-0 place-items-center rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
            {client.logoUrl ? (
              <img src={client.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-[19px] font-semibold text-slate-600 dark:text-slate-300">
                {iniciais(client.company || client.name || '?')}
              </span>
            )}
            <button
              onClick={() => logoInputRef.current?.click()}
              aria-label="Trocar logo"
              title="Trocar logo"
              className="absolute inset-0 grid place-items-center bg-slate-950/55 text-white opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity cursor-pointer"
            >
              <Upload className="h-4 w-4" />
            </button>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
            />
          </div>

          <div className="min-w-0">
            <h1 className="font-display text-[28px] sm:text-[32px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white leading-tight truncate">
              {client.company || client.name || 'Cliente'}
            </h1>
            <p className="t-body text-slate-600 dark:text-slate-400 mt-0.5 truncate">
              {[client.name, client.city, client.niche].filter(Boolean).join(' · ') ||
                'Sem contato e segmento preenchidos'}
            </p>
          </div>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => onNewTaskForClient(client.id)}
          className="shrink-0"
        >
          Nova pauta
        </Button>
      </header>

      {/* Os números em linha corrida: informam sem virar quatro caixas. */}
      <p className="t-meta text-slate-500 dark:text-slate-400 mt-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span>
          <strong className="text-slate-900 dark:text-white tabular-nums">{emProducao}</strong> em
          produção
        </span>
        <span aria-hidden="true">·</span>
        <span className={comCliente > 0 ? 'text-amber-700 dark:text-amber-500' : undefined}>
          <strong className="tabular-nums">{comCliente}</strong> com o cliente
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <strong className="text-slate-900 dark:text-white tabular-nums">{tasks.length}</strong>{' '}
          {tasks.length === 1 ? 'pauta no total' : 'pautas no total'}
        </span>
        {tempoTotal > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {tempoLegivel(tempoTotal)} dedicadas
            </span>
          </>
        )}
      </p>

      {/* ---------------------------------------------------------------
          Abas: navegam, não agem.
         --------------------------------------------------------------- */}
      <nav
        className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-800 mt-6 overflow-x-auto"
        aria-label="Seções do cliente"
      >
        {ABAS.map((a) => {
          const ativa = aba === a.key;
          return (
            <button
              key={a.key}
              id={`tab-client-${a.key}`}
              onClick={() => setAba(a.key)}
              aria-current={ativa ? 'page' : undefined}
              className={`relative pb-2.5 t-ui whitespace-nowrap transition-colors cursor-pointer ${
                ativa
                  ? 'text-slate-950 dark:text-white font-medium'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {a.label}
              {a.key === 'pautas' && tasks.length > 0 && (
                <span className="ml-1.5 t-meta text-slate-400 tabular-nums">{tasks.length}</span>
              )}
              {a.key === 'arquivos' && (client.files?.length || 0) > 0 && (
                <span className="ml-1.5 t-meta text-slate-400 tabular-nums">
                  {client.files?.length}
                </span>
              )}
              {ativa && (
                <span className="absolute -bottom-px left-0 right-0 h-0.5 bg-slate-950 dark:bg-white" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="pt-6">
        {aba === 'pautas' && (
          <AbaPautas
            tasks={tasks}
            statuses={statuses}
            onSelectTask={onSelectTask}
            onNova={() => onNewTaskForClient(client.id)}
          />
        )}

        {aba === 'recorrencia' && <ClientRecurrenceTab client={client} />}

        {aba === 'relatorios' && (
          <AbaRelatorios
            client={client}
            onNovo={() => setNovoRelatorio(true)}
            onExcluir={(id) =>
              salvar({ monthlyReports: (client.monthlyReports || []).filter((r) => r.id !== id) })
            }
          />
        )}

        {aba === 'arquivos' && (
          <AbaArquivos
            client={client}
            onEnviar={addClientFiles}
            onRemover={removeClientFile}
            onPreview={setArquivoEmPreview}
          />
        )}

        {aba === 'portal' && (
          <AbaPortal client={client} onSalvar={salvar} onOpenPortal={onOpenPortal} />
        )}

        {aba === 'cadastro' && (
          <AbaCadastro
            client={client}
            onSalvar={salvar}
            podeExcluir={currentUser?.role === 'admin'}
            onExcluir={() => setConfirmandoExclusao(true)}
          />
        )}
      </div>

      {/* ---------------------------------------------------------------
          Modais
         --------------------------------------------------------------- */}
      {novoRelatorio && (
        <FormularioRelatorio
          onClose={() => setNovoRelatorio(false)}
          onSave={(rep) => {
            salvar({ monthlyReports: [rep, ...(client.monthlyReports || [])] });
            setNovoRelatorio(false);
          }}
        />
      )}

      {arquivoEmPreview && (
        <PreviewArquivo arquivo={arquivoEmPreview} onClose={() => setArquivoEmPreview(null)} />
      )}

      {confirmandoExclusao && (
        <ConfirmarExclusao
          nome={client.company || client.name || 'este cliente'}
          quantasPautas={tasks.length}
          onClose={() => setConfirmandoExclusao(false)}
          onConfirm={() => {
            deleteClient(client.id);
            onBack();
          }}
        />
      )}
    </div>
  );
};

/* ==========================================================================
 * Campo que só grava quando você sai dele.
 *
 * Antes cada tecla chamava updateClient, e updateClient escreve no Firestore.
 * Digitar "Perfetto Uomo" custava catorze escritas. Agora custa uma.
 * ========================================================================== */
const Campo: React.FC<{
  label: string;
  value: string;
  onCommit: (v: string) => void;
  placeholder?: string;
  type?: string;
  hint?: string;
  mono?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, onCommit, placeholder, type = 'text', hint, mono, children }) => {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [editando, setEditando] = useState(false);

  // Valor de fora só entra quando ninguém está digitando — senão uma
  // atualização do Firestore apagaria a frase no meio da palavra.
  useEffect(() => {
    if (!editando) setDraft(value);
  }, [value, editando]);

  return (
    <div>
      <label htmlFor={id} className="block t-label text-slate-500 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={draft}
          placeholder={placeholder}
          onFocus={() => setEditando(true)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => {
            setEditando(false);
            if (draft !== value) onCommit(draft);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
            if (e.key === 'Escape') {
              setDraft(value);
              setEditando(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className={`w-full h-10 px-3 ${children ? 'pr-10' : ''} rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors ${
            mono ? 'font-mono' : ''
          }`}
        />
        {children}
      </div>
      {hint && <p className="t-meta text-slate-400 dark:text-slate-500 mt-1.5">{hint}</p>}
    </div>
  );
};

/* ==========================================================================
 * Pautas
 * ========================================================================== */
const AbaPautas: React.FC<{
  tasks: Task[];
  statuses: { key: string; label: string; color?: string }[];
  onSelectTask: (id: string) => void;
  onNova: () => void;
}> = ({ tasks, statuses, onSelectTask, onNova }) => {
  const ordenadas = useMemo(
    () =>
      [...tasks].sort((a, b) =>
        ((b.postDate || b.date || '') as string).localeCompare((a.postDate || a.date || '') as string)
      ),
    [tasks]
  );

  if (tasks.length === 0) {
    return (
      <EmptyState
        title="Nenhuma pauta para este cliente"
        hint="Crie a primeira pauta para começar a programar o conteúdo da conta."
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={onNova}>
            Nova pauta
          </Button>
        }
      />
    );
  }

  return (
    <section className="space-y-4">
      <BlockHeader
        title="Pautas do cliente"
        count={`${tasks.length} ${tasks.length === 1 ? 'pauta' : 'pautas'}`}
      />

      <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
        {ordenadas.map((t) => {
          const status = statuses.find((s) => s.key === t.status);
          const cor = getColor(hexToColorKey(status?.color));
          const dia = ((t.postDate || t.date || '') as string).split('T')[0];
          return (
            <li key={t.id}>
              <button
                onClick={() => onSelectTask(t.id)}
                className="w-full flex items-center gap-4 py-3.5 text-left group cursor-pointer"
              >
                <span className="min-w-0 flex-1 t-lead font-medium text-slate-900 dark:text-white truncate group-hover:underline underline-offset-4">
                  {t.selectedHeadline || t.headline || t.title}
                </span>
                {t.timeSpent ? (
                  <span className="shrink-0 hidden sm:inline-flex items-center gap-1 t-meta text-slate-400 dark:text-slate-500">
                    <Clock className="h-3 w-3" />
                    {tempoLegivel(t.timeSpent)}
                  </span>
                ) : null}
                <span className={`shrink-0 inline-flex items-center gap-1.5 t-meta ${cor.text}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${cor.solid}`} />
                  {status?.label || t.status}
                </span>
                <span className="shrink-0 t-meta text-slate-400 dark:text-slate-500 w-[120px] text-right">
                  {dia ? formatFriendlyDate(dia) : 'Sem data'}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

/* ==========================================================================
 * Relatórios
 * ========================================================================== */
const AbaRelatorios: React.FC<{
  client: Client;
  onNovo: () => void;
  onExcluir: (id: string) => void;
}> = ({ client, onNovo, onExcluir }) => {
  const reports = client.monthlyReports || [];

  return (
    <section className="space-y-4">
      <BlockHeader
        title="Relatórios mensais"
        count={
          reports.length
            ? `${reports.length} ${reports.length === 1 ? 'mês' : 'meses'} · aparecem no portal`
            : undefined
        }
        action={
          <Button variant="secondary" size="sm" icon={Plus} onClick={onNovo}>
            Novo relatório
          </Button>
        }
      />

      {reports.length === 0 ? (
        <EmptyState
          title="Nenhum relatório cadastrado"
          hint="Os números que você lançar aqui aparecem para o cliente no portal, na aba Resumo."
          action={
            <Button variant="primary" size="sm" icon={Plus} onClick={onNovo}>
              Lançar o primeiro mês
            </Button>
          }
        />
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
          {reports.map((rep) => (
            <li key={rep.id} className="py-5 group">
              <div className="flex items-start justify-between gap-4">
                <h3 className="t-lead font-semibold text-slate-950 dark:text-white">{rep.month}</h3>
                <button
                  onClick={() => onExcluir(rep.id)}
                  aria-label={`Excluir relatório de ${rep.month}`}
                  className="shrink-0 grid h-7 w-7 place-items-center rounded-md text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-7 gap-y-3 mt-3">
                {[
                  {
                    rotulo: 'novos seguidores',
                    valor:
                      rep.newFollowers === undefined
                        ? '—'
                        : `+${rep.newFollowers.toLocaleString('pt-BR')}`,
                  },
                  { rotulo: 'alcance', valor: numero(rep.reach ?? rep.reachTotal) },
                  { rotulo: 'impressões', valor: numero(rep.impressions) },
                  { rotulo: 'engajamento', valor: numero(rep.engagementRate, '%') },
                  { rotulo: 'posts', valor: numero(rep.postsPublished ?? rep.postsCount) },
                ].map((m) => (
                  <span key={m.rotulo}>
                    <span className="block font-display text-[19px] font-semibold tabular-nums leading-none text-slate-950 dark:text-white">
                      {m.valor}
                    </span>
                    <span className="block t-meta text-slate-400 dark:text-slate-500 mt-1">
                      {m.rotulo}
                    </span>
                  </span>
                ))}
              </div>

              {rep.insights && (
                <p className="t-body text-slate-600 dark:text-slate-400 mt-4 max-w-2xl">
                  {rep.insights}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ==========================================================================
 * Arquivos
 * ========================================================================== */
const AbaArquivos: React.FC<{
  client: Client;
  onEnviar: (clientId: string, files: any[]) => void;
  onRemover: (clientId: string, fileId: string) => void;
  onPreview: (f: any) => void;
}> = ({ client, onEnviar, onRemover, onPreview }) => {
  const [enviando, setEnviando] = useState(false);
  const arquivos = client.files || [];

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setEnviando(true);
    try {
      const novos: any[] = [];
      for (const f of Array.from(files) as File[]) {
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(f);
        });
        novos.push({
          id: `cfile_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
          name: f.name,
          type: f.type,
          size: f.size,
          dataUrl,
          uploadedAt: new Date().toISOString().split('T')[0],
        });
      }
      if (novos.length) onEnviar(client.id, novos);
    } finally {
      setEnviando(false);
      e.target.value = '';
    }
  };

  const botaoEnviar = (
    <label
      className={`inline-flex items-center justify-center gap-2 h-8 px-3 rounded-lg t-ui font-medium border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:border-slate-900 dark:hover:border-white transition-colors ${
        enviando ? 'opacity-60 pointer-events-none' : 'cursor-pointer'
      }`}
    >
      <Upload className="h-3.5 w-3.5" />
      {enviando ? 'Enviando…' : 'Enviar arquivo'}
      <input type="file" multiple onChange={handleUpload} className="hidden" />
    </label>
  );

  return (
    <section className="space-y-4">
      <BlockHeader
        title="Arquivos da marca"
        count={
          arquivos.length
            ? `${arquivos.length} ${arquivos.length === 1 ? 'arquivo' : 'arquivos'}`
            : undefined
        }
        action={botaoEnviar}
      />

      {arquivos.length === 0 ? (
        <EmptyState
          title="Nenhum arquivo enviado"
          hint="Manual de marca, logos em alta, fotos de banco e briefings ficam aqui — e a equipe encontra sem pedir."
          action={botaoEnviar}
        />
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800">
          {arquivos.map((f) => (
            <li key={f.id} className="flex items-center gap-4 py-3.5 group">
              <FileText className="h-4 w-4 shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="t-ui font-medium text-slate-900 dark:text-white truncate" title={f.name}>
                  {f.name}
                </p>
                <p className="t-meta text-slate-400 dark:text-slate-500">
                  {formatFriendlyDate((f.uploadedAt || '').split('T')[0])} ·{' '}
                  {Math.max(1, Math.round((f.size || 0) / 1024))} KB
                </p>
              </div>

              <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                <button
                  onClick={() => onPreview(f)}
                  aria-label={`Visualizar ${f.name}`}
                  title="Visualizar"
                  className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                {f.dataUrl && (
                  <a
                    href={f.dataUrl}
                    download={f.name}
                    aria-label={`Baixar ${f.name}`}
                    title="Baixar"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  onClick={() => onRemover(client.id, f.id)}
                  aria-label={`Excluir ${f.name}`}
                  title="Excluir"
                  className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/* ==========================================================================
 * Portal
 * ========================================================================== */
const AbaPortal: React.FC<{
  client: Client;
  onSalvar: (dados: Partial<Client>) => void;
  onOpenPortal?: (clientId: string) => void;
}> = ({ client, onSalvar, onOpenPortal }) => {
  const [verSenha, setVerSenha] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const email = client.portalEmail || client.email || '';
  const senhaPropria = !!client.portalPassword;
  const senhaEfetiva = client.portalPassword || '1234';

  const copiarConvite = () => {
    if (!email) return;
    const url = `${window.location.origin}?email=${encodeURIComponent(email)}&portal=${encodeURIComponent(client.id)}`;
    const texto = `Olá ${client.name || client.company}!\n\nAqui está o seu acesso ao portal de aprovação da BeeWave:\n\nLink: ${url}\nE-mail: ${email}\nSenha: ${senhaEfetiva}\n\nPor lá você aprova os posts, pede ajustes e acompanha o que está no ar.`;
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  return (
    <section className="max-w-xl space-y-6">
      <BlockHeader title="Acesso ao portal" />

      {/* O estado é lido dos dados, não desenhado fixo. O selo antigo dizia
          "Acesso Ativo" mesmo sem e-mail cadastrado. */}
      <p className="t-body text-slate-600 dark:text-slate-400">
        {!email ? (
          <>
            <strong className="text-amber-700 dark:text-amber-500">Sem acesso configurado.</strong>{' '}
            Preencha o e-mail abaixo para {client.company} conseguir entrar.
          </>
        ) : !senhaPropria ? (
          <>
            <strong className="text-amber-700 dark:text-amber-500">
              Usando a senha padrão 1234.
            </strong>{' '}
            Defina uma senha própria antes de enviar o convite.
          </>
        ) : (
          <>
            Acesso configurado. {client.company} entra com esse e-mail e senha e vê apenas as pautas
            da própria marca.
          </>
        )}
      </p>

      <div className="space-y-5">
        <Campo
          label="E-mail de login"
          type="email"
          value={client.portalEmail || ''}
          onCommit={(v) => onSalvar({ portalEmail: v.trim() })}
          placeholder={client.email || 'cliente@empresa.com'}
          hint={
            !client.portalEmail && client.email
              ? `Vazio, então vale o e-mail do cadastro: ${client.email}`
              : 'É o e-mail que o cliente digita na tela de entrada.'
          }
        />

        <Campo
          label="Senha"
          type={verSenha ? 'text' : 'password'}
          mono
          value={client.portalPassword || ''}
          onCommit={(v) => onSalvar({ portalPassword: v.trim() || undefined })}
          placeholder="1234"
          hint="Salva ao sair do campo. Deixe em branco para manter o padrão 1234."
        >
          <button
            type="button"
            onClick={() => setVerSenha(!verSenha)}
            aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </Campo>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Button
          variant="primary"
          icon={copiado ? Check : Share2}
          onClick={copiarConvite}
          disabled={!email}
        >
          {copiado ? 'Convite copiado' : 'Copiar convite'}
        </Button>

        {onOpenPortal && (
          <Button variant="secondary" icon={ExternalLink} onClick={() => onOpenPortal(client.id)}>
            Ver como o cliente
          </Button>
        )}
      </div>

      {!email && (
        <p className="t-meta text-slate-400 dark:text-slate-500">
          O convite fica disponível assim que houver um e-mail.
        </p>
      )}
    </section>
  );
};

/* ==========================================================================
 * Cadastro
 * ========================================================================== */
const AbaCadastro: React.FC<{
  client: Client;
  onSalvar: (dados: Partial<Client>) => void;
  podeExcluir: boolean;
  onExcluir: () => void;
}> = ({ client, onSalvar, podeExcluir, onExcluir }) => (
  <section className="max-w-3xl space-y-8">
    <div className="space-y-5">
      <BlockHeader title="Dados da conta" count="salva ao sair do campo" />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          label="Nome da marca"
          value={client.company || ''}
          onCommit={(v) => onSalvar({ company: v })}
        />
        <Campo
          label="Contato"
          value={client.name || ''}
          onCommit={(v) => onSalvar({ name: v })}
          placeholder="Quem responde pela conta"
        />
        <Campo
          label="Segmento"
          value={client.niche || ''}
          onCommit={(v) => onSalvar({ niche: v })}
          placeholder="Moda masculina"
        />
        <Campo
          label="Cidade"
          value={client.city || ''}
          onCommit={(v) => onSalvar({ city: v })}
        />
        <Campo
          label="WhatsApp"
          value={client.whatsapp || ''}
          onCommit={(v) => onSalvar({ whatsapp: v })}
          placeholder="(51) 99999-9999"
        />
        <Campo
          label="E-mail"
          type="email"
          value={client.email || ''}
          onCommit={(v) => onSalvar({ email: v })}
        />
        <Campo
          label="Instagram"
          value={client.instagram || ''}
          onCommit={(v) => onSalvar({ instagram: v })}
          placeholder="@marca"
        />
        <Campo
          label="Site"
          value={client.site || ''}
          onCommit={(v) => onSalvar({ site: v })}
          placeholder="marca.com.br"
        />
        <Campo label="CNPJ" value={client.cnpj || ''} onCommit={(v) => onSalvar({ cnpj: v })} />
      </div>
    </div>

    {podeExcluir && (
      <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
        <p className="t-ui font-medium text-slate-900 dark:text-white">Excluir cliente</p>
        <p className="t-meta text-slate-500 dark:text-slate-400 mt-1 max-w-lg">
          Remove a conta da lista. As pautas já criadas continuam no sistema, mas ficam sem cliente.
        </p>
        <Button variant="danger" size="sm" onClick={onExcluir} className="mt-3">
          Excluir {client.company || 'cliente'}
        </Button>
      </div>
    )}
  </section>
);

/* ==========================================================================
 * Modais
 * ========================================================================== */

/** Fecha no Escape. Vale para os três modais desta tela. */
const useEscape = (onClose: () => void) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
};

const Modal: React.FC<{
  titulo: string;
  onClose: () => void;
  largura?: string;
  children: React.ReactNode;
  rodape?: React.ReactNode;
}> = ({ titulo, onClose, largura = 'sm:max-w-lg', children, rodape }) => {
  useEscape(onClose);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`relative w-full ${largura} max-h-[90vh] flex flex-col bg-white dark:bg-[#0f1114] sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl`}
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between gap-4 px-6 h-14 shrink-0 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white truncate">
            {titulo}
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {rodape && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0 border-t border-slate-200 dark:border-slate-800">
            {rodape}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Novo relatório.
 *
 * Os campos começam vazios de propósito: o formulário antigo vinha preenchido
 * com 480 seguidores e 38.500 de alcance, e quem salvasse sem reparar mandava
 * número inventado para o portal do cliente.
 */
const FormularioRelatorio: React.FC<{
  onClose: () => void;
  onSave: (rep: MonthlyReport) => void;
}> = ({ onClose, onSave }) => {
  const mesAtual = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const [mes, setMes] = useState(mesAtual.charAt(0).toUpperCase() + mesAtual.slice(1));
  const [seguidores, setSeguidores] = useState('');
  const [crescimento, setCrescimento] = useState('');
  const [alcance, setAlcance] = useState('');
  const [impressoes, setImpressoes] = useState('');
  const [engajamento, setEngajamento] = useState('');
  const [posts, setPosts] = useState('');
  const [insights, setInsights] = useState('');

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mes.trim()) return;
    onSave({
      id: `rep_${Date.now()}`,
      month: mes.trim(),
      newFollowers: num(seguidores),
      followersGrowthPercent: num(crescimento),
      reach: num(alcance),
      impressions: num(impressoes),
      engagementRate: num(engajamento),
      postsPublished: num(posts),
      insights: insights.trim() || undefined,
    });
  };

  const campo =
    'w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors';

  return (
    <Modal
      titulo="Novo relatório"
      onClose={onClose}
      rodape={
        <>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" form="form-relatorio" disabled={!mes.trim()}>
            Salvar relatório
          </Button>
        </>
      }
    >
      <form id="form-relatorio" onSubmit={submit} className="space-y-5">
        <div>
          <label htmlFor="rep-mes" className="block t-label text-slate-500 mb-1.5">
            Mês de referência
          </label>
          <input
            id="rep-mes"
            autoFocus
            required
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            placeholder="Setembro 2026"
            className={campo}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { id: 'seg', l: 'Novos seguidores', v: seguidores, s: setSeguidores, p: '480' },
            { id: 'cre', l: 'Crescimento (%)', v: crescimento, s: setCrescimento, p: '12,5' },
            { id: 'alc', l: 'Alcance', v: alcance, s: setAlcance, p: '38500' },
            { id: 'imp', l: 'Impressões', v: impressoes, s: setImpressoes, p: '94200' },
            { id: 'eng', l: 'Engajamento (%)', v: engajamento, s: setEngajamento, p: '4,8' },
            { id: 'pos', l: 'Posts publicados', v: posts, s: setPosts, p: '16' },
          ].map((c) => (
            <div key={c.id}>
              <label htmlFor={`rep-${c.id}`} className="block t-label text-slate-500 mb-1.5">
                {c.l}
              </label>
              <input
                id={`rep-${c.id}`}
                type="number"
                step="any"
                value={c.v}
                onChange={(e) => c.s(e.target.value)}
                placeholder={c.p}
                className={campo}
              />
            </div>
          ))}
        </div>

        <p className="t-meta text-slate-400 dark:text-slate-500">
          Campo em branco aparece como "—" no portal. Melhor do que número chutado.
        </p>

        <div>
          <label htmlFor="rep-insights" className="block t-label text-slate-500 mb-1.5">
            Leitura do mês
          </label>
          <textarea
            id="rep-insights"
            rows={3}
            value={insights}
            onChange={(e) => setInsights(e.target.value)}
            placeholder="O que funcionou, o que mudou e o que vem no mês que vem."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-body text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors resize-y"
          />
        </div>
      </form>
    </Modal>
  );
};

const PreviewArquivo: React.FC<{ arquivo: any; onClose: () => void }> = ({ arquivo, onClose }) => {
  const ehImagem = (arquivo.type || '').startsWith('image/');
  const ehPdf = (arquivo.type || '').includes('pdf');

  return (
    <Modal titulo={arquivo.name} onClose={onClose} largura="sm:max-w-3xl">
      {ehImagem ? (
        <img src={arquivo.dataUrl} alt={arquivo.name} className="w-full rounded-lg" />
      ) : ehPdf ? (
        <iframe src={arquivo.dataUrl} title={arquivo.name} className="w-full h-[65vh] rounded-lg" />
      ) : (
        <EmptyState
          title="Este tipo de arquivo não abre aqui"
          hint="Baixe para ver no programa certo."
          action={
            <a
              href={arquivo.dataUrl}
              download={arquivo.name}
              className="inline-flex items-center gap-2 h-9 px-4 rounded-lg t-ui font-medium bg-slate-950 text-white dark:bg-white dark:text-slate-950"
            >
              <Download className="h-4 w-4" />
              Baixar arquivo
            </a>
          }
        />
      )}
    </Modal>
  );
};

const ConfirmarExclusao: React.FC<{
  nome: string;
  quantasPautas: number;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ nome, quantasPautas, onClose, onConfirm }) => (
  <Modal
    titulo="Excluir cliente"
    onClose={onClose}
    largura="sm:max-w-md"
    rodape={
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          Excluir mesmo assim
        </Button>
      </>
    }
  >
    <p className="t-body text-slate-700 dark:text-slate-300">
      <strong className="text-slate-950 dark:text-white">{nome}</strong> sai da lista de clientes e
      perde o acesso ao portal.
    </p>
    {quantasPautas > 0 && (
      <p className="t-body text-slate-600 dark:text-slate-400 mt-3">
        {quantasPautas === 1
          ? 'A pauta já criada continua no sistema, mas fica sem cliente.'
          : `As ${quantasPautas} pautas já criadas continuam no sistema, mas ficam sem cliente.`}
      </p>
    )}
  </Modal>
);
