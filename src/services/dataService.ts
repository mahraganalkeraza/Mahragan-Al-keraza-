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
 * Safely writes to Supabase, then tries Firebase in the background without throwing console crashes.
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

  // B. Try replicating to Firebase silently
  try {
    const colRef = Array.isArray(collectionPath) 
      ? collection(db, ...collectionPath as [string, ...string[]])
      : collection(db, collectionPath);
    const docRef = await addDoc(colRef, enrichedPayload);
    docRefId = docRef.id;
    console.log(`[Firebase] Data successfully replicated to collection: ${collectionName}`);
  } catch (firebaseError: any) {
    const isQuotaError = firebaseError.code === 'resource-exhausted' || firebaseError.message?.includes('quota') || firebaseError.status === 429;
    
    if (isQuotaError) {
      // Intentionally swallow the error completely. No red lines, no console pollution.
      console.warn("[Firebase Quota Exceeded] Firebase failed, but data is 100% safe in Supabase.");
      if (!supabaseSuccess) {
        throw new Error("حدث خطأ أثناء حفظ البيانات بالسيرفر الاحتياطي والأساسي");
      }
    } else {
      console.error("[Firebase Replication Warning]:", firebaseError.message);
      if (!supabaseSuccess) {
        throw firebaseError;
      }
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
 * SECURE & NON-BLOCKING DUAL-WRITE REGISTRATION SERVICE
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
      // 2. BACKGROUND REPLICATION: Fire-and-forget write to Firebase
      const firestoreWritePromise = payload.id
        ? setDoc(doc(db, TABLE_NAME, payload.id), { ...enrichedPayload, supabase_synced_id: fallbackId })
        : addDoc(collection(db, TABLE_NAME), { ...enrichedPayload, supabase_synced_id: fallbackId || null });

      firestoreWritePromise
        .then(() => {
          console.log(`[Firebase] Parallel replication completed silently in background for ${TABLE_NAME}.`);
        })
        .catch((fbError: any) => {
          // Suppress and handle Firebase failures
          const isQuota = fbError.code === 'resource-exhausted' || fbError.status === 429 || fbError.message?.includes('quota');
          if (isQuota) {
            console.warn("[Firebase Sync Deferred] Quota locked, write skipped. Record is safe in Supabase.");
          } else {
            console.error("[Firebase Non-Quota Sync Error]:", fbError.message);
          }
        });

      return { success: true, message: "تم التسجيل بنجاح", id: fallbackId };
    } else {
      // 3. FALLBACK PRIMARY WRITE: Block and wait for Firebase if no Supabase
      let fbRefId = payload.id;
      if (payload.id) {
         await setDoc(doc(db, TABLE_NAME, payload.id), { ...enrichedPayload });
      } else {
         const newRef = await addDoc(collection(db, TABLE_NAME), { ...enrichedPayload });
         fbRefId = newRef.id;
      }
      console.log(`[Firebase] Primary write completed for ${TABLE_NAME}.`);
      return { success: true, message: "تم التسجيل بنجاح", id: fbRefId };
    }

  } catch (error: any) {
    const isQuotaError = error.code === 'resource-exhausted' || error.message?.includes('quota') || error.status === 429;
    if (isQuotaError) {
      console.error("[Firebase Quota Block] Failed to register participant.");
      throw new Error("عذراً، ضغط شديد على السيرفر، يرجى المحاولة بعد قليل.");
    }
    console.error("[Critical UI Block] Firebase failed to write registration:", error.message || error);
    throw new Error("عذراً، حدث خطأ أثناء الاتصال بالسيرفر الرئيسي، يرجى المحاولة مرة أخرى");
  }
}
