import { supabase } from '../lib/supabaseClient';
import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

export interface MigrationStatus {
  collectionName: string;
  totalFirebase: number;
  alreadyInSupabase: number;
  migratedCount: number;
  success: boolean;
  message?: string;
  error?: string;
}

export const MIGRATABLE_COLLECTIONS = [
  { id: 'participants', name: 'قاعدة بيانات المشتركين (participants)' },
  { id: 'results', name: 'نتائج الامتحانات الورقية (results)' },
  { id: 'activityTeams', name: 'بيانات فرق الأنشطة (activityTeams)' },
  { id: 'orders', name: 'طلبات التقديس والقرطاسية (orders)' },
  { id: 'online_results', name: 'نتائج الامتحانات الإلكترونية (online_results)' },
  { id: 'churches', name: 'بنك الكنائس (churches)' },
  { id: 'levels', name: 'المهرجان والمراحل التعليمية (levels)' },
  { id: 'competitions', name: 'بنك المسابقات (competitions)' },
  { id: 'activityStages', name: 'مراحل الأنشطة والكورال (activityStages)' },
  { id: 'hymnStages', name: 'مراحل ألحان المهرجان (hymnStages)' },
  { id: 'news', name: 'الأخبار والتعميمات (news)' },
  { id: 'carousel', name: 'إعلانات الصفحة الرئيسية (carousel)' },
  { id: 'examLinks', name: 'روابط الامتحانات الرقمية (examLinks)' },
  { id: 'schedules', name: 'سجلات الجداول والأنشطة (schedules)' }
];

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export async function runOneTimeCollectionMigration(collectionName: string): Promise<MigrationStatus> {
  try {
    console.log(`[Migration] Starting transfer from Firebase collection: ${collectionName}...`);

    if (!supabase) {
      throw new Error("Supabase client is not initialized.");
    }

    // 1. Fetch all documents from Firestore
    let fbDocsSnapshot;
    try {
      fbDocsSnapshot = await getDocs(collection(db, collectionName));
    } catch (fbErr: any) {
      throw new Error(`Failed to fetch from Firebase: ${fbErr.message}`);
    }

    const firebaseRecords = fbDocsSnapshot.docs.map(doc => {
      const data = doc.data();
      // Ensure all objects have created_at if missing
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at || data.createdAt || data.timestamp || new Date().toISOString()
      };
    });

    if (firebaseRecords.length === 0) {
      console.log(`[Migration] Firebase collection '${collectionName}' contains 0 records.`);
      return {
        collectionName,
        totalFirebase: 0,
        alreadyInSupabase: 0,
        migratedCount: 0,
        success: true,
        message: "لا توجد بيانات في السيرفر القديم لنقلها لهذه الخدمة"
      };
    }

    console.log(`[Migration] Pulled ${firebaseRecords.length} records from Firebase collection: ${collectionName}. Querying destination...`);

    // 2. Fetch already existing IDs from Supabase to prevent duplicate key violations
    const { data: existingRows, error: fetchError } = await supabase
      .from(collectionName)
      .select('id');

    if (fetchError) {
      // If table doesn't exist, provide a detailed message or create table warning
      throw new Error(`Failed to verify Supabase table: ${fetchError.message}`);
    }

    const existingIds = new Set(existingRows?.map(row => row.id) || []);
    
    // 3. Filter only unique records
    const uniqueRecordsToInsert = firebaseRecords.filter(record => !existingIds.has(record.id));

    if (uniqueRecordsToInsert.length === 0) {
      console.log(`[Migration] All ${firebaseRecords.length} records for '${collectionName}' already exist inside Supabase.`);
      return {
        collectionName,
        totalFirebase: firebaseRecords.length,
        alreadyInSupabase: firebaseRecords.length,
        migratedCount: 0,
        success: true,
        message: "تم نقل جميع البيانات سابقاً بالفعل، لا توجد سجلات جديدة لنقلها"
      };
    }

    console.log(`[Migration] Inserting ${uniqueRecordsToInsert.length} / ${firebaseRecords.length} unique records into Supabase...`);

    // 4. Chunk inserts to avoid Supabase bulk payload limits and guarantee fast, safe requests
    const recordChunks = chunkArray(uniqueRecordsToInsert, 100);
    let totalMigrated = 0;

    for (let i = 0; i < recordChunks.length; i++) {
      const chunk = recordChunks[i];
      const { error: insertError } = await supabase
        .from(collectionName)
        .insert(chunk);

      if (insertError) {
        throw new Error(`Error during chunk ${i + 1} insert: ${insertError.message}`);
      }
      totalMigrated += chunk.length;
      console.log(`[Migration Progress] Chunk ${i + 1}/${recordChunks.length} successfully migrated (${totalMigrated}/${uniqueRecordsToInsert.length})`);
    }

    console.log(`[Migration Success] Replicated ${totalMigrated} rows of '${collectionName}' to Supabase!`);

    return {
      collectionName,
      totalFirebase: firebaseRecords.length,
      alreadyInSupabase: existingIds.size,
      migratedCount: totalMigrated,
      success: true,
      message: `تم نقل ${totalMigrated} سجل جديد كنسخة احتياطية بنجاح إلى قاعدة بيانات Supabase!`
    };

  } catch (error: any) {
    console.error(`[Migration Critical failure for ${collectionName}]:`, error);
    return {
      collectionName,
      totalFirebase: 0,
      alreadyInSupabase: 0,
      migratedCount: 0,
      success: false,
      error: error.message || String(error)
    };
  }
}
