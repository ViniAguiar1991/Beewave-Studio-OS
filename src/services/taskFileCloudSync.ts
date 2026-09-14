import {
  db,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
} from '../firebase';
import { TaskFile } from '../types';
import { saveFileToLocalDb, getFileFromLocalDb, deleteFileFromLocalDb } from '../utils/fileStorageDb';
import { isCloudSyncDisabled } from './firestoreSync';

const CHUNK_SIZE = 550000; // ~550KB per chunk, well below Firestore's 1MB limit

const COLLECTIONS = {
  TASK_FILES: 'task_files',
  TASK_FILE_CHUNKS: 'task_file_chunks',
} as const;

/* ============================================================================
 * Arquivos de tarefa: onde a imagem mora de verdade.
 *
 * A imagem inteira nunca fica no localStorage — ele tem ~5 MB para o app todo
 * e estoura com meia dúzia de artes. Ela mora em dois lugares:
 *
 *   1. IndexedDB deste navegador, para abrir na hora;
 *   2. Firestore, fatiada em pedaços de ~550 KB, para chegar em qualquer
 *      máquina e sobreviver a limpar o navegador.
 *
 * O que estava quebrado era a volta. Subir funcionava; baixar, nada chamava.
 * Quando a cópia da memória se perdia — a cada recarga depois de um deploy,
 * por exemplo — a arte aparecia vazia mesmo inteira na nuvem.
 * ========================================================================== */

/**
 * Sobe a imagem para o IndexedDB e para o Firestore.
 *
 * Ordem importa: pedaços primeiro, cabeçalho por último. O cabeçalho passa a
 * ser a prova de que o upload terminou. Antes ele era gravado primeiro, e
 * quando a cota de escrita estourava no meio, ficava um cabeçalho apontando
 * para pedaços que nunca chegaram — 19 artes ficaram assim.
 */
export async function uploadTaskFileToCloud(taskId: string, file: TaskFile): Promise<void> {
  if (!file || !file.id) return;

  if (file.dataUrl && file.dataUrl.startsWith('data:')) {
    // O cache local vale mesmo com a nuvem desligada: é o que faz a arte
    // reaparecer na hora depois de recarregar.
    await saveFileToLocalDb(file.id, file.dataUrl, {
      name: file.name,
      type: file.type,
      size: file.size,
      taskId,
    });

    if (isCloudSyncDisabled()) return;

    const dataUrl = file.dataUrl;
    const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const chunkRef = doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${file.id}_${i}`);
      await setDoc(chunkRef, {
        fileId: file.id,
        taskId,
        chunkIndex: i,
        totalChunks,
        data: dataUrl.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
        updatedAt: new Date().toISOString(),
      });
    }

    const fileHeaderRef = doc(db, COLLECTIONS.TASK_FILES, file.id);
    await setDoc(
      fileHeaderRef,
      {
        fileId: file.id,
        taskId,
        name: file.name,
        type: file.type,
        size: file.size,
        totalChunks,
        totalChars: dataUrl.length,
        hasPayload: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    nuvemConfirmada.add(file.id);
  } else if (file.url && !isCloudSyncDisabled()) {
    // Link externo (Drive, Figma): só o cabeçalho.
    const fileHeaderRef = doc(db, COLLECTIONS.TASK_FILES, file.id);
    await setDoc(
      fileHeaderRef,
      {
        fileId: file.id,
        taskId,
        name: file.name,
        type: file.type || 'link',
        url: file.url,
        hasPayload: false,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }
}

/** Arquivos cuja cópia na nuvem já foi conferida nesta sessão. */
const nuvemConfirmada = new Set<string>();

/** Leituras em andamento, para duas telas pedindo a mesma arte baixarem uma vez só. */
const emAndamento = new Map<string, Promise<string | null>>();

/**
 * Busca os pedaços no Firestore e remonta a imagem.
 *
 * Só devolve se TODOS os pedaços chegaram. A versão anterior concatenava o
 * que existisse e devolvia mesmo faltando pedaço — uma imagem truncada, que
 * o navegador desenha quebrada. Melhor não mostrar do que mostrar corrompido.
 */
async function baixarDaNuvem(file: TaskFile): Promise<string | null> {
  const headerSnap = await getDoc(doc(db, COLLECTIONS.TASK_FILES, file.id));
  if (!headerSnap.exists()) return null;

  const header = headerSnap.data();
  if (!header.hasPayload) return null;

  const totalChunks = header.totalChunks || 1;
  const snaps = await Promise.all(
    Array.from({ length: totalChunks }, (_, i) =>
      getDoc(doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${file.id}_${i}`))
    )
  );

  if (snaps.some((s) => !s.exists())) return null;

  const dataUrl = snaps.map((s) => s.data()?.data || '').join('');
  if (!dataUrl.startsWith('data:')) return null;
  if (header.totalChars && dataUrl.length !== header.totalChars) return null;

  nuvemConfirmada.add(file.id);
  await saveFileToLocalDb(file.id, dataUrl, {
    name: file.name,
    type: file.type,
    size: file.size,
    taskId: header.taskId,
  });
  return dataUrl;
}

/**
 * Conserta a nuvem a partir da cópia local.
 *
 * Quando a arte existe no IndexedDB mas a nuvem está incompleta (upload
 * interrompido pela cota), sobe de novo. Roda uma vez por arquivo por sessão
 * e em segundo plano: quem abriu a tela não espera por isso.
 */
async function repararNuvem(file: TaskFile, dataUrl: string, taskId?: string) {
  if (isCloudSyncDisabled() || nuvemConfirmada.has(file.id)) return;
  nuvemConfirmada.add(file.id);

  try {
    const header = await getDoc(doc(db, COLLECTIONS.TASK_FILES, file.id));
    const total = header.exists() ? header.data().totalChunks || 1 : 0;
    const ultimo = total
      ? await getDoc(doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${file.id}_${total - 1}`))
      : null;

    const completa = !!ultimo?.exists();
    if (completa) return;

    const idDaTarefa = taskId || (header.exists() ? header.data().taskId : '');
    if (!idDaTarefa) return;

    await uploadTaskFileToCloud(idDaTarefa, { ...file, dataUrl });
  } catch (err) {
    // Se falhar (cota de novo), libera para tentar na próxima sessão.
    nuvemConfirmada.delete(file.id);
    console.warn(`Não foi possível reparar ${file.name} na nuvem:`, err);
  }
}

/**
 * Devolve a imagem da tarefa, de onde ela estiver.
 *
 * Memória → IndexedDB → Firestore. Achando localmente, confere a nuvem em
 * segundo plano e repara se precisar.
 */
export async function loadTaskFileDataUrl(file: TaskFile, taskId?: string): Promise<string | null> {
  if (!file || !file.id) return null;

  if (file.dataUrl && file.dataUrl.startsWith('data:') && file.dataUrl.length > 50) {
    return file.dataUrl;
  }

  const pendente = emAndamento.get(file.id);
  if (pendente) return pendente;

  const busca = (async () => {
    const local = await getFileFromLocalDb(file.id);
    if (local && local.startsWith('data:')) {
      void repararNuvem(file, local, taskId);
      return local;
    }

    try {
      return await baixarDaNuvem(file);
    } catch (err) {
      console.error(`Erro ao carregar ${file.name} da nuvem:`, err);
      return null;
    }
  })();

  emAndamento.set(file.id, busca);
  try {
    return await busca;
  } finally {
    emAndamento.delete(file.id);
  }
}

/**
 * Deletes a task file and all its chunks from Firestore and local cache
 */
export async function deleteTaskFileFromCloud(fileId: string, totalChunksEstimated = 20): Promise<void> {
  if (!fileId) return;
  await deleteFileFromLocalDb(fileId);
  nuvemConfirmada.delete(fileId);

  if (isCloudSyncDisabled()) return;

  try {
    await deleteDoc(doc(db, COLLECTIONS.TASK_FILES, fileId));
    await Promise.all(
      Array.from({ length: totalChunksEstimated }, (_, i) =>
        deleteDoc(doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${fileId}_${i}`)).catch(() => {})
      )
    );
  } catch (err) {
    console.warn(`Error deleting file ${fileId} from Firestore:`, err);
  }
}
