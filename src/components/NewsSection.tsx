import React, { useState } from 'react';
import {
  Newspaper,
  Bookmark,
  BookmarkCheck,
  Search,
  Plus,
  RefreshCw,
  Lightbulb,
  Tag,
  X,
  Clock,
  Sun,
  Sunset,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../store';

interface NewsSectionProps {
  onNewTaskWithIdea: (ideaText: string, title: string) => void;
}

const CATEGORIES = [
  'Todas',
  'Social Media',
  'Tendências de Vídeo',
  'Estratégia & Vendas',
  'IA & Automação',
  'Salvas',
];

const FALLBACK_NEWS_IMAGES = [
  'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
];

export const NewsSection: React.FC<NewsSectionProps> = ({ onNewTaskWithIdea }) => {
  const news = useAppStore((s) => s.news);
  const newsNiches = useAppStore((s) => s.newsNiches);
  const addNewsNiche = useAppStore((s) => s.addNewsNiche);
  const removeNewsNiche = useAppStore((s) => s.removeNewsNiche);
  const adminPrompts = useAppStore((s) => s.adminPrompts);
  const toggleBookmarkNews = useAppStore((s) => s.toggleBookmarkNews);

  // Compute current shift based on local hour
  const currentHour = new Date().getHours();
  const defaultShift = currentHour < 12 ? 'manha' : currentHour < 18 ? 'tarde' : 'noite';

  const [selectedShift, setSelectedShift] = useState<'manha' | 'tarde' | 'noite'>(defaultShift);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newNicheInput, setNewNicheInput] = useState('');
  const [showNicheManager, setShowNicheManager] = useState(false);

  const handleAddNiche = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNicheInput.trim()) return;
    addNewsNiche(newNicheInput.trim());
    setNewNicheInput('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/ai/news-trends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory === 'Todas' || selectedCategory === 'Salvas' ? 'todas' : selectedCategory,
          niches: newsNiches,
          shift: selectedShift,
          systemPrompt: adminPrompts?.newsTrendsPrompt,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.news && Array.isArray(data.news)) {
          useAppStore.setState({ news: data.news });
        }
      }
    } catch (e) {
      console.error('Failed to refresh news trends:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredNews = news.filter((item) => {
    const matchesCategory =
      selectedCategory === 'Todas'
        ? true
        : selectedCategory === 'Salvas'
        ? item.bookmarked
        : item.category.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesSearch =
      (item.title + ' ' + item.summary + ' ' + (item.contentIdea || '')).toLowerCase().includes(
        searchQuery.toLowerCase()
      );

    return matchesCategory && matchesSearch;
  });

  return (
    <div id="news-section" className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Top Banner & Header */}
      <div className="clean-card p-6 md:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-white dark:bg-white dark:text-slate-900 font-bold">
                <Newspaper className="h-4 w-4" />
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                Notícias e Tendências por Nicho
              </h1>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl mt-1">
              Curadoria de tendências com IA, atualizada por turnos e filtrada pelos nichos dos seus clientes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="btn-refresh-news"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-900 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-60 whitespace-nowrap cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Buscando tendências com IA...' : 'Atualizar Notícias'}</span>
            </button>
          </div>
        </div>

        {/* Turno / Shift Selector & Registered Niches Toolbar */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                <span>Turno de Atualização:</span>
              </span>
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl">
                {[
                  { key: 'manha', label: 'Manhã', icon: Sun },
                  { key: 'tarde', label: 'Tarde', icon: Sunset },
                  { key: 'noite', label: 'Noite', icon: Moon },
                ].map((s) => {
                  const Icon = s.icon;
                  const active = selectedShift === s.key;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setSelectedShift(s.key as any)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="h-3 w-3" />
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowNicheManager(!showNicheManager)}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Tag className="h-3.5 w-3.5" />
              <span>{showNicheManager ? 'Ocultar Nichos' : 'Gerenciar Nichos Cadastrados'}</span>
              <span className="rounded-full bg-slate-200 dark:bg-slate-800 px-1.5 py-0.2 text-[10px]">
                {newsNiches.length}
              </span>
            </button>
          </div>

          {/* Registered Niches Badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mr-1">
                Nichos Ativos:
              </span>
              {newsNiches.map((niche) => (
                <span
                  key={niche}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-2xs"
                >
                  <span>{niche}</span>
                  <button
                    onClick={() => removeNewsNiche(niche)}
                    className="hover:text-red-500 p-0.5 rounded transition-colors cursor-pointer"
                    title="Remover nicho"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>

            {/* Quick Add Niche Input */}
            {showNicheManager && (
              <form onSubmit={handleAddNiche} className="flex gap-2 pt-2 max-w-md">
                <input
                  type="text"
                  value={newNicheInput}
                  onChange={(e) => setNewNicheInput(e.target.value)}
                  placeholder="Ex: Finanças & Investimentos, Odontologia..."
                  className="clean-input h-8 text-xs px-3 flex-1 bg-white dark:bg-slate-900"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-bold px-3 h-8 text-xs shadow-xs cursor-pointer"
                >
                  + Cadastrar Nicho
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Filter chips & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-200/50 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-300/80 dark:border-white/15'
                  }`}
                >
                  {cat === 'Salvas' ? '★ Salvas' : cat}
                </button>
              );
            })}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar notícia ou nicho..."
              className="clean-input h-10 w-full pl-9 pr-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Symmetrical Grid of News Cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        {filteredNews.map((item, idx) => {
          const coverUrl = item.imageUrl || FALLBACK_NEWS_IMAGES[idx % FALLBACK_NEWS_IMAGES.length];

          return (
            <article
              key={item.id}
              className="clean-card flex flex-col justify-between p-6 hover:border-slate-400 dark:hover:border-slate-500 transition-all group space-y-4"
            >
              <div className="space-y-4">
                {/* Embedded Cover Image */}
                <div className="relative w-full h-44 rounded-xl overflow-hidden border border-white/60 dark:border-white/10 bg-slate-200 dark:bg-slate-800">
                  <img
                    src={coverUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-50 group-hover:opacity-30 transition-opacity" />
                  
                  {/* Outline-only transparent badge */}
                  <span className="absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/30">
                    {item.category}
                  </span>

                  <button
                    onClick={() => toggleBookmarkNews(item.id)}
                    className="absolute top-3 right-3 rounded-full p-2 bg-black/60 backdrop-blur-md text-white border border-white/30 hover:bg-black/80 transition-all cursor-pointer"
                    title={item.bookmarked ? 'Remover dos favoritos' : 'Salvar notícia'}
                  >
                    {item.bookmarked ? (
                      <BookmarkCheck className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Bookmark className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* Card Meta Top */}
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-300">
                  <span>{item.source}</span>
                  <span>{item.date}</span>
                </div>

                {/* Title & Summary */}
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white leading-snug group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-200">
                    {item.summary}
                  </p>
                </div>

                {/* Actionable Content Idea Box */}
                {item.contentIdea && (
                  <div className="rounded-xl border border-slate-200/60 dark:border-white/10 clean-glass-subtle p-4 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-white">
                      <Lightbulb className="h-3.5 w-3.5 text-slate-700 dark:text-white" />
                      <span>Ideia de Post e Gancho:</span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                      {item.contentIdea}
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Action Button to transform news into Task */}
              <div className="pt-4 border-t border-slate-200/50 dark:border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-300">
                  Útil para criação de conteúdo
                </span>

                <button
                  onClick={() =>
                    onNewTaskWithIdea(
                      `Notícia base: ${item.title}\n\nResumo: ${item.summary}\n\nIdeia prática: ${item.contentIdea || ''}`,
                      `Post sobre: ${item.title.slice(0, 45)}...`
                    )
                  }
                  className="flex items-center gap-1.5 rounded-xl bg-slate-800 dark:bg-white hover:bg-slate-900 dark:hover:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Criar post com esta notícia</span>
                </button>
              </div>
            </article>
          );
        })}

        {filteredNews.length === 0 && (
          <div className="col-span-full py-12 text-center text-xs text-slate-400 dark:text-slate-500 clean-card">
            Nenhuma notícia encontrada na categoria "{selectedCategory}".
          </div>
        )}
      </div>
    </div>
  );
};

