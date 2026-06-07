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
    try {
      const colRef = Array.isArray(collectionPath) 
        ? collection(db, ...collectionPath as [string, ...string[]])
        : collection(db, collectionPath);
      const docRef = await addDoc(colRef, enrichedPayload);
      docRefId = docRef.id;
      console.log(`[Firebase Fallback] Data successfully written to backup collection: ${collectionName}`);
    } catch (firebaseError: any) {
      console.error("[Firebase Fallback Error] Backup database write failed:", firebaseError.message);
      throw firebaseError;
    }
  }

  return { id: docRefId };
}

/**
 * 2. SILENT DUAL-READ HANDLER
 * Tries to fetch from Firebase first. If quota is dead, seamlessly falls back to Supabase without breaking the UI.
 */
export async function silentDualFetch(collectionPath: string | string[], queryConstraints: any[] = []) {
  // Try Firebase first
  try {
    const colRef = Array.isArray(collectionPath) 
      ? collection(db, ...collectionPath as [string, ...string[]])
      : collection(db, collectionPath);
    
    const q = queryConstraints.length > 0 ? query(colRef, ...queryConstraints) : colRef;
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (fbError: any) {
    const isQuotaError = fbError.code === 'resource-exhausted' || fbError.message?.includes('quota') || fbError.status === 429;
    
    if (isQuotaError) {
      // Firebase is locked. Silently divert traffic to Supabase without throwing errors.
      console.warn(`[Firebase Quota locked] Silently failing over to Supabase for: ${collectionPath}`);
      const collectionName = Array.isArray(collectionPath) ? collectionPath[0] : collectionPath;
      if (supabase) {
        try {
          const { data, error } = await supabase.from(collectionName).select('*');
          if (error) throw error;
          let results = data || [];
          if (queryConstraints.length > 0) {
            results = filterInMemory(results, queryConstraints);
          }
          return results;
        } catch (subaFetchError) {
          console.error("Fallback data source failed:", subaFetchError);
          return [];
        }
      }
      return [];
    } else {
      // If it's a different error, log it for tracking
      console.error("Firebase read error on collection " + JSON.stringify(collectionPath) + ":", fbError.message);
      return [];
    }
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

    if (supabase) {
      // 1. PRIMARY WRITING PROCESS: Save to Supabase (Unrestricted, Enterprise PostgreSQL)
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

    if (supabaseSuccess) {
      // Bypasses Firebase replication completely to avoid database write quotas
      return { success: true, message: "تم التسجيل بنجاح", id: fallbackId };
    } else {
      // 2. FALLBACK PRIMARY WRITE: Block and wait for Firebase if no Supabase is available
      let fbRefId = payload.id;
      if (payload.id) {
         await setDoc(doc(db, TABLE_NAME, payload.id), { ...enrichedPayload });
      } else {
         const newRef = await addDoc(collection(db, TABLE_NAME), { ...enrichedPayload });
         fbRefId = newRef.id;
      }
      console.log(`[Firebase Fallback] Primary write completed for ${TABLE_NAME}.`);
      return { success: true, message: "تم التسجيل بنجاح", id: fbRefId };
    }

  } catch (error: any) {
    console.error("[Critical UI Block] Registration write failure:", error.message || error);
    throw new Error("عذراً، حدث خطأ أثناء الاتصال بالسيرفر، يرجى المحاولة مرة أخرى");
  }
}
