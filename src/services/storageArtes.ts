/**
 * Artes no Cloud Storage.
 *
 * Antes cada imagem era fatiada em dezenas de documentos do banco: o envio
 * demorava, podia chegar pela metade — a arte "corrompida" — e enquanto isso
 * a tarefa ficava pendente. Aqui a arte sobe inteira, de uma vez, e o que vai
 * para o banco é só o endereço dela. Quem está com a tarefa aberta recebe esse
 * endereço na mesma hora, pelo mesmo caminho de qualquer outro campo.
 */
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from '../firebase';
import type { TaskFile } from '../types';
import { getFileFromLocalDb } from '../utils/fileStorageDb';

const storage = getStorage(app);

const EXTENSOES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/quicktime': 'mov',
  'application/pdf': 'pdf',
};

const extensao = (tipo?: string, nome?: string): string => {
  if (tipo && EXTENSOES[tipo]) return EXTENSOES[tipo];
  const doNome = (nome || '').split('.').pop();
  return doNome && doNome.length <= 5 ? doNome.toLowerCase() : 'bin';
};

/** Converte o dataUrl que o navegador já leu em bytes, sem ler o arquivo de novo. */
export const bytesDoDataUrl = (dataUrl: string): Blob | null => {
  const virgula = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || virgula < 0) return null;
  const tipo = dataUrl.slice(5, dataUrl.indexOf(';')) || 'application/octet-stream';
  const binario = atob(dataUrl.slice(virgula + 1));
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return new Blob([bytes], { type: tipo });
};

/**
 * Sobe a arte e devolve o endereço público dela.
 *
 * O caminho leva o id da tarefa e o id do arquivo, então reenviar a mesma arte
 * sobrescreve a anterior em vez de deixar lixo para trás.
 */
export const enviarArteParaStorage = async (
  taskId: string,
  file: TaskFile,
  conteudo: Blob,
): Promise<{ url: string; storagePath: string }> => {
  const storagePath = `artes/${taskId}/${file.id}.${extensao(file.type, file.name)}`;
  const alvo = ref(storage, storagePath);
  await uploadBytes(alvo, conteudo, {
    contentType: file.type || conteudo.type || 'application/octet-stream',
    // Sem isto o navegador abre a imagem em vez de baixar quando alguém clica
    // em "baixar"; com isto, os dois casos funcionam.
    contentDisposition: `inline; filename*=UTF-8''${encodeURIComponent(file.name || 'arte')}`,
  });
  const url = await getDownloadURL(alvo);
  return { url, storagePath };
};

/** Apaga a arte do Storage. Falha em silêncio: arte já removida não é problema. */
export const apagarArteDoStorage = async (storagePath?: string): Promise<void> => {
  if (!storagePath) return;
  try {
    await deleteObject(ref(storage, storagePath));
  } catch {
    /* já não estava lá */
  }
};

/**
 * Imagem que o portal mostra no lugar da arte (em produção, arquivo pesado).
 *
 * Vai com data no nome: trocar a imagem gera um endereço novo, e ninguém fica
 * vendo a anterior guardada no cache do navegador. Fica dentro de `artes/`
 * porque é a única pasta que as regras do Storage liberam.
 */
export const enviarImagemDoPortal = async (
  chave: 'emProducao' | 'arquivoPesado',
  arquivo: File,
): Promise<string> => {
  const storagePath = `artes/_portal/${chave}-${Date.now()}.${extensao(arquivo.type, arquivo.name)}`;
  const alvo = ref(storage, storagePath);
  await uploadBytes(alvo, arquivo, { contentType: arquivo.type || 'image/webp' });
  return getDownloadURL(alvo);
};

/* ----------------------------------------------------------------- reparo */

const subindo = new Set<string>();

/**
 * Garante que a arte esteja no Storage, subindo o que ainda só existe aqui.
 *
 * Usada quando a tarefa é gravada e algum arquivo continua sem endereço: arte
 * antiga, ou envio que falhou no meio. Sobe uma vez por arquivo — sem isto,
 * cada gravação da tarefa mandaria a imagem inteira de novo.
 */
export const garantirArteNoStorage = async (
  taskId: string,
  file: TaskFile,
): Promise<{ url: string; storagePath: string } | null> => {
  if (!file?.id || file.url || subindo.has(file.id)) return null;
  const dataUrl = file.dataUrl?.startsWith('data:')
    ? file.dataUrl
    : await getFileFromLocalDb(file.id);
  if (!dataUrl?.startsWith('data:')) return null;
  const conteudo = bytesDoDataUrl(dataUrl);
  if (!conteudo) return null;

  subindo.add(file.id);
  try {
    return await enviarArteParaStorage(taskId, file, conteudo);
  } finally {
    subindo.delete(file.id);
  }
};
