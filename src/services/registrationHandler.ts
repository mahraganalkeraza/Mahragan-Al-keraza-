/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Event Registration Dual-Write Parallel Backup System
 * Location: Egypt Event Registrations Platform
 * 
 * This module implements a robust, fault-tolerant dual-write mechanism.
 * When a registration is submitted, it is written:
 * 1. Primary: Firebase Cloud Firestore (Authoritative source) - must be successful.
 * 2. Secondary/Backup: Supabase (Parallel Fallback/Audit trial) - runs asynchronously
 *    in the background and is completely isolated. Any database/network failures 
 *    in Supabase will not affect or block the user's primary registration flow.
 */

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../lib/supabaseClient';
import { generateShortId } from '../lib/utils';
import { Participant } from '../types';
import { OFFICIAL_STAGES, OFFICIAL_COMPETITIONS } from '../constants';

// Payload schema interface for the incoming registration
export interface RegistrationPayload {
  name: string;            // Student's full name
  churchName: string;      // Church / Location name
  stage: string;           // Educational / Age stage (e.g. "إعدادي")
  gender: string;          // Male / Female ("ذكر" / "أنثى")
  competitions: string[];  // Main categories registered in (e.g. ["دراسي", "قبطي"])
  year?: string;           // Registration target year
  country?: string;        // Country option (default: "مصر")
}

// Target database structure for the parallel backup system in Supabase
export interface SupabaseRegistrationRow {
  id: string;              // Unique identifier (Primary key)
  serial: string;          // Human-readable short ID for validation
  name: string;            // Maps to Name column
  churchName: string;      // Church/Location
  stage: string;           // Educational/Age stage
  gender: string;          // Male/Female
  competition: string;     // Main activity/category (comma separated list string)
  darasi: boolean | number; // Academic competition status as boolean/int (1 or 0)
  qebti: boolean | number;  // Coptic language competition status as boolean/int (1 or 0)
  mahfouzat: boolean | number; // Memorization competition status as boolean/int (1 or 0)
  country: string;         // Default: Egypt / مصر
  year: string;            // Operating active academic year
  timestamp: string;       // Registration execution time (ISO string)
}

/**
 * Normalizes competition array into clean individual target statuses
 * maps the strings inside Egyptian registration Arabic values
 */
export function mapArabicCompetitions(competitions: string[], useIntegerRepresentation = false) {
  const hasDarasi = competitions.some(c => c && c.includes('دراسي'));
  const hasQebti = competitions.some(c => c && c.includes('قبطي'));
  const hasMahfouzat = competitions.some(c => c && c.includes('محفوظات'));

  if (useIntegerRepresentation) {
    return {
      darasi: hasDarasi ? 1 : 0,
      qebti: hasQebti ? 1 : 0,
      mahfouzat: hasMahfouzat ? 1 : 0,
    };
  }

  return {
    darasi: hasDarasi,
    qebti: hasQebti,
    mahfouzat: hasMahfouzat,
  };
}

/**
 * Asynchronous Backplane for Supabase Parallel Insertion
 * 
 * Runs as a decoupled background task to avoid locking the event loop
 * or adding latency overhead to the user API response.
 * Isolated in an explicit, safe try-catch wrapper.
 */
function runSupabaseBackupAsync(supabaseData: SupabaseRegistrationRow): void {
  // Leverage setTimeout or Promise microtask resolve to ensure non-blocking execution
  setTimeout(() => {
    Promise.resolve()
      .then(async () => {
        console.log(`[Backup Sync] Initiating parallel backup for student: ${supabaseData.name} (${supabaseData.serial})`);
        
        const startTime = performance.now();
        const { data, error } = await supabase
          .from('registrations')
          .insert([supabaseData])
          .select();

        const duration = (performance.now() - startTime).toFixed(2);

        if (error) {
          throw error;
        }

        console.log(`[Backup Sync Success] Supabase Dual-Write completed successfully in ${duration}ms.`, data);
      })
      .catch((err: any) => {
        /**
         * Requirement 2 Met: 
         * Log error quietly for background debugging without escalating to the caller or blocking.
         * Handles PGRST205 schema cache states, timeouts, disconnects, etc.
         */
        console.error('[Backup Sync Error] Supabase parallel write failed (Isolated quiet capture):', {
          message: err?.message || String(err),
          code: err?.code || 'NO_CODE',
          details: err?.details || null,
          hint: err?.hint || null,
          targetedStudent: supabaseData.name,
          durationMs: performance.now()
        });
      });
  }, 0);
}

/**
 * Dual-Write Registration Handler Core Function
 * 
 * @param payload The registration details submitted from input forms.
 * @param useIntForStatus Mode flag representing whether target columns store integer 0/1 or standard boolean flags.
 * @returns Object indicating Firebase document ID, registration statuses, and overall execution tracking.
 */
export async function registerParticipantDualWrite(
  payload: RegistrationPayload,
  useIntForStatus = false
): Promise<{ success: boolean; id: string; source: 'firebase-primary' }> {
  
  if (!payload.name || !payload.stage || !payload.gender) {
    throw new Error('Required schema validation failed: [name, stage, gender] must be provided');
  }

  // Define unique identifier
  const customId = generateShortId();
  const currentAcademicYear = payload.year || '2026';
  const targetCountry = payload.country || 'مصر';
  const now = new Date();

  // Create authoritative payload for primary source (Firebase Cloud Firestore)
  const firebaseData = {
    id: customId,
    serial: customId,
    name: payload.name.trim(),
    churchName: payload.churchName.trim(),
    stage: payload.stage.trim(),
    gender: payload.gender,
    competitions: payload.competitions.filter(c => c && c.trim() !== ''),
    year: currentAcademicYear,
    country: targetCountry,
    timestamp: now.toISOString()
  };

  try {
    console.log(`[Primary Flow] Initializing Firebase Write for custom ID: ${customId}`);
    
    // 1. Authoritative Write to Cloud Firestore
    const docRef = doc(db, 'participants', customId);
    await setDoc(docRef, firebaseData);
    
    console.log(`[Primary Flow Success] Written verified document securely to Firebase Firestore: ${customId}`);

    // Map targets status for backup table schema match
    const compStatuses = mapArabicCompetitions(payload.competitions, useIntForStatus);
    
    // Construct exact target column payload for Supabase matching the structure
    const supabaseBackupPayload: SupabaseRegistrationRow = {
      id: customId,
      serial: customId,
      name: firebaseData.name,
      churchName: firebaseData.churchName,
      stage: firebaseData.stage,
      gender: firebaseData.gender,
      competition: firebaseData.competitions.join(', ') || 'عام',
      darasi: compStatuses.darasi,
      qebti: compStatuses.qebti,
      mahfouzat: compStatuses.mahfouzat,
      country: firebaseData.country,
      year: firebaseData.year,
      timestamp: firebaseData.timestamp
    };

    /**
     * Requirement 4 Met:
     * Fire the Supabase backup insertion as a parallel asynchronous process.
     * Yields execution immediately so that client response isn't blocked.
     */
    runSupabaseBackupAsync(supabaseBackupPayload);

    // Return the successful primary response back to client
    return {
      success: true,
      id: customId,
      source: 'firebase-primary'
    };

  } catch (firebaseErr: any) {
    // If the primary writer fails, escalate immediately as it is the live authoritative source
    console.error('[Primary Flow Fatal] Firebase registration transaction aborted:', firebaseErr);
    throw firebaseErr;
  }
}

/**
 * Normalizes and sanitizes a record fetched from Supabase to conform strictly
 * to the legacy Frontend / Firestore Participant schema.
 * 
 * 1. Strict Mapping & Fallbacks:
 *    - Maps fields like name, stage, gender, churchName, etc.
 *    - Provides safe fallbacks so no undefined reads/crashes happen.
 * 2. Reconstruction of 'competitions':
 *    - Reconstructs the string array from the comma-separated `competition` column
 *      or the individual boolean flags `darasi`, `qebti`, `mahfouzat` to ensure
 *      filters, reports, and calculations work flawlessly.
 * 3. Sanitization:
 *    - Strips extra metadata columns/internal metadata.
 */
export function normalizeRegistrationData(row: any): Participant {
  if (!row) {
    return {
      id: '',
      serial: '',
      docId: '',
      ID: '',
      name: '',
      churchName: '',
      country: 'مصر',
      stage: '',
      gender: '',
      competitions: [],
      darasi: false,
      qebti: false,
      mahfouzat: false,
      timestamp: new Date().toISOString(),
      year: '2026'
    };
  }

  // Determine competitions string array
  let comps: string[] = [];
  
  if (row.competition && typeof row.competition === 'string') {
    comps = row.competition.split(',').map((s: string) => s.trim()).filter(Boolean);
  } else if (Array.isArray(row.competitions)) {
    // Legacy support if they got saved as an array
    comps = row.competitions.filter(Boolean);
  }

  /**
   * Data Type Enforcement & Legacy Field Reconstruction
   * We map boolean/integer flags back to standard boolean statuses for the UI.
   * If the UI eventually expects string "1"/"0", this can be adjusted here.
   */
  const darasiStatus = (row.darasi === true || row.darasi === 1 || String(row.darasi) === '1' || String(row.darasi) === 'true');
  const qebtiStatus = (row.qebti === true || row.qebti === 1 || String(row.qebti) === '1' || String(row.qebti) === 'true');
  const mahfouzatStatus = (row.mahfouzat === true || row.mahfouzat === 1 || String(row.mahfouzat) === '1' || String(row.mahfouzat) === 'true');

  // If list is empty, reconstruct from boolean flags
  if (comps.length === 0) {
    if (darasiStatus) comps.push('دراسي');
    if (qebtiStatus) {
      const currentStage = String(row.stage || '').trim();
      // Use official terminology
      if (['خامسة وسادسة', 'إعدادي', 'ثانوي', 'جامعة', 'خريجون'].some(stg => currentStage.includes(stg))) {
        comps.push('قبطي مستوى ثان');
      } else {
        comps.push('قبطي مستوى أول');
      }
    }
    if (mahfouzatStatus) comps.push('محفوظات');
  }

  // ID Normalization: Map to all possible keys the legacy filters might expect
  const normalizedId = row.id || row.serial || row.docId || row.ID || '';

  return {
    id: normalizedId,
    serial: row.serial || normalizedId,
    docId: normalizedId,
    ID: normalizedId,
    name: String(row.name || '').trim(),
    churchName: String(row.churchName || row.church || '').trim(),
    country: String(row.country || 'مصر').trim(),
    stage: String(row.stage || row.level || '').trim(),
    gender: String(row.gender || '').trim(),
    competitions: comps,
    // Cast to boolean if that's what legacy logic usually expects for flags
    darasi: darasiStatus,
    qebti: qebtiStatus,
    mahfouzat: mahfouzatStatus,
    timestamp: row.timestamp || new Date().toISOString(),
    year: String(row.year || '2026'),
    tshirtSize: row.tshirtSize || '',
    personalImage: row.personalImage || ''
  };
}

/**
 * Normalizes an array of Supabase registration rows.
 */
export function normalizeRegistrationList(rows: any[]): Participant[] {
  if (!Array.isArray(rows)) return [];
  return rows.map(row => normalizeRegistrationData(row));
}
