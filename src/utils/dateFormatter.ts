import {
  parseISO,
  isToday,
  isYesterday,
  isTomorrow,
  isBefore,
  startOfToday,
  differenceInCalendarDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  format,
  isValid,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Checks if a given date string (YYYY-MM-DD or ISO) is strictly before today.
 */
export function isDateBeforeToday(dateStr?: string | null): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  try {
    let d: Date;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, day] = dateStr.split('-').map(Number);
      d = new Date(y, m - 1, day, 0, 0, 0);
    } else {
      d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    }
    if (!isValid(d)) return false;
    const today = startOfToday();
    return isBefore(d, today);
  } catch {
    return false;
  }
}

/**
 * Determines if a task is delayed (has a date before today and is not concluded or approved).
 * Se a tarefa está aprovada ou postada, não classificar como atrasada.
 */
export function isTaskDelayed(task: { status?: string; postDate?: string | null; artDate?: string | null }): boolean {
  if (!task) return false;
  const s = (task.status || '').toLowerCase().trim();
  if (
    s === 'aprovado' ||
    s === 'aprovada' ||
    s === 'postado' ||
    s === 'postada' ||
    s === 'concluido' ||
    s === 'concluído' ||
    s === 'publicado' ||
    s.includes('aprovad') ||
    s.includes('postad') ||
    s.includes('conclui') ||
    s.includes('publicad')
  ) {
    return false;
  }
  return isDateBeforeToday(task.postDate);
}

/**
 * Formats a date string (YYYY-MM-DD or ISO) into standard Brazilian format: dd/MM/yy (e.g. 19/08/26)
 */
export function formatStandardDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    let d: Date;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, day] = dateStr.split('-').map(Number);
      d = new Date(y, m - 1, day, 12, 0, 0);
    } else {
      d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    }
    if (!isValid(d)) return dateStr;
    return format(d, 'dd/MM/yy');
  } catch {
    return dateStr || '';
  }
}

/**
 * Returns ONLY the friendly relative label if it makes sense (ontem, hoje, amanhã, dia da semana, próxima semana),
 * or null if outside that window so we don't duplicate regular dates.
 */
export function getFriendlyLabelOnly(dateStr?: string | null): string | null {
  if (!dateStr) return null;
  try {
    let date: Date;
    if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, d] = dateStr.split('-').map(Number);
      date = new Date(y, m - 1, d, 12, 0, 0);
    } else {
      date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    }

    if (!isValid(date)) return null;

    const now = new Date();

    if (isToday(date)) return 'Hoje';
    if (isYesterday(date)) return 'Ontem';
    if (isTomorrow(date)) return 'Amanhã';

    const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
    const currentWeekEnd = endOfWeek(now, { weekStartsOn: 0 });

    const nextWeekStart = startOfWeek(addWeeks(now, 1), { weekStartsOn: 0 });
    const nextWeekEnd = endOfWeek(addWeeks(now, 1), { weekStartsOn: 0 });

    // Check if in current week
    if (date >= currentWeekStart && date <= currentWeekEnd) {
      const weekday = format(date, 'EEEE', { locale: ptBR }).replace('-feira', '');
      // Capitalize first letter
      return weekday.charAt(0).toUpperCase() + weekday.slice(1);
    }

    // Check if in next week
    if (date >= nextWeekStart && date <= nextWeekEnd) {
      const weekday = format(date, 'EEEE', { locale: ptBR }).replace('-feira', '');
      const prefix = weekday.startsWith('sábado') || weekday.startsWith('domingo') ? 'Próximo' : 'Próxima';
      return `${prefix} ${weekday}`;
    }

    return null;
  } catch {
    return null;
  }
}

export interface FormattedDatePair {
  primary: string; // e.g. "Hoje", "Amanhã", "Sexta-feira", "Próxima segunda-feira", or "13/08/26"
  secondary: string | null; // e.g. "19/08/26" or null if no friendly label exists (avoids repetition)
}

/**
 * Returns primary (larger) and secondary (smaller) date texts.
 * If a friendly relative label exists (e.g. "Hoje"), primary is "Hoje" and secondary is "19/08/26".
 * If no friendly relative label exists (e.g. "13/08/26"), primary is "13/08/26" and secondary is null (no duplication!).
 */
export function getDateDisplayPair(dateStr?: string | null): FormattedDatePair {
  if (!dateStr || !dateStr.trim()) {
    return { primary: 'Sem data', secondary: null };
  }
  const standard = formatStandardDate(dateStr);
  const friendly = getFriendlyLabelOnly(dateStr);
  if (friendly) {
    return { primary: friendly, secondary: standard };
  }
  return { primary: standard || 'Sem data', secondary: null };
}

/**
 * Returns descriptive relative labels according to user specification:
 * - "ontem"
 * - "hoje"
 * - "amanhã"
 * - Weekday in current week: "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado", "domingo"
 * - Weekday in next week: "próxima segunda-feira", "próxima terça-feira", "próxima quarta-feira", ...
 * - Otherwise: dd/MM/yy (e.g. 19/08/26)
 */
export function formatFriendlyDate(dateStr?: string | null, includeDateSuffix = false): string {
  if (!dateStr) return 'Sem data';
  try {
    const standard = formatStandardDate(dateStr);
    const friendly = getFriendlyLabelOnly(dateStr);

    if (friendly) {
      return includeDateSuffix ? `${friendly} • ${standard}` : friendly;
    }

    return standard;
  } catch {
    return dateStr || '';
  }
}

/**
 * Parses the two date shapes used across the app (YYYY-MM-DD and full ISO)
 * into a local Date anchored at midday, so timezone drift never shifts the day.
 */
function parseAppDate(dateStr?: string | null): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  try {
    let d: Date;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [y, m, day] = dateStr.split('-').map(Number);
      d = new Date(y, m - 1, day, 12, 0, 0);
    } else {
      d = parseISO(dateStr);
    }
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Editorial long date, for headers and detail views.
 * Example: "segunda-feira, 14 de setembro".
 */
export function formatLongDate(dateStr?: string | null): string {
  const d = parseAppDate(dateStr);
  if (!d) return 'Sem data definida';
  return format(d, "EEEE, d 'de' MMMM", { locale: ptBR });
}

/**
 * Timestamp for activity and history entries.
 * Example: "14/09 às 16h20".
 */
export function formatTimestamp(iso?: string | null): string {
  const d = parseAppDate(iso);
  if (!d) return '';
  return format(d, "dd/MM 'às' HH'h'mm", { locale: ptBR });
}

/**
 * Returns formatted date with both friendly label and dd/MM/yy
 * Example: "Hoje (19/08/26)" or "Próxima segunda-feira (24/08/26)" or "13/08/26"
 */
export function formatFullBadgeDate(dateStr?: string | null): string {
  if (!dateStr) return 'Sem data';
  const pair = getDateDisplayPair(dateStr);
  if (pair.secondary) {
    return `${pair.primary} (${pair.secondary})`;
  }
  return pair.primary;
}
