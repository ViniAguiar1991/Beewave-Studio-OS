import React from 'react';
import { getPortalState } from './client-portal/portalStatus';
import { TaskStatusKey } from '../types';

/* ============================================================================
 * Primitivas do Portal do Cliente
 *
 * Existe um motivo para este arquivo: antes dele, a ação "Aprovar" tinha quatro
 * aparências diferentes espalhadas pelo portal. Toda ação, pílula de status e
 * estado vazio do portal sai daqui. Se precisar de uma variação nova, ela nasce
 * neste arquivo — não inline na tela.
 *
 * Escala tipográfica: use as classes semânticas do portal — t-label, t-meta,
 * t-ui, t-body, t-lead — definidas em index.css. Nunca px solto no JSX: a
 * escala precisa ser afinável num lugar só.
 * ========================================================================== */

/* --------------------------------------------------------------------------
 * Button — uma ação dominante por tela.
 * `primary` é tinta cheia e deve aparecer no máximo uma vez por bloco.
 * ------------------------------------------------------------------------ */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  icon?: React.ComponentType<{ className?: string }>;
  /** Mostra o estado de envio e bloqueia cliques repetidos. */
  pending?: boolean;
  pendingLabel?: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-slate-950 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200',
  secondary:
    'border border-slate-300 text-slate-800 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60 dark:hover:border-slate-600',
  ghost:
    'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white',
  danger:
    'text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40',
};

const SIZES = {
  sm: 'h-8 px-3 t-ui gap-1.5',
  md: 'h-10 px-4 t-ui gap-2',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  pending = false,
  pendingLabel = 'Enviando…',
  children,
  className = '',
  disabled,
  ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || pending}
    aria-busy={pending || undefined}
    className={[
      'inline-flex items-center justify-center rounded-lg font-medium',
      'transition-[background-color,border-color,color,opacity] duration-150',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950/30 dark:focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950',
      'disabled:opacity-45 disabled:cursor-not-allowed',
      'cursor-pointer whitespace-nowrap',
      VARIANTS[variant],
      SIZES[size],
      className,
    ].join(' ')}
  >
    {pending ? (
      <>
        <Spinner />
        <span>{pendingLabel}</span>
      </>
    ) : (
      <>
        {Icon && <Icon className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
        {children}
      </>
    )}
  </button>
);

const Spinner = () => (
  <span
    aria-hidden="true"
    className="h-3.5 w-3.5 rounded-full border-2 border-current border-r-transparent animate-spin opacity-70"
  />
);

/* --------------------------------------------------------------------------
 * StatusPill — o mesmo status sempre com a mesma cara, em qualquer tela.
 * ------------------------------------------------------------------------ */

export const StatusPill: React.FC<{
  status?: TaskStatusKey | string | null;
  /** Usa a frase completa em vez do rótulo curto. */
  long?: boolean;
}> = ({ status, long = false }) => {
  const state = getPortalState(status);
  return (
    <span className="inline-flex items-center gap-2 t-ui font-medium">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${state.dot}`} aria-hidden="true" />
      <span className={state.text}>{long ? state.sentence : state.label}</span>
    </span>
  );
};

/* --------------------------------------------------------------------------
 * Tipografia estrutural
 * ------------------------------------------------------------------------ */

/** Rótulo de seção. Discreto por design — organiza sem competir. */
export const SectionLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <h2
    className={`t-label text-slate-500 dark:text-slate-500 ${className}`}
  >
    {children}
  </h2>
);

/**
 * Cabeçalho de bloco: título + contagem concreta + ação opcional.
 * A contagem é obrigatória quando existe — "3 aguardando" informa, "Posts" não.
 */
export const BlockHeader: React.FC<{
  title: string;
  count?: string;
  action?: React.ReactNode;
}> = ({ title, count, action }) => (
  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 min-w-0">
      <SectionLabel>{title}</SectionLabel>
      {count && <span className="t-meta text-slate-400 dark:text-slate-500">{count}</span>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

/* --------------------------------------------------------------------------
 * Estados de interface
 * ------------------------------------------------------------------------ */

/**
 * Estado vazio. `title` diz o que não existe, `hint` diz o que acontece depois.
 * Nunca use um genérico do tipo "Nenhum item encontrado".
 */
export const EmptyState: React.FC<{
  title: string;
  hint?: string;
  action?: React.ReactNode;
}> = ({ title, hint, action }) => (
  <div className="py-14 text-center">
    <p className="t-lead font-medium text-slate-900 dark:text-white">{title}</p>
    {hint && (
      <p className="mt-1.5 t-body text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        {hint}
      </p>
    )}
    {action && <div className="mt-5 flex justify-center">{action}</div>}
  </div>
);

/** Estado de erro. Sempre oferece o próximo passo, nunca só o problema. */
export const ErrorState: React.FC<{
  title: string;
  hint?: string;
  onRetry?: () => void;
}> = ({ title, hint, onRetry }) => (
  <div className="py-14 text-center">
    <p className="t-lead font-medium text-slate-900 dark:text-white">{title}</p>
    {hint && (
      <p className="mt-1.5 t-body text-slate-500 dark:text-slate-400 max-w-md mx-auto">
        {hint}
      </p>
    )}
    {onRetry && (
      <div className="mt-5 flex justify-center">
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </div>
    )}
  </div>
);

/** Bloco cinza neutro usado para montar skeletons. */
export const Shimmer: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div
    aria-hidden="true"
    className={`bg-slate-100 dark:bg-slate-800 rounded animate-pulse ${className}`}
  />
);

/**
 * Skeleton no formato real de uma pauta — imagem quadrada à esquerda, texto à
 * direita. Um spinner genérico não diria nada sobre o que está chegando.
 */
export const PostSkeleton: React.FC = () => (
  <div className="py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
    <div className="lg:col-span-4">
      <Shimmer className="w-full aspect-square rounded-xl" />
    </div>
    <div className="lg:col-span-8 space-y-3 pt-1">
      <Shimmer className="h-3.5 w-40" />
      <Shimmer className="h-6 w-3/4" />
      <Shimmer className="h-3.5 w-52" />
      <div className="space-y-2 pt-3">
        <Shimmer className="h-3 w-full" />
        <Shimmer className="h-3 w-11/12" />
        <Shimmer className="h-3 w-2/3" />
      </div>
      <div className="flex gap-3 pt-4">
        <Shimmer className="h-9 w-28 rounded-lg" />
        <Shimmer className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  </div>
);

export const PostListSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => (
  <div className="divide-y divide-slate-200 dark:divide-slate-800" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <PostSkeleton key={i} />
    ))}
  </div>
);

/* --------------------------------------------------------------------------
 * Imagem com carregamento real
 *
 * As artes chegam como dataURL pesada ou URL remota — este é o único ponto do
 * portal onde existe espera de verdade, então é o único que merece skeleton.
 * ------------------------------------------------------------------------ */

export const PostImage: React.FC<{
  src?: string | null;
  alt: string;
  className?: string;
}> = ({ src, alt, className = '' }) => {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [src]);

  /**
   * Uma imagem em cache (ou uma dataURL) pode terminar de decodificar antes do
   * React anexar o onLoad — o evento nunca dispara e a imagem fica presa em
   * opacity 0. Conferir `complete` depois da renderização cobre esse caso.
   */
  React.useEffect(() => {
    const el = imgRef.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, [src]);

  if (!src) {
    return (
      <div
        className={`grid place-items-center bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 ${className}`}
      >
        <span className="t-meta">Arte ainda não enviada</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-900 ${className}`}>
      {!loaded && !failed && <Shimmer className="absolute inset-0 rounded-none" />}
      {failed ? (
        <div className="absolute inset-0 grid place-items-center text-slate-400 dark:text-slate-600">
          <span className="t-meta">Não foi possível carregar a arte</span>
        </div>
      ) : (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-full w-full object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

/* --------------------------------------------------------------------------
 * Toast — confirmação de sucesso, discreta e curta.
 * Substitui o confetti: no modo Operate, aprovar um post é rotina, não festa.
 * ------------------------------------------------------------------------ */

export const Toast: React.FC<{ message: string | null; onDismiss: () => void }> = ({
  message,
  onDismiss,
}) => {
  React.useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(id);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-slate-950 dark:bg-white px-4 py-2.5 t-ui font-medium text-white dark:text-slate-950 shadow-lg"
      style={{ animation: 'portal-toast-in 180ms cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {message}
    </div>
  );
};
