import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  Firestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with robust multi-tab persistent cache
export const db: Firestore = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
}, firebaseConfig.firestoreDatabaseId || '(default)');

// Initialize Auth
export const auth = getAuth(app);

// Collection Names
export const COLLECTIONS = {
  CLIENTS: 'clients',
  TASKS: 'tasks',
  USERS: 'users',
  PLANS: 'plans',
  CATEGORIES: 'categories',
  STATUSES: 'statuses',
  NOTES: 'notes',
  PROMPT_FOLDERS: 'promptFolders',
  PROMPTS: 'prompts',
  CUSTOM_TABS: 'customTabs',
  APP_CONFIG: 'appConfig',
} as const;

export {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
};
