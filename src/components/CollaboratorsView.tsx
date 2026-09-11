import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit2,
  Eye,
  EyeOff,
  Plus,
  Search,
  Share2,
  Trash2,
  X,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { Role, User } from '../types';
import { Button, EmptyState, Toast } from './ui';

const CARGOS = [
  'Diretor Geral',
  'Gestor de Contas',
  'Designer Gráfico',
  'Social Media',
  'Copywriter',
  'Editor de Vídeo',
  'Fotógrafo',
  'Tráfego Pago',
];

const CORES = [
  '#0ea5e9',
  '#f59e0b',
  '#10b981',
  '#8b5cf6',
  '#ef4444',
  '#ec4899',
  '#14b8a6',
  '#64748b',
];

/**
 * Permissões que existem de verdade.
 *
 * A lista antiga oferecia sete chaves, e quatro delas — calendário,
 * notícias, financeiro e CRM — não controlavam nada: ou a seção sumiu do
 * app, ou nunca existiu. Desmarcar dava a impressão de restringir acesso
 * sem restringir coisa nenhuma. E "clientes" liberava a Equipe junto, de
 * carona, sem dizer.
 *
 * Cada linha aqui corresponde a um item da barra lateral. Se um dia
 * aparecer um item novo, ele entra nesta lista ou não é restringível.
 */
const PERMISSOES: { key: string; label: string; descricao: string }[] = [
  { key: 'tarefas', label: 'Tarefas e campanhas', descricao: 'Ver e editar as pautas da agência' },
  { key: 'clientes', label: 'Clientes', descricao: 'Abrir as pastas e o acesso ao portal' },
  { key: 'equipe', label: 'Equipe', descricao: 'Ver e cadastrar colegas' },
  { key: 'prompts', label: 'Prompts', descricao: 'Biblioteca de comandos salvos' },
];

const PADRAO_PERMISSOES = { tarefas: true, clientes: true, equipe: false, prompts: true };

const iniciais = (nome: string) =>
  nome.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

/**
 * Equipe — quem trabalha na agência e o que cada um alcança.
 *
 * Uma linha por pessoa, não um card cheio de métricas. O que importa de
 * relance é nome, cargo e quantas pautas estão na mão dela; o resto abre
 * no formulário.
 *
 * Clientes não aparecem aqui: o acesso deles mora na pasta de cada conta.
 */
export const CollaboratorsView: React.FC = () => {
  const currentUser = useCurrentUser();
  const users = useAppStore((s) => s.users);
  const tasks = useAppStore((s) => s.tasks);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);

  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<User | null>(null);
  const [criando, setCriando] = useState(false);
  const [aRemover, setARemover] = useState<User | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const equipe = useMemo(() => users.filter((u) => u.role !== 'cliente'), [users]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return equipe;
    return equipe.filter(
      (u) =>
        u.name.toLowerCase().includes(termo) ||
        u.email.toLowerCase().includes(termo) ||
        (u.jobTitle || '').toLowerCase().includes(termo)
    );
  }, [equipe, busca]);

  const copiarAcesso = (user: User) => {
    const url = `${window.location.origin}${window.location.pathname}?email=${encodeURIComponent(user.email)}`;
    const texto = `Olá ${user.name.split(' ')[0]}!\n\nSeu acesso ao Beewave Studio:\n\nLink: ${url}\nE-mail: ${user.email}\nSenha: ${user.password || '1234'}\n\nAbra o link e entre com esses dados.`;
    navigator.clipboard.writeText(texto);
    setCopiado(user.id);
    setTimeout(() => setCopiado((c) => (c === user.id ? null : c)), 3000);
  };

  const salvar = (dados: Partial<User>) => {
    if (editando) {
      updateUser(editando.id, dados);
      setAviso(`${dados.name || editando.name} atualizado.`);
    } else {
      addUser(dados);
      setAviso(`${dados.name} entrou na equipe.`);
    }
    setEditando(null);
    setCriando(false);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-semibold tracking-[-0.02em] text-slate-950 dark:text-white leading-tight">
            Equipe
          </h1>
          <p className="t-body text-slate-600 dark:text-slate-400 mt-1">
            {equipe.length} {equipe.length === 1 ? 'pessoa na agência' : 'pessoas na agência'}. O
            acesso dos clientes fica na pasta de cada conta.
          </p>
        </div>
        <Button variant="primary" icon={Plus} onClick={() => setCriando(true)}>
          Nova pessoa
        </Button>
      </header>

      {equipe.length > 4 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cargo…"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
          />
          {busca && (
            <button
              onClick={() => setBusca('')}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {visiveis.length === 0 ? (
        <EmptyState
          title={equipe.length === 0 ? 'Ninguém cadastrado ainda' : 'Ninguém com esse nome'}
          hint={
            equipe.length === 0
              ? 'Cadastre quem trabalha na agência para poder atribuir pautas e liberar o acesso.'
              : 'Tente outro termo de busca.'
          }
          action={
            equipe.length === 0 ? (
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setCriando(true)}>
                Cadastrar pessoa
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800 border-y border-slate-200 dark:border-slate-800">
          {visiveis.map((user) => {
            const naMao = tasks.filter(
              (t) =>
                (t.assigneeId === user.id || (t.assigneeIds || []).includes(user.id)) &&
                t.status !== 'postado' &&
                t.status !== 'aprovado'
            ).length;
            const inativo = user.status === 'inactive';

            return (
              <li key={user.id} className="flex items-center gap-4 py-4 group">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg text-white font-display text-[13px] font-semibold ${
                    inativo ? 'opacity-40' : ''
                  }`}
                  style={{ backgroundColor: user.color || '#64748b' }}
                  aria-hidden="true"
                >
                  {iniciais(user.name)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="t-lead font-medium text-slate-950 dark:text-white truncate">
                    {user.name}
                    {user.role === 'admin' && (
                      <span className="ml-2 t-meta font-normal text-slate-400">administrador</span>
                    )}
                    {inativo && (
                      <span className="ml-2 t-meta font-normal text-slate-400">inativo</span>
                    )}
                  </p>
                  <p className="t-meta text-slate-500 dark:text-slate-400 truncate">
                    {user.jobTitle || 'Sem cargo definido'} · {user.email}
                  </p>
                </div>

                <span className="shrink-0 hidden sm:block t-meta text-slate-400 dark:text-slate-500 w-[110px] text-right tabular-nums">
                  {naMao === 0 ? 'sem pautas' : `${naMao} ${naMao === 1 ? 'pauta' : 'pautas'}`}
                </span>

                <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => copiarAcesso(user)}
                    aria-label={`Copiar acesso de ${user.name}`}
                    title="Copiar acesso para enviar"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    {copiado === user.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Share2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditando(user)}
                    aria-label={`Editar ${user.name}`}
                    title="Editar"
                    className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  {user.id !== currentUser?.id && user.id !== 'u_admin' && (
                    <button
                      onClick={() => setARemover(user)}
                      aria-label={`Remover ${user.name}`}
                      title="Remover"
                      className="grid h-7 w-7 place-items-center rounded-md text-slate-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(criando || editando) && (
        <FormularioPessoa
          user={editando}
          onClose={() => {
            setCriando(false);
            setEditando(null);
          }}
          onSave={salvar}
        />
      )}

      {aRemover && (
        <ConfirmarRemocao
          user={aRemover}
          quantasPautas={
            tasks.filter(
              (t) => t.assigneeId === aRemover.id || (t.assigneeIds || []).includes(aRemover.id)
            ).length
          }
          onClose={() => setARemover(null)}
          onConfirm={() => {
            deleteUser(aRemover.id);
            setAviso(`${aRemover.name} saiu da equipe.`);
            setARemover(null);
          }}
        />
      )}

      <Toast message={aviso} onDismiss={() => setAviso(null)} />
    </div>
  );
};

/* ========================================================================== */

const FormularioPessoa: React.FC<{
  user: User | null;
  onClose: () => void;
  onSave: (dados: Partial<User>) => void;
}> = ({ user, onClose, onSave }) => {
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState(user?.password || '1234');
  const [phone, setPhone] = useState(user?.phone || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || CARGOS[2]);
  const [role, setRole] = useState<Role>(user?.role || 'colaborador');
  const [color, setColor] = useState(
    user?.color || CORES[Math.floor(Math.random() * CORES.length)]
  );
  const [ativo, setAtivo] = useState((user?.status || 'active') === 'active');
  const [verSenha, setVerSenha] = useState(false);
  const [permissoes, setPermissoes] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    for (const p of PERMISSOES) {
      base[p.key] = user
        ? ((user.permissions as any)?.[p.key] ?? (PADRAO_PERMISSOES as any)[p.key] ?? false)
        : ((PADRAO_PERMISSOES as any)[p.key] ?? false);
    }
    return base;
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    onSave({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password.trim() || '1234',
      phone: phone.trim(),
      jobTitle: jobTitle.trim(),
      role,
      color,
      status: ativo ? 'active' : 'inactive',
      // Administrador alcança tudo, então guardar marcações para ele só
      // criaria uma segunda fonte de verdade para a mesma pergunta.
      permissions: role === 'admin' ? {} : permissoes,
    });
  };

  const campo =
    'w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />

      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={user ? `Editar ${user.name}` : 'Nova pessoa'}
        className="relative w-full sm:max-w-lg max-h-[92vh] flex flex-col bg-white dark:bg-[#0f1114] sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="flex items-center justify-between gap-4 px-6 h-14 shrink-0 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white truncate">
            {user ? user.name : 'Nova pessoa'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto px-6 py-6 space-y-5">
          <div className="flex items-end gap-4">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-lg text-white font-display text-[15px] font-semibold"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            >
              {iniciais(name || '?')}
            </span>
            <div className="min-w-0 flex-1">
              <label htmlFor="col-nome" className="block t-label text-slate-500 mb-1.5">
                Nome
              </label>
              <input
                id="col-nome"
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome e sobrenome"
                className={campo}
              />
            </div>
          </div>

          <div>
            <p className="t-label text-slate-500 mb-1.5">Cor no sistema</p>
            <div className="flex items-center gap-2">
              {CORES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                  aria-pressed={color === c}
                  className={`h-7 w-7 rounded-lg transition-transform cursor-pointer ${
                    color === c
                      ? 'ring-2 ring-offset-2 ring-slate-950 dark:ring-white ring-offset-white dark:ring-offset-[#0f1114]'
                      : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="col-cargo" className="block t-label text-slate-500 mb-1.5">
                Cargo
              </label>
              <select
                id="col-cargo"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className={`${campo} cursor-pointer`}
              >
                {CARGOS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="col-tel" className="block t-label text-slate-500 mb-1.5">
                WhatsApp
              </label>
              <input
                id="col-tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(51) 99999-9999"
                className={campo}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="col-email" className="block t-label text-slate-500 mb-1.5">
                E-mail de login
              </label>
              <input
                id="col-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@beewave.com"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="col-senha" className="block t-label text-slate-500 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <input
                  id="col-senha"
                  type={verSenha ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${campo} pr-10 font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setVerSenha(!verSenha)}
                  aria-label={verSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {verSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-5 border-t border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3">
              {(['colaborador', 'admin'] as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  aria-pressed={role === r}
                  className={`flex-1 h-9 rounded-lg t-ui font-medium transition-colors cursor-pointer ${
                    role === r
                      ? 'bg-slate-950 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {r === 'admin' ? 'Administrador' : 'Colaborador'}
                </button>
              ))}
            </div>

            {role === 'admin' ? (
              <p className="t-meta text-slate-500 dark:text-slate-400">
                Administrador alcança todas as seções, inclusive Configurações e Lixeira.
              </p>
            ) : (
              <div className="space-y-2.5">
                <p className="t-label text-slate-500">O que esta pessoa alcança</p>
                {PERMISSOES.map((p) => (
                  <label
                    key={p.key}
                    className="flex items-start gap-3 cursor-pointer select-none group/perm"
                  >
                    <input
                      type="checkbox"
                      checked={!!permissoes[p.key]}
                      onChange={(e) =>
                        setPermissoes((prev) => ({ ...prev, [p.key]: e.target.checked }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-slate-950 focus:ring-slate-950 dark:focus:ring-white cursor-pointer"
                    />
                    <span className="min-w-0">
                      <span className="block t-ui text-slate-900 dark:text-white">{p.label}</span>
                      <span className="block t-meta text-slate-400 dark:text-slate-500">
                        {p.descricao}
                      </span>
                    </span>
                  </label>
                ))}
                <p className="t-meta text-slate-400 dark:text-slate-500 pt-1">
                  Início e Lixeira ficam sempre disponíveis. Configurações é só de administrador.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2.5 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-slate-950 focus:ring-slate-950 dark:focus:ring-white cursor-pointer"
              />
              <span className="t-ui text-slate-900 dark:text-white">
                Ativo — pode entrar no sistema
              </span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0 border-t border-slate-200 dark:border-slate-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={!name.trim() || !email.trim()}>
            {user ? 'Salvar' : 'Cadastrar'}
          </Button>
        </div>
      </form>
    </div>
  );
};

/* ========================================================================== */

const ConfirmarRemocao: React.FC<{
  user: User;
  quantasPautas: number;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ user, quantasPautas, onClose, onConfirm }) => {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-slate-950/55" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Remover ${user.name}`}
        className="relative w-full max-w-md bg-white dark:bg-[#0f1114] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <h2 className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white">
          Remover {user.name.split(' ')[0]} da equipe?
        </h2>
        <p className="t-body text-slate-600 dark:text-slate-400">
          {user.name} perde o acesso ao sistema.
          {quantasPautas > 0 &&
            ` As ${quantasPautas} pautas atribuídas a ${user.name.split(' ')[0]} ficam sem responsável.`}
        </p>
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Remover
          </Button>
        </div>
      </div>
    </div>
  );
};
