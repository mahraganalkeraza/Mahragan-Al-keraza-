import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, addDoc, updateDoc, deleteDoc, deleteField, getDocFromServer, writeBatch, orderBy, limit, runTransaction, serverTimestamp, startAfter, getCountFromServer } from 'firebase/firestore';
import { getDatabase, ref as rdbRef, set as rdbSet, onValue, onDisconnect, off, push, serverTimestamp as rdbServerTimestamp, get as rdbGet } from 'firebase/database';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Import the Firebase configuration
import firebaseConfigJson from '../firebase-applet-config.json';

// Initialize Firebase SDK
export const firebaseApp = initializeApp(firebaseConfigJson);
export const db = getFirestore(firebaseApp, firebaseConfigJson.firestoreDatabaseId);

export const firebaseConfig = firebaseConfigJson;


enableIndexedDbPersistence(db).catch((err) => {
  if (err.code == 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code == 'unimplemented') {
    console.warn('The current browser does not support all of the features required to enable persistence');
  }
});

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

  const errMsg = errInfo.error.toLowerCase();
  const isQuota = errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('over_quota') || errMsg.includes('billing') || errMsg.includes('limit exceeded') || errMsg.includes('capacity');
  if (isQuota) {
    if (typeof window !== 'undefined') {
      (window as any).firestoreQuotaExceeded = true;
      window.dispatchEvent(new CustomEvent('firestore-quota-exceeded', { detail: errInfo }));
    }
    console.warn(`[Quota Non-Blocking Warn] Blocked throwing crashing error on Firebase Quota Limit for operation: ${operationType} on path: ${path}`);
    return;
  }

  throw new Error(serialized);
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
  onSnapshot, 
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
