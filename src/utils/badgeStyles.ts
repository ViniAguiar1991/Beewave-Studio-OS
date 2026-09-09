import { TaskStatusKey } from '../types';

export interface BadgeStyle {
  border: string;
  text: string;
  dot: string;
}

export const getStatusBadgeStyle = (status?: TaskStatusKey | string | null): BadgeStyle => {
  if (!status) {
    return {
      border: 'border-slate-400/50 dark:border-slate-500/50',
      text: 'text-slate-600 dark:text-slate-300',
      dot: 'bg-slate-400',
    };
  }

  switch (status) {
    case 'nao_iniciado':
      return {
        border: 'border-slate-400/60 dark:border-slate-500/60',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-400',
      };
    case 'aguardar':
      return {
        border: 'border-blue-500/60 dark:border-blue-400/60',
        text: 'text-blue-600 dark:text-blue-400',
        dot: 'bg-blue-500',
      };
    case 'urgencia':
      return {
        border: 'border-red-500/70 dark:border-red-400/70',
        text: 'text-red-600 dark:text-red-400',
        dot: 'bg-red-500',
      };
    case 'em_andamento':
      return {
        border: 'border-amber-500/70 dark:border-amber-400/70',
        text: 'text-amber-600 dark:text-amber-400',
        dot: 'bg-amber-500',
      };
    case 'em_aprovacao':
      return {
        border: 'border-sky-500/70 dark:border-sky-400/70',
        text: 'text-sky-600 dark:text-sky-400',
        dot: 'bg-sky-500',
      };
    case 'alterar':
      return {
        border: 'border-rose-500/80 dark:border-rose-400/80',
        text: 'text-rose-600 dark:text-rose-400',
        dot: 'bg-rose-500',
      };
    case 'aprovado':
      return {
        border: 'border-emerald-500/70 dark:border-emerald-400/70',
        text: 'text-emerald-600 dark:text-emerald-400',
        dot: 'bg-emerald-500',
      };
    case 'postado':
      return {
        border: 'border-teal-500/70 dark:border-teal-400/70',
        text: 'text-teal-600 dark:text-teal-400',
        dot: 'bg-teal-500',
      };
    default:
      return {
        border: 'border-slate-400/50 dark:border-slate-500/50',
        text: 'text-slate-600 dark:text-slate-300',
        dot: 'bg-slate-400',
      };
  }
};

export const getStatusLabel = (status?: TaskStatusKey | string | null): string => {
  if (!status || typeof status !== 'string') return 'Não iniciado';
  const map: Record<string, string> = {
    nao_iniciado: 'Não iniciado',
    aguardar: 'Aguardar',
    urgencia: 'Urgência',
    em_andamento: 'Em andamento',
    em_aprovacao: 'Em aprovação',
    alterar: 'Alterar',
    aprovado: 'Aprovado',
    postado: 'Postado',
  };
  return map[status] || status.replace(/_/g, ' ');
};

/**
 * Resolves the display label for a task format seamlessly across copyMode and categoryId.
 */
export const getFormatLabel = (
  task?: { categoryId?: string; copyMode?: string } | null,
  categories?: { id: string; name: string }[]
): string => {
  if (!task) return 'Post';
  
  if (categories && task.categoryId) {
    const found = categories.find((c) => c.id === task.categoryId);
    if (found?.name) return found.name;
  }

  if (task.copyMode === 'roteiro' || task.categoryId === 'cat_reels' || task.categoryId === 'reels') {
    return 'Reels';
  }
  if (task.copyMode === 'carrossel' || task.categoryId === 'cat_carrossel' || task.categoryId === 'carrossel') {
    return 'Carrossel';
  }
  if (task.copyMode === 'legenda' || task.categoryId === 'cat_post' || task.categoryId === 'post') {
    return 'Post Único';
  }
  if (task.copyMode === 'none' || task.categoryId === 'cat_stories' || task.categoryId === 'stories') {
    return 'Stories';
  }

  return 'Post';
};

/**
 * Returns canonical copyMode / format key from a task
 */
export const getCanonicalFormatKey = (
  task?: { categoryId?: string; copyMode?: string } | null
): 'roteiro' | 'carrossel' | 'legenda' | 'none' => {
  if (!task) return 'carrossel';
  if (task.copyMode === 'roteiro' || task.categoryId === 'cat_reels' || task.categoryId === 'reels') {
    return 'roteiro';
  }
  if (task.copyMode === 'legenda' || task.categoryId === 'cat_post' || task.categoryId === 'post') {
    return 'legenda';
  }
  if (task.copyMode === 'none' || task.categoryId === 'cat_stories' || task.categoryId === 'stories') {
    return 'none';
  }
  return 'carrossel';
};
