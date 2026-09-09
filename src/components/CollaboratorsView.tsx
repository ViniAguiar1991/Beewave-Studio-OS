import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Mail,
  Phone,
  Briefcase,
  Shield,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  Share2,
  Check,
  Edit2,
  Trash2,
  Sparkles,
  ExternalLink,
  MessageCircle,
  ListChecks,
  Lock,
  Calendar,
  Filter,
} from 'lucide-react';
import { useAppStore, useCurrentUser } from '../store';
import { User, Role } from '../types';

const JOB_PRESETS = [
  'Designer Gráfico',
  'Motion Designer & Vídeo',
  'Copywriter & Conteúdo',
  'Social Media Manager',
  'Gestor de Tráfego Pago',
  'Atendimento & Sucesso do Cliente',
  'Diretor de Criação',
  'Estrategista Digital',
  'Desenvolvedor Web',
];

const COLOR_PRESETS = [
  '#f59e0b', // Amber
  '#0ea5e9', // Sky
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f43f5e', // Rose
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#14b8a6', // Teal
];

export const CollaboratorsView: React.FC = () => {
  const currentUser = useCurrentUser();
  const users = useAppStore((s) => s.users);
  const tasks = useAppStore((s) => s.tasks);
  const addUser = useAppStore((s) => s.addUser);
  const updateUser = useAppStore((s) => s.updateUser);
  const deleteUser = useAppStore((s) => s.deleteUser);

  // Filter ONLY collaborators and admins (Exclude clients)
  const collaborators = users.filter((u) => u.role !== 'cliente');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<'all' | 'admin' | 'colaborador'>('all');
  const [selectedJobFilter, setSelectedJobFilter] = useState<string>('all');

  // Modal States
  const [showModal, setShowModal] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('1234');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('Designer Gráfico');
  const [role, setRole] = useState<Role>('colaborador');
  const [color, setColor] = useState('#0ea5e9');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [showPassword, setShowPassword] = useState(false);
  const [permissions, setPermissions] = useState({
    tarefas: true,
    clientes: true,
    calendario: true,
    noticias: true,
    prompts: true,
    financeiro: false,
    crm: false,
  });

  // Copy invitation feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete confirmation modal state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Open modal for new user
  const handleOpenNewUser = () => {
    setEditingUserId(null);
    setName('');
    setEmail('');
    setPassword('1234');
    setPhone('');
    setJobTitle('Designer Gráfico');
    setRole('colaborador');
    setColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
    setStatus('active');
    setShowPassword(false);
    setPermissions({
      tarefas: true,
      clientes: true,
      calendario: true,
      noticias: true,
      prompts: true,
      financeiro: false,
      crm: false,
    });
    setShowModal(true);
  };

  // Open modal for editing user
  const handleOpenEditUser = (user: User) => {
    setEditingUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(user.password || '1234');
    setPhone(user.phone || '');
    setJobTitle(user.jobTitle || 'Colaborador');
    setRole(user.role);
    setColor(user.color || '#0ea5e9');
    setStatus(user.status || 'active');
    setShowPassword(false);
    setPermissions({
      tarefas: user.permissions?.tarefas ?? true,
      clientes: user.permissions?.clientes ?? true,
      calendario: user.permissions?.calendario ?? true,
      noticias: user.permissions?.noticias ?? true,
      prompts: user.permissions?.prompts ?? true,
      financeiro: user.permissions?.financeiro ?? false,
      crm: user.permissions?.crm ?? false,
    });
    setShowModal(true);
  };

  // Save form
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    if (editingUserId) {
      updateUser(editingUserId, {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        role,
        color,
        status,
        permissions: role === 'admin' ? {} : permissions,
      });
    } else {
      addUser({
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
        phone: phone.trim(),
        jobTitle: jobTitle.trim(),
        role,
        color,
        status,
        permissions: role === 'admin' ? {} : permissions,
      });
    }

    setShowModal(false);
  };

  // Copy WhatsApp invitation
  const handleCopyInvite = (user: User) => {
    const origin = window.location.origin + window.location.pathname;
    const inviteUrl = `${origin}?email=${encodeURIComponent(user.email)}`;
    const pass = user.password || '1234';
    const text = `Olá ${user.name.split(' ')[0]}! 👋\n\nAqui está o seu acesso ao painel de equipe da BeeWave:\n\n🌐 *Link de Acesso:* ${inviteUrl}\n📧 *E-mail de Login:* ${user.email}\n🔑 *Senha:* ${pass}\n\nAbra o link acima para acessar seu painel, tarefas e briefings!`;
    navigator.clipboard.writeText(text);
    setCopiedId(user.id);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Filtered Collaborators
  const filteredCollaborators = collaborators.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.phone && u.phone.includes(searchQuery)) ||
      (u.jobTitle && u.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole =
      selectedRoleFilter === 'all' ? true : u.role === selectedRoleFilter;

    const matchesJob =
      selectedJobFilter === 'all'
        ? true
        : u.jobTitle?.toLowerCase().includes(selectedJobFilter.toLowerCase());

    return matchesSearch && matchesRole && matchesJob;
  });

  // Calculate team stats
  const totalCollaborators = collaborators.length;
  const adminCount = collaborators.filter((u) => u.role === 'admin').length;
  const memberCount = totalCollaborators - adminCount;

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-20">
      {/* Header & Quick Stats */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">👥</span>
            <h1 className="text-2xl font-bold font-display text-slate-900 dark:text-white">
              Equipe & Colaboradores
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os membros da sua agência, cargos, permissões e acessos ao sistema
          </p>
        </div>

        <button
          id="btn-add-collaborator"
          type="button"
          onClick={handleOpenNewUser}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold px-5 py-3 text-xs shadow-md transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Colaborador</span>
        </button>
      </div>

      {/* Info Notice: Separation from Clients */}
      <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold text-xs">
          💡
        </span>
        <div className="text-xs text-slate-700 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-slate-100">
            Equipe Interna separada dos Clientes
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Aqui ficam apenas os profissionais da agência (designers, copywriters, gestores). Os acessos dos clientes são gerenciados individualmente na aba <strong>Clientes</strong>.
          </p>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="clean-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total na Equipe</p>
          <p className="text-xl font-bold font-display text-slate-900 dark:text-white mt-1">{totalCollaborators}</p>
        </div>
        <div className="clean-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Colaboradores</p>
          <p className="text-xl font-bold font-display text-sky-600 dark:text-sky-400 mt-1">{memberCount}</p>
        </div>
        <div className="clean-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Administradores</p>
          <p className="text-xl font-bold font-display text-slate-900 dark:text-white mt-1">{adminCount}</p>
        </div>
        <div className="clean-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Tarefas Atribuídas</p>
          <p className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400 mt-1">
            {tasks.filter((t) => t.assigneeId && t.status !== 'postado').length} ativas
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="clean-card p-4 bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="input-search-collaborators"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, e-mail, cargo..."
            className="clean-input h-10 w-full pl-10 pr-4 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-300 dark:border-slate-700 rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Todos ({totalCollaborators})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('colaborador')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'colaborador'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Colaboradores ({memberCount})
            </button>
            <button
              type="button"
              onClick={() => setSelectedRoleFilter('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedRoleFilter === 'admin'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Admins ({adminCount})
            </button>
          </div>
        </div>
      </div>

      {/* Collaborators Grid */}
      {filteredCollaborators.length === 0 ? (
        <div className="clean-card p-12 text-center bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 space-y-3">
          <Users className="h-10 w-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Nenhum colaborador encontrado
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Tente buscar com outros termos ou adicione um novo membro à equipe.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCollaborators.map((user) => {
            const userTasks = tasks.filter((t) => t.assigneeId === user.id);
            const activeTasksCount = userTasks.filter((t) => t.status !== 'postado').length;
            const completedTasksCount = userTasks.filter((t) => t.status === 'postado').length;

            return (
              <div
                key={user.id}
                className="clean-card p-5 bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div className="space-y-4">
                  {/* Top Card: Avatar + Role Badge + Options */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white font-black text-sm shadow-md"
                        style={{ backgroundColor: user.color || '#0ea5e9' }}
                      >
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {user.name}
                          </h3>
                          {user.role === 'admin' && (
                            <span title="Administrador">👑</span>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-300 flex items-center gap-1 mt-0.5 truncate">
                          <Briefcase className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>{user.jobTitle || (user.role === 'admin' ? 'Diretor Geral' : 'Colaborador')}</span>
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                        user.role === 'admin'
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border border-slate-900 dark:border-white'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {user.role === 'admin' ? 'Admin' : 'Membro'}
                    </span>
                  </div>

                  {/* Contact Info: Email & WhatsApp */}
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {user.phone && typeof user.phone === 'string' ? (
                        <a
                          href={`https://wa.me/55${user.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <span>{user.phone}</span>
                          <MessageCircle className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">Telefone não informado</span>
                      )}
                    </div>
                  </div>

                  {/* Workload Stats & Permissions */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <ListChecks className="h-3.5 w-3.5 text-slate-500" />
                      <span>{activeTasksCount} tarefas ativas</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {completedTasksCount} concluídas
                    </span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold py-2 px-3 transition-all cursor-pointer"
                    title="Copiar dados de login para WhatsApp"
                  >
                    {copiedId === user.id ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>Acesso WhatsApp</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditUser(user)}
                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-all cursor-pointer"
                      title="Editar cadastro"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    {user.id !== currentUser?.id && user.id !== 'u_admin' && (
                      <button
                        type="button"
                        onClick={() => setUserToDelete(user)}
                        className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                        title="Remover colaborador"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add / Edit Collaborator */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-lg p-6 bg-white dark:bg-slate-900 space-y-5 shadow-2xl border border-slate-200 dark:border-slate-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white">
                  <UserPlus className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold font-display text-slate-900 dark:text-white">
                  {editingUserId ? 'Editar Colaborador' : 'Cadastrar Novo Colaborador'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
              {/* Nome Completo */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  id="input-collab-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Juliana Mendes"
                  className="clean-input h-10 w-full px-3 text-xs bg-slate-50 dark:bg-slate-800"
                />
              </div>

              {/* Cargo / Especialidade */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Cargo / Especialidade na Agência
                </label>
                <div className="space-y-2">
                  <input
                    id="input-collab-job"
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Ex: Designer Gráfico, Copywriter, Social Media..."
                    className="clean-input h-10 w-full px-3 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {JOB_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setJobTitle(preset)}
                        className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                          jobTitle === preset
                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Telefone / WhatsApp e Cor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Telefone / WhatsApp
                  </label>
                  <input
                    id="input-collab-phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(54) 99999-8888"
                    className="clean-input h-10 w-full px-3 text-xs bg-slate-50 dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cor de Identificação
                  </label>
                  <div className="flex items-center gap-2 pt-1">
                    {COLOR_PRESETS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-7 w-7 rounded-xl transition-all cursor-pointer ${
                          color === c ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Credenciais de Login: E-mail e Senha */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <p className="text-[11px] font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5" />
                  <span>Acesso ao Sistema (Login & Senha)</span>
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      E-mail Institucional *
                    </label>
                    <input
                      id="input-collab-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nome@beewave.com"
                      className="clean-input h-9 w-full px-3 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1 text-[11px]">
                      Senha de Acesso
                    </label>
                    <div className="relative">
                      <input
                        id="input-collab-password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="clean-input h-9 w-full px-3 pr-8 text-xs font-mono bg-white dark:bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nível de Acesso (Role) */}
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Nível de Permissão
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setRole('colaborador')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'colaborador'
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p className="text-xs">👤 Colaborador</p>
                    <p className="text-[10px] opacity-80 font-normal mt-0.5">
                      Acesso aos módulos de criação e tarefas
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole('admin')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      role === 'admin'
                        ? 'border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-900 font-bold'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <p className="text-xs">👑 Administrador</p>
                    <p className="text-[10px] opacity-80 font-normal mt-0.5">
                      Acesso total a todas as configurações
                    </p>
                  </button>
                </div>
              </div>

              {/* Modular Permissions (Only for non-admins) */}
              {role === 'colaborador' && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Módulos Liberados para este Colaborador:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.tarefas}
                        onChange={(e) => setPermissions({ ...permissions, tarefas: e.target.checked })}
                        className="rounded text-slate-900 dark:text-white"
                      />
                      <span>Tarefas & Kanban</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.clientes}
                        onChange={(e) => setPermissions({ ...permissions, clientes: e.target.checked })}
                        className="rounded text-slate-900 dark:text-white"
                      />
                      <span>Perfis de Clientes</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.calendario}
                        onChange={(e) => setPermissions({ ...permissions, calendario: e.target.checked })}
                        className="rounded text-slate-900 dark:text-white"
                      />
                      <span>Calendário</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.noticias}
                        onChange={(e) => setPermissions({ ...permissions, noticias: e.target.checked })}
                        className="rounded text-slate-900 dark:text-white"
                      />
                      <span>Notícias & Tendências</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions.prompts}
                        onChange={(e) => setPermissions({ ...permissions, prompts: e.target.checked })}
                        className="rounded text-slate-900 dark:text-white"
                      />
                      <span>Prompts & Notas</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-collaborator"
                  type="submit"
                  className="flex-1 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 py-2.5 text-xs font-bold text-white dark:text-slate-900 shadow-md transition-all cursor-pointer"
                >
                  {editingUserId ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="clean-card w-full max-w-sm p-6 bg-white dark:bg-slate-900 space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-500 mx-auto">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Remover {userToDelete.name}?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Esta ação removerá o login e acesso deste colaborador. As tarefas atribuídas a ele continuarão no sistema.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteUser(userToDelete.id);
                  setUserToDelete(null);
                }}
                className="flex-1 rounded-xl bg-rose-600 hover:bg-rose-500 py-2 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Sim, Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
