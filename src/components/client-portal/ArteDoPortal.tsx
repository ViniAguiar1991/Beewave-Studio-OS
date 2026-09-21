import React from 'react';
import { PostArte } from '../ArteDaTarefa';
import { useAppStore } from '../../store';
import type { Task, TaskFile } from '../../types';

/** Imagens padrão, trocáveis em Configurações → Marca. */
export const IMAGEM_PADRAO = {
  emProducao: '/arte-em-producao.webp',
  arquivoPesado: '/arquivo-pesado.webp',
} as const;

/**
 * A arte como o cliente vê.
 *
 * Três casos, nesta ordem: a arte enviada; a arte grande demais, que vai por
 * link (aviso de arquivo pesado); e a pauta ainda sem arte, só planejada
 * (aviso de que está em produção). Nunca um bloco vazio ou um texto solto.
 */
export const ArteDoPortal: React.FC<{
  task: Task;
  file: TaskFile | undefined;
  className?: string;
  /** Classe da imagem em si; sem ela, a arte ocupa a largura toda. */
  imgClassName?: string;
}> = ({ task, file, className = '', imgClassName }) => {
  const imagens = useAppStore((s) => s.imagensPortal);

  if (file) {
    return (
      <PostArte
        file={file}
        taskId={task.id}
        alt={task.title}
        className={className}
        manterProporcao
        imgClassName={imgClassName}
      />
    );
  }

  const pesado = !!task.driveLink;
  const src = pesado
    ? imagens.arquivoPesado || IMAGEM_PADRAO.arquivoPesado
    : imagens.emProducao || IMAGEM_PADRAO.emProducao;

  return (
    <img
      src={src}
      alt={
        pesado
          ? 'O arquivo ficou pesado. Visualize a arte ou vídeo pelo link.'
          : 'A arte ainda está sendo produzida. Verifique mais tarde.'
      }
      className={imgClassName || `w-full h-auto object-contain ${className}`}
    />
  );
};
