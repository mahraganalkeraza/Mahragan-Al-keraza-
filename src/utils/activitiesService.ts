import { supabase } from '../lib/supabaseClient';

export interface CustomActivity {
  id: number | string;
  name: string;
  is_active: boolean;
  created_at?: string;
}

const DEFAULT_ACTIVITIES: string[] = [
  'ألحان',
  'كورال',
  'ترنيم فردي',
  'عزف',
  'ثقافية',
  'أدبية',
  'فنون تشكيلية',
  'كمبيوتر'
];

/**
 * Fetch custom activities.
 * Try Supabase first. If it fails, fall back to localStorage.
 */
export async function getCustomActivities(): Promise<CustomActivity[]> {
  try {
    const { data, error } = await supabase
      .from('custom_activities')
      .select('*')
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      // Supabase table is active and has data
      return data as CustomActivity[];
    }

    if (error) {
      console.warn("Supabase custom_activities table error (falling back to localStorage):", error.message);
    }
  } catch (err: any) {
    console.warn("Supabase fetch failed (falling back to localStorage):", err.message);
  }

  // Fallback to localStorage
  const localData = localStorage.getItem('local_custom_activities');
  if (localData) {
    try {
      return JSON.parse(localData);
    } catch (e) {
      console.error("Failed to parse local_custom_activities", e);
    }
  }

  // If local custom activities is empty, seed with the default hardcoded activities
  const initialList: CustomActivity[] = DEFAULT_ACTIVITIES.map((act, index) => ({
    id: `default-${index}`,
    name: act,
    is_active: true
  }));

  localStorage.setItem('local_custom_activities', JSON.stringify(initialList));
  return initialList;
}

/**
 * Save / Add custom activity.
 */
export async function addCustomActivity(name: string): Promise<CustomActivity> {
  const cleanName = name.trim();
  if (!cleanName) throw new Error("اسم النشاط لا يمكن أن يكون فارغاً");

  const newAct: Partial<CustomActivity> = {
    name: cleanName,
    is_active: true
  };

  try {
    const { data, error } = await supabase
      .from('custom_activities')
      .insert([newAct])
      .select();

    if (!error && data && data[0]) {
      // Sync to localStorage as well
      const current = await getCustomActivities();
      const updated = [...current.filter(c => c.name !== cleanName), data[0] as CustomActivity];
      localStorage.setItem('local_custom_activities', JSON.stringify(updated));
      return data[0] as CustomActivity;
    }

    if (error) {
      throw error;
    }
  } catch (err: any) {
    console.error("Supabase insert failed, saving locally:", err.message);
  }

  // Handle locally
  const current = await getCustomActivities();
  if (current.some(c => c.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error("هذا النشاط موجود بالفعل");
  }

  const newLocalAct: CustomActivity = {
    id: `local-${Date.now()}`,
    name: cleanName,
    is_active: true,
    created_at: new Date().toISOString()
  };

  const updated = [...current, newLocalAct];
  localStorage.setItem('local_custom_activities', JSON.stringify(updated));
  return newLocalAct;
}

/**
 * Update / toggle active status of a custom activity.
 */
export async function toggleCustomActivityStatus(id: number | string, is_active: boolean): Promise<void> {
  // If numeric, try Supabase
  if (typeof id === 'number' || !isNaN(Number(id))) {
    try {
      const { error } = await supabase
        .from('custom_activities')
        .update({ is_active })
        .eq('id', id);

      if (!error) {
        // Sync local
        const current = await getCustomActivities();
        const updated = current.map(c => String(c.id) === String(id) ? { ...c, is_active } : c);
        localStorage.setItem('local_custom_activities', JSON.stringify(updated));
        return;
      }
    } catch (e: any) {
      console.warn("Supabase update failed, updating locally:", e.message);
    }
  }

  // Local update
  const current = await getCustomActivities();
  const updated = current.map(c => String(c.id) === String(id) ? { ...c, is_active } : c);
  localStorage.setItem('local_custom_activities', JSON.stringify(updated));
}

/**
 * Delete a custom activity.
 */
export async function deleteCustomActivity(id: number | string): Promise<void> {
  // If numeric, try Supabase
  if (typeof id === 'number' || !isNaN(Number(id))) {
    try {
      const { error } = await supabase
        .from('custom_activities')
        .delete()
        .eq('id', id);

      if (!error) {
        // Sync local
        const current = await getCustomActivities();
        const updated = current.filter(c => String(c.id) !== String(id));
        localStorage.setItem('local_custom_activities', JSON.stringify(updated));
        return;
      }
    } catch (e: any) {
      console.warn("Supabase delete failed, deleting locally:", e.message);
    }
  }

  // Local delete
  const current = await getCustomActivities();
  const updated = current.filter(c => String(c.id) !== String(id));
  localStorage.setItem('local_custom_activities', JSON.stringify(updated));
}
