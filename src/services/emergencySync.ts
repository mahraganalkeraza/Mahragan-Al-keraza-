import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { supabase } from '../lib/supabaseClient';

export async function syncEmergencyDataToFirestore() {
  const localData = JSON.parse(localStorage.getItem('emergency_registrations') || '[]');
  
  if (localData.length === 0) return; // Nothing to sync

  console.log(`Found ${localData.length} pending registrations. Attempting to sync...`);
  
  const remainingData = [];

  for (const record of localData) {
    try {
      // Attempt to write the local record to the original Firestore collection
      await addDoc(collection(db, "registrations"), record);
      console.log(`Successfully synced record for: ${record.churchName || 'Unknown Church'}`);
    } catch (error: any) {
      // If Firestore is STILL blocked or fails, keep the record in the queue
      if (error && (error.code === 'resource-exhausted' || error.message?.includes('quota'))) {
        console.warn("Firestore quota still exceeded. Keeping data in local storage.");
        remainingData.push(record);
      } else {
        // Handle other rare errors but keep data safe
        remainingData.push(record);
      }
    }
  }

  // Update localStorage: clear synced ones, keep failed ones for next retry
  if (remainingData.length > 0) {
    localStorage.setItem('emergency_registrations', JSON.stringify(remainingData));
  } else {
    localStorage.removeItem('emergency_registrations');
    console.log("All emergency local data successfully synced to Firestore!");
  }
}

export async function autoSyncSupabaseToFirebase() {
  if (!supabase) return;
  // Fetch unsynced records from Supabase
  const { data: unsyncedRecords, error } = await supabase
    .from('registrations_backup')
    .select('*')
    .eq('synced_to_firebase', false);

  if (error || !unsyncedRecords || unsyncedRecords.length === 0) return;

  for (const record of unsyncedRecords) {
    try {
      // Push to Firebase
      const { id, synced_to_firebase, ...firebasePayload } = record; // remove supabase meta
      await addDoc(collection(db, "registrations"), firebasePayload);
      
      // Mark as synced in Supabase
      await supabase
        .from('registrations_backup')
        .update({ synced_to_firebase: true })
        .eq('id', id);
    } catch (fbError: any) {
      if (fbError.code === 'resource-exhausted' || fbError.message?.includes('quota')) break; // Firebase still locked, stop loop
    }
  }
}
