import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

export interface BishopricExamRecord {
  id?: string;
  student_name: string; // اسم المشترك
  stage: string;        // المرحلة
  church_name: string;  // اسم الكنيسة
  exam_code: string;    // كود امتحان الأسقفية
  created_at?: string;
}

export interface BishopricExamQuestion {
  id?: string;
  stage: string;
  subject_name: string;
  question_text: string;
  options: string[];
  correct_answer: string;
  score: number;
  created_at?: string;
}

export interface BishopricExamResult {
  id?: string;
  exam_code: string;
  student_name: string;
  church_name: string;
  stage: string;
  subject_name?: string;
  total_score: number;
  max_score: number;
  percentage: number;
  status?: string;
  completed_at?: string;
}

export interface BishopricExamConfig {
  portalUrl: string;
  records: BishopricExamRecord[];
  lastUploadedAt?: string;
  fileName?: string;
}

const LOCAL_STORAGE_CONFIG_KEY = 'bishopric_exam_config_data';
const DEFAULT_PORTAL_URL = 'https://mahragan-al-karma.org/exams';

// Arabic normalization helper
export const normalizeArabic = (str: any): string => {
  if (str === undefined || str === null) return '';
  return String(str)
    .trim()
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/ـ+/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
};

export const stripChurchPrefix = (name: string): string => {
  return normalizeArabic(name)
    .replace(/^(كنيسه|كنسيه|مقر|دير|قطاع|كنيسة)\s+/, '')
    .trim();
};

export const isChurchMatch = (church1: string, church2: string): boolean => {
  if (!church1 || !church2) return false;
  const norm1 = normalizeArabic(church1);
  const norm2 = normalizeArabic(church2);
  if (norm1 === norm2) return true;

  const stripped1 = stripChurchPrefix(church1);
  const stripped2 = stripChurchPrefix(church2);
  if (stripped1 && stripped2 && (stripped1 === stripped2 || stripped1.includes(stripped2) || stripped2.includes(stripped1))) {
    return true;
  }
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    return true;
  }
  return false;
};

/**
 * Downloads a clean blank Excel template with the official headers:
 * [اسم المشترك | المرحلة | اسم الكنيسة | كود امتحان الأسقفية]
 * Mapped to: [student_name | stage | church_name | exam_code]
 */
export const downloadBlankBishopricTemplate = () => {
  const headers = ['اسم المشترك', 'المرحلة', 'اسم الكنيسة', 'كود امتحان الأسقفية'];
  
  // Sample guidance row to illustrate format
  const sampleData = [
    {
      'اسم المشترك': 'مثال: مينا سامح جرجس',
      'المرحلة': 'ثالثة ورابعة',
      'اسم الكنيسة': 'العذراء مريم والأنبا بيشوي',
      'كود امتحان الأسقفية': 'BISHOP-2026-9812'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
  
  // Set generous column widths
  worksheet['!cols'] = [
    { wch: 30 }, // اسم المشترك
    { wch: 20 }, // المرحلة
    { wch: 35 }, // اسم الكنيسة
    { wch: 25 }  // كود امتحان الأسقفية
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قالب أكواد الأسقفية');

  XLSX.writeFile(workbook, 'قالب_أكواد_امتحانات_الأسقفية_2026.xlsx');
};

/**
 * Parses an uploaded Excel file for Bishopric exam records.
 * Returns objects with strictly lowercase keys: { student_name, stage, church_name, exam_code }
 */
export const parseBishopricExcelFile = async (file: File): Promise<BishopricExamRecord[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('الملف لا يحتوي على أوراق عمل صالحة');
        }

        const sheet = workbook.Sheets[firstSheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          throw new Error('ورقة العمل فارغة، يرجى ملء البيانات وإعادة المحاولة');
        }

        const records: BishopricExamRecord[] = [];

        rawJson.forEach((row) => {
          // Dynamic column lookup
          let student_name = '';
          let stage = '';
          let church_name = '';
          let exam_code = '';

          for (const key of Object.keys(row)) {
            const cleanKey = normalizeArabic(key);
            const val = String(row[key] || '').trim();

            if (
              cleanKey.includes('اسم المشترك') || 
              cleanKey.includes('المشترك') || 
              cleanKey.includes('اسم الطالب') || 
              cleanKey.includes('الاسم') ||
              cleanKey === 'name' || 
              cleanKey === 'student_name' ||
              cleanKey === 'studentname'
            ) {
              if (!student_name) student_name = val;
            } else if (
              cleanKey.includes('المرحله') || 
              cleanKey.includes('مرحله') || 
              cleanKey === 'stage'
            ) {
              if (!stage) stage = val;
            } else if (
              cleanKey.includes('اسم الكنيسه') || 
              cleanKey.includes('الكنيسه') || 
              cleanKey.includes('كنيسه') || 
              cleanKey === 'church' || 
              cleanKey === 'church_name' ||
              cleanKey === 'churchname'
            ) {
              if (!church_name) church_name = val;
            } else if (
              cleanKey.includes('كود امتحان الاسقفيه') || 
              cleanKey.includes('كود الاسقفيه') || 
              cleanKey.includes('كود الامتحان') || 
              cleanKey.includes('الكود') || 
              cleanKey.includes('كود') || 
              cleanKey === 'exam_code' ||
              cleanKey === 'examcode' || 
              cleanKey === 'code'
            ) {
              if (!exam_code) exam_code = val;
            }
          }

          // Skip sample placeholder row if detected
          if (student_name.includes('مثال:') || exam_code.includes('BISHOP-2026-9812')) {
            return;
          }

          if (student_name && (exam_code || church_name || stage)) {
            records.push({
              student_name,
              stage: stage || 'عام',
              church_name: church_name || 'غير محددة',
              exam_code: exam_code || '-'
            });
          }
        });

        resolve(records);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Wipes and Inserts new records into Supabase table `bishopric_exam_codes`.
 * All keys are strictly lowercase (student_name, stage, church_name, exam_code).
 */
export const syncBishopricRecordsToSupabase = async (
  records: BishopricExamRecord[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Wipe existing records in bishopric_exam_codes
    const { error: deleteError } = await supabase
      .from('bishopric_exam_codes')
      .delete()
      .not('id', 'is', null);

    if (deleteError) {
      console.warn('Note on deleting bishopric_exam_codes:', deleteError.message);
    }

    // 2. Insert new records in batches
    if (records.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize).map(r => ({
          student_name: r.student_name,
          stage: r.stage,
          church_name: r.church_name,
          exam_code: r.exam_code
        }));

        const { error: insertError } = await supabase
          .from('bishopric_exam_codes')
          .insert(batch);

        if (insertError) {
          console.error('Supabase insert error in bishopric_exam_codes:', insertError);
          return { success: false, error: insertError.message };
        }
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error syncing records to bishopric_exam_codes:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء مزامنة السجلات' };
  }
};

/**
 * Fetches all records from Supabase table `bishopric_exam_codes`.
 */
export const fetchAllBishopricRecordsFromDb = async (): Promise<BishopricExamRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('bishopric_exam_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Error querying bishopric_exam_codes:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Fetch error for bishopric_exam_codes:', err);
    return [];
  }
};

/**
 * Fetches records from `bishopric_exam_codes` for a specific active church.
 */
export const fetchChurchBishopricRecordsFromDb = async (
  currentChurchName: string
): Promise<BishopricExamRecord[]> => {
  if (!currentChurchName || !currentChurchName.trim()) return [];

  try {
    // 1. Direct equality query as requested
    const { data, error } = await supabase
      .from('bishopric_exam_codes')
      .select('*')
      .eq('church_name', currentChurchName);

    if (!error && data && data.length > 0) {
      return data;
    }

    // 2. Fallback normalization in case of prefix difference (e.g. 'كنيسة العذراء' vs 'العذراء')
    const { data: allData, error: allErr } = await supabase
      .from('bishopric_exam_codes')
      .select('*');

    if (!allErr && allData && allData.length > 0) {
      return allData.filter(r => isChurchMatch(r.church_name, currentChurchName));
    }

    return data || [];
  } catch (err) {
    console.warn('Fetch church bishopric records error:', err);
    return [];
  }
};

/**
 * Global Portal URL and file upload metadata management.
 */
export const fetchBishopricExamConfig = async (): Promise<BishopricExamConfig> => {
  let portalUrl = DEFAULT_PORTAL_URL;
  let lastUploadedAt: string | undefined;
  let fileName: string | undefined;

  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_CONFIG_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed) {
        portalUrl = parsed.portalUrl || DEFAULT_PORTAL_URL;
        lastUploadedAt = parsed.lastUploadedAt;
        fileName = parsed.fileName;
      }
    }
  } catch (e) {
    console.warn('Local storage read error:', e);
  }

  // Fetch Portal URL & metadata from system_settings
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'bishopric_exam_config')
      .maybeSingle();

    if (!error && data && data.config_data) {
      const remote = typeof data.config_data === 'string' ? JSON.parse(data.config_data) : data.config_data;
      if (remote) {
        portalUrl = remote.portalUrl || portalUrl;
        lastUploadedAt = remote.lastUploadedAt || lastUploadedAt;
        fileName = remote.fileName || fileName;
      }
    }
  } catch (e) {
    console.warn('Error fetching bishopric config from system_settings:', e);
  }

  // Fetch actual records from bishopric_exam_codes table
  const records = await fetchAllBishopricRecordsFromDb();

  const config: BishopricExamConfig = {
    portalUrl,
    records,
    lastUploadedAt,
    fileName
  };

  try {
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    // Ignore cache error
  }

  return config;
};

/**
 * Saves metadata / Portal URL and syncs records.
 */
export const saveBishopricExamConfig = async (
  config: BishopricExamConfig
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Cache metadata locally
    localStorage.setItem(LOCAL_STORAGE_CONFIG_KEY, JSON.stringify(config));

    // 2. Save portal URL & file info to system_settings
    await supabase
      .from('system_settings')
      .upsert({
        id: 'bishopric_exam_config',
        config_data: {
          portalUrl: config.portalUrl,
          lastUploadedAt: config.lastUploadedAt,
          fileName: config.fileName
        }
      });

    // 3. Sync records to bishopric_exam_codes table
    const syncRes = await syncBishopricRecordsToSupabase(config.records);
    if (!syncRes.success) {
      return syncRes;
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error saving bishopric config:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء الحفظ' };
  }
};

/**
 * Filter uploaded Bishopric records for a specific church (in-memory helper).
 */
export const filterBishopricRecordsForChurch = (
  allRecords: BishopricExamRecord[],
  targetChurch: string
): BishopricExamRecord[] => {
  if (!targetChurch || !targetChurch.trim()) return allRecords;
  return allRecords.filter(r => isChurchMatch(r.church_name, targetChurch));
};

// ==========================================
// BISHOPRIC EXAM QUESTIONS (bishopric_exam_questions)
// ==========================================

/**
 * Fetch questions from bishopric_exam_questions
 */
export const fetchBishopricQuestions = async (
  stage?: string,
  subject_name?: string
): Promise<BishopricExamQuestion[]> => {
  try {
    let query = supabase
      .from('bishopric_exam_questions')
      .select('*')
      .order('created_at', { ascending: true });

    if (stage && stage !== 'الكل') {
      query = query.eq('stage', stage);
    }
    if (subject_name && subject_name !== 'الكل') {
      query = query.eq('subject_name', subject_name);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching bishopric_exam_questions:', error.message);
      // Check local storage backup if table is fresh
      const cached = localStorage.getItem('bishopric_exam_questions_cache');
      if (cached) {
        try {
          const parsed: BishopricExamQuestion[] = JSON.parse(cached);
          return parsed.filter(q => (!stage || stage === 'الكل' || q.stage === stage) && (!subject_name || subject_name === 'الكل' || q.subject_name === subject_name));
        } catch {}
      }
      return [];
    }

    if (data) {
      try {
        localStorage.setItem('bishopric_exam_questions_cache', JSON.stringify(data));
      } catch {}
      return data;
    }
    return [];
  } catch (err) {
    console.error('Fetch bishopric questions error:', err);
    return [];
  }
};

/**
 * Save / Upsert a question to bishopric_exam_questions
 */
export const saveBishopricQuestion = async (
  question: BishopricExamQuestion
): Promise<{ success: boolean; data?: BishopricExamQuestion; error?: string }> => {
  try {
    const payload: any = {
      stage: question.stage,
      subject_name: question.subject_name,
      question_text: question.question_text,
      options: question.options || [],
      correct_answer: question.correct_answer,
      score: Number(question.score) || 1
    };

    if (question.id) {
      payload.id = question.id;
    }

    const { data, error } = await supabase
      .from('bishopric_exam_questions')
      .upsert(payload)
      .select()
      .single();

    if (error) {
      console.error('Error saving bishopric question:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Save bishopric question error:', err);
    return { success: false, error: err.message || 'فشل في حفظ السؤال' };
  }
};

/**
 * Delete a question from bishopric_exam_questions
 */
export const deleteBishopricQuestion = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from('bishopric_exam_questions')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting bishopric question:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Delete bishopric question error:', err);
    return { success: false, error: err.message || 'فشل في حذف السؤال' };
  }
};

// ==========================================
// BISHOPRIC EXAM RESULTS (bishopric_exam_results)
// ==========================================

/**
 * Fetch results from bishopric_exam_results
 */
export const fetchBishopricExamResults = async (
  churchName?: string
): Promise<BishopricExamResult[]> => {
  try {
    let query = supabase
      .from('bishopric_exam_results')
      .select('*')
      .order('completed_at', { ascending: false });

    if (churchName && churchName.trim()) {
      query = query.eq('church_name', churchName);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching bishopric_exam_results:', error.message);
      // Fallback in case of subtle church naming variation
      if (churchName) {
        const { data: allData, error: allErr } = await supabase
          .from('bishopric_exam_results')
          .select('*')
          .order('completed_at', { ascending: false });
        
        if (!allErr && allData) {
          return allData.filter(r => isChurchMatch(r.church_name, churchName));
        }
      }
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Fetch bishopric exam results error:', err);
    return [];
  }
};

/**
 * Fetch a specific student's result by exam_code
 */
export const fetchBishopricStudentResult = async (
  exam_code: string
): Promise<BishopricExamResult | null> => {
  if (!exam_code || !exam_code.trim()) return null;
  try {
    const { data, error } = await supabase
      .from('bishopric_exam_results')
      .select('*')
      .eq('exam_code', exam_code.trim())
      .maybeSingle();

    if (error) {
      console.warn('Error querying student result:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Fetch student result error:', err);
    return null;
  }
};

/**
 * Submit / Upsert student exam result into bishopric_exam_results
 * Strict Network Handshake with auto-retry loop and Supabase confirmation
 */
export const submitBishopricExamResult = async (
  result: BishopricExamResult,
  maxRetries = 3,
  onAttempt?: (attempt: number) => void
): Promise<{ success: boolean; data?: BishopricExamResult; error?: string }> => {
  const payload = {
    exam_code: result.exam_code.trim(),
    student_name: result.student_name.trim(),
    church_name: result.church_name.trim(),
    stage: result.stage,
    subject_name: result.subject_name || 'امتحان الأسقفية',
    total_score: Number(result.total_score) || 0,
    max_score: Number(result.max_score) || 0,
    percentage: Number(result.percentage) || 0,
    status: result.status || 'completed',
    completed_at: result.completed_at || new Date().toISOString()
  };

  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (onAttempt) onAttempt(attempt);
    try {
      const { data, error } = await supabase
        .from('bishopric_exam_results')
        .upsert([payload], { onConflict: 'exam_code' })
        .select();

      if (error || !data || data.length === 0) {
        throw new Error(error?.message || "فشل التأكيد من السيرفر، جاري إعطاء محاولة أخرى...");
      }

      // Verified 200 OK insertion confirmation from Supabase
      return { success: true, data: data[0] as BishopricExamResult };
    } catch (err: any) {
      console.warn(`[BishopricHandshake] Attempt ${attempt}/${maxRetries} failed:`, err);
      lastError = err.message || 'فشل التأكيد من السيرفر، جاري إعطاء محاولة أخرى...';
      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, 1500));
      }
    }
  }

  return { success: false, error: lastError };
};

/**
 * Verify student by exam code strictly against bishopric_exam_codes
 */
export const verifyBishopricStudentCode = async (
  examCode: string
): Promise<{
  success: boolean;
  student?: BishopricExamRecord;
  alreadySubmitted?: BishopricExamResult | null;
  error?: string;
}> => {
  if (!examCode || !examCode.trim()) {
    return { success: false, error: 'يرجى إدخال كود امتحان الأسقفية' };
  }

  const cleanCode = examCode.trim();

  try {
    // 1. Check in bishopric_exam_codes
    const { data, error } = await supabase
      .from('bishopric_exam_codes')
      .select('*')
      .eq('exam_code', cleanCode)
      .maybeSingle();

    let studentRecord: BishopricExamRecord | undefined = data;

    // Fallback: check case-insensitive or in local storage config if offline
    if (!studentRecord) {
      const allDb = await fetchAllBishopricRecordsFromDb();
      studentRecord = allDb.find(r => r.exam_code.trim().toLowerCase() === cleanCode.toLowerCase());
    }

    if (!studentRecord) {
      return { 
        success: false, 
        error: 'كود الامتحان غير مسجل في كشوف أكواد الأسقفية المعتمدة. يرجى مراجعة مسؤول الكنيسة.' 
      };
    }

    // 2. Check if already submitted in bishopric_exam_results
    const previousResult = await fetchBishopricStudentResult(cleanCode);

    return {
      success: true,
      student: studentRecord,
      alreadySubmitted: previousResult
    };
  } catch (err: any) {
    console.error('Verification error:', err);
    return { success: false, error: err.message || 'حدث خطأ أثناء التحقق من الكود' };
  }
};
