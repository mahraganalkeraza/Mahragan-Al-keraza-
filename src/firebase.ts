import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, deleteField, getDocFromServer, writeBatch, orderBy, limit, runTransaction, serverTimestamp, startAfter, getCountFromServer, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getDatabase, ref as rdbRef, set as rdbSet, onValue, onDisconnect, off, push, serverTimestamp as rdbServerTimestamp, get as rdbGet } from 'firebase/database';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfigJson from '../firebase-applet-config.json';

// Initialize Firebase SDK
export const firebaseApp = initializeApp(firebaseConfigJson);

if (typeof window !== 'undefined') {
  // Set to false by default so Firestore is tried first. 
  // It will switch to true automatically if a quota error is encountered.
  (window as any).firestoreQuotaExceeded = false;
}

// Initialize Firestore with persistent cache
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfigJson.firestoreDatabaseId);

export const firebaseConfig = firebaseConfigJson;


export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);
export const rdb = getDatabase(firebaseApp);

export const CURRENT_YEAR = '2026';

// Error handling spec for Firestore permissions
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function isQuotaError(error: any): boolean {
  if (!error) return false;
  const errMsg = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return errMsg.includes('quota') || 
         errMsg.includes('resource_exhausted') || 
         errMsg.includes('over_quota') || 
         errMsg.includes('billing') || 
         errMsg.includes('limit exceeded') ||
         errMsg.includes('exhausted');
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const isQuota = isQuotaError(error);
  
  if (isQuota && typeof window !== 'undefined') {
    (window as any).firestoreQuotaExceeded = true;
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  
  const serialized = JSON.stringify(errInfo);
  
  if (isQuota) {
    // Log as warning rather than error to keep the console cleaner if it's already expected/handled
    console.warn('Firestore Quota Exceeded for path:', path, '. Bypassing UI might be triggered.');
    // Stop propagation of this specific error to avoid crashing the whole app logic if we want to fallback
    return; 
  }

  console.error('Firestore Error caught: ', serialized);
  throw new Error(serialized);
}

// Supabase Import (assuming it exists based on previous turns)
import { supabase } from './lib/supabaseClient';

/**
 * Maps Firestore collection names to Supabase table names.
 */
function getSupabaseTable(firestoreCollection: string): string {
  const map: Record<string, string> = {
    'participants': 'registrations',
    'registrations': 'registrations',
    'news': 'news',
    'settings': 'settings',
    'churches': 'churches',
    'levels': 'levels',
    'activityStages': 'activityStages',
    'hymnStages': 'hymnStages'
  };
  return map[firestoreCollection] || firestoreCollection;
}

export async function getDocSafe(docRef: any) {
  if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
    console.warn("Firestore quota exceeded, bypassing to Supabase (getDocSafe)");
    const parts = docRef.path.split('/');
    const collectionName = parts[0];
    const id = parts[1];
    const table = getSupabaseTable(collectionName);
    
    const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
    if (error) throw error;
    return { 
      exists: () => !!data, 
      data: () => data,
      id: data?.id || id
    };
  }

  try {
    return await getDoc(docRef);
  } catch (error) {
    if (isQuotaError(error)) {
      (window as any).firestoreQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      const parts = docRef.path.split('/');
      const table = getSupabaseTable(parts[0]);
      const id = parts[1];
      const { data, error: sbError } = await supabase.from(table).select('*').eq('id', id).single();
      if (sbError) throw sbError;
      return { 
        exists: () => !!data, 
        data: () => data,
        id: data?.id || id
      };
    }
    throw error;
  }
}

export async function getDocsSafe(q: any) {
  if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
    console.warn("Firestore quota exceeded, bypassing (getDocsSafe)");
    // We throw here to trigger the catch block in the caller which usually has custom Supabase logic
    const error = new Error('Firestore Quota Exceeded');
    (error as any).code = 'resource-exhausted';
    throw error;
  }

  try {
    return await getDocs(q);
  } catch (error) {
    if (isQuotaError(error)) {
      (window as any).firestoreQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      throw error; // Throw so caller handles fallback
    }
    throw error;
  }
}

export async function getCountFromServerSafe(q: any) {
    if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
        return { data: () => ({ count: 0 }) };
    }
    try {
        return await getCountFromServer(q);
    } catch (error) {
        if (isQuotaError(error)) {
            (window as any).firestoreQuotaExceeded = true;
            window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
            return { data: () => ({ count: 0 }) };
        }
        throw error;
    }
}



// Global interceptors for unhandled database/quota errors
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason) {
      const msg = reason.message || reason.error || String(reason);
      const errorStr = String(msg).toLowerCase();
      if (errorStr.includes('quota') || errorStr.includes('resource_exhausted') || errorStr.includes('over_quota') || errorStr.includes('quota limit exceeded')) {
        (window as any).firestoreQuotaExceeded = true;
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
        event.preventDefault(); // Stop from logging as uncaught rejection
      }
    }
  });

  window.addEventListener('error', (event) => {
    const msg = event.message || String(event.error);
    const errorStr = String(msg).toLowerCase();
    if (errorStr.includes('quota') || errorStr.includes('resource_exhausted') || errorStr.includes('over_quota') || errorStr.includes('quota limit exceeded')) {
      (window as any).firestoreQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      event.preventDefault(); // Stop from logging as uncaught exception
    }
  });
}



// Wrapped onSnapshot to prevent quota exhaustion
const originalOnSnapshot = onSnapshot;
export const onSnapshotWrapped: typeof onSnapshot = (query, ...args) => {
  if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
    console.warn("Skipping onSnapshot due to detected quota exhaustion.");
    // Return a dummy unsubscribe function
    return () => {};
  }
  return originalOnSnapshot(query, ...(args as [any]));
};

export { 
  onAuthStateChanged, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshotWrapped as onSnapshot,
  query, 
  where, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  deleteField,
  writeBatch,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
  startAfter,
  getCountFromServerSafe as getCountFromServer,
  ref,
  uploadBytesResumable,
  getDownloadURL,
  getDatabase,
  rdbRef,
  rdbSet,
  onValue,
  onDisconnect,
  off,
  push,
  rdbServerTimestamp,
  rdbGet
};
