import {
  db,
  doc,
  collection,
  query,
  where,
  getDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  getCountFromServer,
} from '../firebase';
import { Task, TaskFile } from '../types';
import {
  saveFileToLocalDb,
  getFileFromLocalDb,
  deleteFileFromLocalDb,
  temArquivoNoLocalDb,
  lerArquivoDoLocalDb,
} from '../utils/fileStorageDb';
import { isCloudSyncDisabled } from './firestoreSync';
import { rastrearEnvio } from './statusNuvem';

const CHUNK_SIZE = 550000; // ~550KB per chunk, well below Firestore's 1MB limit

/**
 * Pedaços por lote de gravação. Uma requisição ao Firestore aceita até
 * 10 MB; 14 × 550 KB ≈ 7,7 MB deixa folga.
 */
const PEDACOS_POR_LOTE = 14;

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
 * O que fazia a arte "corromper" a cada atualização não era a atualização:
 * era a arte que nunca tinha chegado inteira na nuvem. Quem enviou continuava
 * vendo (cópia local); qualquer outro computador, ou a mesma pessoa depois de
 * recarregar em outra máquina, via a arte quebrada. Auditoria de 15/09: 24 de
 * 62 artes estavam incompletas no Firestore.
 *
 * Três causas, três correções:
 *   - Envio pedaço por pedaço, esperando cada um: se a cota acabava ou a aba
 *     fechava no meio, sobrava metade. Agora a arte vai num lote atômico —
 *     chega inteira ou não chega — e o lote entra na fila do navegador na
 *     hora, então fechar a aba não perde nada.
 *   - Reparo só acontecia quando quem enviou abria uma tela com aquela arte.
 *     Agora, ao abrir o app, todas as artes deste navegador são conferidas e
 *     as incompletas sobem de novo, em segundo plano.
 *   - Quem via a arte quebrada ficava com ela quebrada até recarregar. Agora a
 *     tela escuta o cabeçalho da arte e mostra sozinha quando ela completar.
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * Artes já conferidas como inteiras na nuvem
 *
 * O conteúdo de uma arte nunca muda com o mesmo id, então a conferência vale
 * para sempre e fica guardada no navegador. Sem isso, cada abertura do app
 * repetiria as leituras de todas as artes.
 * ------------------------------------------------------------------------- */
const CHAVE_CONFIRMADAS = 'beewave_artes_na_nuvem_v1';

const nuvemConfirmada: Set<string> = (() => {
  try {
    return new Set<string>(JSON.parse(localStorage.getItem(CHAVE_CONFIRMADAS) || '[]'));
  } catch {
    return new Set<string>();
  }
})();

const guardarConfirmadas = () => {
  try {
    localStorage.setItem(CHAVE_CONFIRMADAS, JSON.stringify([...nuvemConfirmada]));
  } catch {
    /* sem espaço: a conferência só não fica lembrada */
  }
};
const confirmar = (fileId: string) => {
  if (nuvemConfirmada.has(fileId)) return;
  nuvemConfirmada.add(fileId);
  guardarConfirmadas();
};
const desconfirmar = (fileId: string) => {
  if (!nuvemConfirmada.delete(fileId)) return;
  guardarConfirmadas();
};

/* ---------------------------------------------------------------------------
 * Envio
 * ------------------------------------------------------------------------- */

/**
 * Sobe a imagem para o IndexedDB e para o Firestore.
 *
 * Pedaços e cabeçalho vão juntos no mesmo lote (ou, numa arte enorme, em
 * lotes com o cabeçalho no último). O cabeçalho é a prova de que a arte está
 * completa: se ele existe, os pedaços existem.
 */
async function enviarArquivo(taskId: string, file: TaskFile): Promise<void> {
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
    const agora = new Date().toISOString();
    const lotes = [];

    for (let inicio = 0; inicio < totalChunks; inicio += PEDACOS_POR_LOTE) {
      const lote = writeBatch(db);
      const fim = Math.min(inicio + PEDACOS_POR_LOTE, totalChunks);
      for (let i = inicio; i < fim; i++) {
        lote.set(doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${file.id}_${i}`), {
          fileId: file.id,
          taskId,
          chunkIndex: i,
          totalChunks,
          data: dataUrl.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
          updatedAt: agora,
        });
      }
      if (fim === totalChunks) {
        lote.set(
          doc(db, COLLECTIONS.TASK_FILES, file.id),
          {
            fileId: file.id,
            taskId,
            name: file.name,
            type: file.type,
            size: file.size,
            totalChunks,
            totalChars: dataUrl.length,
            hasPayload: true,
            updatedAt: agora,
          },
          { merge: true }
        );
      }
      lotes.push(lote);
    }

    // Todos os lotes entram na fila do Firestore neste instante, na ordem —
    // o do cabeçalho por último. Esperar um por um (como antes) deixava os
    // seguintes fora da fila se a aba fechasse.
    await Promise.all(lotes.map((lote) => rastrearEnvio(lote.commit())));
    confirmar(file.id);
  } else if (file.url && !isCloudSyncDisabled()) {
    // Link externo (Drive, Figma): só o cabeçalho.
    const lote = writeBatch(db);
    lote.set(
      doc(db, COLLECTIONS.TASK_FILES, file.id),
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
    await rastrearEnvio(lote.commit());
    confirmar(file.id);
  }
}

/**
 * A arte está inteira na nuvem? Duas leituras: o cabeçalho e a contagem de
 * pedaços (sem baixar nenhum). Lança erro se não der para conferir.
 */
async function arteInteiraNaNuvem(
  fileId: string,
  totalChars?: number
): Promise<{ inteira: boolean; aCaminho?: boolean; taskId?: string }> {
  const header = await getDoc(doc(db, COLLECTIONS.TASK_FILES, fileId));
  // Cabeçalho com gravação pendente: a arte já está na fila deste navegador
  // (enviada numa sessão anterior, esperando internet ou cota). Subir de novo
  // só empilharia outra cópia na fila.
  if (header.metadata.hasPendingWrites) return { inteira: false, aCaminho: true };
  if (!header.exists()) return { inteira: false };
  const h = header.data();
  if (!h.hasPayload) return { inteira: false, taskId: h.taskId };
  if (totalChars && h.totalChars && h.totalChars !== totalChars) return { inteira: false, taskId: h.taskId };

  const contagem = await getCountFromServer(
    query(collection(db, COLLECTIONS.TASK_FILE_CHUNKS), where('fileId', '==', fileId))
  );
  return { inteira: contagem.data().count >= (h.totalChunks || 1), taskId: h.taskId };
}

/** Envios em andamento, para a mesma arte não subir duas vezes ao mesmo tempo. */
const enviando = new Map<string, Promise<void>>();

/**
 * Garante que a arte está inteira na nuvem, subindo só se faltar.
 *
 * `soSeConferir`: sem conseguir conferir (sem internet), não sobe. É o modo do
 * reparo em segundo plano, que passa por todas as artes do navegador — subir
 * tudo às cegas gastaria a cota inteira.
 */
export function garantirArquivoNaNuvem(
  taskId: string | undefined,
  file: TaskFile,
  opcoes: { soSeConferir?: boolean } = {}
): Promise<void> {
  if (!file?.id) return Promise.resolve();
  if (nuvemConfirmada.has(file.id)) return Promise.resolve();
  const emCurso = enviando.get(file.id);
  if (emCurso) return emCurso;

  const tarefa = (async () => {
    let idDaTarefa = taskId;
    const temConteudo = !!file.dataUrl && file.dataUrl.startsWith('data:');

    if (temConteudo && !isCloudSyncDisabled()) {
      try {
        const conferencia = await arteInteiraNaNuvem(file.id, file.dataUrl!.length);
        if (conferencia.aCaminho) return;
        idDaTarefa = idDaTarefa || conferencia.taskId;
        if (conferencia.inteira) {
          confirmar(file.id);
          await saveFileToLocalDb(file.id, file.dataUrl!, {
            name: file.name,
            type: file.type,
            size: file.size,
            taskId: idDaTarefa,
          });
          return;
        }
      } catch {
        if (opcoes.soSeConferir) return;
        // Envio do usuário: sem conseguir conferir, sobe. Melhor gastar
        // gravação que perder arte.
      }
    }

    if (!idDaTarefa) return;
    await enviarArquivo(idDaTarefa, file);
  })().finally(() => {
    if (enviando.get(file.id) === tarefa) enviando.delete(file.id);
  });

  enviando.set(file.id, tarefa);
  return tarefa;
}

/** Nome antigo, usado pelo upload do modal. Passa pela mesma conferência. */
export const uploadTaskFileToCloud = (taskId: string, file: TaskFile) =>
  garantirArquivoNaNuvem(taskId, file);

/**
 * Troca o conteúdo de uma arte mantendo o id — o "enviar de novo" de uma arte
 * que não chegou. Quem estiver com a tarefa aberta recebe a nova sozinho.
 */
export function reenviarArte(taskId: string, file: TaskFile): Promise<void> {
  if (!file?.id || !file.dataUrl?.startsWith('data:')) return Promise.resolve();
  desconfirmar(file.id);
  // Registrado como envio em andamento: a gravação da tarefa que vem logo
  // depois reconhece e não sobe a mesma arte uma segunda vez.
  const tarefa = enviarArquivo(taskId, file).finally(() => {
    if (enviando.get(file.id) === tarefa) enviando.delete(file.id);
  });
  enviando.set(file.id, tarefa);
  return tarefa;
}

/* ---------------------------------------------------------------------------
 * Reparo em segundo plano
 * ------------------------------------------------------------------------- */

let reparoIniciado = false;

/**
 * Confere todas as artes que existem neste navegador e sobe as incompletas.
 *
 * Roda uma vez por sessão, uma arte por vez. As que já foram conferidas em
 * outra sessão nem são lidas. É o que conserta, sem ninguém fazer nada, as
 * artes que ficaram pela metade na nuvem: basta quem enviou abrir o app.
 */
export async function repararArtesDesteNavegador(tarefas: Task[]): Promise<void> {
  if (reparoIniciado || isCloudSyncDisabled()) return;
  reparoIniciado = true;

  const pendentes: { taskId: string; file: TaskFile }[] = [];
  for (const t of tarefas) {
    for (const f of [...(t.files || []), ...(t.briefingFiles || [])]) {
      if (!f?.id || nuvemConfirmada.has(f.id)) continue;
      if (f.url && !f.dataUrl?.startsWith('data:')) continue; // link externo
      pendentes.push({ taskId: t.id, file: f });
    }
  }

  let reparadas = 0;
  for (const { taskId, file } of pendentes) {
    if (!(await temArquivoNoLocalDb(file.id))) continue;
    const dataUrl = await lerArquivoDoLocalDb(file.id);
    if (!dataUrl?.startsWith('data:')) continue;
    const antes = nuvemConfirmada.has(file.id);
    try {
      await garantirArquivoNaNuvem(taskId, { ...file, dataUrl }, { soSeConferir: true });
      if (!antes && nuvemConfirmada.has(file.id)) reparadas++;
    } catch (err) {
      console.warn(`Reparo de ${file.name} não terminou:`, err);
    }
  }
  if (pendentes.length) {
    console.info(`[BeeWave] Artes conferidas neste navegador: ${pendentes.length}; confirmadas agora: ${reparadas}.`);
  }
}

/* ---------------------------------------------------------------------------
 * Leitura
 * ------------------------------------------------------------------------- */

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

  confirmar(file.id);
  await saveFileToLocalDb(file.id, dataUrl, {
    name: file.name,
    type: file.type,
    size: file.size,
    taskId: header.taskId,
  });
  return dataUrl;
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
      if (!isCloudSyncDisabled()) {
        garantirArquivoNaNuvem(taskId, { ...file, dataUrl: local }, { soSeConferir: true }).catch((err) =>
          console.warn(`Não foi possível reparar ${file.name} na nuvem:`, err)
        );
      }
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
 * Avisa quando o cabeçalho da arte mudar — sinal de que ela acabou de chegar
 * inteira na nuvem. A primeira leitura é o ponto de partida e não conta.
 */
export function observarChegadaDaArte(fileId: string, aoChegar: () => void): () => void {
  if (!fileId || isCloudSyncDisabled()) return () => {};
  let marcaInicial: string | null | undefined;
  return onSnapshot(
    doc(db, COLLECTIONS.TASK_FILES, fileId),
    (snap) => {
      const marca = snap.exists() ? `${snap.data().updatedAt}|${snap.data().totalChars}` : null;
      if (marcaInicial === undefined) {
        marcaInicial = marca;
        return;
      }
      if (marca && marca !== marcaInicial) {
        marcaInicial = marca;
        aoChegar();
      }
    },
    () => {
      /* sem escuta, a arte aparece na próxima abertura */
    }
  );
}

/* ---------------------------------------------------------------------------
 * Exclusão
 * ------------------------------------------------------------------------- */

/**
 * Deletes a task file and all its chunks from Firestore and local cache
 */
export async function deleteTaskFileFromCloud(fileId: string, totalChunksEstimated = 20): Promise<void> {
  if (!fileId) return;
  await deleteFileFromLocalDb(fileId);
  desconfirmar(fileId);

  if (isCloudSyncDisabled()) return;

  try {
    // Apagava 20 pedaços às cegas — 21 gravações por arte, mesmo quando ela
    // tinha 1 pedaço. O cabeçalho diz quantos existem.
    let total = totalChunksEstimated;
    try {
      const header = await getDoc(doc(db, COLLECTIONS.TASK_FILES, fileId));
      if (header.exists()) total = header.data().hasPayload ? header.data().totalChunks || 1 : 0;
    } catch {
      /* sem cabeçalho legível, fica a estimativa */
    }
    await rastrearEnvio(deleteDoc(doc(db, COLLECTIONS.TASK_FILES, fileId)));
    await Promise.all(
      Array.from({ length: total }, (_, i) =>
        rastrearEnvio(deleteDoc(doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${fileId}_${i}`))).catch(() => {})
      )
    );
  } catch (err) {
    console.warn(`Error deleting file ${fileId} from Firestore:`, err);
  }
}
