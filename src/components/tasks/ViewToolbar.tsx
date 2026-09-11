import React, { useRef, useState } from 'react';
import {
  Filter,
  Palette,
  Columns3,
  ArrowUpDown,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  GripVertical,
  Eye,
  EyeOff,
  Pencil,
} from 'lucide-react';
import {
  ColorRule,
  CustomProperty,
  FilterGroup,
  PropertyOption,
  PropertyType,
  TaskSort,
  TaskView,
} from '../../types';
import {
  EvalContext,
  TASK_COLORS,
  allFields,
  customFieldId,
  findField,
  getColor,
  newColorRule,
  newCondition,
} from '../../lib/taskViews';
import { ConditionRow } from './ConditionRow';
import { Button } from '../ui';

interface ViewToolbarProps {
  view: TaskView;
  views: TaskView[];
  ctx: EvalContext;
  resultCount: number;
  onUpdateView: (data: Partial<TaskView>) => void;
  onSelectView: (id: string) => void;
  onCreateView: () => void;
  onDuplicateView: () => void;
  onDeleteView: () => void;
  onAddProperty: (prop: CustomProperty) => void;
  onDeleteProperty: (id: string) => void;
  /** A barra de configuração vive atrás da engrenagem: o padrão é fechada. */
  open: boolean;
}

type PanelKey = 'filtro' | 'cores' | 'colunas' | 'ordem' | null;

/**
 * Barra de configuração da Central de Tarefas.
 *
 * Tudo que antes exigia mexer no código — quais colunas aparecem, o que
 * filtrar, que cor cada situação recebe — vira painel aqui. As mudanças valem
 * para a visão aberta, então dá para ter uma visão "Atrasadas em vermelho" e
 * outra "Só minhas, sem cor" sem uma atrapalhar a outra.
 */
export const ViewToolbar: React.FC<ViewToolbarProps> = ({
  view,
  views,
  ctx,
  resultCount,
  onUpdateView,
  onSelectView,
  onCreateView,
  onDuplicateView,
  onDeleteView,
  onAddProperty,
  onDeleteProperty,
  open,
}) => {
  const [panel, setPanel] = useState<PanelKey>(null);
  const [renaming, setRenaming] = useState(false);

  // Fechar a engrenagem também fecha o painel aberto, senão ele reabre sozinho
  // na próxima vez e o usuário não entende de onde veio.
  React.useEffect(() => {
    if (!open) setPanel(null);
  }, [open]);

  const activeFilters = view.filter.conditions.length;
  const activeRules = view.colorRules.filter((r) => r.enabled).length;

  const togglePanel = (key: PanelKey) => setPanel((p) => (p === key ? null : key));

  return (
    <div className="space-y-3">
      {/* Visões salvas */}
      <div className="flex items-center gap-1 flex-wrap border-b border-slate-200 dark:border-slate-800">
        {views.map((v) => {
          const isActive = v.id === view.id;
          return (
            <button
              key={v.id}
              onClick={() => onSelectView(v.id)}
              onDoubleClick={() => isActive && setRenaming(true)}
              aria-current={isActive ? 'page' : undefined}
              title={isActive ? 'Clique duas vezes para renomear' : undefined}
              className={`relative px-3 py-2 -mb-px border-b-2 t-ui transition-colors duration-150 cursor-pointer ${
                isActive
                  ? 'border-slate-950 dark:border-white text-slate-950 dark:text-white font-semibold'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {v.name}
            </button>
          );
        })}
        <button
          onClick={onCreateView}
          aria-label="Nova visão"
          title="Nova visão"
          className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {renaming && (
        <RenameView
          name={view.name}
          onCancel={() => setRenaming(false)}
          onSave={(name) => {
            onUpdateView({ name });
            setRenaming(false);
          }}
        />
      )}

      {/* Controles da visão. Ficam atrás da engrenagem: são ajustes de
          configuração, não o trabalho do dia. */}
      {!open ? null : (
      <div className="flex items-center gap-2 flex-wrap">
        <ToolButton
          icon={Filter}
          label="Filtros"
          count={activeFilters}
          active={panel === 'filtro'}
          onClick={() => togglePanel('filtro')}
        />
        <ToolButton
          icon={Palette}
          label="Cores"
          count={activeRules}
          active={panel === 'cores'}
          onClick={() => togglePanel('cores')}
        />
        <ToolButton
          icon={Columns3}
          label="Colunas"
          count={view.visibleColumns.length}
          active={panel === 'colunas'}
          onClick={() => togglePanel('colunas')}
        />
        <ToolButton
          icon={ArrowUpDown}
          label="Ordenar"
          count={view.sort ? 1 : 0}
          active={panel === 'ordem'}
          onClick={() => togglePanel('ordem')}
        />

        <span className="t-meta text-slate-400 dark:text-slate-500 ml-1">
          {resultCount} {resultCount === 1 ? 'tarefa' : 'tarefas'}
        </span>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setRenaming(true)}
            aria-label="Renomear visão"
            title="Renomear visão"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onDuplicateView}
            aria-label="Duplicar visão"
            title="Duplicar visão"
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          {views.length > 1 && (
            <button
              onClick={onDeleteView}
              aria-label="Excluir visão"
              title="Excluir visão"
              className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
      )}

      {panel === 'filtro' && (
        <Panel title="Mostrar apenas as tarefas que…">
          <FilterEditor
            filter={view.filter}
            ctx={ctx}
            onChange={(filter) => onUpdateView({ filter })}
          />
        </Panel>
      )}

      {panel === 'cores' && (
        <Panel title="Pintar a linha quando…">
          <ColorRulesEditor
            rules={view.colorRules}
            ctx={ctx}
            onChange={(colorRules) => onUpdateView({ colorRules })}
          />
        </Panel>
      )}

      {panel === 'colunas' && (
        <Panel title="Colunas desta visão">
          <ColumnsEditor
            view={view}
            ctx={ctx}
            onUpdateView={onUpdateView}
            onAddProperty={onAddProperty}
            onDeleteProperty={onDeleteProperty}
          />
        </Panel>
      )}

      {panel === 'ordem' && (
        <Panel title="Ordenar por">
          <SortEditor view={view} ctx={ctx} onChange={(sort) => onUpdateView({ sort })} />
        </Panel>
      )}
    </div>
  );
};

/* ========================================================================== */

const ToolButton: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}> = ({ icon: Icon, label, count, active, onClick }) => (
  <button
    onClick={onClick}
    aria-expanded={active}
    className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md t-ui transition-colors duration-150 cursor-pointer ${
      active
        ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950'
        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
    {label}
    {count > 0 && (
      <span className={`tabular-nums ${active ? 'opacity-70' : 'text-slate-400 dark:text-slate-500'}`}>
        {count}
      </span>
    )}
    <ChevronDown className={`h-3 w-3 transition-transform ${active ? 'rotate-180' : ''}`} />
  </button>
);

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 p-4 space-y-3">
    <p className="t-label text-slate-500">{title}</p>
    {children}
  </div>
);

const RenameView: React.FC<{
  name: string;
  onSave: (name: string) => void;
  onCancel: () => void;
}> = ({ name, onSave, onCancel }) => {
  const [draft, setDraft] = useState(name);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (draft.trim()) onSave(draft.trim());
      }}
      className="flex items-center gap-2"
    >
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
        className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
      />
      <Button size="sm" variant="primary" type="submit">
        Salvar nome
      </Button>
      <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
        Cancelar
      </Button>
    </form>
  );
};

/* ------------------------------- Filtros ---------------------------------- */

const FilterEditor: React.FC<{
  filter: FilterGroup;
  ctx: EvalContext;
  onChange: (f: FilterGroup) => void;
}> = ({ filter, ctx, onChange }) => (
  <div className="space-y-2.5">
    {filter.conditions.length > 1 && (
      <div className="flex items-center gap-2 t-meta text-slate-500">
        <span>Combinar condições com</span>
        <select
          value={filter.match}
          onChange={(e) => onChange({ ...filter, match: e.target.value as 'all' | 'any' })}
          className="h-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 t-meta cursor-pointer"
        >
          <option value="all">E (todas precisam bater)</option>
          <option value="any">OU (basta uma bater)</option>
        </select>
      </div>
    )}

    {filter.conditions.map((c) => (
      <ConditionRow
        key={c.id}
        condition={c}
        ctx={ctx}
        onChange={(next) =>
          onChange({
            ...filter,
            conditions: filter.conditions.map((x) => (x.id === next.id ? next : x)),
          })
        }
        onRemove={() =>
          onChange({ ...filter, conditions: filter.conditions.filter((x) => x.id !== c.id) })
        }
      />
    ))}

    <Button
      size="sm"
      variant="secondary"
      icon={Plus}
      onClick={() => onChange({ ...filter, conditions: [...filter.conditions, newCondition()] })}
    >
      Adicionar condição
    </Button>

    {filter.conditions.length === 0 && (
      <p className="t-meta text-slate-400 dark:text-slate-500">
        Sem filtro, esta visão mostra todas as tarefas.
      </p>
    )}
  </div>
);

/* -------------------------------- Cores ----------------------------------- */

const ColorRulesEditor: React.FC<{
  rules: ColorRule[];
  ctx: EvalContext;
  onChange: (r: ColorRule[]) => void;
}> = ({ rules, ctx, onChange }) => {
  const patch = (id: string, data: Partial<ColorRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...data } : r)));

  const move = (index: number, delta: number) => {
    const next = [...rules];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {rules.length > 1 && (
        <p className="t-meta text-slate-500">
          A primeira regra que bater é a que vale. Use as setas para mudar a prioridade.
        </p>
      )}

      {rules.map((rule, i) => {
        const color = getColor(rule.color);
        return (
          <div
            key={rule.id}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 space-y-3"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`h-3 w-3 rounded-full shrink-0 ${color.solid}`} aria-hidden="true" />

              <input
                value={rule.name}
                onChange={(e) => patch(rule.id, { name: e.target.value })}
                placeholder="Nome da regra"
                className="h-8 flex-1 min-w-[130px] rounded-md border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-slate-900 dark:focus:border-white bg-transparent px-2 t-ui font-medium text-slate-900 dark:text-white focus:outline-none"
              />

              <select
                value={rule.color}
                onChange={(e) => patch(rule.id, { color: e.target.value })}
                className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 t-meta cursor-pointer"
                aria-label="Cor"
              >
                {TASK_COLORS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>

              <div className="flex items-center">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label="Subir prioridade"
                  className="grid h-7 w-6 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === rules.length - 1}
                  aria-label="Descer prioridade"
                  className="grid h-7 w-6 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  ↓
                </button>
              </div>

              <button
                onClick={() => patch(rule.id, { enabled: !rule.enabled })}
                aria-label={rule.enabled ? 'Desativar regra' : 'Ativar regra'}
                title={rule.enabled ? 'Desativar regra' : 'Ativar regra'}
                className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                {rule.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>

              <button
                onClick={() => onChange(rules.filter((r) => r.id !== rule.id))}
                aria-label="Excluir regra"
                className="grid h-7 w-7 place-items-center rounded text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className={rule.enabled ? '' : 'opacity-45'}>
              <FilterEditor
                filter={rule.filter}
                ctx={ctx}
                onChange={(filter) => patch(rule.id, { filter })}
              />
            </div>
          </div>
        );
      })}

      <Button
        size="sm"
        variant="secondary"
        icon={Plus}
        onClick={() => onChange([...rules, newColorRule()])}
      >
        Nova regra de cor
      </Button>

      {rules.length === 0 && (
        <p className="t-meta text-slate-400 dark:text-slate-500">
          Sem regras, as linhas ficam neutras. Exemplo: campo “Publicação”, condição “já passou”,
          cor amarela.
        </p>
      )}
    </div>
  );
};

/* ------------------------------- Colunas ---------------------------------- */

const ColumnsEditor: React.FC<{
  view: TaskView;
  ctx: EvalContext;
  onUpdateView: (data: Partial<TaskView>) => void;
  onAddProperty: (prop: CustomProperty) => void;
  onDeleteProperty: (id: string) => void;
}> = ({ view, ctx, onUpdateView, onAddProperty, onDeleteProperty }) => {
  const [creating, setCreating] = useState(false);
  const fields = allFields(ctx.properties).filter((f) => f.columnar);

  const ordered = [
    ...view.columnOrder.filter((id) => fields.some((f) => f.id === id)),
    ...fields.map((f) => f.id).filter((id) => !view.columnOrder.includes(id)),
  ];

  const toggle = (id: string) => {
    const visible = view.visibleColumns.includes(id);
    onUpdateView({
      visibleColumns: visible
        ? view.visibleColumns.filter((c) => c !== id)
        : [...view.visibleColumns, id],
    });
  };

  const move = (id: string, delta: number) => {
    const next = [...ordered];
    const i = next.indexOf(id);
    const target = i + delta;
    if (target < 0 || target >= next.length) return;
    [next[i], next[target]] = [next[target], next[i]];
    onUpdateView({ columnOrder: next });
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-0.5">
        {ordered.map((id, i) => {
          const field = fields.find((f) => f.id === id);
          if (!field) return null;
          const visible = view.visibleColumns.includes(id);
          const isCustom = id.startsWith('custom:');
          return (
            <li key={id} className="flex items-center gap-2">
              <GripVertical className="h-3.5 w-3.5 text-slate-300 dark:text-slate-700 shrink-0" />
              <button
                onClick={() => toggle(id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left t-ui cursor-pointer py-1"
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border transition-colors ${
                    visible
                      ? 'bg-slate-950 dark:bg-white border-slate-950 dark:border-white text-white dark:text-slate-950'
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {visible && <Check className="h-2.5 w-2.5" strokeWidth={3.5} />}
                </span>
                <span
                  className={`truncate ${
                    visible ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {field.label}
                </span>
                {isCustom && (
                  <span className="t-meta text-slate-400 shrink-0">personalizada</span>
                )}
              </button>

              <div className="flex items-center shrink-0">
                <button
                  onClick={() => move(id, -1)}
                  disabled={i === 0}
                  aria-label="Mover para a esquerda"
                  className="grid h-6 w-5 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  ↑
                </button>
                <button
                  onClick={() => move(id, 1)}
                  disabled={i === ordered.length - 1}
                  aria-label="Mover para a direita"
                  className="grid h-6 w-5 place-items-center rounded text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                >
                  ↓
                </button>
                {isCustom && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Excluir a coluna "${field.label}"? Os valores preenchidos nas tarefas serão perdidos.`
                        )
                      ) {
                        onDeleteProperty(id.slice('custom:'.length));
                      }
                    }}
                    aria-label="Excluir coluna"
                    className="grid h-6 w-6 place-items-center rounded text-slate-400 hover:text-rose-600 cursor-pointer ml-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {creating ? (
        <NewPropertyForm
          onCancel={() => setCreating(false)}
          onCreate={(prop) => {
            onAddProperty(prop);
            onUpdateView({
              visibleColumns: [...view.visibleColumns, customFieldId(prop.id)],
              columnOrder: [...view.columnOrder, customFieldId(prop.id)],
            });
            setCreating(false);
          }}
        />
      ) : (
        <Button size="sm" variant="secondary" icon={Plus} onClick={() => setCreating(true)}>
          Nova coluna
        </Button>
      )}
    </div>
  );
};

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  text: 'Texto',
  select: 'Seleção única',
  multiSelect: 'Seleção múltipla',
  number: 'Número',
  date: 'Data',
  checkbox: 'Caixa de marcar',
  url: 'Link',
};

const NewPropertyForm: React.FC<{
  onCreate: (prop: CustomProperty) => void;
  onCancel: () => void;
}> = ({ onCreate, onCancel }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<PropertyType>('text');
  const [optionsText, setOptionsText] = useState('');

  const needsOptions = type === 'select' || type === 'multiSelect';

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const options: PropertyOption[] = needsOptions
      ? optionsText
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .map((label, i) => ({
            id: `opt_${Date.now().toString(36)}_${i}`,
            label,
            color: TASK_COLORS[(i + 1) % TASK_COLORS.length].key,
          }))
      : [];

    onCreate({
      id: `prop_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
      name: name.trim(),
      type,
      options,
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-3 space-y-3"
    >
      <div className="flex items-center gap-2 flex-wrap">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome da coluna"
          className="h-8 flex-1 min-w-[140px] rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as PropertyType)}
          className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 t-meta cursor-pointer"
          aria-label="Tipo"
        >
          {(Object.keys(PROPERTY_TYPE_LABELS) as PropertyType[]).map((t) => (
            <option key={t} value={t}>
              {PROPERTY_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {needsOptions && (
        <div>
          <label className="t-meta text-slate-500 block mb-1.5">
            Opções, uma por linha
          </label>
          <textarea
            rows={3}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
            placeholder={'Prioridade alta\nPrioridade média\nPrioridade baixa'}
            className="w-full rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-2 t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white"
          />
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button size="sm" variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button size="sm" variant="primary" type="submit" disabled={!name.trim()}>
          Criar coluna
        </Button>
      </div>
    </form>
  );
};

/* ------------------------------ Ordenação --------------------------------- */

const SortEditor: React.FC<{
  view: TaskView;
  ctx: EvalContext;
  onChange: (sort: TaskSort | null) => void;
}> = ({ view, ctx, onChange }) => {
  const fields = allFields(ctx.properties).filter((f) => f.id !== 'attachments');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={view.sort?.field || ''}
        onChange={(e) =>
          onChange(
            e.target.value
              ? { field: e.target.value, direction: view.sort?.direction || 'asc' }
              : null
          )
        }
        className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 t-meta cursor-pointer"
        aria-label="Campo de ordenação"
      >
        <option value="">Sem ordenação</option>
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>

      {view.sort && (
        <select
          value={view.sort.direction}
          onChange={(e) =>
            onChange({ ...view.sort!, direction: e.target.value as 'asc' | 'desc' })
          }
          className="h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 t-meta cursor-pointer"
          aria-label="Direção"
        >
          <option value="asc">Crescente</option>
          <option value="desc">Decrescente</option>
        </select>
      )}
    </div>
  );
};
