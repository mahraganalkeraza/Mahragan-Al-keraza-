import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, deleteField, getDocFromServer, writeBatch, orderBy, limit, runTransaction, serverTimestamp, startAfter, getCountFromServer, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getDatabase, ref as rdbRef, set as rdbSet, onValue, onDisconnect, off, push, serverTimestamp as rdbServerTimestamp, get as rdbGet } from 'firebase/database';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfigJson from '../firebase-applet-config.json';

// Initialize Firebase SDK
export const firebaseApp = initializeApp(firebaseConfigJson);

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
  return errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('over_quota') || errMsg.includes('billing') || errMsg.includes('limit exceeded');
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  console.warn('Firestore Error caught: ', serialized);

  if (isQuotaError(errInfo.error)) {
    if (typeof window !== 'undefined') {
      (window as any).firestoreQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: errInfo }));
    }
    console.error('Firestore Quota Exceeded. Logging error but NOT throwing.');
    return;
  }

  throw new Error(serialized);
}

// Supabase Import (assuming it exists based on previous turns)
import { supabase } from './lib/supabaseClient';

export async function getDocSafe(docRef: any) {
  if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
    console.warn("Firestore quota exceeded, bypassing to Supabase (getDocSafe)");
    // Fallback logic - this assumes the docRef has a path like "collection/id"
    const [collectionName, id] = docRef.path.split('/');
    const { data, error } = await supabase.from(collectionName).select('*').eq('id', id).single();
    if (error) throw error;
    return { exists: () => !!data, data: () => data };
  }

  try {
    return await getDoc(docRef);
  } catch (error) {
    if (isQuotaError(error)) {
      (window as any).firestoreQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      const [collectionName, id] = docRef.path.split('/');
      const { data, error: sbError } = await supabase.from(collectionName).select('*').eq('id', id).single();
      if (sbError) throw sbError;
      return { exists: () => !!data, data: () => data };
    }
    throw error;
  }
}

export async function getDocsSafe(q: any) {
  if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
    console.warn("Firestore quota exceeded, bypassing to Supabase (getDocsSafe)");
    return { docs: [] };
  }

  try {
    return await getDocs(q);
  } catch (error) {
    if (isQuotaError(error)) {
      (window as any).firestoreQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      return { docs: [], empty: true };
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

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

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
  getCountFromServer,
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
