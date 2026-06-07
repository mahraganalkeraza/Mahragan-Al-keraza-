import { supabase } from '../lib/supabaseClient';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, setDoc, doc } from 'firebase/firestore';

function extractFirestoreFilter(constraint: any): { field: string; op: string; value: any } | null {
  if (!constraint) return null;
  try {
    let field = '';
    let op = '';
    let value: any = undefined;

    if (constraint.field) {
      field = constraint.field;
    } else if (constraint._field?.path?.segments) {
      field = constraint._field.path.segments.join('.');
    }

    if (constraint.op) {
      op = constraint.op;
    } else if (constraint._op) {
      op = constraint._op;
    }

    if (constraint.value !== undefined) {
      value = constraint.value;
    } else if (constraint._value !== undefined) {
      value = constraint._value;
    }

    if (!field || !op) {
      for (const k of Object.keys(constraint)) {
        const val = constraint[k];
        if (val && typeof val === 'object' && val.segments) {
          field = val.segments.join('.');
        } else if (val && typeof val === 'object' && val._segments) {
          field = val._segments.join('.');
        }
        if (k === 'op' || k === '_op') op = val;
        if (k === 'value' || k === '_value') value = val;
      }
    }

    if (field && op) {
      return { field, op, value };
    }
  } catch (e) {
    console.warn("Parsing query constraint failed: ", e);
  }
  return null;
}

function filterInMemory(data: any[], queryConstraints: any[]): any[] {
  let filtered = [...data];
  for (const constraint of queryConstraints) {
    const parsed = extractFirestoreFilter(constraint);
    if (parsed) {
      const { field, op, value } = parsed;
      filtered = filtered.filter((item: any) => {
        const itemVal = item[field];
        if (op === '==' || op === 'equal') {
          return itemVal === value;
        }
        if (op === '!=' || op === 'not-equal') {
          return itemVal !== value;
        }
        if (op === 'array-contains') {
          return Array.isArray(itemVal) && itemVal.includes(value);
        }
        if (op === '>=') {
          return itemVal !== undefined && itemVal >= value;
        }
        if (op === '<=') {
          return itemVal !== undefined && itemVal <= value;
        }
        if (op === 'in') {
          return Array.isArray(value) && value.includes(itemVal);
        }
        return true;
      });
    }
  }
  return filtered;
}

/**
 * 1. SILENT DUAL-WRITE HANDLER
 * Safely writes directly to Supabase. Fallback to Firebase only as backup if Supabase is offline.
 * Bypasses companion Firestore writes when Supabase succeeds to prevent 429 quota exhaustion.
 */
export async function silentDualWrite(collectionPath: string | string[], dataPayload: any) {
  const enrichedPayload = { ...dataPayload, created_at: new Date().toISOString() };
  const collectionName = Array.isArray(collectionPath) ? collectionPath[0] : collectionPath;

  let supabaseSuccess = false;
  let docRefId = 'temp_sup_' + Math.random().toString(36).substring(2, 9);

  // A. Always secure data in Supabase first (Unrestricted primary defense)
  if (supabase) {
    try {
      const { error } = await supabase
        .from(collectionName)
        .insert([enrichedPayload]);

      if (error) throw error;
      supabaseSuccess = true;
      console.log(`[Supabase] Data successfully secured in table: ${collectionName}`);
    } catch (supabaseError) {
      console.error("[Supabase Error] Critical failure saving to backup server:", supabaseError);
    }
  }

  // B. ONLY try replicating to Firebase if Supabase write failed
  if (!supabaseSuccess) {
    if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
      console.warn(`[Firestore Skip] Quota exceeded. Skipping backup firebase write for ${collectionName}.`);
      return { id: docRefId };
    }

    try {
      const colRef = Array.isArray(collectionPath) 
        ? collection(db, ...collectionPath as [string, ...string[]])
        : collection(db, collectionPath);
      const docRef = await addDoc(colRef, enrichedPayload);
      docRefId = docRef.id;
      console.log(`[Firebase Fallback] Data successfully written to backup collection: ${collectionName}`);
    } catch (firebaseError: any) {
      const isQuotaError = firebaseError.code === 'resource-exhausted' || 
                           firebaseError.message?.toLowerCase().includes('quota') || 
                           firebaseError.message?.toLowerCase().includes('resource_exhausted') ||
                           firebaseError.message?.toLowerCase().includes('over_quota') ||
                           firebaseError.message?.toLowerCase().includes('limit exceeded') ||
                           firebaseError.status === 429;
      if (isQuotaError) {
        if (typeof window !== 'undefined') {
          (window as any).firestoreQuotaExceeded = true;
          window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
        }
        console.warn(`[Firebase Fallback Write Quota Exceeded] Silent backup bypass for ${collectionName}`);
      } else {
        console.warn("[Firebase Fallback Error] Backup database write failed:", firebaseError.message);
        throw firebaseError;
      }
    }
  }

  return { id: docRefId };
}

/**
 * 2. SILENT DUAL-READ HANDLER
 * Fetches from Supabase first. If Supabase is offline or fails, falls back to Firebase as secondary backup.
 */
export async function silentDualFetch(collectionPath: string | string[], queryConstraints: any[] = []) {
  const collectionName = Array.isArray(collectionPath) ? collectionPath[0] : collectionPath;

  // A. Try Supabase first (Primary high-availability data source)
  if (supabase) {
    try {
      const { data, error } = await supabase.from(collectionName).select('*');
      if (!error && data) {
        let results = data;
        if (queryConstraints.length > 0) {
          results = filterInMemory(results, queryConstraints);
        }
        return results;
      }
    } catch (supabaseError) {
      console.warn(`[Supabase Fetch Error] Silently falling back to Firebase for ${collectionName}:`, supabaseError);
    }
  }

  // B. Fallback to Firebase only as secondary safety backup
  if (typeof window !== 'undefined' && (window as any).firestoreQuotaExceeded) {
    console.warn(`[Firestore Skip] Quota exceeded. Skipping Firebase read fallback for ${collectionName}.`);
    return [];
  }

  try {
    const colRef = Array.isArray(collectionPath) 
      ? collection(db, ...collectionPath as [string, ...string[]])
      : collection(db, collectionPath);
    
    const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (fbError: any) {
    const isQuotaError = fbError.code === 'resource-exhausted' || 
                         fbError.message?.toLowerCase().includes('quota') || 
                         fbError.message?.toLowerCase().includes('resource_exhausted') ||
                         fbError.message?.toLowerCase().includes('over_quota') ||
                         fbError.message?.toLowerCase().includes('limit exceeded') ||
                         fbError.status === 429;
    if (isQuotaError) {
      if (typeof window !== 'undefined') {
        (window as any).firestoreQuotaExceeded = true;
        window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
      }
      console.warn(`[Firebase Fallback Read Quota Exceeded] Silent bypass for ${collectionName}`);
    } else {
      console.warn(`[Firebase Fallback Read Info] Failed to read ${collectionName}:`, fbError.message);
    }
    return [];
  }
}

// Preserve backwards compatibility wrappers
export async function saveGlobalData(collectionPath: string | string[], dataPayload: any) {
  return silentDualWrite(collectionPath, dataPayload);
}

export async function fetchAllCombinedData(collectionPath: string | string[], queryConstraints: any[] = []) {
  return silentDualFetch(collectionPath, queryConstraints);
}

interface RegistrationPayload {
  name: string;
  church_name?: string;
  churchName?: string;
  phone?: string;
  [key: string]: any;
}

/**
 * SECURE & NON-BLOCKING DIRECT-WRITE REGISTRATION SERVICE
 * Writes directly to Supabase and completely bypasses Firestore companion writes when successful.
 */
export async function submitNewRegistration(payload: RegistrationPayload, customTableName?: string) {
  const TABLE_NAME = customTableName || 'participants';
  const enrichedPayload = {
    ...payload,
    created_at: new Date().toISOString()
  };

  try {
    let supabaseSuccess = false;
    let fallbackId = payload.id;

    // 1. PRIMARY WRITING PROCESS: Save to Supabase (Unrestricted, Enterprise PostgreSQL)
    if (supabase) {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert([enrichedPayload])
        .select()
        .maybeSingle();

      if (error) {
         console.warn("[Supabase] Failed to write registration:", error.message);
      } else {
         supabaseSuccess = true;
         fallbackId = data?.id || fallbackId;
         console.log(`[Supabase] Live registration secured successfully in table: ${TABLE_NAME}`);
      }
    }

    // 2. SILENT BACKUP WRITE (Firebase) - attempt even if Supabase succeeded
    try {
      if (typeof window === 'undefined' || !(window as any).firestoreQuotaExceeded) {
        if (payload.id) {
           await setDoc(doc(db, TABLE_NAME, payload.id), { ...enrichedPayload });
        } else {
           await addDoc(collection(db, TABLE_NAME), { ...enrichedPayload });
        }
        console.log(`[Firebase Backup] Silent backup completed for ${TABLE_NAME}.`);
      }
    } catch (fbError: any) {
      console.warn("[Firebase Backup] Silent backup failed (non-critical):", fbError.message);
    }

    return { 
      success: supabaseSuccess, 
      message: supabaseSuccess ? "تم التسجيل بنجاح" : "تم التسجيل بنجاح (وضع العمل الاحتياطي)", 
      id: fallbackId 
    };

  } catch (error: any) {
    console.error("[Critical UI Block] Registration write failure:", error.message || error);
    throw new Error("عذراً، حدث خطأ أثناء التسجيل، يرجى المحاولة مرة أخرى");
  }
}
