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

/**
 * Saves a single high-resolution uncompressed task file to Firestore with chunking.
 * Also persists it to local IndexedDB for instant zero-latency access.
 */
export async function uploadTaskFileToCloud(taskId: string, file: TaskFile): Promise<void> {
  if (isCloudSyncDisabled()) return;
  if (!file || !file.id) return;

  // If file has dataUrl, store it
  if (file.dataUrl && file.dataUrl.startsWith('data:')) {
    // 1. Cache to local IndexedDB first
    await saveFileToLocalDb(file.id, file.dataUrl, {
      name: file.name,
      type: file.type,
      size: file.size,
      taskId,
    });

    // 2. Chunk dataUrl for Firestore cloud storage
    try {
      const dataUrl = file.dataUrl;
      const totalChars = dataUrl.length;
      const totalChunks = Math.ceil(totalChars / CHUNK_SIZE);

      // Save file header
      const fileHeaderRef = doc(db, COLLECTIONS.TASK_FILES, file.id);
      await setDoc(fileHeaderRef, {
        fileId: file.id,
        taskId,
        name: file.name,
        type: file.type,
        size: file.size,
        totalChunks,
        hasPayload: true,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      // Save chunks
      for (let i = 0; i < totalChunks; i++) {
        const chunkStart = i * CHUNK_SIZE;
        const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, totalChars);
        const chunkData = dataUrl.substring(chunkStart, chunkEnd);

        const chunkRef = doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${file.id}_${i}`);
        await setDoc(chunkRef, {
          fileId: file.id,
          taskId,
          chunkIndex: i,
          totalChunks,
          data: chunkData,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error(`Error uploading uncompressed file ${file.name} to Firestore:`, err);
    }
  } else if (file.url) {
    // For external links (e.g. Google Drive, Figma)
    try {
      const fileHeaderRef = doc(db, COLLECTIONS.TASK_FILES, file.id);
      await setDoc(fileHeaderRef, {
        fileId: file.id,
        taskId,
        name: file.name,
        type: file.type || 'link',
        url: file.url,
        hasPayload: false,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.error(`Error saving link ${file.name} to Firestore:`, err);
    }
  }
}

/**
 * Loads a task file's original dataUrl.
 * First checks memory/IndexedDB. If not found, fetches chunks from Firestore and reconstructs it.
 */
export async function loadTaskFileDataUrl(file: TaskFile): Promise<string | null> {
  if (!file || !file.id) return null;

  // 1. If already in file object
  if (file.dataUrl && file.dataUrl.length > 50) {
    return file.dataUrl;
  }

  // 2. Check local IndexedDB
  const localCached = await getFileFromLocalDb(file.id);
  if (localCached && localCached.length > 50) {
    return localCached;
  }

  // 3. Fetch from Firestore chunks
  try {
    const fileHeaderRef = doc(db, COLLECTIONS.TASK_FILES, file.id);
    const headerSnap = await getDoc(fileHeaderRef);

    if (!headerSnap.exists()) {
      return null;
    }

    const header = headerSnap.data();
    const totalChunks = header.totalChunks || 1;
    const chunkPromises: Promise<any>[] = [];

    for (let i = 0; i < totalChunks; i++) {
      const chunkRef = doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${file.id}_${i}`);
      chunkPromises.push(getDoc(chunkRef));
    }

    const chunkSnaps = await Promise.all(chunkPromises);
    let reconstructedDataUrl = '';

    for (let i = 0; i < chunkSnaps.length; i++) {
      const snap = chunkSnaps[i];
      if (snap.exists()) {
        const chunkDoc = snap.data();
        reconstructedDataUrl += chunkDoc.data || '';
      }
    }

    if (reconstructedDataUrl && reconstructedDataUrl.startsWith('data:')) {
      // Cache in IndexedDB for subsequent zero-delay loads
      await saveFileToLocalDb(file.id, reconstructedDataUrl, {
        name: file.name,
        type: file.type,
        size: file.size,
        taskId: header.taskId,
      });
      return reconstructedDataUrl;
    }
  } catch (err) {
    console.error(`Error loading cloud file ${file.name} (${file.id}):`, err);
  }

  return null;
}

/**
 * Deletes a task file and all its chunks from Firestore and local cache
 */
export async function deleteTaskFileFromCloud(fileId: string, totalChunksEstimated = 20): Promise<void> {
  if (isCloudSyncDisabled()) return;
  if (!fileId) return;

  await deleteFileFromLocalDb(fileId);

  try {
    const fileHeaderRef = doc(db, COLLECTIONS.TASK_FILES, fileId);
    await deleteDoc(fileHeaderRef);

    // Delete chunks
    const deletePromises: Promise<any>[] = [];
    for (let i = 0; i < totalChunksEstimated; i++) {
      const chunkRef = doc(db, COLLECTIONS.TASK_FILE_CHUNKS, `${fileId}_${i}`);
      deletePromises.push(deleteDoc(chunkRef).catch(() => {}));
    }
    await Promise.all(deletePromises);
  } catch (err) {
    console.warn(`Error deleting file ${fileId} from Firestore:`, err);
  }
}
