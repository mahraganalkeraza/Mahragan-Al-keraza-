import { supabase } from '../lib/supabaseClient';

export const SEED_CHURCHES = [
  { "name": "العباسية", "password": "lk2*951" },
  { "name": "المطرانية", "password": "vp7@385" },
  { "name": "نزلة عصر", "password": "zw2#398" },
  { "name": "المداور", "password": "kf1@638" },
  { "name": "نزلة رمضان", "password": "nb7_264" },
  { "name": "البسقلون", "password": "rt5#930" },
  { "name": "عباد شارونة", "password": "mx2@901" },
  { "name": "علي باشا", "password": "js3@452" },
  { "name": "عزبة رزق", "password": "kz5#259" },
  { "name": "صفانية", "password": "dx1#924" },
  { "name": "الملاك ميخائيل - مغاغة", "password": "km1@245" },
  { "name": "عزبة بطرس", "password": "tr4#739" },
  { "name": "قصر لملوم", "password": "lk5_441" },
  { "name": "بني عامر", "password": "vz1#827" },
  { "name": "قفادة", "password": "jh4_333" },
  { "name": "عزبة سمعان", "password": "ty3@682" },
  { "name": "بلهاسة", "password": "bn6#218" },
  { "name": "بني خالد", "password": "xj7*195" },
  { "name": "شارونة", "password": "bm1*627" },
  { "name": "الشيخ زياد", "password": "dp2#118" },
  { "name": "أبو غطاس", "password": "xj9_803" },
  { "name": "طنبدي", "password": "jn5#572" },
  { "name": "ميانة", "password": "lk9*118" },
  { "name": "صعايدة الكوم الأخضر", "password": "qw9_106" },
  { "name": "الشيخ مسعود", "password": "sm7_134" },
  { "name": "كفر عبد الخالق", "password": "vn4@538" },
  { "name": "عطف حيدر", "password": "gx6_193" },
  { "name": "عزبة مهدي", "password": "kf4#819" },
  { "name": "الكوم الأخضر", "password": "bf3#614" },
  { "name": "الجزيرة", "password": "np8_423" },
  { "name": "شم القبلية", "password": "mr8*508" },
  { "name": "مارمينا مغاغة", "password": "gh8_682" },
  { "name": "برطباط", "password": "bt4@717" },
  { "name": "عزبة إسحق", "password": "rf1*860" },
  { "name": "صعايدة الساوي", "password": "tp2#742" },
  { "name": "العذراء مغاغة", "password": "gh9*515" },
  { "name": "شمس الدين", "password": "rt8*485" },
  { "name": "آبا البلد", "password": "jn2@551" },
  { "name": "دهروط", "password": "ts6*304" },
  { "name": "الساوي", "password": "lv6*373" },
  { "name": "بني واللمس", "password": "xz8_402" },
  { "name": "كوم الحاصل", "password": "tr8*704" },
  { "name": "دير الجرنوس", "password": "rf5#472" },
  { "name": "الزورة", "password": "wq3#490" },
  { "name": "إشنين", "password": "mb4@952" },
  { "name": "إبراهيم عبد السيد", "password": "qw4@316" },
  { "name": "القديسة دميانة", "password": "vz9@624" },
  { "name": "برمشا", "password": "wq2@714" },
  { "name": "القايات", "password": "zw7*291" },
  { "name": "محمد بيه", "password": "bt3*815" },
  { "name": "العدوة", "password": "vp3_726" }
];

export const SEED_STAGES = [
  "حضانة", "أولى وثانية", "ثالثة ورابعة", "خامسة وسادسة", "إعدادي", "ثانوي", "جامعة", "خريجون", "خدام وإعداد الخدام", "قانا الجليل", "تعليم كبار", "سمعان الشيخ", "حرفيون", "ديديموس", "بولس وسيلا", "صم وبكم", "ذوي القدرات"
];

export const SEED_COMPETITIONS = [
  "دراسي", "محفوظات", "قبطي مستوى أول", "قبطي مستوى ثان"
];

export async function autoSeedSupabaseTables() {
  if (!supabase) return { success: false, message: 'Supabase client is not configured.' };

  try {
    console.log("[Seeding] Initiating auto-seeding for Supabase tables...");

    // 1. Seed stages
    try {
      const { data: currentStages, error: err } = await supabase.from('stages').select('name');
      if (!err && (!currentStages || currentStages.length === 0)) {
        console.log("[Seeding] Stages table is empty. Inserting 17 default stages...");
        const payload = SEED_STAGES.map(name => ({ name }));
        await supabase.from('stages').insert(payload);
      }
    } catch (e) {
      console.warn("[Seeding] Could not seed stages (table might not exist yet):", e);
    }

    // 2. Seed competitions
    try {
      const { data: currentComps, error: err } = await supabase.from('competitions').select('name');
      if (!err && (!currentComps || currentComps.length === 0)) {
        console.log("[Seeding] Competitions table is empty. Inserting 4 default competitions...");
        const payload = SEED_COMPETITIONS.map(name => ({ name }));
        await supabase.from('competitions').insert(payload);
      }
    } catch (e) {
      console.warn("[Seeding] Could not seed competitions (table might not exist yet):", e);
    }

    // 3. Seed churches: Clean up table and insert exactly 51 rows with exact passwords
    try {
      const alreadyCleanSeeded = localStorage.getItem('supabase_clean_seed_v5');
      if (alreadyCleanSeeded !== 'true') {
        console.log("[Seeding] Cleaning up 'churches' table in Supabase to ensure exact 51 passwords...");
        await supabase.from('churches').delete().neq('name', '_non_existent_');
        
        console.log("[Seeding] Inserting exact 51 default churches into Supabase...");
        const { error: insError } = await supabase.from('churches').insert(SEED_CHURCHES);
        if (insError) {
          console.error("[Seeding] Failed to insert 51 seed churches:", insError);
        } else {
          console.log("[Seeding] Successfully inserted 51 churches with pristine passwords.");
          localStorage.setItem('supabase_clean_seed_v5', 'true');
        }
      } else {
        console.log("[Seeding] Churches already clean-seeded in Supabase, bypassing.");
      }
    } catch (e) {
      console.warn("[Seeding] Could not seed churches (table might not exist yet):", e);
    }

    return { success: true, message: 'Auto-seeding check complete.' };
  } catch (error: any) {
    console.error("[Seeding Error] Seeding operation encountered a mistake:", error);
    return { success: false, error: error.message };
  }
}
