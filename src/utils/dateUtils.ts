export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Sem data';
  try {
    // If format is already YYYY-MM-DD or contains T
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const yy = year.length === 4 ? year.slice(2) : year;
      return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${yy}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const yy = String(d.getFullYear()).slice(2);
    return `${day}/${month}/${yy}`;
  } catch {
    return dateStr || 'Sem data';
  }
}

export function formatTimeAgo(ts: string): string {
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return 'Hoje';
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours} h`;
    return formatDate(ts);
  } catch {
    return 'Hoje';
  }
}
