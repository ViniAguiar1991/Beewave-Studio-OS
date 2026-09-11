import {
  db,
  COLLECTIONS,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
} from '../firebase';
import { useAppStore } from '../store';
import { Client, Task, User, Category, TaskStatus, NoteItem, PromptItem, AdminSystemPrompts, TaskLiveEditing, TableViewConfig, TaskView, CustomProperty } from '../types';
import { uploadTaskFileToCloud, deleteTaskFileFromCloud } from './taskFileCloudSync';

let isListening = false;
let isSyncingToCloud = false;

/**
 * Trava de desenvolvimento.
 *
 * Com VITE_DISABLE_CLOUD_SYNC=true em .env.local, nada sai desta máquina para
 * o Firestore de produção: nem os listeners, nem as gravações avulsas que as
 * ações da store disparam por conta própria (syncTaskToCloud e companhia são
 * chamadas direto de dentro da store, fora do initFirestoreSync).
 *
 * Sem essa trava, rodar `npm run dev` e clicar em "Aprovar" altera a base real
 * dos clientes.
 */
export const isCloudSyncDisabled = (): boolean =>
  import.meta.env?.VITE_DISABLE_CLOUD_SYNC === 'true';

/**
 * Recursively cleans objects/arrays so Firestore never throws 'Unsupported field value: undefined'
 */
export function sanitizeForFirestore(val: any): any {
  if (val === undefined) return null;
  if (val === null || typeof val !== 'object') return val;
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeForFirestore(item));
  }
  const cleanObj: Record<string, any> = {};
  for (const key of Object.keys(val)) {
    const v = val[key];
    if (v !== undefined) {
      cleanObj[key] = sanitizeForFirestore(v);
    }
  }
  return cleanObj;
}

/**
 * Initializes real-time two-way synchronization between Firestore and local Zustand store.
 * - Subscribes to Firestore collections (users, clients, tasks, notes)
 * - Updates local store when cloud changes occur
 * - Provides initial seed of default data if cloud database is empty
 */
export function initFirestoreSync() {
  if (isCloudSyncDisabled()) return;
  if (isListening) return;
  isListening = true;

  try {
    // 1. Listen to Users collection (Colaboradores, Admins, Clientes)
    const usersCol = collection(db, COLLECTIONS.USERS);
    onSnapshot(usersCol, (snapshot) => {
      if (snapshot.empty && !isSyncingToCloud) {
        // If empty on cloud, seed local default users to cloud
        seedInitialUsersToCloud();
        return;
      }
      const users: User[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as any;
        if (raw) {
          users.push({ id: docSnap.id, ...raw } as User);
        }
      });
      if (users.length > 0) {
        useAppStore.setState({ users });
      }
    }, (error) => {
      console.warn('Firestore users listener note:', error.message);
    });

    // 2. Listen to Clients collection
    const clientsCol = collection(db, COLLECTIONS.CLIENTS);
    onSnapshot(clientsCol, (snapshot) => {
      if (snapshot.empty && !isSyncingToCloud) {
        // If empty on cloud, seed local default clients to cloud
        seedInitialClientsToCloud();
        return;
      }
      const clients: Client[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as any;
        if (raw) {
          clients.push({ id: docSnap.id, ...raw } as Client);
        }
      });
      if (clients.length > 0) {
        useAppStore.setState({ clients });
      }
    }, (error) => {
      console.warn('Firestore clients listener note:', error.message);
    });

    // 3. Listen to Tasks collection (Real-time updates between all users)
    const tasksCol = collection(db, COLLECTIONS.TASKS);
    onSnapshot(tasksCol, (snapshot) => {
      if (snapshot.empty && !isSyncingToCloud) {
        // If empty on cloud, seed local default tasks
        seedInitialTasksToCloud();
        return;
      }
      const existingTasks = useAppStore.getState().tasks;
      const tasks: Task[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as any;
        if (raw) {
          const localMatch = existingTasks.find((et) => et.id === docSnap.id);
          // Preserve any in-memory dataUrls already loaded for files
          const mergedFiles = (raw.files || []).map((rf: any) => {
            const localFile = localMatch?.files?.find((lf) => lf.id === rf.id);
            return {
              ...rf,
              dataUrl: localFile?.dataUrl || rf.dataUrl || '',
            };
          });
          const t: Task = {
            id: docSnap.id,
            ...raw,
            files: mergedFiles,
          };

          // Quem tem o carimbo mais novo ganha.
          //
          // Antes a nuvem sobrescrevia a memória sem comparar nada. Quando
          // uma escrita falhava — cota diária estourada, rede caída — o
          // snapshot seguinte devolvia a versão velha e desfazia a alteração
          // em silêncio. Era o cronômetro que voltava a correr depois de
          // pausado, e era também qualquer outra edição perdida sem aviso.
          const localAt = Date.parse(localMatch?.updatedAt || '');
          const cloudAt = Date.parse(raw.updatedAt || '');
          const localEhMaisNovo =
            !!localMatch && !Number.isNaN(localAt) && (Number.isNaN(cloudAt) || localAt > cloudAt);

          tasks.push(localEhMaisNovo ? { ...localMatch, files: mergedFiles } : t);
        }
      });
      if (tasks.length > 0) {
        // Tasks with dates first (chronological), tasks without date at the end of queue
        tasks.sort((a, b) => {
          const dateA = a.postDate;
          const dateB = b.postDate;
          if (!dateA && !dateB) {
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          }
          if (!dateA) return 1;
          if (!dateB) return -1;
          return dateA.localeCompare(dateB);
        });
        useAppStore.setState({ tasks });
      }
    }, (error) => {
      console.warn('Firestore tasks listener note:', error.message);
    });

    // 4. Listen to Notes collection
    const notesCol = collection(db, COLLECTIONS.NOTES);
    onSnapshot(notesCol, (snapshot) => {
      if (!snapshot.empty) {
        const notes: NoteItem[] = [];
        snapshot.forEach((docSnap) => {
          const raw = docSnap.data() as any;
          if (raw) {
            notes.push({ id: docSnap.id, ...raw } as NoteItem);
          }
        });
        useAppStore.setState({ notes });
      }
    }, (error) => {
      console.warn('Firestore notes listener note:', error.message);
    });

    // 5. Listen to Admin System Prompts & Global Settings
    const adminPromptsDocRef = doc(db, COLLECTIONS.APP_CONFIG, 'adminPrompts');
    onSnapshot(adminPromptsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudPrompts = docSnap.data() as AdminSystemPrompts;
        if (cloudPrompts && (cloudPrompts.headlinePrompt || cloudPrompts.copyCaptionPrompt)) {
          useAppStore.setState((state) => ({
            adminPrompts: {
              ...state.adminPrompts,
              ...cloudPrompts,
            },
          }));
        }
      } else if (!isSyncingToCloud) {
        // Seed default or local admin prompts to Firestore
        const currentPrompts = useAppStore.getState().adminPrompts;
        if (currentPrompts) {
          syncAdminPromptsToCloud(currentPrompts);
        }
      }
    }, (error) => {
      console.warn('Firestore adminPrompts listener note:', error.message);
    });

    // 5a. Mascote compartilhado
    const brandingDocRef = doc(db, COLLECTIONS.APP_CONFIG, 'branding');
    onSnapshot(brandingDocRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const dados = docSnap.data() as { mascotImages?: string[] };
      if (Array.isArray(dados?.mascotImages)) {
        useAppStore.setState({ mascotImages: dados.mascotImages });
      }
    }, (error) => {
      console.warn('Listener do mascote:', error.message);
    });

    // 5b. Visões da Central de Tarefas publicadas para a equipe
    const taskViewsDocRef = doc(db, COLLECTIONS.APP_CONFIG, 'taskViews');
    onSnapshot(taskViewsDocRef, (docSnap) => {
      if (!docSnap.exists()) return;
      const dados = docSnap.data() as {
        taskViews?: TaskView[];
        customProperties?: CustomProperty[];
      };
      if (!dados?.taskViews?.length) return;

      useAppStore.setState((state) => {
        const publicadas = dados.taskViews || [];
        // Visões que a pessoa criou e ainda não publicou continuam na máquina
        // dela: receber a configuração da equipe não pode apagar rascunho.
        const locaisNaoPublicadas = state.taskViews.filter(
          (v) => !v.isShared && !publicadas.some((p) => p.id === v.id)
        );
        const todas = [...publicadas, ...locaisNaoPublicadas];
        return {
          taskViews: todas,
          customProperties: dados.customProperties || state.customProperties,
          activeViewId: todas.some((v) => v.id === state.activeViewId)
            ? state.activeViewId
            : todas[0]?.id || '',
          viewsDirty: false,
        };
      });
    }, (error) => {
      console.warn('Listener de visões:', error.message);
    });

    // 6. Listen to App Configuration (Agency, Categories, Plans, Statuses)
    const agencyConfigDocRef = doc(db, COLLECTIONS.APP_CONFIG, 'agencyConfig');
    onSnapshot(agencyConfigDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const config = docSnap.data();
        if (config) {
          useAppStore.setState((state) => ({
            agencyName: config.agencyName || state.agencyName,
            categories: config.categories?.length ? config.categories : state.categories,
            plans: config.plans?.length ? config.plans : state.plans,
            statuses: config.statuses?.length ? config.statuses : state.statuses,
            newsNiches: config.newsNiches?.length ? config.newsNiches : state.newsNiches,
            promptFolders: config.promptFolders?.length ? config.promptFolders : state.promptFolders,
            prompts: config.prompts?.length ? config.prompts : state.prompts,
          }));
        }
      }
    }, (error) => {
      console.warn('Firestore agencyConfig listener note:', error.message);
    });

    // 7. Listen to Shared Table View Configuration (Admin custom columns & widths)
    const tableViewConfigDocRef = doc(db, COLLECTIONS.APP_CONFIG, 'tableViewConfig');
    onSnapshot(tableViewConfigDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const config = docSnap.data() as TableViewConfig;
        if (config && Array.isArray(config.visibleColumnIds)) {
          useAppStore.setState({ tableViewConfig: config });
        }
      }
    }, (error) => {
      console.warn('Firestore tableViewConfig listener note:', error.message);
    });

    // Update cloud sync status
    useAppStore.setState((s) => ({
      cloudSync: {
        ...s.cloudSync,
        enabled: true,
        connected: true,
        lastSync: new Date().toISOString(),
        backupCount: (s.cloudSync.backupCount || 0) + 1,
      },
    }));
  } catch (err) {
    console.error('Error initializing Firestore sync:', err);
  }
}

/**
 * Saves Admin Table View Configuration (Visible columns, order, and column widths) to Firestore
 */
export async function syncTableViewConfigToCloud(config: TableViewConfig) {
  if (isCloudSyncDisabled()) return;
  try {
    const configRef = doc(db, COLLECTIONS.APP_CONFIG, 'tableViewConfig');
    const cleanData = sanitizeForFirestore({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(configRef, cleanData, { merge: true });
    useAppStore.setState({ tableViewConfig: config });
    return true;
  } catch (err) {
    console.error('Error saving tableViewConfig to Firestore:', err);
    return false;
  }
}


/**
 * Saves Admin System Prompts directly to Firestore
 */
/**
 * Publica as visões da Central de Tarefas para toda a equipe.
 *
 * Visão, regra de cor e coluna personalizada nascem no navegador de quem
 * criou. Enquanto ficam só lá, cada pessoa monta as suas e ninguém vê o
 * trabalho do outro — por isso existe a publicação explícita.
 */
export async function publishTaskViewsToCloud(
  taskViews: TaskView[],
  customProperties: CustomProperty[],
  publishedBy: string
) {
  if (isCloudSyncDisabled()) return;
  try {
    const ref = doc(db, COLLECTIONS.APP_CONFIG, 'taskViews');
    await setDoc(
      ref,
      sanitizeForFirestore({
        taskViews,
        customProperties,
        publishedBy,
        publishedAt: new Date().toISOString(),
      }),
      { merge: true }
    );
  } catch (err) {
    console.error('Erro ao publicar visões:', err);
    throw err;
  }
}

/**
 * Publica as poses do mascote para toda a equipe.
 *
 * Documento próprio, e não junto do agencyConfig: são imagens em base64 e o
 * limite do Firestore é 1 MB por documento — misturá-las com o resto da
 * configuração derrubaria as duas coisas de uma vez.
 */
export async function syncMascotToCloud(mascotImages: string[]) {
  if (isCloudSyncDisabled()) return;
  const ref = doc(db, COLLECTIONS.APP_CONFIG, 'branding');
  await setDoc(ref, sanitizeForFirestore({ mascotImages }), { merge: true });
}

export async function syncAdminPromptsToCloud(prompts: AdminSystemPrompts) {
  if (isCloudSyncDisabled()) return;
  if (!prompts) return;
  try {
    const promptsRef = doc(db, COLLECTIONS.APP_CONFIG, 'adminPrompts');
    const cleanData = sanitizeForFirestore({
      ...prompts,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(promptsRef, cleanData, { merge: true });
  } catch (err) {
    console.error('Error saving adminPrompts to Firestore:', err);
  }
}

/**
 * Saves Agency Configuration (Categories, Plans, Statuses) directly to Firestore
 */
export async function syncAgencyConfigToCloud(config: Record<string, any>) {
  if (isCloudSyncDisabled()) return;
  try {
    const configRef = doc(db, COLLECTIONS.APP_CONFIG, 'agencyConfig');
    const cleanData = sanitizeForFirestore({
      ...config,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(configRef, cleanData, { merge: true });
  } catch (err) {
    console.error('Error saving agencyConfig to Firestore:', err);
  }
}

/**
 * Saves Prompts and Prompt Folders directly to Firestore
 */
export async function syncPromptsConfigToCloud(promptFolders: any[], prompts: any[]) {
  if (isCloudSyncDisabled()) return;
  try {
    const configRef = doc(db, COLLECTIONS.APP_CONFIG, 'agencyConfig');
    const cleanData = sanitizeForFirestore({
      promptFolders,
      prompts,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(configRef, cleanData, { merge: true });
  } catch (err) {
    console.error('Error saving prompts to Firestore:', err);
  }
}

/**
 * Saves or updates a single user directly in Firestore
 */
export async function syncUserToCloud(user: User) {
  if (isCloudSyncDisabled()) return;
  if (!user.id) return;
  try {
    const userRef = doc(db, COLLECTIONS.USERS, user.id);
    const cleanData = sanitizeForFirestore({
      ...user,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(userRef, cleanData, { merge: true });
  } catch (err) {
    console.error(`Error saving user ${user.id} to Firestore:`, err);
  }
}

/**
 * Deletes a single user from Firestore
 */
export async function deleteUserFromCloud(userId: string) {
  if (isCloudSyncDisabled()) return;
  if (!userId) return;
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    await deleteDoc(userRef);
  } catch (err) {
    console.error(`Error deleting user ${userId} from Firestore:`, err);
  }
}

/**
 * Saves or updates a single task directly in Firestore
 */
export async function syncTaskToCloud(task: Task) {
  if (isCloudSyncDisabled()) return;
  if (!task.id) return;
  try {
    const taskRef = doc(db, COLLECTIONS.TASKS, task.id);

    // If task has files with high-res dataUrls, upload files to Firestore task_files in chunks
    // and strip large dataUrl from the main document to ensure it stays well under the 1MB Firestore limit
    const sanitizedFiles = (task.files || []).map((file) => {
      if (file.dataUrl && file.dataUrl.length > 50) {
        // Upload uncompressed file payload in background
        uploadTaskFileToCloud(task.id, file).catch((err) =>
          console.warn(`Background chunk upload error for ${file.name}:`, err)
        );
      }
      return {
        id: file.id,
        name: file.name,
        type: file.type || 'image/jpeg',
        size: file.size || 0,
        url: file.url || null,
        uploadedAt: file.uploadedAt || new Date().toISOString(),
        // Keep small icons/SVGs in doc, omit large base64 strings so main doc is < 5KB
        dataUrl: file.dataUrl && file.dataUrl.length < 35000 ? file.dataUrl : '',
      };
    });

    const sanitizedBriefingFiles = (task.briefingFiles || []).map((file) => {
      if (file.dataUrl && file.dataUrl.length > 50) {
        uploadTaskFileToCloud(task.id, file).catch((err) =>
          console.warn(`Background chunk upload error for briefing file ${file.name}:`, err)
        );
      }
      return {
        id: file.id,
        name: file.name,
        type: file.type || 'application/octet-stream',
        size: file.size || 0,
        url: file.url || null,
        uploadedAt: file.uploadedAt || new Date().toISOString(),
        dataUrl: file.dataUrl && file.dataUrl.length < 35000 ? file.dataUrl : '',
      };
    });

    const cleanData = sanitizeForFirestore({
      ...task,
      files: sanitizedFiles,
      briefingFiles: sanitizedBriefingFiles,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(taskRef, cleanData, { merge: true });
  } catch (err) {
    console.error(`Error saving task ${task.id} to Firestore:`, err);
  }
}

/**
 * Updates live editing status for a task in Firestore in real time
 */
export async function syncTaskLiveEditingToCloud(taskId: string, editingBy: TaskLiveEditing | null) {
  if (isCloudSyncDisabled()) return;
  if (!taskId) return;
  try {
    const taskRef = doc(db, COLLECTIONS.TASKS, taskId);
    await setDoc(
      taskRef,
      {
        editingBy: editingBy ? sanitizeForFirestore(editingBy) : null,
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`Error updating live editing for task ${taskId}:`, err);
  }
}

/**
 * Deletes a single task from Firestore and its file chunks
 */
export async function deleteTaskFromCloud(taskId: string) {
  if (isCloudSyncDisabled()) return;
  if (!taskId) return;
  try {
    const task = useAppStore.getState().tasks.find((t) => t.id === taskId);
    if (task?.files) {
      task.files.forEach((f) => {
        deleteTaskFileFromCloud(f.id).catch(() => {});
      });
    }
    const taskRef = doc(db, COLLECTIONS.TASKS, taskId);
    await deleteDoc(taskRef);
  } catch (err) {
    console.error(`Error deleting task ${taskId} from Firestore:`, err);
  }
}

/**
 * Saves or updates a single client directly in Firestore
 */
export async function syncClientToCloud(client: Client) {
  if (isCloudSyncDisabled()) return;
  if (!client.id) return;
  try {
    const clientRef = doc(db, COLLECTIONS.CLIENTS, client.id);
    const cleanData = sanitizeForFirestore({
      ...client,
      updatedAt: new Date().toISOString(),
    });
    await setDoc(clientRef, cleanData, { merge: true });
  } catch (err) {
    console.error(`Error saving client ${client.id} to Firestore:`, err);
  }
}

/**
 * Deletes a single client from Firestore
 */
export async function deleteClientFromCloud(clientId: string) {
  if (isCloudSyncDisabled()) return;
  if (!clientId) return;
  try {
    const clientRef = doc(db, COLLECTIONS.CLIENTS, clientId);
    await deleteDoc(clientRef);
  } catch (err) {
    console.error(`Error deleting client ${clientId} from Firestore:`, err);
  }
}

/**
 * Pushes all current local store data to Firestore as a cloud backup and sync point
 */
export async function pushFullStoreToCloud(): Promise<boolean> {
  if (isCloudSyncDisabled()) return false;
  isSyncingToCloud = true;
  const state = useAppStore.getState();
  try {
    // 1. Sync Users
    for (const user of state.users) {
      const ref = doc(db, COLLECTIONS.USERS, user.id);
      await setDoc(ref, sanitizeForFirestore(user), { merge: true });
    }

    // 2. Sync Clients
    for (const client of state.clients) {
      const ref = doc(db, COLLECTIONS.CLIENTS, client.id);
      await setDoc(ref, sanitizeForFirestore(client), { merge: true });
    }

    // 3. Sync Tasks
    for (const task of state.tasks) {
      const ref = doc(db, COLLECTIONS.TASKS, task.id);
      await setDoc(ref, sanitizeForFirestore(task), { merge: true });
    }

    // 4. Sync Notes
    for (const note of state.notes) {
      const ref = doc(db, COLLECTIONS.NOTES, note.id);
      await setDoc(ref, sanitizeForFirestore(note), { merge: true });
    }

    // 5. Sync Admin Prompts & Agency Settings
    if (state.adminPrompts) {
      const promptsRef = doc(db, COLLECTIONS.APP_CONFIG, 'adminPrompts');
      await setDoc(promptsRef, sanitizeForFirestore(state.adminPrompts), { merge: true });
    }

    const agencyRef = doc(db, COLLECTIONS.APP_CONFIG, 'agencyConfig');
    await setDoc(
      agencyRef,
      sanitizeForFirestore({
        agencyName: state.agencyName,
        categories: state.categories,
        plans: state.plans,
        statuses: state.statuses,
        newsNiches: state.newsNiches,
      }),
      { merge: true }
    );

    // Update cloud sync state
    useAppStore.setState((s) => ({
      cloudSync: {
        ...s.cloudSync,
        enabled: true,
        connected: true,
        lastSync: new Date().toISOString(),
        backupCount: (s.cloudSync.backupCount || 0) + 1,
      },
    }));

    return true;
  } catch (err) {
    console.error('Error pushing full store to Firestore:', err);
    return false;
  } finally {
    isSyncingToCloud = false;
  }
}

async function seedInitialUsersToCloud() {
  if (isCloudSyncDisabled()) return;
  const state = useAppStore.getState();
  if (!state.users || state.users.length === 0) return;
  isSyncingToCloud = true;
  try {
    for (const user of state.users) {
      const ref = doc(db, COLLECTIONS.USERS, user.id);
      await setDoc(ref, sanitizeForFirestore(user), { merge: true });
    }
  } catch (err) {
    console.error('Error seeding users:', err);
  } finally {
    isSyncingToCloud = false;
  }
}

async function seedInitialClientsToCloud() {
  if (isCloudSyncDisabled()) return;
  const state = useAppStore.getState();
  if (!state.clients || state.clients.length === 0) return;
  isSyncingToCloud = true;
  try {
    for (const client of state.clients) {
      const ref = doc(db, COLLECTIONS.CLIENTS, client.id);
      await setDoc(ref, sanitizeForFirestore(client), { merge: true });
    }
  } catch (err) {
    console.error('Error seeding clients:', err);
  } finally {
    isSyncingToCloud = false;
  }
}

async function seedInitialTasksToCloud() {
  if (isCloudSyncDisabled()) return;
  const state = useAppStore.getState();
  if (!state.tasks || state.tasks.length === 0) return;
  isSyncingToCloud = true;
  try {
    for (const task of state.tasks) {
      const ref = doc(db, COLLECTIONS.TASKS, task.id);
      await setDoc(ref, sanitizeForFirestore(task), { merge: true });
    }
  } catch (err) {
    console.error('Error seeding tasks:', err);
  } finally {
    isSyncingToCloud = false;
  }
}
