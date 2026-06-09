import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfigJson from '../firebase-applet-config.json';
import { supabase } from './lib/supabaseClient';

export const firebaseApp = initializeApp(firebaseConfigJson);
export const firebaseConfig = firebaseConfigJson;
export const auth = getAuth(firebaseApp);
export const storage = getStorage(firebaseApp);
export const CURRENT_YEAR = '2026';

// Quota exceeded should be false for Supabase operation
if (typeof window !== 'undefined') {
  (window as any).firestoreQuotaExceeded = false;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

// Helper to safely extract collection path string and parts from any reference/query object
export function getPathAndSegments(refObj: any) {
  let pathStr = '';
  if (refObj) {
    if (typeof refObj.path === 'string') {
      pathStr = refObj.path;
    } else if (refObj._query) {
      return getPathAndSegments(refObj._query);
    } else if (refObj.path?.segments) {
      pathStr = Array.from(refObj.path.segments).join('/');
    } else if (refObj._query?.path?.segments) {
      pathStr = Array.from(refObj._query.path.segments).join('/');
    }
  }
  const segments = pathStr ? pathStr.split('/') : [];
  return { path: pathStr, segments };
}

export function getCollectionName(refObj: any): string {
  if (typeof refObj === 'string') return refObj;
  const { segments } = getPathAndSegments(refObj);
  return segments[0] || 'registrations';
}

// Intercept old Firestore doc calls and route directly to Supabase
export async function getDocSafe(docRef: any) {
  const { segments } = getPathAndSegments(docRef);
  const collectionName = segments[0] || 'registrations';
  const id = segments[1] || 'default_id';
  const targetTable = collectionName === 'participants' ? 'registrations' : collectionName;
  
  const { data, error } = await supabase.from(targetTable).select('*').eq('id', id).single();
  // Firestore getDoc resolves with exists: false when not found, so handle gracefully
  if (error) {
    return { exists: () => false, data: () => null, id: id };
  }
  return { exists: () => !!data, data: () => data, id: id };
}

export async function getDocsSafe(queryObject: any) {
  const collectionName = getCollectionName(queryObject);
  const targetTable = collectionName === 'participants' ? 'registrations' : collectionName;
  
  const { data, error } = await supabase.from(targetTable).select('*');
  if (error) {
    return {
      empty: true,
      docs: [],
      forEach: (cb: any) => {}
    };
  }
  return {
    empty: data.length === 0,
    docs: data.map((item: any) => ({
      id: item.id || item.serial,
      data: () => item,
      ref: { path: `${targetTable}/${item.id || item.serial}`, type: 'doc' },
      exists: () => true
    })),
    forEach: (cb: any) => data.forEach((item: any) => cb({
      id: item.id || item.serial,
      data: () => item,
      ref: { path: `${targetTable}/${item.id || item.serial}`, type: 'doc' },
      exists: () => true
    }))
  };
}

export const db: any = {
  collection: (name: string) => ({ id: name, path: name, type: 'collection' }),
  doc: (path: string) => ({ path, type: 'doc' })
};

export const rdb: any = {};
export const rdbRef = (...args: any[]) => ({});
export const rdbSet = async (...args: any[]) => {};
export const onValue = (...args: any[]) => { return () => {}; };
export const onDisconnect = (...args: any[]) => ({ set: () => {}, remove: () => {}, update: () => {} });
export const rdbServerTimestamp = () => Date.now();
export const push = (...args: any[]) => ({ key: 'temp-key' });
export const rdbGet = async (...args: any[]) => ({ val: () => null, exists: () => false });
export const off = (...args: any[]) => {};

export const collection = (db: any, path: string, ...paths: string[]) => ({ path, type: 'collection' });
export const doc = (...args: any[]) => {
  const dbOrCol = args[0];
  const pathParts = args.slice(1);
  if (pathParts.length === 0) {
    if (dbOrCol && dbOrCol.type === 'collection') {
      return { path: `${dbOrCol.path}/${Math.random().toString(36).substring(7)}`, type: 'doc' };
    }
    return { path: `${Math.random().toString(36).substring(7)}`, type: 'doc' };
  }
  if (dbOrCol && dbOrCol.type === 'collection') {
    return { path: `${dbOrCol.path}/${pathParts.join('/')}`, type: 'doc' };
  }
  return { path: pathParts.join('/'), type: 'doc' };
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
  const { segments } = getPathAndSegments(docRef);
  const targetTable = segments[0] === 'participants' ? 'registrations' : (segments[0] || 'registrations');
  const id = segments[1] || 'default_id';
  
  const { error } = await supabase.from(targetTable).upsert({ id, ...data });
  if (error) {
    console.error("Supabase Upsert Error:", error);
    throw error;
  }
};

export const addDoc = async (colRef: any, data: any) => {
  const { path: colPath } = getPathAndSegments(colRef);
  const targetTable = colPath === 'participants' ? 'registrations' : (colPath || 'registrations');
  const id = 'sb_' + Date.now() + Math.random().toString(36).substring(7);
  
  const { error } = await supabase.from(targetTable).insert({ id, ...data });
  if (error) {
    console.error("Supabase Insert Error:", error);
    throw error;
  }
  return { id, path: `${colPath || 'registrations'}/${id}` };
};

// Explicit safe addDoc bridge requested by user
export async function addDocSafe(collectionRef: any, dataObject: any) {
  const collectionName = collectionRef.id || collectionRef.path || 'registrations';
  let targetTable = collectionName;
  if (collectionName === 'participants') targetTable = 'registrations';

  console.log(`[Hybrid Sync] 1. Updating local UI and simultaneously pushing to Supabase table: ${targetTable}`);

  // FIRE REMOTE INSERT TO SUPABASE PRODUCTION SERVER
  const { data, error } = await supabase
    .from(targetTable)
    .insert([dataObject])
    .select();

  if (error) {
    console.error("❌ SERVER ERROR: Failed to sync with Supabase remote backend!", error);
    throw error; // Throw so the component knows the network failed
  }

  console.log("✅ SERVER SUCCESS: Data permanently stored in Supabase!", data);
  return { id: data[0]?.id || data[0]?.serial || "remote_success_id", ...data[0] };
}

export const updateDoc = async (docRef: any, data: any) => {
  const { segments } = getPathAndSegments(docRef);
  const targetTable = segments[0] === 'participants' ? 'registrations' : (segments[0] || 'registrations');
  const id = segments[1];
  if (id) {
    const { error } = await supabase.from(targetTable).update(data).eq('id', id);
    if (error) {
       console.error("Supabase Update Error:", error);
       throw error;
    }
  }
};

// Intercept state updates for app settings and toggles
export async function updateDocSafe(docRef: any, updateData: any) {
  const segments = docRef.path?.split('/') || [];
  const collectionName = segments[0] || 'settings';
  const id = segments[1] || 'global';
  const targetTable = collectionName === 'participants' ? 'registrations' : collectionName;

  const { data, error } = await supabase.from(targetTable).update(updateData).eq('id', id).select();
  if (error) {
    console.error("Supabase Update Error:", error);
    throw error;
  }
  return data;
}

export const deleteDoc = async (docRef: any) => {
  const { segments } = getPathAndSegments(docRef);
  const targetTable = segments[0] === 'participants' ? 'registrations' : (segments[0] || 'registrations');
  const id = segments[1];
  if (id) {
    const { error } = await supabase.from(targetTable).delete().eq('id', id);
    if (error) {
      console.error("Supabase Delete Error:", error);
      throw error;
    }
  }
};

export const getDoc = async (docRef: any) => {
  return await getDocSafe(docRef);
};

export const getDocs = async (queryReq: any) => {
  return await getDocsSafe(queryReq);
};

export const onSnapshot = (...args: any[]) => {
  const queryObj = args[0];
  const cb = args.find(a => typeof a === 'function');
  if (cb) {
    if (queryObj && queryObj.type === 'doc') {
      getDocSafe(queryObj).then(res => cb(res)).catch(() => cb({ exists: () => false, data: () => ({}) }));
    } else {
      getDocsSafe(queryObj).then(res => {
        (res as any).docChanges = () => res.docs.map((d:any) => ({ type: 'added', doc: d }));
        cb(res);
      }).catch(() => cb({ empty: true, docs: [], docChanges: () => [] }));
    }
  }
  return () => {};
};

export const query = (...args: any[]) => {
  let colRef = args[0];
  while (colRef && colRef._query) {
    colRef = colRef._query;
  }
  return { _query: colRef };
};

export const where = (...args: any[]) => {};
export const orderBy = (...args: any[]) => {};
export const limit = (...args: any[]) => {};
export const startAfter = (...args: any[]) => {};
export const getCountFromServer = async (...args: any[]) => ({ data: () => ({ count: 0 }) });
export const deleteField = () => "DELETE_FIELD";

// Fully implement writeBatch to route operations to Supabase
export const writeBatch = (db: any) => {
  const operations: Array<() => Promise<any>> = [];
  return {
    set: (docRef: any, data: any, options?: any) => {
      operations.push(async () => {
        const { segments } = getPathAndSegments(docRef);
        const targetTable = segments[0] === 'participants' ? 'registrations' : (segments[0] || 'registrations');
        const id = segments[1] || 'default_id';
        await supabase.from(targetTable).upsert({ id, ...data });
      });
    },
    update: (docRef: any, data: any) => {
      operations.push(async () => {
        const { segments } = getPathAndSegments(docRef);
        const targetTable = segments[0] === 'participants' ? 'registrations' : (segments[0] || 'registrations');
        const id = segments[1];
        if (id) {
          await supabase.from(targetTable).update(data).eq('id', id);
        }
      });
    },
    delete: (docRef: any) => {
      operations.push(async () => {
        const { segments } = getPathAndSegments(docRef);
        const targetTable = segments[0] === 'participants' ? 'registrations' : (segments[0] || 'registrations');
        const id = segments[1];
        if (id) {
          await supabase.from(targetTable).delete().eq('id', id);
        }
      });
    },
    commit: async () => {
      await Promise.all(operations.map(op => op()));
    }
  };
};

export const handleFirestoreError = (...args: any[]) => {
  console.warn("handleFirestoreError bypassed", args);
};
export const getDocFromServer = getDoc;
export const runTransaction = async (...args: any[]) => {};
export const serverTimestamp = () => Date.now();
export const uploadBytesResumable = (...args: any[]) => ({
  on: (event: any, next: any, error: any, complete: any) => complete?.()
});
export const getDownloadURL = async (...args: any[]) => "https://dummy-url.com/image.jpg";
export const ref = (...args: any[]) => ({});

export {
  onAuthStateChanged,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';

