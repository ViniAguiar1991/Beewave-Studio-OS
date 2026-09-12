import React, { useMemo, useState } from 'react';
import {
  Plus,
  ArrowRight,
  Check,
  Trash2,
  CalendarClock,
  MessageSquareWarning,
  Lightbulb,
  PartyPopper,
  Settings2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAppStore, useCurrentUser } from '../store';
import { Task, Client, TaskStatus } from '../types';
import { getColor, hexToColorKey } from '../lib/taskViews';
import { formatFriendlyDate, isTaskDelayed } from '../utils/dateFormatter';
import {
  resumoDaSemana,
  cargaPorDia,
  saudacao,
  fraseDoDia,
  mascoteDoDia,
  DiaDaSemana,
} from '../lib/weekPlan';
import { Button, BlockHeader, EmptyState } from './ui';

interface DashboardHomeProps {
  onSelectTask: (taskId: string) => void;
  onNewTask: () => void;
  onSelectClient: (clientId: string) => void;
  onSelectTab: (tab: string) => void;
}

const getDay = (t: Task) => (t.postDate || t.date || '').split('T')[0] || null;

/**
 * Início — o retrato da semana.
 *
 * A pergunta que a tela responde é "o que ainda falta entregar até domingo?".
 * Antes ela repetia a lista de tarefas que já existe em Tarefas, o que fazia
 * a pessoa ler a mesma informação duas vezes e decidir nada.
 *
 * Aqui os containers são justificados: cada bloco é uma decisão fechada — o
 * que falta planejar, o que está em produção, o que espera o cliente. Não é
 * caixa para enfeitar, é caixa para separar decisões.
 */
export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onSelectTask,
  onNewTask,
  onSelectClient,
  onSelectTab,
}) => {
  const clients = useAppStore((s) => s.clients);
  const tasks = useAppStore((s) => s.tasks);
  const statuses = useAppStore((s) => s.statuses);
  const notes = useAppStore((s) => s.notes);
  const mascotImages = useAppStore((s) => s.mascotImages);
  const addNote = useAppStore((s) => s.addNote);
  const toggleNote = useAppStore((s) => s.toggleNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const currentUser = useCurrentUser();

  const [newNoteText, setNewNoteText] = useState('');

  const firstName = currentUser?.name?.split(' ')[0] || 'Criativo';
  const mascote = useMemo(() => mascoteDoDia(mascotImages), [mascotImages]);
  const frase = useMemo(() => fraseDoDia(), []);

  const semana = useMemo(() => resumoDaSemana(clients, tasks), [clients, tasks]);
  const carga = useMemo(() => cargaPorDia(tasks), [tasks]);

  /** A fila da equipe: o que está parado esperando alguém da Beewave. */
  const fila = useMemo(() => {
    const ajustes = tasks.filter((t) => t.status === 'alterar');
    const sugestoes = tasks.filter((t) => t.clientRequest && t.status === 'nao_iniciado');
    const atrasadas = tasks.filter(
      (t) => isTaskDelayed(t) && t.status !== 'alterar' && !t.clientRequest
    );
    return { ajustes, sugestoes, atrasadas, total: ajustes.length + sugestoes.length + atrasadas.length };
  }, [tasks]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !currentUser) return;
    addNote(currentUser.id, newNoteText.trim());
    setNewNoteText('');
  };

  const clientesComPendencia = semana.clientes
    .filter((c) => c.faltaPlanejar > 0)
    .sort((a, b) => b.faltaPlanejar - a.faltaPlanejar);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* ---------------------------------------------------------------
          Saudação: texto solto no topo, sem caixa
         --------------------------------------------------------------- */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="t-meta text-slate-400 dark:text-slate-500 first-letter:uppercase">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
          <h1 className="font-display text-[34px] sm:text-[40px] font-semibold tracking-[-0.025em] text-slate-950 dark:text-white leading-[1.1] mt-1.5">
            {saudacao()}, {firstName}
          </h1>
          <p className="t-body text-slate-600 dark:text-slate-400 mt-1.5">{frase}</p>
        </div>
        <Button variant="primary" icon={Plus} onClick={onNewTask}>
          Nova tarefa
        </Button>
      </header>

      {/* ---------------------------------------------------------------
          Mascote e carga da semana
         --------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* O degradê é do container, não da imagem: o PNG entra recortado
            e a base some no cinza em vez de terminar numa borda dura. */}
        <section className="lg:col-span-3 relative rounded-2xl overflow-hidden bg-gradient-to-t from-slate-200/90 via-slate-100/60 to-transparent dark:from-slate-800/70 dark:via-slate-800/25 dark:to-transparent min-h-[240px]">
          {mascote ? (
            /* Posição absoluta de propósito: assim a imagem não entra na
               conta da altura da linha. Com w-full no fluxo normal, numa
               tela larga a proporção do PNG puxava a altura para cima e
               esticava o gráfico junto. Quem manda na altura é a carga da
               semana; o mascote só preenche o que sobrar. */
            <img
              src={mascote}
              alt=""
              className="absolute inset-x-0 bottom-0 mx-auto h-[86%] w-auto max-w-[88%] object-contain object-bottom select-none"
              draggable={false}
            />
          ) : (
            <div className="absolute inset-0 flex items-center">
              <MascoteVazio onConfigure={() => onSelectTab('admin')} />
            </div>
          )}
        </section>

        {/* Carga por dia */}
        <section className="lg:col-span-9 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 sm:p-7 flex flex-col">
          <div>
            <h2 className="t-label text-slate-500">Carga da semana</h2>
            <p className="t-meta text-slate-400 dark:text-slate-500 mt-1">
              {format(semana.inicio, "d 'de' MMM", { locale: ptBR })} a{' '}
              {format(semana.fim, "d 'de' MMM", { locale: ptBR })}
            </p>
          </div>

          <GraficoDaSemana dias={carga} />
        </section>
      </div>

      {/* ---------------------------------------------------------------
          A semana
         --------------------------------------------------------------- */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 sm:p-7 space-y-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="t-label text-slate-500">Entregas da semana</h2>
          <button
            onClick={() => onSelectTab('tarefas')}
            className="t-ui text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white underline underline-offset-4 cursor-pointer"
          >
            Abrir tarefas
          </button>
        </div>

        {semana.semContratos ? (
          <SemContrato onConfigure={() => onSelectTab('clientes')} />
        ) : semana.tudoEmDia ? (
          <TudoEmDia total={semana.concluido} />
        ) : (
          <>
            <BarraDaSemana semana={semana} />

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 pt-1">
              <Metrica
                valor={semana.faltaPlanejar}
                rotulo="Falta planejar"
                detalhe="contratado e ainda sem pauta"
                destaque={semana.faltaPlanejar > 0 ? 'amber' : undefined}
              />
              <Metrica valor={semana.emProducao} rotulo="Em produção" detalhe="com a equipe" />
              <Metrica
                valor={semana.comCliente}
                rotulo="Com o cliente"
                detalhe="aguardando aprovação"
                destaque={semana.comCliente > 0 ? 'sky' : undefined}
              />
              <Metrica
                valor={semana.concluido}
                rotulo="Concluídas"
                detalhe="aprovadas ou no ar"
                destaque={semana.concluido > 0 ? 'emerald' : undefined}
              />
            </div>
          </>
        )}
      </section>

      {/* ---------------------------------------------------------------
          Onde falta planejar
         --------------------------------------------------------------- */}
      {clientesComPendencia.length > 0 && (
        <section className="rounded-2xl border border-amber-300 dark:border-amber-900/70 bg-amber-50/60 dark:bg-amber-950/20 p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-amber-700 dark:text-amber-500" />
            <h2 className="t-label text-amber-800 dark:text-amber-400">Falta planejar esta semana</h2>
          </div>

          <ul className="space-y-2.5">
            {clientesComPendencia.map((c) => (
              <li key={c.clientId}>
                <button
                  onClick={() => onSelectClient(c.clientId)}
                  className="w-full flex items-center gap-3 text-left group cursor-pointer"
                >
                  <span className="t-lead font-medium text-slate-900 dark:text-white group-hover:underline underline-offset-4">
                    {c.nome}
                  </span>
                  <span className="t-body text-slate-600 dark:text-slate-400">
                    {c.faltaPlanejar === 1
                      ? 'falta 1 publicação'
                      : `faltam ${c.faltaPlanejar} publicações`}
                  </span>
                  <span className="ml-auto t-meta text-slate-500 dark:text-slate-400 tabular-nums shrink-0">
                    {c.planejado} de {c.contratado}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------------------------------------------------------
          Fila da equipe
         --------------------------------------------------------------- */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 sm:p-7 space-y-5">
        <BlockHeader
          title="Precisa de você"
          count={fila.total > 0 ? `${fila.total} ${fila.total === 1 ? 'pauta' : 'pautas'}` : undefined}
          action={
            fila.total > 0 ? (
              <Button variant="secondary" size="sm" onClick={() => onSelectTab('tarefas')}>
                Abrir tarefas
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : undefined
          }
        />

        {fila.total === 0 ? (
          <EmptyState
            title="Nada travado no momento"
            hint="Ajustes pedidos pelo cliente, sugestões vindas do portal e pautas atrasadas aparecem aqui."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <CartaoFila
              titulo="Ajustes do cliente"
              icone={MessageSquareWarning}
              tom="rose"
              tarefas={fila.ajustes}
              clients={clients}
              statuses={statuses}
              onSelectTask={onSelectTask}
            />
            <CartaoFila
              titulo="Sugestões do portal"
              icone={Lightbulb}
              tom="amber"
              tarefas={fila.sugestoes}
              clients={clients}
              statuses={statuses}
              onSelectTask={onSelectTask}
            />
            <CartaoFila
              titulo="Atrasadas"
              icone={CalendarClock}
              tom="slate"
              tarefas={fila.atrasadas}
              clients={clients}
              statuses={statuses}
              onSelectTask={onSelectTask}
            />
          </div>
        )}
      </section>

      {/* ---------------------------------------------------------------
          Notas
         --------------------------------------------------------------- */}
      <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 sm:p-7 space-y-4">
        <BlockHeader
          title="Notas"
          count={
            notes.filter((n) => !n.done).length > 0
              ? `${notes.filter((n) => !n.done).length} em aberto`
              : undefined
          }
        />

        <form onSubmit={handleAddNote} className="flex gap-2.5">
          <input
            type="text"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Anotar um lembrete…"
            className="flex-1 h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
          />
          <Button variant="secondary" type="submit" disabled={!newNoteText.trim()}>
            Adicionar
          </Button>
        </form>

        {notes.length > 0 && (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800">
            {notes.map((note) => (
              <li key={note.id} className="flex items-center gap-3 py-2.5">
                <button
                  onClick={() => toggleNote(note.id)}
                  aria-label={note.done ? 'Marcar como pendente' : 'Marcar como feita'}
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded border transition-colors cursor-pointer ${
                    note.done
                      ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-950'
                      : 'border-slate-300 dark:border-slate-600 hover:border-slate-500'
                  }`}
                >
                  {note.done && <Check className="h-3 w-3" strokeWidth={3} />}
                </button>
                <span
                  className={`min-w-0 flex-1 t-body ${
                    note.done
                      ? 'line-through text-slate-400 dark:text-slate-600'
                      : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {note.text}
                </span>
                <button
                  onClick={() => deleteNote(note.id)}
                  aria-label="Excluir nota"
                  className="shrink-0 text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 transition-colors cursor-pointer p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

/* ========================================================================== */

const MascoteVazio: React.FC<{ onConfigure: () => void }> = ({ onConfigure }) => (
  <button
    onClick={onConfigure}
    className="w-full grid place-items-center py-16 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
  >
    <span className="text-center px-4">
      <Settings2 className="h-5 w-5 mx-auto mb-2" />
      <span className="block t-ui font-medium">Enviar as poses do mascote</span>
      <span className="block t-meta mt-0.5 opacity-80">PNG com fundo transparente</span>
    </span>
  </button>
);

/**
 * Barras empilhadas por dia. A altura é relativa ao dia mais cheio da semana,
 * não a um teto fixo — o que importa é comparar os dias entre si.
 */
const GraficoDaSemana: React.FC<{ dias: DiaDaSemana[] }> = ({ dias }) => {
  const pico = Math.max(...dias.map((d) => d.total), 1);
  const vazio = dias.every((d) => d.total === 0);

  // Escala em passos inteiros: meia publicação não existe.
  const topo = Math.max(2, Math.ceil(pico / 2) * 2);
  const marcas = [topo, topo / 2, 0];
  const ALTURA = 150;

  return (
    <div className="flex-1 flex flex-col justify-end mt-7">
      {vazio && (
        <p className="t-body text-slate-400 dark:text-slate-500 mb-4">
          Nenhuma publicação programada para esta semana.
        </p>
      )}

      <div className="flex gap-3">
        {/* Eixo. Dá referência de quantidade sem precisar de número em cada barra. */}
        <div
          className="flex flex-col justify-between shrink-0 text-right"
          style={{ height: ALTURA }}
          aria-hidden="true"
        >
          {marcas.map((m) => (
            <span key={m} className="t-meta text-slate-300 dark:text-slate-600 tabular-nums leading-none">
              {m}
            </span>
          ))}
        </div>

        <div className="flex-1 relative">
          {/* Linhas de grade */}
          <div className="absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            {marcas.map((m) => (
              <span key={m} className="h-px w-full bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>

          <div className="relative flex items-end gap-2 sm:gap-4" style={{ height: ALTURA }}>
            {dias.map((dia) => {
              const faixas = [
                { valor: dia.emProducao, cor: 'bg-slate-300 dark:bg-slate-600' },
                { valor: dia.comCliente, cor: 'bg-sky-400' },
                { valor: dia.concluido, cor: 'bg-emerald-500' },
              ].filter((f) => f.valor > 0);

              return (
                <div
                  key={dia.chave}
                  className="flex-1 h-full flex items-end justify-center group/bar"
                  title={`${dia.rotulo}: ${dia.total} ${dia.total === 1 ? 'publicação' : 'publicações'}`}
                >
                  {dia.total === 0 ? (
                    <span className="w-full max-w-[46px] h-[3px] rounded-full bg-slate-100 dark:bg-slate-800" />
                  ) : (
                    <span
                      className="w-full max-w-[46px] flex flex-col-reverse overflow-hidden rounded-t-md transition-opacity group-hover/bar:opacity-80"
                      style={{ height: `${(dia.total / topo) * ALTURA}px` }}
                    >
                      {faixas.map((f, i) => (
                        <span
                          key={i}
                          className={f.cor}
                          style={{ height: `${(f.valor / dia.total) * 100}%` }}
                        />
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Dias */}
          <div className="flex gap-2 sm:gap-4 pt-2.5">
            {dias.map((dia) => (
              <span
                key={dia.chave}
                className={`flex-1 text-center t-meta ${
                  dia.hoje
                    ? 'font-semibold text-slate-950 dark:text-white'
                    : 'text-slate-400 dark:text-slate-500'
                }`}
              >
                {dia.rotulo}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-wrap mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
        <Legenda cor="bg-emerald-500" texto="Concluídas" />
        <Legenda cor="bg-sky-400" texto="Com o cliente" />
        <Legenda cor="bg-slate-300 dark:bg-slate-600" texto="Em produção" />
      </div>
    </div>
  );
};

const Legenda: React.FC<{ cor: string; texto: string }> = ({ cor, texto }) => (
  <span className="inline-flex items-center gap-1.5 t-meta text-slate-500 dark:text-slate-400">
    <span className={`h-2 w-2 rounded-sm ${cor}`} />
    {texto}
  </span>
);

/**
 * Barra segmentada da semana. Cada faixa é um estágio, na ordem em que a
 * pauta caminha: falta planejar → produção → cliente → concluída.
 */
const BarraDaSemana: React.FC<{ semana: ReturnType<typeof resumoDaSemana> }> = ({ semana }) => {
  const total = Math.max(semana.contratado, semana.planejado, 1);
  const faixas = [
    { valor: semana.concluido, cor: 'bg-emerald-500', nome: 'Concluídas' },
    { valor: semana.comCliente, cor: 'bg-sky-500', nome: 'Com o cliente' },
    { valor: semana.emProducao, cor: 'bg-slate-400 dark:bg-slate-500', nome: 'Em produção' },
    { valor: semana.faltaPlanejar, cor: 'bg-amber-400', nome: 'Falta planejar' },
  ].filter((f) => f.valor > 0);

  return (
    <div className="space-y-2.5">
      <p className="t-body text-slate-700 dark:text-slate-300">
        <strong className="font-semibold text-slate-950 dark:text-white tabular-nums">
          {semana.concluido} de {Math.max(semana.contratado, semana.planejado)}
        </strong>{' '}
        {semana.contratado > 0
          ? 'publicações contratadas já estão aprovadas'
          : 'publicações programadas já estão aprovadas'}
      </p>

      <div
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        role="img"
        aria-label={faixas.map((f) => `${f.nome}: ${f.valor}`).join(', ')}
      >
        {faixas.map((f) => (
          <span
            key={f.nome}
            className={`${f.cor} transition-all duration-300`}
            style={{ width: `${(f.valor / total) * 100}%` }}
            title={`${f.nome}: ${f.valor}`}
          />
        ))}
      </div>
    </div>
  );
};

const Metrica: React.FC<{
  valor: number;
  rotulo: string;
  detalhe: string;
  destaque?: 'amber' | 'sky' | 'emerald';
}> = ({ valor, rotulo, detalhe, destaque }) => {
  const cor = destaque
    ? {
        amber: 'text-amber-700 dark:text-amber-500',
        sky: 'text-sky-700 dark:text-sky-400',
        emerald: 'text-emerald-700 dark:text-emerald-400',
      }[destaque]
    : 'text-slate-950 dark:text-white';

  return (
    <div>
      <p className={`font-display text-[30px] font-semibold tracking-tight tabular-nums leading-none ${cor}`}>
        {valor}
      </p>
      <p className="t-ui font-medium text-slate-800 dark:text-slate-200 mt-2">{rotulo}</p>
      <p className="t-meta text-slate-400 dark:text-slate-500 mt-0.5">{detalhe}</p>
    </div>
  );
};

const TudoEmDia: React.FC<{ total: number }> = ({ total }) => (
  <div className="flex items-center gap-4 py-3">
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400">
      <PartyPopper className="h-5 w-5" />
    </span>
    <div>
      <p className="t-lead font-semibold text-slate-950 dark:text-white">
        Todas as demandas da semana concluídas
      </p>
      <p className="t-body text-slate-600 dark:text-slate-400 mt-0.5">
        {total > 0
          ? `${total} ${total === 1 ? 'publicação aprovada' : 'publicações aprovadas'}, nada pendente com a equipe nem com os clientes.`
          : 'Nada pendente com a equipe nem com os clientes.'}
      </p>
    </div>
  </div>
);

/**
 * Estado inicial honesto: sem serviços recorrentes cadastrados não existe
 * meta, e a tela diz o que fazer em vez de mostrar zero sem explicação.
 */
const SemContrato: React.FC<{ onConfigure: () => void }> = ({ onConfigure }) => (
  <div className="py-2">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-5 opacity-40 pointer-events-none select-none">
      <Metrica valor={0} rotulo="Falta planejar" detalhe="contratado e ainda sem pauta" />
      <Metrica valor={0} rotulo="Em produção" detalhe="com a equipe" />
      <Metrica valor={0} rotulo="Com o cliente" detalhe="aguardando aprovação" />
      <Metrica valor={0} rotulo="Concluídas" detalhe="aprovadas ou no ar" />
    </div>

    <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
      <p className="t-lead font-medium text-slate-900 dark:text-white">
        Cadastre os serviços recorrentes para esta conta funcionar
      </p>
      <p className="t-body text-slate-600 dark:text-slate-400 mt-1 max-w-xl">
        Ao dizer que a Daxx tem 3 posts por semana e a Perfetto 4, o painel passa a
        mostrar quanto falta planejar em cada cliente — hoje ele não tem com o que comparar.
      </p>
      <div className="mt-4">
        <Button variant="secondary" size="sm" onClick={onConfigure}>
          Abrir clientes
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  </div>
);

const CartaoFila: React.FC<{
  titulo: string;
  icone: React.ComponentType<{ className?: string }>;
  tom: 'rose' | 'amber' | 'slate';
  tarefas: Task[];
  clients: Client[];
  statuses: TaskStatus[];
  onSelectTask: (id: string) => void;
}> = ({ titulo, icone: Icone, tom, tarefas, clients, statuses, onSelectTask }) => {
  const cores = {
    rose: 'text-rose-700 dark:text-rose-400',
    amber: 'text-amber-700 dark:text-amber-500',
    slate: 'text-slate-600 dark:text-slate-400',
  }[tom];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
        <Icone className={`h-3.5 w-3.5 ${cores}`} />
        <h3 className={`t-label ${cores}`}>{titulo}</h3>
        <span className="ml-auto t-meta text-slate-400 dark:text-slate-500 tabular-nums">
          {tarefas.length}
        </span>
      </div>

      {tarefas.length === 0 ? (
        <p className="t-meta text-slate-300 dark:text-slate-700 py-4">Nada aqui</p>
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800/70">
          {tarefas.slice(0, 4).map((task) => {
            const client = clients.find((c) => c.id === task.clientId);
            const status = statuses.find((s) => s.key === task.status);
            const cor = getColor(hexToColorKey(status?.color));
            const dia = getDay(task);
            return (
              <li key={task.id}>
                <button
                  onClick={() => onSelectTask(task.id)}
                  className="w-full py-2.5 text-left group cursor-pointer"
                >
                  <span className="block t-ui font-medium text-slate-900 dark:text-white line-clamp-2 group-hover:underline underline-offset-4">
                    {task.selectedHeadline || task.headline || task.title}
                  </span>
                  <span className="flex items-center gap-1.5 mt-1">
                    <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cor.solid}`} />
                    <span className="t-meta text-slate-500 dark:text-slate-400 truncate">
                      {client?.company || 'Sem cliente'}
                      {dia && ` · ${formatFriendlyDate(dia)}`}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {tarefas.length > 4 && (
        <p className="t-meta text-slate-400 dark:text-slate-500 pt-2.5">
          e mais {tarefas.length - 4}
        </p>
      )}
    </div>
  );
};
