import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { supabase } from '../utils/supabaseClient';
import { 
  FileSpreadsheet, 
  Settings, 
  Download, 
  FileArchive, 
  HelpCircle, 
  Phone, 
  Calendar, 
  Check, 
  RefreshCw, 
  AlertCircle,
  FolderArchive,
  ChevronDown,
  Sparkles,
  Info
} from 'lucide-react';

/**
 * Normalizes raw competitions input into a clean string array.
 * Prevents character-by-character string iteration bugs when writing to Excel cells.
 */
export const parseCompetitions = (rawComps: any): string[] => {
  if (!rawComps) return [];
  if (Array.isArray(rawComps)) {
    return rawComps.map(item => String(item).trim()).filter(Boolean);
  }
  if (typeof rawComps === 'string') {
    const trimmed = rawComps.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item).trim()).filter(Boolean);
        }
      } catch (_) {
        // Fall back to split if JSON parsing fails
      }
    }
    return trimmed.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean);
  }
  return [String(rawComps).trim()].filter(Boolean);
};

/**
 * Safely quotes and escapes string values for PostgREST .or() filter queries in Supabase.
 * Handles special characters like parentheses '()' or commas ',' in church names without syntax errors.
 */
export const escapePostgrestValue = (val: string): string => {
  if (!val) return '""';
  const escaped = val.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
};

/**
 * Resolves standardized public paths for Excel template files.
 * Uses import.meta.env.BASE_URL to support both local dev and production builds.
 */
export const getTemplatePath = (templateOrCategory: string): string => {
  const base = import.meta.env.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  
  let fileName = '';
  if (templateOrCategory === 'primary' || templateOrCategory.includes('ابتدائي')) {
    fileName = 'تسجيل مشتركين ابتدائي 2026.xls';
  } else if (
    templateOrCategory === 'prep_servants' || 
    templateOrCategory.includes('اعدادي') || 
    templateOrCategory.includes('إعدادي') || 
    templateOrCategory.includes('خدام')
  ) {
    fileName = 'تسجيل مشتركين من اعدادي لخدام 2026.xls';
  } else if (
    templateOrCategory === 'special_needs' || 
    templateOrCategory === 'special' || 
    templateOrCategory.includes('فئات خاصة')
  ) {
    fileName = 'تسجيل مشتركين فئات خاصة 2026.xls';
  } else {
    fileName = templateOrCategory.replace(/^\/?(public\/)?(templates\/)?/, '').trim();
  }

  return `${cleanBase}templates/${encodeURIComponent(fileName)}`;
};

export type TemplateType = 'primary' | 'special' | 'prep_servants';

export interface TemplateMappingInfo {
  storageName: string;
  downloadName: string;
}

/**
 * Template Mapping dictionary connecting each stage key, its internal storage file name on Supabase Storage
 * (English without spaces), and its display file name in Arabic for the user download.
 */
export const TEMPLATE_MAPPING: Record<TemplateType, TemplateMappingInfo> = {
  primary: {
    storageName: 'primary_registration_2026.xls',
    downloadName: 'تسجيل مشتركين ابتدائي 2026.xls',
  },
  special: {
    storageName: 'special_categories_2026.xls',
    downloadName: 'تسجيل مشتركين فئات خاصة 2026.xls',
  },
  prep_servants: {
    storageName: 'prep_to_servants_2026.xls',
    downloadName: 'تسجيل مشتركين من اعدادي لخدام 2026.xls',
  },
};

export const isQualifiedForNextStage = (student: any): boolean => {
  if (!student) return false;
  if (
    student.is_qualified === true ||
    student.isQualified === true ||
    student.is_qualified_next_stage === true ||
    student.isQualifiedForNextStage === true ||
    student.isHonored === true ||
    student.isMokaram === true ||
    student.is_honored === true ||
    String(student.is_qualified).toLowerCase() === 'true' ||
    String(student.isQualified).toLowerCase() === 'true'
  ) {
    return true;
  }
  const score = Number(student.academicScore || student.totalScore || 0);
  return score >= 50;
};

// Helper to sanitize student name to be between 3 and 5 words max
export const sanitizeStudentName = (rawName: string): string => {
  if (!rawName) return 'اسم المشترك الثلاثي';
  const cleaned = String(rawName).replace(/[\t\n\r]/g, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'اسم المشترك الثلاثي';
  
  if (words.length > 5) {
    return words.slice(0, 5).join(' ');
  }
  
  if (words.length < 3) {
    const defaultPads = ['سامح', 'جرجس', 'مكرم'];
    let padIdx = 0;
    while (words.length < 3) {
      words.push(defaultPads[padIdx % defaultPads.length]);
      padIdx++;
    }
    return words.join(' ');
  }
  
  return words.join(' ');
};

// Default Birth Year Ranges for each stage
export const DEFAULT_BIRTH_YEARS: Record<string, { min: number; max: number }> = {
  "حضانة": { min: 2020, max: 2022 },
  "أولى وثانية": { min: 2018, max: 2019 },
  "ثالثة ورابعة": { min: 2016, max: 2017 },
  "خامسة وسادسة": { min: 2014, max: 2015 },
  "إعدادي": { min: 2011, max: 2013 },
  "ثانوي": { min: 2008, max: 2010 },
  "جامعة": { min: 2002, max: 2007 },
  "خريجون": { min: 1990, max: 2001 },
  "خدام وإعداد الخدام": { min: 1970, max: 2005 },
  "حرفيون": { min: 1980, max: 2005 },
  "قانا الجليل": { min: 1970, max: 1995 },
  "تعليم الكبار": { min: 1950, max: 2000 },
  "صم وبكم": { min: 1980, max: 2015 },
  "سمعان الشيخ": { min: 1940, max: 1965 },
  "ذوي القدرات": { min: 1980, max: 2015 },
  "ديديموس": { min: 1980, max: 2015 },
  "بولس وسيلا": { min: 1980, max: 2015 }
};

export const getRandomBirthdate = (stageName: string, yearRanges: Record<string, { min: number; max: number }> = DEFAULT_BIRTH_YEARS) => {
  const range = yearRanges[stageName] || { min: 2000, max: 2010 };
  const year = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1;
  return { day, month, year };
};

/**
 * Top-level Core Function: Fill a specific Excel workbook directly in template binary (.xls BIFF8 format)
 */
export async function fillExcelTemplateBuffer(
  templateName: string,
  studentsList: any[],
  fallbackPhone: string = '01234567890'
): Promise<ArrayBuffer> {
  const templateUrl = getTemplatePath(templateName);
  console.log("Fetching exact template from:", templateUrl);

  const resp = await fetch(templateUrl);
  if (!resp.ok) {
    throw new Error(`HTTP Error ${resp.status} loading template from ${templateUrl}`);
  }

  const contentType = resp.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('text/html')) {
    throw new Error(`File not found on server (404 HTML response for ${templateUrl}).`);
  }

  const templateBuffer = await resp.arrayBuffer();
  if (!templateBuffer || templateBuffer.byteLength === 0) {
    throw new Error(`Downloaded template buffer is empty for ${templateName}`);
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(templateBuffer, { 
      type: 'array', 
      cellStyles: true, 
      cellFormula: true, 
      cellDates: true, 
      cellNF: true,
      sheetStubs: true
    });
  } catch (err) {
    console.error(`Failed to read template binary from ${templateUrl}:`, err);
    throw new Error(`Could not parse template binary for ${templateName}`);
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error(`Official template ${templateName} has no valid worksheets.`);
  }

  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];

  // Filter list to keep ONLY qualified students (المصعدين) from local results
  const qualifiedStudents = studentsList.filter((student) => {
    return isQualifiedForNextStage(student);
  });

  // Row writing starts strictly at ROW 3 (0-indexed rIdx = 2 -> A3, B3, C3...)
  let currentRow = 3;

  qualifiedStudents.forEach(student => {
    const rIdx = currentRow - 1; // 0-indexed row for SheetJS

    // Column A (Row 3 onwards - A3): Student Name (اسم المتسابق) - 3 to 5 words max
    const rawName = student.name || student.studentName || student.fullName || '';
    const cleanName = sanitizeStudentName(rawName);
    ws[XLSX.utils.encode_cell({ r: rIdx, c: 0 })] = { t: 's', v: cleanName };

    // Column B (Row 3 onwards - B3): Mobile Number (رقم الموبايل)
    const phoneNum = student.phoneNumber || student.phone || student.mobile || fallbackPhone;
    ws[XLSX.utils.encode_cell({ r: rIdx, c: 1 })] = { t: 's', v: String(phoneNum) };

    // Column C (Row 3 onwards - C3): Gender Dropdown (ذكر / أنثى)
    const isFemale = student.gender === 'أنثى' || student.gender === 'female' || student.gender === 'انثى';
    const genderStr = isFemale ? 'أنثى' : 'ذكر';
    ws[XLSX.utils.encode_cell({ r: rIdx, c: 2 })] = { t: 's', v: genderStr };

    // Column D (Day), E (Month), F (Year) starting strictly at Row 3
    let day = student.birthDay || student.day;
    let month = student.birthMonth || student.month;
    let year = student.birthYear || student.year;

    if (!day || !month || !year) {
      const generated = getRandomBirthdate(student.stage);
      day = day || generated.day;
      month = month || generated.month;
      year = year || generated.year;
    }

    ws[XLSX.utils.encode_cell({ r: rIdx, c: 3 })] = { t: 'n', v: Number(day) };
    ws[XLSX.utils.encode_cell({ r: rIdx, c: 4 })] = { t: 'n', v: Number(month) };
    ws[XLSX.utils.encode_cell({ r: rIdx, c: 5 })] = { t: 'n', v: Number(year) };

    // Columns G to N (7 to 14): Registered Competitions
    const competitions = parseCompetitions(student.competitions);
    for (let i = 0; i < 8; i++) {
      ws[XLSX.utils.encode_cell({ r: rIdx, c: 6 + i })] = { t: 's', v: competitions[i] || '' };
    }

    currentRow++;
  });

  // Update worksheet dimensions range
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:N100');
  if (currentRow - 1 > range.e.r) {
    range.e.r = currentRow - 1;
    ws['!ref'] = XLSX.utils.encode_range(range);
  }

  // Export strictly as BIFF8 .xls binary buffer
  const outBuffer = XLSX.write(workbook, { bookType: 'biff8', type: 'array', cellStyles: true });
  return outBuffer;
}

/**
 * Single, unified export function in React that invokes the Supabase Edge Function 'generate-excel'
 * to populate and download template-based Excel files for all educational stages, preserving data validations
 * (dropdown lists) and original formatting without altering data content.
 */
export async function exportStudentsExcel(
  templateType: TemplateType,
  students: any[]
): Promise<void> {
  const config = TEMPLATE_MAPPING[templateType];
  if (!config) {
    throw new Error(`نوع القالب غير معروف: ${templateType}`);
  }

  const { storageName, downloadName } = config;

  console.log(`[exportStudentsExcel] Invoking Supabase Edge Function 'generate-excel' for: ${storageName}`, {
    studentCount: students?.length || 0,
  });

  try {
    const { data, error } = await supabase.functions.invoke('generate-excel', {
      body: {
        templateName: storageName,
        students: students || [],
      },
    });

    if (error) {
      console.warn(`[exportStudentsExcel] Edge function returned error for ${storageName}:`, error);
      throw error;
    }

    if (!data) {
      throw new Error('لم يتم استلام أي بيانات من Edge Function');
    }

    let blob: Blob;
    if (data instanceof Blob) {
      blob = data;
    } else if (data instanceof ArrayBuffer) {
      blob = new Blob([data], { type: 'application/vnd.ms-excel' });
    } else if (data && typeof data === 'object' && 'buffer' in data && (data as any).buffer instanceof ArrayBuffer) {
      blob = new Blob([(data as any).buffer], { type: 'application/vnd.ms-excel' });
    } else {
      throw new Error('تنسيق الاستجابة غير متوافق من Edge Function');
    }

    saveAs(blob, downloadName);
    console.log(`[exportStudentsExcel] Automated download triggered for: ${downloadName}`);
    return;
  } catch (edgeErr: any) {
    console.warn(`[exportStudentsExcel] Edge function invocation failed. Executing client fallback for ${downloadName}:`, edgeErr);

    try {
      const buffer = await fillExcelTemplateBuffer(downloadName, students);
      const blob = new Blob([buffer], { type: 'application/vnd.ms-excel' });
      saveAs(blob, downloadName);
      console.log(`[exportStudentsExcel] Download completed via client fallback: ${downloadName}`);
    } catch (fallbackErr: any) {
      console.error(`[exportStudentsExcel] Client fallback also failed:`, fallbackErr);
      const msg = fallbackErr?.message || fallbackErr || 'خطأ غير معروف';
      throw new Error(`فشل تصدير ملف Excel (${downloadName}): ${msg}`);
    }
  }
}

interface TemplateExcelExporterProps {
  participants: any[];
  userChurch?: string;
  isAdmin?: boolean;
}

export const TemplateExcelExporter: React.FC<TemplateExcelExporterProps> = ({ 
  participants = [], 
  userChurch = '', 
  isAdmin = false 
}) => {
  // Load settings from localStorage or defaults
  const [fallbackPhone, setFallbackPhone] = useState<string>(() => {
    return localStorage.getItem('export_fallback_phone') || '01234567890';
  });

  const [birthYearRanges, setBirthYearRanges] = useState<Record<string, { min: number; max: number }>>(() => {
    const saved = localStorage.getItem('export_birth_years');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved birth years, using defaults', e);
      }
    }
    return { ...DEFAULT_BIRTH_YEARS };
  });

  const [selectedChurch, setSelectedChurch] = useState<string>('الكل');
  const [activeTab, setActiveTab] = useState<'exporter' | 'settings'>('exporter');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });

  // Save settings on change
  useEffect(() => {
    localStorage.setItem('export_fallback_phone', fallbackPhone);
  }, [fallbackPhone]);

  useEffect(() => {
    localStorage.setItem('export_birth_years', JSON.stringify(birthYearRanges));
  }, [birthYearRanges]);

  // Set default church based on login role
  useEffect(() => {
    if (!isAdmin && userChurch) {
      setSelectedChurch(userChurch);
    }
  }, [isAdmin, userChurch]);

  const [churchOptions, setChurchOptions] = useState<string[]>([]);
  const [localQualifiedList, setLocalQualifiedList] = useState<any[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState<boolean>(true);

  const [minThreshold, setMinThreshold] = useState<number>(() => {
    try {
      const cached = localStorage.getItem('honors_min_threshold');
      return cached ? parseFloat(cached) : 90;
    } catch (e) {
      return 90;
    }
  });

  const [stageThresholds, setStageThresholds] = useState<Record<string, number>>(() => {
    try {
      const cached = localStorage.getItem('honors_stage_thresholds');
      if (cached) return JSON.parse(cached);
      return {};
    } catch (e) {
      return {};
    }
  });

  const [weightsMap, setWeightsMap] = useState<Record<string, Record<string, number>>>(() => {
    try {
      const cached = localStorage.getItem('honors_weights_matrix');
      if (cached) return JSON.parse(cached);
      return {};
    } catch (e) {
      return {};
    }
  });

  // Qualification evaluation algorithm matching AdminHonorsEngine.tsx logic
  const isQualifiedForNextStage = (student: any): boolean => {
    if (!student) return false;

    // 1. Explicit negative override
    if (student.is_qualified === false || student.is_qualified === 'false' || student.is_qualified === 0) {
      return false;
    }

    // 2. Explicit positive qualification / honor flags
    if (
      student.is_qualified === true || student.is_qualified === 'true' || student.is_qualified === 1 ||
      student.is_qualified_next_stage === true || student.isQualifiedForNextStage === true ||
      student.isHonored === true || student.isMokaram === true || student.is_honored === true
    ) {
      return true;
    }

    const stage = (student.stage || student.data?.['المرحلة'] || '').trim();
    const stThreshold = stageThresholds[stage] !== undefined 
      ? Number(stageThresholds[stage]) 
      : (minThreshold || 90);
    const stWeights = weightsMap[stage] || {};

    // 3. Subject score percentage check against stage threshold
    const subjects = ['دراسي', 'محفوظات', 'قبطي مستوى أول', 'قبطي مستوى ثاني'];
    let maxPerc = 0;

    subjects.forEach(subj => {
      let scoreVal: number | null = null;
      if (subj === 'دراسي') {
        const raw = student.derasy_score ?? student.academicScore ?? student.data?.['دراسي'] ?? student.data?.['المسابقة الدراسية'];
        if (raw !== undefined && raw !== null && raw !== '') scoreVal = parseFloat(raw);
      } else if (subj === 'محفوظات') {
        const raw = student.mahfouzat_score ?? student.memorizationScore ?? student.data?.['محفوظات'];
        if (raw !== undefined && raw !== null && raw !== '') scoreVal = parseFloat(raw);
      } else if (subj === 'قبطي مستوى أول') {
        const raw = student.qebty_lvl1_score ?? student.copticL1Score ?? student.data?.['قبطي مستوى أول'] ?? student.data?.['قبطي 1'];
        if (raw !== undefined && raw !== null && raw !== '') scoreVal = parseFloat(raw);
      } else if (subj === 'قبطي مستوى ثاني') {
        const raw = student.qebty_lvl2_score ?? student.copticL2Score ?? student.data?.['قبطي مستوى ثاني'] ?? student.data?.['قبطي مستوى ثان'] ?? student.data?.['قبطي 2'];
        if (raw !== undefined && raw !== null && raw !== '') scoreVal = parseFloat(raw);
      } else if (student.data && student.data[subj] !== undefined && student.data[subj] !== null && student.data[subj] !== '') {
        scoreVal = parseFloat(student.data[subj]);
      }

      if (scoreVal !== null && !isNaN(scoreVal) && scoreVal > 0) {
        const maxScore = Number(stWeights[subj]) || 100;
        if (maxScore > 0) {
          const perc = (scoreVal / maxScore) * 100;
          if (perc > maxPerc) maxPerc = perc;
        }
      }
    });

    // Check overall score percentage if subject scores were not individually matched
    if (maxPerc === 0) {
      if (student.percentage !== undefined && !isNaN(parseFloat(student.percentage))) {
        maxPerc = parseFloat(student.percentage);
      } else if (student.academicScore !== undefined && student.total_max_score && Number(student.total_max_score) > 0) {
        maxPerc = (parseFloat(student.academicScore) / parseFloat(student.total_max_score)) * 100;
      } else if (student.score !== undefined && student.total_max_score && Number(student.total_max_score) > 0) {
        maxPerc = (parseFloat(student.score) / parseFloat(student.total_max_score)) * 100;
      } else if (student.totalScore !== undefined && student.total_max_score && Number(student.total_max_score) > 0) {
        maxPerc = (parseFloat(student.totalScore) / parseFloat(student.total_max_score)) * 100;
      }
    }

    return maxPerc >= stThreshold;
  };

  // Fetch Local Qualification Results directly from DB (exam_submissions & registrations & honors_settings)
  const fetchLocalQualificationResults = async () => {
    setIsLoadingResults(true);
    try {
      // 1. Query honors settings for threshold percentages & weights
      let subQuery = supabase.from('exam_submissions').select('*');
      if (!isAdmin && userChurch) {
        const quotedChurch = escapePostgrestValue(userChurch);
        subQuery = subQuery.or(`churchName.eq.${quotedChurch},church.eq.${quotedChurch},church_name.eq.${quotedChurch}`);
      }

      let regQuery = supabase.from('registrations').select('*');
      if (!isAdmin && userChurch) {
        regQuery = regQuery.eq('churchName', userChurch);
      }

      const [honorsSnap, submissionsSnap, regSnap] = await Promise.all([
        supabase.from('honors_settings').select('*').eq('id', 'current_config').maybeSingle(),
        subQuery,
        Promise.resolve(regQuery).catch(() => ({ data: [] }))
      ]);

      if (honorsSnap.data) {
        const d = honorsSnap.data;
        if (d.min_threshold !== undefined) setMinThreshold(Number(d.min_threshold));
        if (d.stage_thresholds && typeof d.stage_thresholds === 'object') setStageThresholds(d.stage_thresholds);
        if (d.weights_matrix && typeof d.weights_matrix === 'object') {
          const w = { ...d.weights_matrix };
          if (w.__stage_thresholds__) {
            setStageThresholds(prev => ({ ...prev, ...w.__stage_thresholds__ }));
            delete w.__stage_thresholds__;
          }
          setWeightsMap(w);
        }
      }

      const submissionsData = submissionsSnap.data || [];

      // 2. Query registrations for phone numbers, competitions & registration-level qualification flags
      let regMap: Record<string, any> = {};
      let regList: any[] = [];
      if (regSnap && 'data' in regSnap && regSnap.data) {
        regList = regSnap.data;
        regList.forEach((r: any) => {
          const key = String(r.student_id || r.id || '').trim();
          if (key) regMap[key] = r;
          if (r.name) regMap[String(r.name).trim()] = r;
        });
      }

      const mergedMap = new Map<string, any>();

      // Process exam_submissions (Local Qualification Results)
      if (submissionsData && submissionsData.length > 0) {
        submissionsData.forEach((sb: any) => {
          const studentKey = String(sb.student_id || sb.id || sb.name || Math.random()).trim();
          const regInfo = regMap[studentKey] || regMap[String(sb.name || '').trim()] || {};

          const d = Number(sb.derasy_score || 0);
          const m = Number(sb.mahfouzat_score || 0);
          const q1 = Number(sb.qebty_lvl1_score || 0);
          const q2 = Number(sb.qebty_lvl2_score || 0);
          const totalScore = d + m + q1 + q2;

          const rawComps = regInfo.competitions || sb.competitions;
          const competitionsArr = parseCompetitions(rawComps);

          const candidateStudent = {
            id: studentKey,
            studentName: sb.name || regInfo.name || 'مشترك',
            name: sb.name || regInfo.name || 'مشترك',
            churchName: sb.churchName || sb.church_name || sb.church || regInfo.churchName || userChurch || 'كنيسة غير محددة',
            stage: sb.stage || regInfo.stage || '',
            gender: sb.gender || regInfo.gender || 'ذكر',
            phoneNumber: regInfo.phone || regInfo.phoneNumber || regInfo.mobile || sb.phone || sb.phoneNumber || '',
            competitions: competitionsArr,
            derasy_score: d,
            mahfouzat_score: m,
            qebty_lvl1_score: q1,
            qebty_lvl2_score: q2,
            academicScore: totalScore,
            is_qualified: sb.is_qualified ?? regInfo.is_qualified,
            isHonored: sb.is_honored || sb.isHonored || sb.isMokaram || regInfo.isHonored || regInfo.isMokaram,
            total_max_score: sb.total_max_score,
            percentage: sb.percentage,
            year: sb.year || regInfo.year || '2026',
            data: sb.data
          };

          if (isQualifiedForNextStage(candidateStudent)) {
            mergedMap.set(studentKey, candidateStudent);
          }
        });
      }

      // Also include any registrations explicitly marked as qualified or honored
      if (regList.length > 0) {
        regList.forEach((r: any) => {
          const key = String(r.student_id || r.id || r.name || '').trim();
          if (!mergedMap.has(key)) {
            const competitionsArr = parseCompetitions(r.competitions);

            const candidateStudent = {
              id: key,
              studentName: r.name || 'مشترك',
              name: r.name || 'مشترك',
              churchName: r.churchName || r.charchName || r.church || userChurch || 'كنيسة غير محددة',
              stage: r.stage || '',
              gender: r.gender || 'ذكر',
              phoneNumber: r.phone || r.phoneNumber || r.mobile || '',
              competitions: competitionsArr,
              is_qualified: r.is_qualified,
              isHonored: r.isHonored || r.isMokaram || r.is_honored,
              academicScore: r.academicScore || r.totalScore || 0,
              year: r.year || '2026',
              data: r.data
            };

            if (isQualifiedForNextStage(candidateStudent)) {
              mergedMap.set(key, candidateStudent);
            }
          }
        });
      }

      // Fallback to prop participants if DB query returned nothing
      if (mergedMap.size === 0 && participants && participants.length > 0) {
        participants.forEach((p: any) => {
          const candidateStudent = {
            ...p,
            studentName: p.name || p.studentName || 'مشترك',
            phoneNumber: p.phoneNumber || p.phone || p.mobile || '',
            churchName: p.churchName || p.charchName || p.church || '',
            competitions: parseCompetitions(p.competitions)
          };
          if (isQualifiedForNextStage(candidateStudent)) {
            const key = String(p.id || p.student_id || p.name || Math.random()).trim();
            mergedMap.set(key, candidateStudent);
          }
        });
      }

      const finalQualifiedArray = Array.from(mergedMap.values());
      setLocalQualifiedList(finalQualifiedArray);

      // Populate unique churches option dropdown
      const allChurchesInResults = Array.from(
        new Set(finalQualifiedArray.map((p: any) => p.churchName).filter(Boolean))
      ).sort() as string[];

      if (allChurchesInResults.length > 0) {
        setChurchOptions(prev => Array.from(new Set([...prev, ...allChurchesInResults])).sort());
      }

    } catch (err) {
      console.error("Failed to fetch local qualification results:", err);
    } finally {
      setIsLoadingResults(false);
    }
  };

  useEffect(() => {
    fetchLocalQualificationResults();
  }, [isAdmin, userChurch]);

  // Fetch unique sorted list of churches directly from database on mount
  useEffect(() => {
    const fetchChurches = async () => {
      try {
        const { data, error } = await supabase
          .from('church_access_codes')
          .select('church_name')
          .order('church_name', { ascending: true });
        
        if (error) {
          console.error("Error fetching church options:", error);
          return;
        }
        
        if (data) {
          const uniqueNames = Array.from(
            new Set(data.map((d: any) => d.church_name).filter(Boolean))
          ) as string[];
          setChurchOptions(prev => Array.from(new Set([...prev, ...uniqueNames])).sort());
        }
      } catch (err) {
        console.error("Error in fetchChurches:", err);
      }
    };
    fetchChurches();
  }, []);

  // Helper: map stage to template details with robust matching
  const getTemplateForStage = (stage: string): { templateName: string; displayName: string; category: 'primary' | 'prep_servants' | 'special' } => {
    const cleanStage = (stage || '').trim();

    // Special Needs / Special Categories (فئات خاصة)
    const isSpecial = 
      cleanStage.includes('صم') ||
      cleanStage.includes('سمعان') ||
      cleanStage.includes('قدرات') ||
      cleanStage.includes('ديديموس') ||
      cleanStage.includes('بولس') ||
      cleanStage.includes('خاصة');

    // Primary (ابتدائي)
    const isPrimary = 
      cleanStage.includes('حضانة') ||
      cleanStage.includes('أولى') ||
      cleanStage.includes('ثانية') ||
      cleanStage.includes('ثالثة') ||
      cleanStage.includes('رابعة') ||
      cleanStage.includes('خامسة') ||
      cleanStage.includes('سادسة') ||
      cleanStage.includes('ابتدائي') ||
      cleanStage.includes('ابتدائي');

    if (isSpecial) {
      return {
        templateName: 'تسجيل مشتركين فئات خاصة 2026.xls',
        displayName: 'تسجيل مشتركين فئات خاصة 2026.xls',
        category: 'special'
      };
    } else if (isPrimary) {
      return {
        templateName: 'تسجيل مشتركين ابتدائي 2026.xls',
        displayName: 'تسجيل مشتركين ابتدائي 2026.xls',
        category: 'primary'
      };
    } else {
      // Prep to Servants (إعدادي و ثانوي و خدام)
      return {
        templateName: 'تسجيل مشتركين من اعدادي لخدام 2026.xls',
        displayName: 'تسجيل مشتركين من اعدادي لخدام 2026.xls',
        category: 'prep_servants'
      };
    }
  };

  // Organize and filter participants for selected church
  const filteredParticipants = useMemo(() => {
    if (selectedChurch === 'الكل') return localQualifiedList;
    const norm = selectedChurch.trim();
    return localQualifiedList.filter(p => (p.churchName || '').trim() === norm);
  }, [localQualifiedList, selectedChurch]);

  // Count students by template category
  const countsByTemplate = useMemo(() => {
    const counts = { primary: 0, prep_servants: 0, special: 0 };
    filteredParticipants.forEach(p => {
      const { category } = getTemplateForStage(p.stage);
      counts[category]++;
    });
    return counts;
  }, [filteredParticipants]);

  // Helper: generate randomized birthdate
  const getRandomBirthdate = (stageName: string) => {
    const range = birthYearRanges[stageName] || { min: 2000, max: 2010 };
    const year = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1; // 1 to 28 is safe for all months
    return { day, month, year };
  };

  // Core Function: Fill a specific Excel workbook directly in template binary (.xls BIFF8 format)
  const fillTemplateBuffer = async (
    templateName: string,
    studentsList: any[]
  ): Promise<ArrayBuffer> => {
    const templateUrl = getTemplatePath(templateName);
    console.log("Fetching exact template from:", templateUrl);

    const resp = await fetch(templateUrl);
    if (!resp.ok) {
      throw new Error(`HTTP Error ${resp.status} loading template from ${templateUrl}`);
    }

    const contentType = resp.headers.get('content-type') || '';
    if (contentType.toLowerCase().includes('text/html')) {
      throw new Error(`File not found on server (404 HTML response for ${templateUrl}).`);
    }

    const templateBuffer = await resp.arrayBuffer();
    if (!templateBuffer || templateBuffer.byteLength === 0) {
      throw new Error(`Downloaded template buffer is empty for ${templateName}`);
    }

    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(templateBuffer, { 
        type: 'array', 
        cellStyles: true, 
        cellFormula: true, 
        cellDates: true, 
        cellNF: true,
        sheetStubs: true
      });
    } catch (err) {
      console.error(`Failed to read template binary from ${templateUrl}:`, err);
      throw new Error(`Could not parse template binary for ${templateName}`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error(`Official template ${templateName} has no valid worksheets.`);
    }

    const sheetName = workbook.SheetNames[0];
    const ws = workbook.Sheets[sheetName];

    // Filter list to keep ONLY qualified students (المصعدين) from local results
    const qualifiedStudents = studentsList.filter((student) => {
      return isQualifiedForNextStage(student);
    });

    // Row writing starts strictly at ROW 3 (0-indexed rIdx = 2 -> A3, B3, C3...)
    let currentRow = 3;

    qualifiedStudents.forEach(student => {
      const rIdx = currentRow - 1; // 0-indexed row for SheetJS

      // Column A (Row 3 onwards - A3): Student Name (اسم المتسابق) - 3 to 5 words max
      const rawName = student.name || student.studentName || student.fullName || '';
      const cleanName = sanitizeStudentName(rawName);
      ws[XLSX.utils.encode_cell({ r: rIdx, c: 0 })] = { t: 's', v: cleanName };

      // Column B (Row 3 onwards - B3): Mobile Number (رقم الموبايل)
      const phoneNum = student.phoneNumber || student.phone || student.mobile || fallbackPhone;
      ws[XLSX.utils.encode_cell({ r: rIdx, c: 1 })] = { t: 's', v: String(phoneNum) };

      // Column C (Row 3 onwards - C3): Gender Dropdown (ذكر / أنثى)
      const isFemale = student.gender === 'أنثى' || student.gender === 'female' || student.gender === 'انثى';
      const genderStr = isFemale ? 'أنثى' : 'ذكر';
      ws[XLSX.utils.encode_cell({ r: rIdx, c: 2 })] = { t: 's', v: genderStr };

      // Column D (Day), E (Month), F (Year) starting strictly at Row 3
      let day = student.birthDay || student.day;
      let month = student.birthMonth || student.month;
      let year = student.birthYear || student.year;

      if (!day || !month || !year) {
        const generated = getRandomBirthdate(student.stage);
        day = day || generated.day;
        month = month || generated.month;
        year = year || generated.year;
      }

      ws[XLSX.utils.encode_cell({ r: rIdx, c: 3 })] = { t: 'n', v: Number(day) };
      ws[XLSX.utils.encode_cell({ r: rIdx, c: 4 })] = { t: 'n', v: Number(month) };
      ws[XLSX.utils.encode_cell({ r: rIdx, c: 5 })] = { t: 'n', v: Number(year) };

      // Columns G to N (7 to 14): Registered Competitions
      const competitions = parseCompetitions(student.competitions);
      for (let i = 0; i < 8; i++) {
        ws[XLSX.utils.encode_cell({ r: rIdx, c: 6 + i })] = { t: 's', v: competitions[i] || '' };
      }

      currentRow++;
    });

    // Update worksheet dimensions range
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:N100');
    if (currentRow - 1 > range.e.r) {
      range.e.r = currentRow - 1;
      ws['!ref'] = XLSX.utils.encode_range(range);
    }

    // Export strictly as BIFF8 .xls binary buffer
    const outBuffer = XLSX.write(workbook, { bookType: 'biff8', type: 'array', cellStyles: true });
    return outBuffer;
  };

  // Alias for external export functions
  const fillExcelTemplateBuffer = fillTemplateBuffer;

  // Trigger download of a single filled Excel file using unified exportStudentsExcel
  const handleSingleExport = async (category: 'primary' | 'prep_servants' | 'special') => {
    setIsExporting(true);
    setStatusMessage({ text: '', type: null });

    const config = TEMPLATE_MAPPING[category];
    const templateName = config?.downloadName || '';
    let categoryTitle = '';
    
    if (category === 'primary') categoryTitle = 'ابتدائي';
    else if (category === 'prep_servants') categoryTitle = 'إعدادي وثانوي وخدام';
    else categoryTitle = 'فئات خاصة';

    const students = filteredParticipants.filter(p => {
      const t = getTemplateForStage(p.stage);
      return t.category === category;
    });

    if (students.length === 0) {
      setStatusMessage({ 
        text: `لا يوجد مشتركين مسجلين في فئة (${categoryTitle}) لهذه الكنيسة لتصديرهم.`, 
        type: 'error' 
      });
      setIsExporting(false);
      return;
    }

    try {
      setExportProgress(`جاري تجهيز وتعبئة ملف: ${templateName}...`);
      await exportStudentsExcel(category, students);
      
      setStatusMessage({ 
        text: `تم تصدير ملف "${templateName}" بنجاح وتعبئة ${students.length} مشترك!`, 
        type: 'success' 
      });
    } catch (e: any) {
      console.error(e);
      setStatusMessage({ text: `حدث خطأ أثناء محاولة تصدير الملف: ${e?.message || e}`, type: 'error' });
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // Trigger download of a ZIP containing filled Excels for selected church
  const handleChurchZipExport = async () => {
    setIsExporting(true);
    setStatusMessage({ text: '', type: null });
    
    const churchNameStr = selectedChurch === 'الكل' ? 'جميع الكنائس' : selectedChurch;
    
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      const templates: ('primary' | 'prep_servants' | 'special')[] = ['primary', 'prep_servants', 'special'];
      let addedFilesCount = 0;

      for (const cat of templates) {
        const students = filteredParticipants.filter(p => {
          const t = getTemplateForStage(p.stage);
          return t.category === cat;
        });

        if (students.length > 0) {
          let tName = '';
          if (cat === 'primary') tName = 'تسجيل مشتركين ابتدائي 2026.xls';
          else if (cat === 'prep_servants') tName = 'تسجيل مشتركين من اعدادي لخدام 2026.xls';
          else tName = 'تسجيل مشتركين فئات خاصة 2026.xls';

          setExportProgress(`جاري تعبئة ملف ${tName} لـ ${students.length} مشترك...`);
          const buffer = await fillTemplateBuffer(tName, students);
          zip.file(tName, buffer);
          addedFilesCount++;
        }
      }

      if (addedFilesCount === 0) {
        setStatusMessage({ text: 'لا توجد بيانات لتصديرها للكنيسة المحددة.', type: 'error' });
        setIsExporting(false);
        return;
      }

      setExportProgress('جاري ضغط الملفات وإنشاء أرشيف ZIP...');
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `تسجيل مشتركين - ${churchNameStr} 2026.zip`);

      setStatusMessage({ 
        text: `تم تصدير ملف الأرشيف المضغوط لكنيسة "${churchNameStr}" بنجاح يحتوي على ${addedFilesCount} ملفات!`, 
        type: 'success' 
      });
    } catch (e: any) {
      console.error(e);
      setStatusMessage({ text: `حدث خطأ أثناء تصدير الأرشيف المضغوط: ${e?.message || e}`, type: 'error' });
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  // MASTER EXPORT: Export ALL churches into a single nested ZIP
  const handleAllChurchesMasterZipExport = async () => {
    setIsExporting(true);
    setStatusMessage({ text: '', type: null });

    try {
      const JSZip = (await import('jszip')).default;
      const mainZip = new JSZip();

      // Group students by church
      const groupedChurches: Record<string, any[]> = {};
      const honoredAll = localQualifiedList;
      
      honoredAll.forEach(p => {
        const cName = p.churchName || p.charchName || 'كنيسة غير معروفة';
        if (!groupedChurches[cName]) {
          groupedChurches[cName] = [];
        }
        groupedChurches[cName].push(p);
      });
      
      const churchNames = Object.keys(groupedChurches).sort();
      
      if (churchNames.length === 0) {
        setStatusMessage({ text: 'لا توجد بيانات مشتركين متاحة للتصدير في النظام.', type: 'error' });
        setIsExporting(false);
        return;
      }

      let processedChurches = 0;
      let totalFilesCreated = 0;

      for (const cName of churchNames) {
        processedChurches++;
        setExportProgress(`جاري معالجة الكنيسة (${processedChurches} من ${churchNames.length}): كنيسة ${cName}...`);

        const churchStudents = groupedChurches[cName];
        const churchFolder = mainZip.folder(cName);

        const categories: ('primary' | 'prep_servants' | 'special')[] = ['primary', 'prep_servants', 'special'];

        for (const cat of categories) {
          const students = churchStudents.filter(p => {
            const t = getTemplateForStage(p.stage);
            return t.category === cat;
          });

          if (students.length > 0) {
            let tName = '';
            if (cat === 'primary') tName = 'تسجيل مشتركين ابتدائي 2026.xls';
            else if (cat === 'prep_servants') tName = 'تسجيل مشتركين من اعدادي لخدام 2026.xls';
            else tName = 'تسجيل مشتركين فئات خاصة 2026.xls';

            const buffer = await fillTemplateBuffer(tName, students);
            churchFolder?.file(tName, buffer);
            totalFilesCreated++;
          }
        }
      }

      setExportProgress('جاري إنشاء وضغط ملف الأرشيف الرئيسي لجميع الكنائس...');
      const content = await mainZip.generateAsync({ type: 'blob' });
      saveAs(content, `تسجيل المشتركين المجمع - جميع الكنائس 2026.zip`);

      setStatusMessage({ 
        text: `نجاح! تم تصدير بيانات ${churchNames.length} كنائس وتوليد ${totalFilesCreated} ملفات Excel مهيأة ومقسمة داخل الأرشيف بنجاح!`, 
        type: 'success' 
      });
    } catch (e: any) {
      console.error(e);
      setStatusMessage({ text: `حدث خطأ غير متوقع أثناء توليد الأرشيف المضغوط المجمع للكنائس: ${e?.message || e}`, type: 'error' });
    } finally {
      setIsExporting(false);
      setExportProgress('');
    }
  };

  const handleResetYears = () => {
    if (window.confirm('هل تريد بالتأكيد استعادة نطاقات المواليد الافتراضية لجميع المراحل؟')) {
      setBirthYearRanges({ ...DEFAULT_BIRTH_YEARS });
      setStatusMessage({ text: 'تمت استعادة إعدادات تواريخ الميلاد الافتراضية.', type: 'info' });
    }
  };

  const handleUpdateYearRange = (stage: string, field: 'min' | 'max', value: number) => {
    setBirthYearRanges(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [field]: value
      }
    }));
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden" id="excel-templates-exporter">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white relative">
        <div className="absolute top-4 right-4 bg-white/15 px-3 py-1 rounded-full text-[11px] font-black tracking-wider flex items-center gap-1.5 backdrop-blur-sm">
          <Sparkles size={12} />
          <span>تصدير ذكي للوزارة</span>
        </div>
        <h2 className="text-2xl font-black mb-2 flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8" />
          تصدير القوالب الرسمية لمهرجان الكرازة 2026
        </h2>
        <p className="text-emerald-50 text-sm max-w-2xl leading-relaxed">
          نظام متكامل لتصدير وتعبئة بيانات المشتركين مباشرة في قوالب Excel المعتمدة للوزارة مع حماية التنسيق والقوائم المنسدلة، مع توليد ذكي وتلقائي لبيانات تواريخ الميلاد والأرقام البديلة.
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-slate-100 bg-slate-50 p-2 gap-2">
        <button
          onClick={() => setActiveTab('exporter')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'exporter' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
        >
          <FileSpreadsheet size={16} />
          لوحة التصدير والملفات
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'settings' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}`}
        >
          <Settings size={16} />
          إعدادات التوليد العشوائي والبدائل
        </button>
      </div>

      <div className="p-6">
        {/* Messages */}
        {statusMessage.text && (
          <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 border ${
            statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
            statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
            'bg-sky-50 border-sky-200 text-sky-800'
          }`}>
            {statusMessage.type === 'success' ? <Check className="w-5 h-5 shrink-0 text-emerald-600" /> :
             statusMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" /> :
             <Info className="w-5 h-5 shrink-0 text-sky-600" />}
            <div className="text-xs font-bold leading-relaxed">{statusMessage.text}</div>
            <button className="mr-auto text-xs opacity-50 hover:opacity-100 font-bold" onClick={() => setStatusMessage({ text: '', type: null })}>إغلاق</button>
          </div>
        )}

        {/* Loading overlay */}
        {isExporting && (
          <div className="bg-emerald-50/70 border border-emerald-200 p-5 rounded-2xl mb-6 flex flex-col items-center justify-center gap-3 animate-pulse">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <div className="text-sm font-black text-emerald-800">جاري معالجة وتصدير البيانات...</div>
            <div className="text-xs font-bold text-emerald-600">{exportProgress}</div>
          </div>
        )}

        {activeTab === 'exporter' && (
          <div>
            {/* Church selection row */}
            {isAdmin && (
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-black text-slate-800 mb-1 flex items-center gap-1.5">
                    <span>اختر الكنيسة المراد تصدير ملفاتها:</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    يمكنك تصفية وتصدير البيانات لكنيسة واحدة، أو تصدير جميع الكنائس دفعة واحدة بملفات منظمة.
                  </div>
                </div>
                <div className="flex items-center gap-2 min-w-[280px]">
                  <div className="relative flex-1">
                    <select
                      value={selectedChurch}
                      onChange={(e) => setSelectedChurch(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 cursor-pointer text-slate-700 appearance-none"
                    >
                      <option value="الكل">كل الكنائس ({churchOptions.length} كنيسة)</option>
                      {churchOptions.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                  <button
                    onClick={fetchLocalQualificationResults}
                    disabled={isLoadingResults}
                    title="تحديث نتائج التصفية المحلية من قاعدة البيانات"
                    className="p-2 bg-white border border-slate-200 hover:border-emerald-500 hover:text-emerald-600 rounded-xl text-slate-600 transition-all cursor-pointer shadow-sm disabled:opacity-50 shrink-0"
                  >
                    <RefreshCw size={16} className={isLoadingResults ? 'animate-spin text-emerald-600' : ''} />
                  </button>
                </div>
              </div>
            )}

            {!isAdmin && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl mb-6 text-xs text-emerald-800 font-bold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-emerald-600 shrink-0" />
                  <span>أنت تقوم بتصدير البيانات الرسمية الخاصة بكنيستك: <strong>{userChurch || 'كنيسة غير معروفة'}</strong></span>
                </div>
                <button
                  onClick={fetchLocalQualificationResults}
                  disabled={isLoadingResults}
                  className="px-3 py-1 bg-white border border-emerald-200 hover:bg-emerald-100/50 rounded-lg text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                >
                  <RefreshCw size={13} className={isLoadingResults ? 'animate-spin' : ''} />
                  <span>تحديث</span>
                </button>
              </div>
            )}

            {/* Template Files Grid */}
            <h3 className="text-sm font-black text-slate-800 mb-4 flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-600 w-5 h-5" />
              القوالب الثلاثة للتصدير:
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Card 1: Primary */}
              <div className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="p-2 bg-emerald-100 rounded-xl text-emerald-700">
                    <FileSpreadsheet className="w-6 h-6" />
                  </span>
                  <span className="bg-emerald-50 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    مرحلة ابتدائي
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-800 mb-1">تسجيل مشتركين ابتدائي 2026</h4>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  يغطي المراحل: حضانة، أولى وثانية، ثالثة ورابعة، خامسة وسادسة.
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-100/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400">المشتركين المؤهلين:</div>
                    <div className="text-sm font-black text-emerald-600">{countsByTemplate.primary} مشترك</div>
                  </div>
                  <button
                    onClick={() => handleSingleExport('primary')}
                    disabled={isExporting}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-emerald-600/10"
                  >
                    <Download size={14} />
                    تصدير
                  </button>
                </div>
              </div>

              {/* Card 2: Prep to Servants */}
              <div className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="p-2 bg-blue-100 rounded-xl text-blue-700">
                    <FileSpreadsheet className="w-6 h-6" />
                  </span>
                  <span className="bg-blue-50 text-blue-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    إعدادي إلى خدام
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-800 mb-1">تسجيل مشتركين إعدادي لخدام 2026</h4>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  يغطي المراحل: إعدادي، ثانوي، جامعة، خريجون، حرفيون، خدام، قانا الجليل، الكبار.
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-100/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400">المشتركين المؤهلين:</div>
                    <div className="text-sm font-black text-blue-600">{countsByTemplate.prep_servants} مشترك</div>
                  </div>
                  <button
                    onClick={() => handleSingleExport('prep_servants')}
                    disabled={isExporting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-blue-600/10"
                  >
                    <Download size={14} />
                    تصدير
                  </button>
                </div>
              </div>

              {/* Card 3: Special Needs */}
              <div className="bg-gradient-to-br from-white to-slate-50/50 border border-slate-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <span className="p-2 bg-purple-100 rounded-xl text-purple-700">
                    <FileSpreadsheet className="w-6 h-6" />
                  </span>
                  <span className="bg-purple-50 text-purple-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                    فئات خاصة
                  </span>
                </div>
                <h4 className="text-sm font-black text-slate-800 mb-1">تسجيل مشتركين فئات خاصة 2026</h4>
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                  يغطي فئات: صم وبكم، ديديموس، ذوي القدرات، سمعان الشيخ، بولس وسيلا.
                </p>
                
                <div className="mt-auto pt-4 border-t border-slate-100/80 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold text-slate-400">المشتركين المؤهلين:</div>
                    <div className="text-sm font-black text-purple-600">{countsByTemplate.special} مشترك</div>
                  </div>
                  <button
                    onClick={() => handleSingleExport('special')}
                    disabled={isExporting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-sm shadow-purple-600/10"
                  >
                    <Download size={14} />
                    تصدير
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Exports Actions Section */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
              <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <FolderArchive className="text-teal-600" />
                خيارات التصدير والضغط المتقدم (ZIP)
              </h4>
              <p className="text-[11px] text-slate-400 mb-6 max-w-2xl leading-relaxed">
                اضغط وصدر جميع الكنائس دفعة واحدة. سيقوم النظام آلياً بفرز وتوزيع جميع المشتركين لكل كنيسة على حدة، وتعبئتهم في القوالب الخاصة بهم، ثم حفظهم داخل مجلد مخصص باسم الكنيسة داخل أرشيف ZIP مجمع للحفاظ على دقة النظم والفرز.
              </p>

              <div className="flex flex-col md:flex-row gap-4">
                <button
                  onClick={handleChurchZipExport}
                  disabled={isExporting}
                  className="flex-1 py-3 px-5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-teal-600/10 disabled:opacity-50 cursor-pointer"
                >
                  <FileArchive size={16} />
                  تصدير الكنيسة المحددة كـ ZIP ({countsByTemplate.primary + countsByTemplate.prep_servants + countsByTemplate.special} مشترك)
                </button>

                {isAdmin && (
                  <button
                    onClick={handleAllChurchesMasterZipExport}
                    disabled={isExporting}
                    className="flex-1 py-3 px-5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-md shadow-emerald-700/10 disabled:opacity-50 cursor-pointer"
                  >
                    <FolderArchive size={16} />
                    تصدير جميع الكنائس لجميع القوالب دفعة واحدة (أرشيف مجمع ZIP)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <div className="bg-amber-50 border border-amber-100 text-amber-900 p-4 rounded-xl mb-6 flex gap-3 text-xs leading-relaxed">
              <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black mb-1">لماذا نحتاج لهذه الإعدادات؟</p>
                <p className="text-[11px] text-amber-800">
                  عند تصدير المشتركين للوزارة، تتطلب القوالب الحتمية وجود <strong>رقم هاتف</strong> و <strong>تاريخ ميلاد مفرز (يوم، شهر، سنة)</strong>. وبما أن البيانات قد لا تحتوي دائماً على هذه التفاصيل، فإن النظام يقوم آلياً بتوليد تاريخ ميلاد عشوائي يتناسب بدقة مع الفئة العمرية لكل مرحلة، ويكتب رقم هاتف بديل للأشخاص الذين يفتقدون هاتفاً لضمان عدم رفض الملفات أثناء الرفع والتسجيل التلقائي.
                </p>
              </div>
            </div>

            {/* Phone Config */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 mb-6 shadow-sm">
              <h4 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <Phone className="text-emerald-600 w-4 h-4" />
                رقم الهاتف البديل للمشتركين (Fallback Phone Number)
              </h4>
              <div className="flex flex-col md:flex-row items-end gap-4 max-w-xl">
                <div className="flex-1">
                  <label className="block text-[11px] font-bold text-slate-400 mb-1.5">رقم الهاتف الافتراضي البديل (عند خلو حقل الموبايل للمشترك):</label>
                  <input
                    type="text"
                    value={fallbackPhone}
                    onChange={(e) => setFallbackPhone(e.target.value)}
                    placeholder="مثال: 01234567890"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:border-emerald-500 text-slate-700"
                  />
                </div>
                <div className="text-[10px] text-slate-400 leading-normal pb-1">
                  * سيتم تطبيقه على كافة الحقول الفارغة لضمان نجاح معالجة الملف.
                </div>
              </div>
            </div>

            {/* Birth Years Range Configuration Table */}
            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                    <Calendar className="text-emerald-600 w-4 h-4" />
                    تعديل نطاق مواليد السنين للمراحل العمرية
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    حدد الحد الأدنى والأقصى لسنة الميلاد لكل مرحلة لتوليد تواريخ ميلاد مطابقة تماماً للمستندات المقبولة.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetYears}
                  className="px-3 py-1.5 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-[10px] font-black flex items-center gap-1 cursor-pointer transition-all"
                >
                  <RefreshCw size={12} />
                  استعادة الافتراضي
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500">
                      <th className="p-3 text-right">المرحلة</th>
                      <th className="p-3 text-center">أقل سنة ميلاد (أقدم)</th>
                      <th className="p-3 text-center">أعلى سنة ميلاد (أحدث)</th>
                      <th className="p-3 text-center">متوسط العمر التقريبي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(birthYearRanges).map(stage => {
                      const range = birthYearRanges[stage];
                      return (
                        <tr key={stage} className="border-b border-slate-100 hover:bg-slate-50/50 text-xs font-bold text-slate-700">
                          <td className="p-3 font-black text-slate-800">{stage}</td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={range.min}
                              onChange={(e) => handleUpdateYearRange(stage, 'min', Number(e.target.value))}
                              min={1920}
                              max={2030}
                              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-black focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="number"
                              value={range.max}
                              onChange={(e) => handleUpdateYearRange(stage, 'max', Number(e.target.value))}
                              min={1920}
                              max={2030}
                              className="w-20 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-center font-black focus:outline-none focus:border-emerald-500 text-xs text-slate-800"
                            />
                          </td>
                          <td className="p-3 text-center text-[10px] text-slate-400 font-mono">
                            {2026 - range.max} - {2026 - range.min} سنة
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
