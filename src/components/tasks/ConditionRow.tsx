import React from 'react';
import { X } from 'lucide-react';
import { FilterCondition, FilterOperator } from '../../types';
import {
  EvalContext,
  FieldDef,
  OPERATOR_LABELS,
  allFields,
  customPropertyId,
  findField,
  isCustomField,
  isUnaryOperator,
  operatorsFor,
} from '../../lib/taskViews';

interface ConditionRowProps {
  condition: FilterCondition;
  ctx: EvalContext;
  onChange: (next: FilterCondition) => void;
  onRemove: () => void;
}

const selectClass =
  'h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 t-meta text-slate-800 dark:text-slate-200 focus:outline-none focus:border-slate-900 dark:focus:border-white cursor-pointer max-w-[170px]';

const inputClass =
  'h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 t-meta text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white max-w-[170px]';

/**
 * Uma condição: campo, operador e valor.
 *
 * É a peça que se repete tanto no filtro da visão quanto dentro de cada regra
 * de cor — as duas coisas usam exatamente o mesmo modelo, então usam o mesmo
 * editor. Trocar o campo reajusta o operador para um que faça sentido com o
 * novo tipo, em vez de deixar uma combinação inválida na tela.
 */
export const ConditionRow: React.FC<ConditionRowProps> = ({
  condition,
  ctx,
  onChange,
  onRemove,
}) => {
  const fields = allFields(ctx.properties).filter((f) => f.id !== 'attachments');
  const field = findField(condition.field, ctx.properties);
  const operators = field ? operatorsFor(field.type) : (['is'] as FilterOperator[]);

  const handleFieldChange = (nextFieldId: string) => {
    const nextField = findField(nextFieldId, ctx.properties);
    const nextOps = nextField ? operatorsFor(nextField.type) : (['is'] as FilterOperator[]);
    const keepOperator = nextOps.includes(condition.operator) ? condition.operator : nextOps[0];
    onChange({ ...condition, field: nextFieldId, operator: keepOperator, value: '' });
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className={selectClass}
        aria-label="Campo"
      >
        {fields.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={(e) =>
          onChange({ ...condition, operator: e.target.value as FilterOperator, value: '' })
        }
        className={selectClass}
        aria-label="Condição"
      >
        {operators.map((op) => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {!isUnaryOperator(condition.operator) && field && (
        <ValueInput
          condition={condition}
          field={field}
          ctx={ctx}
          onChange={(value) => onChange({ ...condition, value })}
        />
      )}

      <button
        onClick={onRemove}
        aria-label="Remover condição"
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

/**
 * O campo de valor muda conforme o tipo: data vira calendário, status vira
 * lista dos status existentes, texto vira caixa de texto. Digitar o id de um
 * cliente à mão não seria liberdade, seria armadilha.
 */
const ValueInput: React.FC<{
  condition: FilterCondition;
  field: FieldDef;
  ctx: EvalContext;
  onChange: (value: string | string[]) => void;
}> = ({ condition, field, ctx, onChange }) => {
  const multi = condition.operator === 'isAnyOf' || condition.operator === 'isNoneOf';

  const options: { value: string; label: string }[] = React.useMemo(() => {
    if (isCustomField(field.id)) {
      const prop = ctx.properties.find((p) => p.id === customPropertyId(field.id));
      return (prop?.options || []).map((o) => ({ value: o.id, label: o.label }));
    }
    switch (field.id) {
      case 'status':
        return ctx.statuses.map((s) => ({ value: s.key, label: s.label }));
      case 'client':
        return ctx.clients.map((c) => ({ value: c.id, label: c.company }));
      case 'assignee':
        return ctx.users
          .filter((u) => u.role !== 'cliente')
          .map((u) => ({ value: u.id, label: u.name }));
      case 'category':
        return ctx.categories.map((c) => ({ value: c.id, label: c.name }));
      case 'campaign':
        return ctx.campaigns.map((c) => ({ value: c.id, label: c.title }));
      default:
        return [];
    }
  }, [field.id, ctx]);

  if (options.length > 0) {
    if (multi) {
      const selected = Array.isArray(condition.value) ? condition.value : [];
      return (
        <select
          multiple
          value={selected}
          onChange={(e) =>
            onChange(Array.from(e.target.selectedOptions).map((o) => o.value))
          }
          className={`${selectClass} h-auto min-h-[64px] py-1`}
          aria-label="Valores"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
    }
    return (
      <select
        value={String(condition.value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className={selectClass}
        aria-label="Valor"
      >
        <option value="">Escolha…</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === 'date' && ['before', 'after', 'is'].includes(condition.operator)) {
    return (
      <input
        type="date"
        value={String(condition.value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
        aria-label="Data"
      />
    );
  }

  if (
    field.type === 'number' ||
    condition.operator === 'inNextDays' ||
    condition.operator === 'inLastDays'
  ) {
    return (
      <input
        type="number"
        value={String(condition.value ?? '')}
        onChange={(e) => onChange(e.target.value)}
        placeholder={condition.operator.startsWith('in') ? 'dias' : 'número'}
        className={`${inputClass} w-24`}
        aria-label="Valor"
      />
    );
  }

  return (
    <input
      type="text"
      value={String(condition.value ?? '')}
      onChange={(e) => onChange(e.target.value)}
      placeholder="valor"
      className={inputClass}
      aria-label="Valor"
    />
  );
};
