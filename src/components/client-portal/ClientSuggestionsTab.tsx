import React, { useState } from 'react';
import { Client, Task } from '../../types';
import { useAppStore } from '../../store';
import {
  Send,
  Check,
  Calendar,
  Lightbulb,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ClientSuggestionsTabProps {
  currentClient: Client;
}

export const ClientSuggestionsTab: React.FC<ClientSuggestionsTabProps> = ({ currentClient }) => {
  const { tasks, addTask } = useAppStore();

  const [title, setTitle] = useState('');
  const [idea, setIdea] = useState('');
  const [links, setLinks] = useState('');
  const [date, setDate] = useState('');
  const [format, setFormat] = useState('Carrossel');
  const [channel, setChannel] = useState<'instagram' | 'linkedin' | 'tiktok' | 'youtube'>('instagram');
  const [isSuccess, setIsSuccess] = useState(false);

  // Suggestions submitted by this client (identified by clientRequest or title tag)
  const clientSuggestions = tasks.filter(
    (t) => t.clientId === currentClient.id && (t.clientRequest || t.title.toLowerCase().includes('sugestão'))
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !idea.trim()) return;

    const fullTitle = title.trim() || 'Sugestão: ' + idea.trim().slice(0, 45);

    const descriptionParts = [
      '[Sugestão de pauta enviada pelo cliente via Portal]',
      '',
      idea.trim(),
    ];

    if (links.trim()) {
      descriptionParts.push('', 'Links e referências:', links.trim());
    }

    addTask({
      clientId: currentClient.id,
      title: fullTitle,
      briefingText: descriptionParts.join('\n'),
      format: format,
      channel: channel,
      postDate: date || '',
      status: 'nao_iniciado',
      clientRequest: true,
      category: 'conteudo',
    });

    setTitle('');
    setIdea('');
    setLinks('');
    setDate('');
    setIsSuccess(true);
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 },
    });

    setTimeout(() => {
      setIsSuccess(false);
    }, 4000);
  };

  return (
    <div id="client-suggestions-tab" className="w-full space-y-12 animate-in fade-in">
      {/* 1. Header Area - Clean, Line-Separated */}
      <div className="space-y-1 pb-6 border-b border-slate-200/80 dark:border-slate-800">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          Sugerir nova pauta
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Compartilhe uma ideia, novidade, lançamento ou referência para a equipe de conteúdo transformar em publicação.
        </p>
      </div>

      {/* 2. Direct Minimal Form (No Box Container, Pure Editorial Flow) */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {isSuccess && (
          <div className="py-3 px-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Pauta sugerida com sucesso! A equipe do estúdio já foi notificada e avaliará a produção.</span>
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
            Título ou Tema Principal <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Anúncio do novo serviço de consultoria, Dica rápida sobre finanças..."
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
            O que você gostaria de abordar neste post? <span className="text-rose-500">*</span>
          </label>
          <textarea
            required
            rows={4}
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="Explique os pontos essenciais, mensagem que quer passar, público que quer atingir ou dor que quer solucionar..."
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Formato preferido
            </label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none"
            >
              <option value="Carrossel" className="dark:bg-slate-900">Carrossel educativo</option>
              <option value="Reels / Vídeo" className="dark:bg-slate-900">Reels / Vídeo curto</option>
              <option value="Post Estático" className="dark:bg-slate-900">Post estático / Arte única</option>
              <option value="Story" className="dark:bg-slate-900">Sequência de Stories</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Canal
            </label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as any)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none"
            >
              <option value="instagram" className="dark:bg-slate-900">Instagram</option>
              <option value="linkedin" className="dark:bg-slate-900">LinkedIn</option>
              <option value="tiktok" className="dark:bg-slate-900">TikTok</option>
              <option value="youtube" className="dark:bg-slate-900">YouTube</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
              Previsão desejada (opcional)
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-700 dark:text-slate-300 block">
            Links de referência ou inspiração (opcional)
          </label>
          <input
            type="text"
            value={links}
            onChange={(e) => setLinks(e.target.value)}
            placeholder="Cole links do Instagram, notícia, drive ou site de referência..."
            className="w-full text-xs sm:text-sm p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-900 dark:text-white focus:border-slate-900 dark:focus:border-white focus:outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Enviar sugestão para a agência</span>
          </button>
        </div>
      </form>

      {/* 3. Suggestions History - Clean line-separated list */}
      <div className="pt-8 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Pautas enviadas por você ({clientSuggestions.length})
        </h3>

        {clientSuggestions.length === 0 ? (
          <p className="text-xs text-slate-400">
            Nenhuma sugestão enviada recentemente. Preencha o formulário acima para sugerir sua primeira ideia.
          </p>
        ) : (
          <div className="divide-y divide-slate-200/80 dark:divide-slate-800">
            {clientSuggestions.map((sug) => (
              <div key={sug.id} className="py-4 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white">
                    {sug.title}
                  </h4>
                  <p className="text-xs text-slate-500 line-clamp-2">
                    {sug.briefingText || 'Ideia em análise pela equipe'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {sug.channel} • {sug.format || 'Post'} {sug.postDate ? `• Data: ${sug.postDate}` : ''}
                  </p>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    <Clock className="h-3 w-3 text-amber-500" />
                    <span>Em produção / análise</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
