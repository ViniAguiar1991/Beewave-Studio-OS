import React from 'react';

interface FolderCardProps {
  /** Linha de cima, pequena: cliente, segmento, período. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Números que descrevem o conteúdo da pasta. */
  stats?: { valor: number | string; rotulo: string; destaque?: boolean }[];
  /** Cor da aba, vinda da paleta de tarefas. */
  tabColor?: string;
  /** Marca de canto: iniciais, emoji ou logo. */
  mark?: React.ReactNode;
  /** Ações que aparecem no hover, no canto superior direito. */
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  onClick?: () => void;
}

/**
 * Container em formato de pasta.
 *
 * Campanha e cliente são recipientes: guardam pautas, arquivos e histórico.
 * A aba no topo diz isso de relance, sem precisar de rótulo explicando que
 * ali dentro tem coisa.
 *
 * É a exceção à regra de evitar cards — aqui a forma carrega significado, e
 * não é caixa colocada só para preencher a tela.
 */
export const FolderCard: React.FC<FolderCardProps> = ({
  eyebrow,
  title,
  subtitle,
  stats = [],
  tabColor = 'bg-slate-300 dark:bg-slate-700',
  mark,
  actions,
  footer,
  onClick,
}) => {
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <div className="relative group">
      {/* A aba da pasta. Largura fixa e menor que o corpo, encostada à
          esquerda, para ler como pasta e não como cabeçalho de card. */}
      <span
        className={`absolute -top-2 left-4 h-4 w-20 rounded-t-lg ${tabColor}`}
        aria-hidden="true"
      />

      <Wrapper
        onClick={onClick}
        className={`relative w-full text-left rounded-xl rounded-tl-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 transition-colors ${
          onClick
            ? 'hover:border-slate-400 dark:hover:border-slate-600 cursor-pointer'
            : ''
        }`}
      >
        <div className="flex items-start gap-3">
          {mark && <span className="shrink-0">{mark}</span>}

          <span className="min-w-0 flex-1">
            {eyebrow && (
              <span className="block t-meta text-slate-400 dark:text-slate-500 truncate">
                {eyebrow}
              </span>
            )}
            <span className="block t-lead font-semibold text-slate-950 dark:text-white leading-snug line-clamp-2">
              {title}
            </span>
            {subtitle && (
              <span className="block t-body text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                {subtitle}
              </span>
            )}
          </span>
        </div>

        {stats.length > 0 && (
          <div className="flex items-baseline gap-5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {stats.map((s) => (
              <span key={s.rotulo}>
                <span
                  className={`block font-display text-[19px] font-semibold tabular-nums leading-none ${
                    s.destaque
                      ? 'text-amber-700 dark:text-amber-500'
                      : 'text-slate-950 dark:text-white'
                  }`}
                >
                  {s.valor}
                </span>
                <span className="block t-meta text-slate-400 dark:text-slate-500 mt-1">
                  {s.rotulo}
                </span>
              </span>
            ))}
          </div>
        )}

        {footer && <div className="mt-4">{footer}</div>}
      </Wrapper>

      {actions && (
        <div className="absolute top-3.5 right-3.5 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );
};

/** Botão de ação do canto da pasta. */
export const FolderAction: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  danger?: boolean;
}> = ({ icon: Icon, label, onClick, danger }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
    title={label}
    className={`grid h-7 w-7 place-items-center rounded-md bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer ${
      danger
        ? 'text-slate-400 hover:text-rose-600 hover:border-rose-300'
        : 'text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-400'
    }`}
  >
    <Icon className="h-3.5 w-3.5" />
  </button>
);
