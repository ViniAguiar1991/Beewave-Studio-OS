import { useEffect, useState } from 'react';
import { TaskFile } from '../types';
import { loadTaskFileDataUrl, observarChegadaDaArte } from '../services/taskFileCloudSync';

/**
 * Artes já carregadas nesta sessão, para trocar de tela sem piscar.
 * Só guarda o que achou: "não achei" guardado aqui deixava a arte quebrada
 * até recarregar, mesmo depois de ela chegar na nuvem.
 */
const resolvidos = new Map<string, string>();

/** Esquece a arte carregada — usado quando ela é substituída. */
export const esquecerArte = (fileId: string) => resolvidos.delete(fileId);

/** Arquivo que é imagem ou vídeo guardado pelo app, não link externo. */
export const ehMidiaGuardada = (f: Partial<TaskFile> | undefined) =>
  !!f?.id && (f.dataUrl?.startsWith('data:') || !f.url);

/**
 * Endereço para exibir a arte de uma tarefa.
 *
 * Devolve na hora o que já estiver à mão (dataUrl na memória ou link
 * externo) e, se não houver, busca no IndexedDB e depois no Firestore.
 *
 * Existe porque a lista de tarefas e o portal liam só `file.dataUrl` — que
 * some do localStorage por falta de espaço. A arte continuava inteira no
 * banco local e na nuvem, mas ninguém ia buscar.
 */
export function useTaskFileSrc(file: TaskFile | undefined | null, taskId?: string) {
  const imediato =
    file?.dataUrl && file.dataUrl.length > 50
      ? file.dataUrl
      : file && file.url && !file.dataUrl?.startsWith('data:')
        ? file.url
        : file?.id
          ? resolvidos.get(file.id) ?? null
          : null;

  const [src, setSrc] = useState<string | null>(imediato);
  const [carregando, setCarregando] = useState(!imediato && !!file?.id);

  useEffect(() => {
    if (!file?.id) {
      setSrc(null);
      setCarregando(false);
      return;
    }
    if (imediato) {
      setSrc(imediato);
      setCarregando(false);
      return;
    }

    let vivo = true;
    let pararDeObservar: (() => void) | null = null;

    const carregar = (primeira: boolean) => {
      if (primeira) setCarregando(true);
      loadTaskFileDataUrl(file, taskId).then((url) => {
        if (url) resolvidos.set(file.id, url);
        if (!vivo) return;
        if (url || primeira) {
          setSrc(url);
          setCarregando(false);
        }
        if (url) {
          pararDeObservar?.();
          pararDeObservar = null;
        } else if (!pararDeObservar) {
          // Não chegou ainda: fica escutando e mostra assim que completar.
          pararDeObservar = observarChegadaDaArte(file.id, () => carregar(false));
        }
      });
    };
    carregar(true);

    return () => {
      vivo = false;
      pararDeObservar?.();
    };
    // O id identifica a arte; mudar outros campos não exige buscar de novo.
  }, [file?.id, imediato, taskId]);

  return { src, carregando, indisponivel: !carregando && !src && !!file?.id };
}
