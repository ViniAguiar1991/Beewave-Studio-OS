import React, { useEffect, useRef, useState } from 'react';
import { X, Check, Send, ImagePlus, Trash2 } from 'lucide-react';
import { Client, TaskFile } from '../../types';
import { compressImage } from '../../utils/imageCompressor';
import { Button } from '../ui';

export interface SuggestionDraft {
  idea: string;
  format: string;
  channel: string;
  date: string;
  links: string;
  /** Referências visuais anexadas pelo cliente. */
  images: TaskFile[];
}

const MAX_IMAGES = 4;

interface ClientSuggestionPanelProps {
  client: Client;
  open: boolean;
  onClose: () => void;
  onSubmit: (draft: SuggestionDraft) => void;
}

const FORMATS = ['Post único', 'Carrossel', 'Reels', 'Stories'];
const CHANNELS = ['Instagram', 'LinkedIn', 'TikTok', 'YouTube'];

/**
 * Sugerir pauta.
 *
 * Antes isto era uma aba na navegação principal — e uma aba morta: o componente
 * existia mas nunca era renderizado, então o cliente clicava e via tela branca.
 * Agora é o que sempre foi: uma ação, não um destino. Abre em painel sobre a
 * tela, resolve e fecha, sem tirar o cliente do lugar onde ele estava.
 */
export const ClientSuggestionPanel: React.FC<ClientSuggestionPanelProps> = ({
  client,
  open,
  onClose,
  onSubmit,
}) => {
  const emptyDraft: SuggestionDraft = {
    idea: '',
    format: 'Carrossel',
    channel: 'Instagram',
    date: '',
    links: '',
    images: [],
  };

  const [draft, setDraft] = useState<SuggestionDraft>(emptyDraft);
  const [sent, setSent] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isReadingImages, setIsReadingImages] = useState(false);
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setSent(false);
    const id = window.setTimeout(() => firstFieldRef.current?.focus(), 60);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = draft.idea.trim().length > 0;

  /**
   * As imagens são comprimidas antes de entrar no rascunho. Foto de celular
   * crua estoura o limite do localStorage e o teto de 1 MB por documento do
   * Firestore — e a referência visual não precisa de resolução original.
   */
  const handlePickImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files || []) as File[];
    e.target.value = '';
    if (picked.length === 0) return;

    setImageError(null);

    const room = MAX_IMAGES - draft.images.length;
    if (room <= 0) {
      setImageError(`Você já anexou ${MAX_IMAGES} imagens, o máximo por sugestão.`);
      return;
    }

    const naoImagem = picked.find((f) => !f.type.startsWith('image/'));
    if (naoImagem) {
      setImageError(
        `"${naoImagem.name}" não é uma imagem. Para documentos e vídeos, use a aba Arquivos.`
      );
      return;
    }

    setIsReadingImages(true);
    try {
      const compressed = await Promise.all(
        picked.slice(0, room).map(async (file) => ({
          id: `sugimg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: 'image/jpeg',
          dataUrl: await compressImage(file, 1280, 1280, 0.72),
          uploadedAt: new Date().toISOString(),
        }))
      );
      setDraft((d) => ({ ...d, images: [...d.images, ...compressed] }));
      if (picked.length > room) {
        setImageError(`Só couberam ${room} — o limite é ${MAX_IMAGES} imagens por sugestão.`);
      }
    } catch {
      setImageError('Não foi possível processar a imagem. Tente outro arquivo.');
    } finally {
      setIsReadingImages(false);
    }
  };

  const removeImage = (id: string) =>
    setDraft((d) => ({ ...d, images: d.images.filter((img) => img.id !== id) }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(draft);
    setSent(true);
    setDraft(emptyDraft);
    setImageError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggestion-title"
        className="relative w-full sm:max-w-[440px] h-full overflow-y-auto bg-white dark:bg-[#0f1114] border-l border-slate-200 dark:border-slate-800 shadow-2xl"
        style={{ animation: 'portal-fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 px-6 h-14 bg-white/95 dark:bg-[#0f1114]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800">
          <h2
            id="suggestion-title"
            className="font-display text-[18px] font-semibold tracking-tight text-slate-950 dark:text-white"
          >
            Sugerir uma pauta
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:text-slate-950 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="px-6 py-12 text-center">
            <span className="inline-grid h-11 w-11 place-items-center rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 mb-4">
              <Check className="h-5 w-5" />
            </span>
            <p className="t-lead font-medium text-slate-950 dark:text-white">
              Sugestão enviada
            </p>
            <p className="mt-2 t-body text-slate-600 dark:text-slate-400 leading-relaxed">
              A equipe da Beewave recebeu sua ideia e vai avaliar como encaixá-la no plano de
              conteúdo de {client.company}.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => setSent(false)}>
                Enviar outra
              </Button>
              <Button variant="primary" size="sm" onClick={onClose}>
                Fechar
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
            <div>
              <label htmlFor="sug-idea" className="block t-lead font-medium text-slate-900 dark:text-white">
                Qual é a ideia?
              </label>
              <p className="mt-1 t-meta text-slate-500 dark:text-slate-400">
                Descreva do seu jeito. A equipe cuida do roteiro e da arte.
              </p>
              <textarea
                id="sug-idea"
                ref={firstFieldRef}
                required
                rows={5}
                value={draft.idea}
                onChange={(e) => setDraft((d) => ({ ...d, idea: e.target.value }))}
                placeholder="Ex.: mostrar os bastidores da prova de vestido, com as noivas escolhendo o véu."
                className="mt-3 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-3 t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Formato" htmlFor="sug-format">
                <select
                  id="sug-format"
                  value={draft.format}
                  onChange={(e) => setDraft((d) => ({ ...d, format: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white cursor-pointer"
                >
                  {FORMATS.map((f) => (
                    <option key={f} value={f} className="dark:bg-slate-900">
                      {f}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Canal" htmlFor="sug-channel">
                <select
                  id="sug-channel"
                  value={draft.channel}
                  onChange={(e) => setDraft((d) => ({ ...d, channel: e.target.value }))}
                  className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white cursor-pointer"
                >
                  {CHANNELS.map((c) => (
                    <option key={c} value={c} className="dark:bg-slate-900">
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Data desejada" htmlFor="sug-date" hint="Opcional — a equipe confirma se cabe no calendário.">
              <input
                id="sug-date"
                type="date"
                value={draft.date}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 t-ui text-slate-900 dark:text-white focus:outline-none focus:border-slate-900 dark:focus:border-white cursor-pointer"
              />
            </Field>

            <Field
              label="Fotos de referência"
              htmlFor="sug-images"
              hint={`Opcional — até ${MAX_IMAGES} imagens. Um print, uma foto do produto, uma ideia que você viu.`}
            >
              {draft.images.length > 0 && (
                <ul className="flex flex-wrap gap-2.5 mb-3">
                  {draft.images.map((img) => (
                    <li key={img.id} className="relative group">
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="h-20 w-20 rounded-lg object-cover border border-slate-200 dark:border-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img.id)}
                        aria-label={`Remover ${img.name}`}
                        className="absolute -top-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-slate-950 text-white border-2 border-white dark:border-[#0f1114] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={ImagePlus}
                pending={isReadingImages}
                pendingLabel="Preparando imagem…"
                disabled={draft.images.length >= MAX_IMAGES}
                onClick={() => fileInputRef.current?.click()}
              >
                {draft.images.length === 0 ? 'Anexar foto' : 'Anexar outra'}
              </Button>

              <input
                ref={fileInputRef}
                id="sug-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePickImages}
                className="hidden"
                tabIndex={-1}
              />

              {imageError && (
                <p role="alert" className="t-meta text-rose-700 dark:text-rose-400 mt-2.5">
                  {imageError}
                </p>
              )}
            </Field>

            <Field label="Links e referências" htmlFor="sug-links" hint="Opcional — posts ou vídeos que te inspiraram.">
              <textarea
                id="sug-links"
                rows={3}
                value={draft.links}
                onChange={(e) => setDraft((d) => ({ ...d, links: e.target.value }))}
                placeholder="Cole aqui um ou mais links, um por linha."
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent p-3 t-ui text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-900 dark:focus:border-white transition-colors"
              />
            </Field>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={onClose}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit" icon={Send} disabled={!canSubmit}>
                Enviar sugestão
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

const Field: React.FC<{
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, htmlFor, hint, children }) => (
  <div>
    <label htmlFor={htmlFor} className="block t-lead font-medium text-slate-900 dark:text-white">
      {label}
    </label>
    {hint && <p className="mt-1 t-meta text-slate-500 dark:text-slate-400">{hint}</p>}
    <div className="mt-2.5">{children}</div>
  </div>
);
