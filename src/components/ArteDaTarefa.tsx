import React from 'react';
import { ImageOff } from 'lucide-react';
import { TaskFile } from '../types';
import { useTaskFileSrc } from '../hooks/useTaskFileSrc';
import { PostImage } from './ui';

/**
 * Arte que o app sabe exibir como imagem ou vídeo.
 *
 * Link externo não entra. Um endereço do Google Drive aponta para uma
 * página, não para um arquivo de imagem — posto num <img> ele sempre
 * aparece quebrado. Link só conta como arte se terminar em extensão de
 * imagem.
 */
export const ehArteExibivel = (f: Partial<TaskFile> | undefined) =>
  !!f &&
  f.type !== 'link' &&
  ((f.type || '').startsWith('image/') ||
    (f.type || '').startsWith('video/') ||
    (f.dataUrl || '').startsWith('data:image') ||
    (f.dataUrl || '').startsWith('data:video') ||
    (!!f.url && /\.(png|jpe?g|gif|webp|avif|svg)(\?|#|$)/i.test(f.url)));

/**
 * Imagem de uma tarefa, carregada de onde ela estiver.
 *
 * Todo lugar que mostra arte usa este componente, em vez de ler
 * `file.dataUrl` direto: é a leitura direta que fazia a arte sumir depois de
 * recarregar. Enquanto busca, mostra um bloco neutro do mesmo tamanho; se a
 * arte não existe em lugar nenhum, diz isso em vez de desenhar quebrado.
 */
export const ArteDaTarefa: React.FC<{
  file: TaskFile | undefined;
  taskId?: string;
  alt?: string;
  className?: string;
  /** Tamanho pequeno troca o aviso de indisponível por só um ícone. */
  compacta?: boolean;
  onLoadSrc?: (src: string | null) => void;
}> = ({ file, taskId, alt = '', className = '', compacta = false, onLoadSrc }) => {
  const { src, carregando, indisponivel } = useTaskFileSrc(file, taskId);

  React.useEffect(() => {
    if (!carregando) onLoadSrc?.(src);
  }, [src, carregando, onLoadSrc]);

  if (carregando) {
    return (
      <span
        aria-hidden="true"
        className={`block bg-slate-100 dark:bg-slate-800 animate-pulse ${className}`}
      />
    );
  }

  if (indisponivel || !src) {
    return (
      <span
        role="img"
        aria-label={`${file?.name || 'Arte'} ainda não chegou`}
        title="Esta arte ainda não chegou inteira na nuvem. Ela aparece sozinha quando quem enviou abrir o app; se não aparecer, envie de novo na tarefa."
        className={`grid place-items-center bg-slate-100 dark:bg-slate-800 text-slate-400 ${className}`}
      >
        <span className="flex flex-col items-center gap-1 px-2 text-center">
          <ImageOff className={compacta ? 'h-3.5 w-3.5' : 'h-5 w-5'} />
          {!compacta && <span className="t-meta">Arte ainda não chegou</span>}
        </span>
      </span>
    );
  }

  if ((file?.type || '').startsWith('video/') || src.startsWith('data:video')) {
    return <video src={src} className={className} muted playsInline />;
  }

  return <img src={src} alt={alt} className={className} draggable={false} />;
};

/**
 * Versão para o portal: mesmo carregamento, com o visual do PostImage
 * (brilho enquanto busca, esmaecer ao aparecer).
 */
export const PostArte: React.FC<{
  file: TaskFile | undefined;
  taskId?: string;
  alt: string;
  className?: string;
}> = ({ file, taskId, alt, className }) => {
  const { src, carregando, indisponivel } = useTaskFileSrc(file, taskId);
  return (
    <PostImage
      src={src}
      alt={alt}
      className={className}
      carregando={carregando}
      indisponivel={indisponivel}
    />
  );
};
