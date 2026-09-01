import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

export interface BishopricExamRecord {
  id?: string;
  student_name: string; // اسم المشترك
  stage: string;        // المرحلة
  church_name: string;  // اسم الكنيسة
  exam_code: string;    // كود امتحان الأسقفية
  code?: string;        // alias for code
  student_code?: string;
  is_used?: boolean;    // حالة استخدام الكود
  used_at?: string;
  status?: string;
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
  is_excellence?: boolean; // سؤال تميز
  created_at?: string;
}

export interface BishopricExamResult {
  id?: string;
  exam_code: string;
  student_code?: string;
  student_name: string;
  church_name: string;
  stage: string;
  subject_name?: string;
  total_score: number;
  score?: number;
  max_score: number;
  percentage: number;
  excellence_points?: number; // نقاط سؤال التميز
  max_excellence_points?: number;
  excellence_unlocked?: boolean;
  excellence_categories?: string[];
  excellence_answers?: Record<string, any>;
  answers?: any;
  category_scores?: Record<string, any>;
  status?: string;
  submitted_at?: string;
  completed_at?: string;
}

export interface GranularCategoryScore {
  score: number;        // Standard score earned
  maxScore: number;     // Standard max score
  excellence: number;   // Excellence points earned
  maxExcellence: number;// Excellence max points
  total: number;        // score + excellence
}

export interface GranularExamResult {
  id?: string;
  exam_code: string;
  student_name: string;
  church_name: string;
  stage: string;
  subject_name?: string;
  completed_at?: string;
  submitted_at?: string;
  raw: BishopricExamResult;
  curriculum: GranularCategoryScore; // دراسي + تميز دراسي
  hymns: GranularCategoryScore;      // محفوظات + تميز محفوظات
  coptic1: GranularCategoryScore;    // قبطي مستوى أول + تميز قبطي1
  coptic2: GranularCategoryScore;    // قبطي مستوى ثان + تميز قبطي2
  totalStandardScore: number;
  totalExcellencePoints: number;
  grandTotal: number;
  maxScore: number;
  maxExcellencePoints: number;
  percentage: number;
}

export interface BishopricExamConfig {
  portalUrl: string;
  records: BishopricExamRecord[];
  lastUploadedAt?: string;
  fileName?: string;
}

export const BISHOPRIC_ALLOWED_STAGES = [
  'حضانة',
  'أولى وثانية',
  'تعليم كبار',
  'حرفيون',
  'سمعان الشيخ'
];

const LOCAL_STORAGE_CONFIG_KEY = 'bishopric_exam_config_data';
export const PUBLIC_BASE_URL = 'https://mahraganalkeraza.github.io/Mahragan-Al-keraza-/';
export const PUBLIC_PORTAL_URL = 'https://mahraganalkeraza.github.io/Mahragan-Al-keraza-/#/portal';
export const DEFAULT_PORTAL_URL = PUBLIC_PORTAL_URL;

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

export const isAllowedBishopricStage = (stageName: string): boolean => {
  if (!stageName) return true; // Graceful fallback
  const norm = normalizeArabic(stageName);
  return BISHOPRIC_ALLOWED_STAGES.some(allowed => {
    const normAllowed = normalizeArabic(allowed);
    return norm === normAllowed || norm.includes(normAllowed) || normAllowed.includes(norm);
  });
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
  const cleanChurchName = (currentChurchName || '').trim();
  if (!cleanChurchName) return [];

  try {
    // 1. Direct equality query
    const { data: eqData, error: eqError } = await supabase
      .from('bishopric_exam_codes')
      .select('*')
      .eq('church_name', cleanChurchName);

    if (!eqError && eqData && eqData.length > 0) {
      return eqData;
    }

    // 2. Flexible ILIKE query
    const { data: ilikeData, error: ilikeError } = await supabase
      .from('bishopric_exam_codes')
      .select('*')
      .ilike('church_name', `%${cleanChurchName}%`);

    if (!ilikeError && ilikeData && ilikeData.length > 0) {
      return ilikeData;
    }

    // 3. Try with/without 'كنيسة' prefix
    const coreName = cleanChurchName.replace(/^كنيسة\s*/, '').trim();
    if (coreName && coreName !== cleanChurchName) {
      const { data: coreData, error: coreError } = await supabase
        .from('bishopric_exam_codes')
        .select('*')
        .ilike('church_name', `%${coreName}%`);

      if (!coreError && coreData && coreData.length > 0) {
        return coreData;
      }
    }

    // 4. Fallback normalization in case of advanced Arabic normalization differences
    const { data: allData, error: allErr } = await supabase
      .from('bishopric_exam_codes')
      .select('*');

    if (!allErr && allData && allData.length > 0) {
      const matched = allData.filter(r => isChurchMatch(r.church_name, cleanChurchName));
      if (matched.length > 0) return matched;
    }

    return [];
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
      score: Number(question.score) || 1,
      is_excellence: Boolean(question.is_excellence)
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
      .order('completed_at', { ascending: false })
      .range(0, 99999);

    if (churchName && churchName.trim()) {
      const cleanChurch = churchName.trim();
      query = query.eq('church_name', cleanChurch);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Error fetching bishopric_exam_results:', error.message);
      // Fallback in case of subtle church naming variation
      if (churchName) {
        const { data: allData, error: allErr } = await supabase
          .from('bishopric_exam_results')
          .select('*')
          .order('completed_at', { ascending: false })
          .range(0, 99999);
        
        if (!allErr && allData) {
          return allData.filter(r => isChurchMatch(String(r.church_name || '').trim(), churchName.trim()));
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
 * Normalizes competition/subject names into 4 official categories:
 * - 'curriculum': دراسي
 * - 'hymns': محفوظات
 * - 'coptic1': قبطي مستوى أول
 * - 'coptic2': قبطي مستوى ثانٍ
 */
export const normalizeCategoryType = (categoryName: string): 'curriculum' | 'hymns' | 'coptic1' | 'coptic2' | 'other' => {
  if (!categoryName) return 'other';
  const norm = normalizeArabic(categoryName);
  
  if (norm.includes('دراسي') || norm.includes('دراسيه') || norm.includes('منهج') || norm.includes('عقيده') || norm.includes('طقس كتاب')) {
    return 'curriculum';
  }
  if (norm.includes('محفوظ') || norm.includes('الحان') || norm.includes('لحن') || norm.includes('ترنيم')) {
    return 'hymns';
  }
  if (norm.includes('قبطي')) {
    if (norm.includes('ثان') || norm.includes('2') || norm.includes('م2') || norm.includes('م 2')) {
      return 'coptic2';
    }
    return 'coptic1';
  }
  return 'other';
};

/**
 * Granular Score Parser:
 * Evaluates student answers, questions, excellence achievements and extracts independent
 * scores and excellence points for each of the 4 core categories:
 * [دراسي | محفوظات | قبطي مستوى أول | قبطي مستوى ثان]
 */
export const parseGranularScores = (
  result: BishopricExamResult,
  questions: BishopricExamQuestion[] = []
): GranularExamResult => {
  const curriculum: GranularCategoryScore = { score: 0, maxScore: 0, excellence: 0, maxExcellence: 0, total: 0 };
  const hymns: GranularCategoryScore = { score: 0, maxScore: 0, excellence: 0, maxExcellence: 0, total: 0 };
  const coptic1: GranularCategoryScore = { score: 0, maxScore: 0, excellence: 0, maxExcellence: 0, total: 0 };
  const coptic2: GranularCategoryScore = { score: 0, maxScore: 0, excellence: 0, maxExcellence: 0, total: 0 };

  const getTarget = (catType: 'curriculum' | 'hymns' | 'coptic1' | 'coptic2' | 'other') => {
    switch (catType) {
      case 'curriculum': return curriculum;
      case 'hymns': return hymns;
      case 'coptic1': return coptic1;
      case 'coptic2': return coptic2;
      default: return null;
    }
  };

  const studentAnswers = result.answers || {};
  const normResultStage = normalizeArabic(result.stage || '');

  // Filter stage questions if available, otherwise match against whole questions pool
  const stageQuestions = questions.length > 0
    ? questions.filter(q => !normResultStage || normalizeArabic(q.stage || '') === normResultStage)
    : [];
  const activeQuestions = stageQuestions.length > 0 ? stageQuestions : questions;

  // 1. Process standard & excellence question answers by matching questions bank
  if (activeQuestions.length > 0 && typeof studentAnswers === 'object' && Object.keys(studentAnswers).length > 0) {
    activeQuestions.forEach(q => {
      const catType = normalizeCategoryType(q.subject_name);
      const target = getTarget(catType);
      if (!target) return;

      const qKey = q.id || `q_${q.question_text}`;
      const studentAns = studentAnswers[q.id] !== undefined
        ? studentAnswers[q.id]
        : (studentAnswers[qKey] !== undefined
            ? studentAnswers[qKey]
            : (studentAnswers[`q_${q.question_text}`] !== undefined ? studentAnswers[`q_${q.question_text}`] : undefined));

      const qScore = Number(q.score) || 1;
      const isCorrect = studentAns !== undefined && studentAns !== null && String(studentAns).trim() === String(q.correct_answer || '').trim();

      if (q.is_excellence) {
        target.maxExcellence += qScore;
        if (isCorrect) {
          target.excellence += qScore;
        }
      } else {
        target.maxScore += qScore;
        if (isCorrect) {
          target.score += qScore;
        }
      }
    });
  }

  // 2. Process excellence_answers if stored explicitly in result
  if (result.excellence_answers && typeof result.excellence_answers === 'object') {
    Object.entries(result.excellence_answers).forEach(([catName, val]: [string, any]) => {
      const catType = normalizeCategoryType(catName);
      const target = getTarget(catType);
      if (target && val) {
        const pts = Number(val.score) || 1;
        if (val.is_correct) {
          if (target.excellence === 0) {
            target.excellence = pts;
          }
        }
        if (target.maxExcellence === 0) {
          target.maxExcellence = pts;
        }
      }
    });
  }

  // 3. Process category_scores if pre-stored as an object in the result record
  if (result.category_scores && typeof result.category_scores === 'object') {
    Object.entries(result.category_scores).forEach(([catName, val]: [string, any]) => {
      const catType = normalizeCategoryType(catName);
      const target = getTarget(catType);
      if (target) {
        if (typeof val === 'number') {
          target.score = val;
        } else if (val && typeof val === 'object') {
          if (typeof val.score === 'number') target.score = val.score;
          if (typeof val.excellence === 'number') target.excellence = val.excellence;
        }
      }
    });
  }

  // 4. Handle fallback if no questions were matched or legacy single score
  const totalStandardCalculated = curriculum.score + hymns.score + coptic1.score + coptic2.score;
  const totalExcellenceCalculated = curriculum.excellence + hymns.excellence + coptic1.excellence + coptic2.excellence;

  let totalStandardScore = totalStandardCalculated;
  let totalExcellencePoints = totalExcellenceCalculated;

  // Fallback for standard score if not broken down by questions
  const rawStandardScore = Number(result.total_score !== undefined ? result.total_score : (result.score || 0));
  if (totalStandardScore === 0 && rawStandardScore > 0) {
    const catType = normalizeCategoryType(result.subject_name || '');
    const target = getTarget(catType);
    if (target) {
      target.score = rawStandardScore;
      target.maxScore = Number(result.max_score || rawStandardScore);
    } else {
      curriculum.score = rawStandardScore;
      curriculum.maxScore = Number(result.max_score || rawStandardScore);
    }
    totalStandardScore = rawStandardScore;
  }

  // Fallback for excellence points if not broken down
  const rawExcellence = Number(result.excellence_points || 0);
  if (totalExcellencePoints === 0 && rawExcellence > 0) {
    if (Array.isArray(result.excellence_categories) && result.excellence_categories.length > 0) {
      const catType = normalizeCategoryType(result.excellence_categories[0]);
      const target = getTarget(catType);
      if (target) {
        target.excellence = rawExcellence;
      } else {
        curriculum.excellence = rawExcellence;
      }
    } else {
      curriculum.excellence = rawExcellence;
    }
    totalExcellencePoints = rawExcellence;
  }

  curriculum.total = curriculum.score + curriculum.excellence;
  hymns.total = hymns.score + hymns.excellence;
  coptic1.total = coptic1.score + coptic1.excellence;
  coptic2.total = coptic2.score + coptic2.excellence;

  const grandTotal = totalStandardScore + totalExcellencePoints;
  const maxScore = Number(result.max_score || (curriculum.maxScore + hymns.maxScore + coptic1.maxScore + coptic2.maxScore) || totalStandardScore);
  const maxExcellencePoints = Number(result.max_excellence_points || (curriculum.maxExcellence + hymns.maxExcellence + coptic1.maxExcellence + coptic2.maxExcellence) || totalExcellencePoints);

  const percentage = Number(
    result.percentage !== undefined
      ? result.percentage
      : (maxScore > 0 ? ((totalStandardScore / maxScore) * 100).toFixed(1) : 0)
  );

  return {
    id: result.id,
    exam_code: result.exam_code || result.student_code || '',
    student_name: result.student_name || '',
    church_name: result.church_name || '',
    stage: result.stage || '',
    subject_name: result.subject_name || 'امتحان الأسقفية',
    completed_at: result.completed_at || result.submitted_at || (result as any).created_at,
    submitted_at: result.submitted_at || result.completed_at,
    raw: result,
    curriculum,
    hymns,
    coptic1,
    coptic2,
    totalStandardScore,
    totalExcellencePoints,
    grandTotal,
    maxScore,
    maxExcellencePoints,
    percentage
  };
};

/**
 * Deletes a student exam result and optionally resets their code for re-entry
 */
export const deleteBishopricExamResult = async (
  id?: string,
  exam_code?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    let query = supabase.from('bishopric_exam_results').delete();
    if (id) {
      query = query.eq('id', id);
    } else if (exam_code) {
      query = query.eq('exam_code', exam_code.trim());
    } else {
      return { success: false, error: 'معرف النتيجة أو كود المشترك غير محدد' };
    }

    const { error } = await query;
    if (error) {
      console.error('Error deleting bishopric exam result:', error);
      return { success: false, error: error.message };
    }

    // Reset code status if exam_code provided so student can retake if needed
    if (exam_code) {
      const cleanCode = exam_code.trim();
      await supabase
        .from('bishopric_exam_codes')
        .update({ is_used: false, status: 'unused' })
        .eq('exam_code', cleanCode);
      
      updateLocalCacheCodeStatus(cleanCode, false);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Delete bishopric exam result error:', err);
    return { success: false, error: err.message || 'فشل في حذف النتيجة' };
  }
};

/**
 * Updates local cache items (is_used status) for quota protection and offline reliability
 */
export const updateLocalCacheCodeStatus = (code: string, isUsed: boolean) => {
  const cleanCode = (code || '').trim().toLowerCase();
  if (!cleanCode) return;

  const targetKeys: string[] = ['bishopric_active_church_codes'];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bishopric_cached_codes_') && !targetKeys.includes(key)) {
        targetKeys.push(key);
      }
    }

    for (const k of targetKeys) {
      const dataStr = localStorage.getItem(k);
      if (dataStr) {
        const list: any[] = JSON.parse(dataStr);
        let modified = false;
        const updated = list.map(item => {
          const itemCode = (item.code || item.exam_code || '').trim().toLowerCase();
          if (itemCode === cleanCode) {
            modified = true;
            return {
              ...item,
              is_used: isUsed,
              status: isUsed ? 'used' : item.status
            };
          }
          return item;
        });
        if (modified) {
          localStorage.setItem(k, JSON.stringify(updated));
        }
      }
    }
  } catch (e) {
    console.warn('Error updating local cache status:', e);
  }
};

/**
 * Updated Exam Submission Function for Bishopric Portal
 * Dynamically separates standard and excellence scores, enforces 2-step atomic verification,
 * and maintains local cache synchronization.
 */
export const handleSubmitBishopricExam = async (
  studentCode: string,
  userAnswers: Record<string, any>,
  allQuestions: any[],
  setIsLoadingSpinnerVisible: (loading: boolean) => void,
  showBubble: (config: any) => void,
  setIsExamActive: (active: boolean) => void,
  metadata?: {
    student_name?: string;
    church_name?: string;
    stage?: string;
    subject_name?: string;
    max_score?: number;
    max_excellence_points?: number;
    excellence_unlocked?: boolean;
    excellence_categories?: string[];
    excellence_answers?: Record<string, any>;
  }
) => {
  setIsLoadingSpinnerVisible(true);

  try {
    const cleanCode = (studentCode || '').trim();
    if (!cleanCode) {
      throw new Error('كود الطالب غير صحيح.');
    }

    // 1. Separate standard and excellence scores
    let standardScore = 0;
    let excellencePoints = 0;

    allQuestions.forEach((q) => {
      const qKey = q.id || `q_${q.question_text}`;
      const studentAns = userAnswers[qKey] !== undefined ? userAnswers[qKey] : userAnswers[q.id];
      const isCorrect = studentAns !== undefined && String(studentAns).trim() === String(q.correct_answer || '').trim();
      const points = Number(q.points) || Number(q.score) || 1;

      if (isCorrect) {
        if (q.is_excellence) {
          excellencePoints += points;
        } else {
          standardScore += points;
        }
      }
    });

    const nowIso = new Date().toISOString();
    const payload: any = {
      student_code: cleanCode,
      exam_code: cleanCode,
      answers: userAnswers,
      score: standardScore,
      total_score: standardScore,
      excellence_points: excellencePoints, // Saved as a separate column
      submitted_at: nowIso,
      completed_at: nowIso,
      status: 'completed'
    };

    if (metadata) {
      if (metadata.student_name) payload.student_name = metadata.student_name.trim();
      if (metadata.church_name) payload.church_name = metadata.church_name.trim();
      if (metadata.stage) payload.stage = metadata.stage;
      if (metadata.subject_name) payload.subject_name = metadata.subject_name;
      if (metadata.max_score !== undefined) {
        payload.max_score = metadata.max_score;
        payload.percentage = metadata.max_score > 0 
          ? Number(((standardScore / metadata.max_score) * 100).toFixed(1)) 
          : 0;
      }
      if (metadata.max_excellence_points !== undefined) {
        payload.max_excellence_points = metadata.max_excellence_points;
      }
      if (metadata.excellence_unlocked !== undefined) {
        payload.excellence_unlocked = metadata.excellence_unlocked;
      }
      if (metadata.excellence_categories) {
        payload.excellence_categories = metadata.excellence_categories;
      }
      if (metadata.excellence_answers) {
        payload.excellence_answers = metadata.excellence_answers;
      }
    }

    // 2. Insert exam results and verify server receipt using .select()
    const { data: resultData, error: resultError } = await supabase
      .from('bishopric_exam_results')
      .upsert([payload], { onConflict: 'exam_code' })
      .select();

    if (resultError || !resultData || resultData.length === 0) {
      throw new Error(resultError?.message || 'Server failed to acknowledge result insertion.');
    }

    // 3. Update code status ONLY AFTER confirmed insertion
    const { error: codeUpdateError } = await supabase
      .from('bishopric_exam_codes')
      .update({ 
        is_used: true, 
        used_at: nowIso,
        status: 'used'
      })
      .or(`code.eq.${cleanCode},exam_code.eq.${cleanCode}`);

    if (codeUpdateError) {
      console.warn('Result saved but code status update encountered an issue:', codeUpdateError);
    }

    // 4. Synchronize local storage cache
    const cachedData = localStorage.getItem('bishopric_active_church_codes');
    if (cachedData) {
      try {
        const codesList = JSON.parse(cachedData);
        const updatedList = codesList.map((item: any) =>
          ((item.code && item.code.trim() === cleanCode) || (item.exam_code && item.exam_code.trim() === cleanCode))
            ? { ...item, is_used: true, status: 'used' }
            : item
        );
        localStorage.setItem('bishopric_active_church_codes', JSON.stringify(updatedList));
      } catch (e) {
        console.error('Local cache sync error:', e);
      }
    }
    updateLocalCacheCodeStatus(cleanCode, true);

    // 5. Finalize UI State
    setIsLoadingSpinnerVisible(false);
    showBubble({
      type: 'success',
      title: 'تم حفظ الامتحان بنجاح',
      message: 'تم تسليم إجاباتك وتأكيد درجاتك بنجاح !'
    });
    setIsExamActive(false);

    return { success: true, data: resultData[0] };

  } catch (err: any) {
    console.error('Bishopric Exam Submission Error:', err);
    setIsLoadingSpinnerVisible(false);
    showBubble({
      type: 'error',
      title: 'فشل الحفظ',
      message: 'تعذر تأكيد الحفظ ، يرجى إعادة المحاولة'
    });
    return { success: false, error: err?.message || 'تعذر تأكيد الحفظ ، يرجى إعادة المحاولة' };
  }
};

/**
 * Submit / Upsert student exam result into bishopric_exam_results
 * Strict Network Handshake with auto-retry loop and Supabase confirmation
 * Crucial Rule: update bishopric_exam_codes (is_used = true) ONLY AFTER verified results insert.
 */
export const submitBishopricExamResult = async (
  result: BishopricExamResult,
  maxRetries = 3,
  onAttempt?: (attempt: number) => void
): Promise<{ success: boolean; data?: BishopricExamResult; error?: string }> => {
  const code = (result.exam_code || result.student_code || '').trim();
  const nowIso = new Date().toISOString();

  const payload: any = {
    exam_code: code,
    student_code: code,
    student_name: (result.student_name || '').trim(),
    church_name: (result.church_name || '').trim(),
    stage: result.stage,
    subject_name: result.subject_name || 'امتحان الأسقفية',
    score: Number(result.total_score) || 0,
    total_score: Number(result.total_score) || 0,
    max_score: Number(result.max_score) || 0,
    percentage: Number(result.percentage) || 0,
    excellence_points: Number(result.excellence_points) || 0,
    max_excellence_points: Number(result.max_excellence_points) || 0,
    answers: {
      ...(typeof result.answers === 'object' ? result.answers : {}),
      _meta_excellence: {
        points: Number(result.excellence_points) || 0,
        max_points: Number(result.max_excellence_points) || 0,
        unlocked: Boolean(result.excellence_unlocked),
        categories: result.excellence_categories || [],
        excellence_answers: result.excellence_answers || {}
      }
    },
    status: result.status || 'completed',
    submitted_at: result.submitted_at || nowIso,
    completed_at: result.completed_at || nowIso
  };

  let lastError = '';

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    if (onAttempt) onAttempt(attempt);
    try {
      // 1. أ) حفظ النتائج والتأكد عبر .select()
      const { data: resultData, error: resultError } = await supabase
        .from('bishopric_exam_results')
        .upsert([payload], { onConflict: 'exam_code' })
        .select();

      if (resultError || !resultData || resultData.length === 0) {
        throw new Error(resultError?.message || 'لم يتلق السيرفر إشارة تأكيد الحفظ.');
      }

      // 2. ب) تحديث حالة الكود كـ مستخدم في السيرفر فقط بعد تأكيد حفظ النتيجة
      try {
        await supabase
          .from('bishopric_exam_codes')
          .update({ 
            is_used: true, 
            used_at: nowIso, 
            status: 'used' 
          })
          .eq('exam_code', code);
      } catch (updateErr) {
        console.warn('Note updating bishopric_exam_codes is_used status:', updateErr);
      }

      // 3. ج) تحديث الكاش المحلي
      updateLocalCacheCodeStatus(code, true);

      // 4. د) إرجاع النجاح فقط بعد استلام التأكيد المباشر من السيرفر
      return { success: true, data: resultData[0] as BishopricExamResult };
    } catch (err: any) {
      console.warn(`[BishopricHandshake] Attempt ${attempt}/${maxRetries} failed:`, err);
      lastError = err.message || 'لم يتم تأكيد حفظ الإجابة على السيرفر!';
      if (attempt < maxRetries) {
        await new Promise(res => setTimeout(res, 1200));
      }
    }
  }

  return { 
    success: false, 
    error: lastError || 'تعذر تأكيد الحفظ ، يرجى إعادة المحاولة' 
  };
};

/**
 * Sanitize user input code (trim, uppercase, and convert Eastern Arabic digits ٠-٩ to Standard English digits 0-9)
 */
export const sanitizeExamCode = (inputCode: string): string => {
  if (!inputCode) return '';
  return inputCode
    .trim()
    .toUpperCase()
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());
};

/**
 * Normalizes and resolves student record fields (handles swapped student_name/stage in dataset)
 */
export const resolveBishopricRecordFields = (data: any): BishopricExamRecord => {
  if (!data) return data;
  let stage = (data.stage || '').trim();
  let student_name = (data.student_name || '').trim();

  const stageKeywords = [
    'حضانة', 'حضانه', 'أولى', 'اولى', 'ثانية', 'ثانيه', 'ثالثة', 'ثالثه',
    'رابعة', 'رابعه', 'خامسة', 'خامسه', 'سادسة', 'سادسه', 'إعدادي', 'اعدادي',
    'ثانوي', 'جامعة', 'جامعه', 'خريجين', 'كبار', 'حرفيون', 'سمعان', 'قدرات'
  ];

  const studentNameMatchesStage = stageKeywords.some(kw => student_name.includes(kw));
  const stageMatchesKnownKeyword = stageKeywords.some(kw => stage.includes(kw));

  if (studentNameMatchesStage && !stageMatchesKnownKeyword) {
    console.log(`[Stage Field Normalization] Swapped fields detected for code ${data.exam_code || data.code}. Normalizing: student_name="${data.stage}", stage="${data.student_name}"`);
    const temp = student_name;
    student_name = stage;
    stage = temp;
  }

  const cleanCode = sanitizeExamCode(data.exam_code || data.code || '');

  return {
    ...data,
    student_name,
    stage,
    exam_code: cleanCode || data.exam_code || data.code,
    code: cleanCode || data.code || data.exam_code
  };
};

/**
 * Smart Church Caching & Verification (الكاش الذكي لحماية الكوتا ومنع تكرار الدخول)
 * 1. Check local cache first
 * 2. If not found, fetch from Supabase ONCE and cache full church dataset
 * 3. Enforce single use and stage constraints
 */
export const verifyBishopricCodeWithCache = async (
  enteredCode: string,
  availableStages: string[] = []
): Promise<{
  success: boolean;
  student?: BishopricExamRecord;
  alreadySubmitted?: BishopricExamResult | null;
  error?: string;
  isUsed?: boolean;
}> => {
  const formattedCode = sanitizeExamCode(enteredCode);
  if (!formattedCode) {
    console.warn('Code verification failed: Empty input code');
    return { success: false, error: 'يرجى إدخال كود امتحان الأسقفية الخاص بك' };
  }

  console.log(`[ExamCodeVerify] Verifying formatted code: "${formattedCode}" (raw input: "${enteredCode}")`);

  // أ) البحث في الكاش المحلي أولاً (LocalStorage) لحماية الكوتا
  const localCacheKeys = ['bishopric_active_church_codes'];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('bishopric_cached_codes_') && !localCacheKeys.includes(key)) {
        localCacheKeys.push(key);
      }
    }
  } catch (e) {}

  let foundLocalRaw: any = null;
  for (const cacheKey of localCacheKeys) {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const list: any[] = JSON.parse(cached);
        const match = list.find((c: any) => {
          const itemCode = sanitizeExamCode(c.exam_code || c.code || '');
          return itemCode === formattedCode;
        });
        if (match) {
          foundLocalRaw = match;
          break;
        }
      }
    } catch (e) {
      console.warn('Cache read error:', e);
    }
  }

  if (foundLocalRaw) {
    const foundLocal = resolveBishopricRecordFields(foundLocalRaw);
    console.log(`[ExamCodeVerify] Found in local cache:`, foundLocal);

    if (foundLocal.is_used || (foundLocal as any).status === 'used' || (foundLocal as any).status === 'completed') {
      console.warn(`Code ${formattedCode} has already been used.`);
      return {
        success: false,
        student: foundLocal,
        error: 'عفواً، تم استخدام هذا الكود في الامتحان من قبل.',
        isUsed: true
      };
    }

    if ((foundLocal as any).is_active === false) {
      console.warn(`Code ${formattedCode} is disabled.`);
      return {
        success: false,
        student: foundLocal,
        error: 'هذا الكود غير مفعّل حالياً.'
      };
    }

    // تحقق سريع حي ومباشر من السيرفر
    try {
      const { data: statusCheck, error: statusErr } = await supabase
        .from('bishopric_exam_codes')
        .select('id, is_used, status, is_active')
        .eq('exam_code', formattedCode)
        .maybeSingle();

      if (!statusErr && statusCheck) {
        if (statusCheck.is_used || statusCheck.status === 'used' || statusCheck.status === 'completed') {
          console.warn(`Code ${formattedCode} has already been used on server.`);
          updateLocalCacheCodeStatus(formattedCode, true);
          return {
            success: false,
            student: foundLocal,
            error: 'عفواً، تم استخدام هذا الكود في الامتحان من قبل.',
            isUsed: true
          };
        }
        if (statusCheck.is_active === false) {
          console.warn(`Code ${formattedCode} is disabled on server.`);
          return {
            success: false,
            student: foundLocal,
            error: 'هذا الكود غير مفعّل حالياً.'
          };
        }
      }
    } catch (e) {}

    // Stage Matching (Insensitive comparison)
    if (availableStages && availableStages.length > 0) {
      const isStageAvailable = availableStages.some(
        (st) => st.trim().toLowerCase() === foundLocal.stage?.trim().toLowerCase() ||
                normalizeArabic(st) === normalizeArabic(foundLocal.stage)
      );
      if (!isStageAvailable) {
        console.warn(`Stage Mismatch: Code Stage [${foundLocal.stage}] not in Available Stages [${availableStages.join(', ')}]`);
        return {
          success: false,
          student: foundLocal,
          error: 'الكود لا ينتمي للمراحل المتاحة للامتحان حالياً.'
        };
      }
    }

    return {
      success: true,
      student: foundLocal,
      alreadySubmitted: null
    };
  }

  // ب) الجلب من السيرفر عند أول مرة فقط
  try {
    // 1. Fetch Code Entry from Database
    const { data: codeData, error } = await supabase
      .from('bishopric_exam_codes')
      .select('*')
      .eq('exam_code', formattedCode)
      .maybeSingle();

    if (error) {
      console.error("Database Query Error:", error);
      return {
        success: false,
        error: "حدث خطأ أثناء الاتصال بقاعدة البيانات."
      };
    }

    // 2. Failure Diagnostics
    if (!codeData) {
      console.warn(`Code ${formattedCode} not found in database.`);
      return {
        success: false,
        error: "الكود غير صحيح أو غير مسجل بالنظام."
      };
    }

    if (codeData.is_used || codeData.status === 'used' || codeData.status === 'completed') {
      console.warn(`Code ${formattedCode} has already been used.`);
      updateLocalCacheCodeStatus(formattedCode, true);
      return {
        success: false,
        student: resolveBishopricRecordFields(codeData),
        error: "عذراً، هذا الكود تم استخدامه لأداء الامتحان من قبل.",
        isUsed: true
      };
    }

    if (codeData.is_active === false) {
      console.warn(`Code ${formattedCode} is disabled.`);
      return {
        success: false,
        student: resolveBishopricRecordFields(codeData),
        error: "هذا الكود غير مفعّل حالياً."
      };
    }

    const resolvedRecord = resolveBishopricRecordFields(codeData);

    // 3. Stage Matching (Insensitive comparison)
    if (availableStages && availableStages.length > 0) {
      const isStageAvailable = availableStages.some(
        (stage) => stage.trim().toLowerCase() === resolvedRecord.stage?.trim().toLowerCase() ||
                   normalizeArabic(stage) === normalizeArabic(resolvedRecord.stage)
      );

      if (!isStageAvailable) {
        console.warn(`Stage Mismatch: Code Stage [${resolvedRecord.stage}] not in Available Stages [${availableStages.join(', ')}]`);
        return {
          success: false,
          student: resolvedRecord,
          error: "الكود لا ينتمي للمراحل المتاحة للامتحان حالياً."
        };
      }
    }

    // Check previous submitted result
    const prevResult = await fetchBishopricStudentResult(formattedCode);
    if (prevResult && (prevResult.status === 'completed' || prevResult.percentage !== undefined)) {
      console.warn(`Code ${formattedCode} has a completed result record.`);
      updateLocalCacheCodeStatus(formattedCode, true);
      return {
        success: false,
        student: resolvedRecord,
        alreadySubmitted: prevResult,
        error: "عذراً، هذا الكود تم استخدامه لأداء الامتحان من قبل.",
        isUsed: true
      };
    }

    // ج) جلب أكواد الكنيسة بالكامل وتخزينها كاش لحماية الكوتا
    if (codeData.church_name) {
      try {
        const { data: churchCodes, error: churchErr } = await supabase
          .from('bishopric_exam_codes')
          .select('id, exam_code, is_used, student_name, stage, church_name, status, is_active')
          .eq('church_name', codeData.church_name);

        if (!churchErr && churchCodes && churchCodes.length > 0) {
          localStorage.setItem('bishopric_active_church_codes', JSON.stringify(churchCodes));
          const sanitizedChurch = codeData.church_name.trim().replace(/\s+/g, '_');
          localStorage.setItem(`bishopric_cached_codes_${sanitizedChurch}`, JSON.stringify(churchCodes));
        }
      } catch (cacheErr) {
        console.warn('Error caching church codes:', cacheErr);
      }
    }

    console.log(`[ExamCodeVerify] Code ${formattedCode} verified successfully: student="${resolvedRecord.student_name}", stage="${resolvedRecord.stage}"`);

    return {
      success: true,
      student: resolvedRecord,
      alreadySubmitted: null
    };

  } catch (err: any) {
    console.error("Database Query Error:", err);
    return {
      success: false,
      error: "حدث خطأ أثناء الاتصال بقاعدة البيانات."
    };
  }
};

/**
 * Verify student by exam code (Aliased to verifyBishopricCodeWithCache)
 */
export const verifyBishopricStudentCode = verifyBishopricCodeWithCache;
