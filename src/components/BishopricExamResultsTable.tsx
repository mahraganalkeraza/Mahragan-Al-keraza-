import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Award, 
  Search, 
  FileSpreadsheet, 
  RefreshCw, 
  Download,
  Eye,
  Trash2,
  CheckCircle2,
  Sparkles,
  Star,
  X,
  AlertTriangle,
  Bug,
  Unlock,
  Terminal,
  Printer,
  BookOpen,
  Bookmark,
  Languages,
  Trophy,
  Filter,
  Upload,
  FileText,
  HardDrive,
  Database,
  Layers,
  FileUp
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { supabase } from '../utils/supabaseClient';
import { 
  deleteBishopricExamResult,
  normalizeArabic,
  isChurchMatch
} from '../utils/bishopricExamStorage';
import PaginationComponent from './Pagination';

/**
 * Exact Database Column Mapping for bishopric_exam_results
 */
export interface FlatBishopricExamResult {
  // Primary Identifiers
  id: string;
  student_name: string;
  student_code: string;
  exam_code: string;
  church_name: string;
  stage: string;
  subject_name: string;
  category: string;

  // Core Subject Scores
  score_darasi: number;
  score_mahfoozat: number;
  score_coptic: number;
  score: number;
  max_score: number;

  // Excellence Track
  excellence_points: number;
  max_excellence_points: number;
  excellence_unlocked: boolean;
  excellence_categories: string[];
  excellence_answers?: any;

  // Totals & Performance
  grand_total_score: number;
  percentage: number;
  status: string;
  submitted_at: string;
  completed_at: string;

  // Hybrid Data Tracking
  source?: 'csv' | 'server';

  // Flexible camelCase and alias properties
  studentName?: string;
  studentCode?: string;
  examCode?: string;
  churchName?: string;
  subjectName?: string;
  scoreDarasi?: number;
  scoreMahfoozat?: number;
  scoreCoptic?: number;
  maxScore?: number;
  excellencePoints?: number;
  maxExcellencePoints?: number;
  excellenceUnlocked?: boolean;
  excellenceCategories?: string[];
  excellenceAnswers?: any;
  grandTotalScore?: number;
  submittedAt?: string;
  completedAt?: string;

  // JSON/Extra fallback
  answers?: any;
  raw?: any;
}

/**
 * Flexible header normalizer for CSV columns
 * Trims, converts to lowercase, strips UTF-8 BOM, spaces, underscores, dashes, dots, and hash symbols
 */
export const normalizeCSVKey = (key: string): string => {
  return String(key || '')
    .trim()
    .toLowerCase()
    .replace(/^\uFEFF/, '')
    .replace(/[\s_\-#.]/g, '');
};

/**
 * Safe CSV to FlatBishopricExamResult parser using exact database column schema
 * Normalizes headers, supports snake_case and camelCase, and safely coerces numeric values
 */
export const parseCSVToBishopricResults = (rawRows: any[]): FlatBishopricExamResult[] => {
  return rawRows
    .filter((row: any) => {
      if (!row || typeof row !== 'object') return false;
      return Object.values(row).some(v => v !== null && v !== undefined && String(v).trim() !== '');
    })
    .map((row: any, idx: number) => {
      // Build normalized key-value map for the row
      const normalizedMap = new Map<string, any>();
      Object.keys(row).forEach(k => {
        const norm = normalizeCSVKey(k);
        const val = row[k];
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          if (!normalizedMap.has(norm)) {
            normalizedMap.set(norm, val);
          }
        }
      });

      // Helper to find value from key aliases (case-insensitive & trimmed)
      const getVal = (...keys: string[]): any => {
        for (const k of keys) {
          if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
            return row[k];
          }
          const normK = normalizeCSVKey(k);
          if (normalizedMap.has(normK)) {
            return normalizedMap.get(normK);
          }
        }
        return '';
      };

      // Safely convert numeric fields using Number(val) || 0
      const toSafeNumber = (...keys: string[]): number => {
        const v = getVal(...keys);
        if (v === '' || v === null || v === undefined) return 0;
        if (typeof v === 'number') return isNaN(v) ? 0 : v;
        const str = String(v).replace(/,/g, '.').replace(/[^\d.-]/g, '');
        const n = Number(str);
        return isNaN(n) ? 0 : n;
      };

      const parseJSON = (val: any, fallback: any) => {
        if (!val) return fallback;
        if (typeof val === 'object') return val;
        try {
          return JSON.parse(val);
        } catch {
          if (typeof val === 'string' && val.includes(',')) {
            return val.split(',').map((s: string) => s.trim()).filter(Boolean);
          }
          return fallback;
        }
      };

      // 1. Primary Identifiers
      const id = String(getVal('id', 'ID', 'معرف') || `csv_${idx}_${Date.now()}`);
      const studentName = String(getVal('student_name', 'studentName', 'اسم المتسابق', 'اسم_المتسابق', 'الاسم', 'name') || 'بدون اسم').trim();
      const studentCode = String(getVal('student_code', 'studentCode', 'كود المتسابق', 'كود_المتسابق', 'كود_الطالب', 'code') || '').trim();
      const examCode = String(
        getVal('exam_code', 'examCode', 'كود الامتحان', 'كود_الامتحان', 'coupon_code', 'coupon', 'access_code') || 
        studentCode || 
        ''
      ).trim();
      const churchName = String(getVal('church_name', 'churchName', 'الكنيسة', 'كنيسة', 'church') || 'غير محدد').trim();
      const stage = String(getVal('stage', 'المرحلة', 'مرحلة', 'grade', 'grade_name') || 'غير محدد').trim();
      const subjectName = String(getVal('subject_name', 'subjectName', 'المسابقة', 'المادة', 'المسابقة / المادة', 'competition_name') || 'امتحان الأسقفية الOnline').trim();
      const category = String(getVal('category', 'الفئة') || '').trim();

      // 2. Core Subject Scores with safe Number(val) || 0
      const scoreDarasi = toSafeNumber('score_darasi', 'scoreDarasi', 'derasy_score', 'derasyScore', 'درجة الدراسي', 'دراسي');
      const scoreMahfoozat = toSafeNumber('score_mahfoozat', 'scoreMahfoozat', 'mahfouzat_score', 'mahfouzatScore', 'درجة المحفوظات', 'محفوظات');
      const scoreCoptic = toSafeNumber('score_coptic', 'scoreCoptic', 'qebty_lvl1_score', 'qebtyLvl1Score', 'درجة القبطي', 'قبطي');

      let rawScore = toSafeNumber('score', 'total_score', 'totalScore', 'درجة', 'مجموع المواد الأساسية', 'مجموع المواد', 'academicScore');
      if (!rawScore && (scoreDarasi > 0 || scoreMahfoozat > 0 || scoreCoptic > 0)) {
        rawScore = scoreDarasi + scoreMahfoozat + scoreCoptic;
      }
      const score = rawScore;
      const maxScore = toSafeNumber('max_score', 'maxScore', 'الدرجة العظمى', 'الدرجة_القصوى') || 45;

      // 3. Excellence Track
      const excellencePoints = toSafeNumber('excellence_points', 'excellencePoints', 'نقاط التميز', 'نقاط_التميز', 'تميز', 'بونص التميز');
      const maxExcellencePoints = toSafeNumber('max_excellence_points', 'maxExcellencePoints') || (excellencePoints > 0 ? excellencePoints : 15);

      const rawExcellenceUnlocked = getVal('excellence_unlocked', 'excellenceUnlocked', 'فتح التميز');
      const excellenceUnlocked = Boolean(
        rawExcellenceUnlocked === true || 
        rawExcellenceUnlocked === 'true' || 
        rawExcellenceUnlocked === '1' || 
        excellencePoints > 0
      );

      const excellenceCategories = parseJSON(getVal('excellence_categories', 'excellenceCategories', 'فئات التميز'), []);
      const excellenceAnswers = parseJSON(getVal('excellence_answers', 'excellenceAnswers', 'إجابات التميز'), null);
      const answers = parseJSON(getVal('answers', 'الإجابات'), null);

      // 4. Totals & Performance
      let grandTotalScore = toSafeNumber('grand_total_score', 'grandTotalScore', 'المجموع الكلي', 'المجموع_الكلي', 'grand_total', 'grandTotal');
      if (!grandTotalScore && (score > 0 || excellencePoints > 0)) {
        grandTotalScore = score + excellencePoints;
      }

      let percentage = toSafeNumber('percentage', 'النسبة المئوية', 'النسبة');
      if (!percentage && maxScore > 0) {
        percentage = Math.round((score / maxScore) * 100);
      }

      let status = String(getVal('status', 'الحالة', 'التقدير') || '').trim();
      if (!status) {
        status = percentage >= 100 ? 'ممتاز' : percentage >= 85 ? 'جيد جداً' : percentage >= 70 ? 'جيد' : percentage >= 50 ? 'مقبول' : 'مكتمل';
      }

      const completedAt = String(getVal('completed_at', 'completedAt', 'تاريخ التسليم', 'تاريخ_الانتهاء') || getVal('submitted_at', 'submittedAt', 'تاريخ الإرسال') || '');
      const submittedAt = String(getVal('submitted_at', 'submittedAt', 'تاريخ الإرسال') || completedAt || '');

      return {
        id,
        student_name: studentName,
        studentName: studentName,
        student_code: studentCode,
        studentCode: studentCode,
        exam_code: examCode,
        examCode: examCode,
        church_name: churchName,
        churchName: churchName,
        stage,
        subject_name: subjectName,
        subjectName: subjectName,
        category,

        score_darasi: scoreDarasi,
        scoreDarasi: scoreDarasi,
        score_mahfoozat: scoreMahfoozat,
        scoreMahfoozat: scoreMahfoozat,
        score_coptic: scoreCoptic,
        scoreCoptic: scoreCoptic,
        score,
        max_score: maxScore,
        maxScore: maxScore,

        excellence_points: excellencePoints,
        excellencePoints: excellencePoints,
        max_excellence_points: maxExcellencePoints,
        maxExcellencePoints: maxExcellencePoints,
        excellence_unlocked: excellenceUnlocked,
        excellenceUnlocked: excellenceUnlocked,
        excellence_categories: Array.isArray(excellenceCategories) ? excellenceCategories : [],
        excellenceCategories: Array.isArray(excellenceCategories) ? excellenceCategories : [],
        excellence_answers: excellenceAnswers,
        excellenceAnswers: excellenceAnswers,

        grand_total_score: grandTotalScore,
        grandTotalScore: grandTotalScore,
        percentage,
        status,
        submitted_at: submittedAt,
        submittedAt: submittedAt,
        completed_at: completedAt,
        completedAt: completedAt,

        answers,
        source: 'csv' as const,
        raw: row
      };
    });
};

interface BishopricExamResultsTableProps {
  userChurchName?: string;
}

export const BishopricExamResultsTable: React.FC<BishopricExamResultsTableProps> = ({ userChurchName }) => {
  // Live Server Data
  const [serverResults, setServerResults] = useState<FlatBishopricExamResult[]>([]);
  const [rawSupabaseData, setRawSupabaseData] = useState<any[]>([]);
  const [rawSupabaseError, setRawSupabaseError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Offline / Local CSV State
  const [csvResults, setCsvResults] = useState<FlatBishopricExamResult[]>(() => {
    try {
      const cached = localStorage.getItem('cached_bishopric_csv_results');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parseCSVToBishopricResults(parsed);
        }
      }
    } catch (_) {}
    return [];
  });
  const [csvFileName, setCsvFileName] = useState<string | null>(() => {
    try {
      return localStorage.getItem('cached_bishopric_csv_filename') || null;
    } catch (_) {
      return null;
    }
  });

  // Hybrid Data Source Mode ('server' | 'csv' | 'hybrid')
  const [dataSourceMode, setDataSourceMode] = useState<'hybrid' | 'csv' | 'server'>(() => {
    try {
      const cached = localStorage.getItem('cached_bishopric_csv_results');
      if (cached && JSON.parse(cached)?.length > 0) {
        return 'hybrid';
      }
    } catch (_) {}
    return 'server';
  });

  const [isParsingCSV, setIsParsingCSV] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debug & Filter Controls
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isBypassFilters, setIsBypassFilters] = useState(false);

  // Dynamic Filter Lists from Supabase
  const [dbChurches, setDbChurches] = useState<string[]>([]);
  const [dbStages, setDbStages] = useState<string[]>([]);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [churchFilter, setChurchFilter] = useState('الكل');
  const [stageFilter, setStageFilter] = useState('الكل');
  const [statusFilter, setStatusFilter] = useState('الكل');
  const [excellenceFilter, setExcellenceFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Modal States
  const [selectedResultForDetails, setSelectedResultForDetails] = useState<FlatBishopricExamResult | null>(null);
  const [resultToDelete, setResultToDelete] = useState<FlatBishopricExamResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  const ITEMS_PER_PAGE = 15;
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Dynamic Filter Options Fetching from Supabase
  const fetchFilterOptions = async () => {
    try {
      const [churchesRes, stagesRes] = await Promise.all([
        supabase.from('church_access_codes').select('church_name').range(0, 9999),
        supabase.from('stage_competitions').select('stage_name').range(0, 9999)
      ]);

      if (churchesRes.data) {
        const uniqueChurches = Array.from(
          new Set(
            churchesRes.data
              .map((c: any) => String(c.church_name || '').trim())
              .filter((c: string) => c.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, 'ar'));
        setDbChurches(uniqueChurches);
      }

      if (stagesRes.data) {
        const uniqueStages = Array.from(
          new Set(
            stagesRes.data
              .map((s: any) => String(s.stage_name || '').trim())
              .filter((s: string) => s.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, 'ar'));
        setDbStages(uniqueStages);
      }
    } catch (err) {
      console.warn("Error fetching dynamic filter options:", err);
    }
  };

  // 2. Fetch all exam results with direct column mapping
  const fetchOnlineExamResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let data: any[] | null = null;
      let fetchErr: any = null;

      // Try 1: Order by submitted_at desc
      try {
        const res = await supabase
          .from('bishopric_exam_results')
          .select('*')
          .order('submitted_at', { ascending: false });
        if (!res.error && res.data) {
          data = res.data;
        } else {
          fetchErr = res.error;
        }
      } catch (err) {
        fetchErr = err;
      }

      // Try 2 Fallback: Order by created_at desc
      if (fetchErr || !data) {
        try {
          const res = await supabase
            .from('bishopric_exam_results')
            .select('*')
            .order('created_at', { ascending: false });
          if (!res.error && res.data) {
            data = res.data;
            fetchErr = null;
          } else {
            fetchErr = res.error;
          }
        } catch (err) {
          fetchErr = err;
        }
      }

      // Try 3 Fallback: Unordered select
      if (fetchErr || !data) {
        try {
          const res = await supabase
            .from('bishopric_exam_results')
            .select('*');
          if (!res.error && res.data) {
            data = res.data;
            fetchErr = null;
          } else {
            fetchErr = res.error;
          }
        } catch (err) {
          fetchErr = err;
        }
      }

      setRawSupabaseData(data || []);
      setRawSupabaseError(fetchErr || null);

      if (fetchErr) {
        console.error("Supabase Fetch Error:", fetchErr.message, fetchErr.details || fetchErr);
        setError("تعذر جلب النتائج من السيرفر: " + fetchErr.message);
        setServerResults([]);
      } else {
        const rawList: any[] = data || [];

        // STRICT EXACT COLUMN MAPPING
        const mappedList: FlatBishopricExamResult[] = rawList.map((row, idx) => {
          // Primary Identifiers
          const studentName = String(row.student_name || row.full_name || row.name || 'بدون اسم').trim();
          const studentCode = String(row.student_code || row.code || '').trim();
          const examCode = String(
            row.exam_code || 
            row.coupon_code || 
            row.coupon || 
            studentCode || 
            row.access_code || 
            ''
          ).trim();
          const churchName = String(row.church_name || row.church || 'غير محدد').trim();
          const stage = String(row.stage || row.grade || row.grade_name || 'غير محدد').trim();
          const subjectName = String(row.subject_name || row.competition_name || 'امتحان الأسقفية الOnline').trim();
          const category = String(row.category || '').trim();

          // Core Subject Scores with safe fallback
          const scoreDarasi = row.score_darasi != null ? Number(row.score_darasi) : 0;
          const scoreMahfoozat = row.score_mahfoozat != null ? Number(row.score_mahfoozat) : 0;
          const scoreCoptic = row.score_coptic != null ? Number(row.score_coptic) : 0;

          // Main total score & max score
          const rawScore = row.score != null ? Number(row.score) : (row.total_score != null ? Number(row.total_score) : (scoreDarasi + scoreMahfoozat + scoreCoptic));
          const score = isNaN(rawScore) ? 0 : rawScore;
          const maxScore = Number(row.max_score) > 0 ? Number(row.max_score) : 45;

          // Excellence Track
          const rawExcellence = Number(row.excellence_points);
          const excellencePoints = isNaN(rawExcellence) ? 0 : rawExcellence;
          const maxExcellencePoints = Number(row.max_excellence_points) > 0 
            ? Number(row.max_excellence_points) 
            : (excellencePoints > 0 ? excellencePoints : 15);
          const excellenceUnlocked = Boolean(row.excellence_unlocked || excellencePoints > 0);
          const excellenceCategories = Array.isArray(row.excellence_categories) ? row.excellence_categories : [];

          // Totals & Performance
          const rawGrandTotal = row.grand_total_score != null ? Number(row.grand_total_score) : (score + excellencePoints);
          const grandTotalScore = isNaN(rawGrandTotal) ? (score + excellencePoints) : rawGrandTotal;

          const rawPct = row.percentage != null 
            ? Number(row.percentage) 
            : (maxScore > 0 ? Math.round((score / maxScore) * 100) : 0);
          const percentage = isNaN(rawPct) ? 0 : rawPct;

          const status = String(
            row.status || 
            (percentage >= 100 ? 'ممتاز' : percentage >= 85 ? 'جيد جداً' : percentage >= 70 ? 'جيد' : percentage >= 50 ? 'مقبول' : 'مكتمل')
          ).trim();

          const submittedAt = String(row.submitted_at || row.completed_at || row.created_at || '');
          const completedAt = String(row.completed_at || row.submitted_at || row.created_at || '');

          return {
            id: String(row.id || `row_${idx}_${Date.now()}`),
            student_name: studentName,
            student_code: studentCode,
            exam_code: examCode,
            church_name: churchName,
            stage: stage,
            subject_name: subjectName,
            category: category,

            score_darasi: isNaN(scoreDarasi) ? 0 : scoreDarasi,
            score_mahfoozat: isNaN(scoreMahfoozat) ? 0 : scoreMahfoozat,
            score_coptic: isNaN(scoreCoptic) ? 0 : scoreCoptic,
            score: score,
            max_score: maxScore,

            excellence_points: excellencePoints,
            max_excellence_points: maxExcellencePoints,
            excellence_unlocked: excellenceUnlocked,
            excellence_categories: excellenceCategories,
            excellence_answers: row.excellence_answers,

            grand_total_score: grandTotalScore,
            percentage: percentage,
            status: status,
            submitted_at: submittedAt,
            completed_at: completedAt,

            answers: row.answers,
            source: 'server' as const,
            raw: row
          };
        });

        setServerResults(mappedList);
      }
    } catch (err: any) {
      console.error("Unexpected Error in fetchOnlineExamResults:", err);
      setError("حدث خطأ غير متوقع: " + (err?.message || 'خطأ في الشبكة'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchOnlineExamResults();
  }, [userChurchName]);

  // Handle CSV file processing
  const processCSVFile = (file: File) => {
    setIsParsingCSV(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      encoding: 'UTF-8',
      transformHeader: (header: string) => {
        return header
          .trim()
          .replace(/^\uFEFF/, '')
          .replace(/^["']|["']$/g, '');
      },
      complete: (parseResult) => {
        setIsParsingCSV(false);
        try {
          if (!parseResult.data || parseResult.data.length === 0) {
            setActionFeedback({ text: 'ملف CSV فارغ أو لم يتم التعرف على صفوف البيانات.', type: 'error' });
            return;
          }

          const mapped = parseCSVToBishopricResults(parseResult.data);
          if (mapped.length === 0) {
            setActionFeedback({ text: 'لم يتم العثور على أي نتائج صالحة في ملف CSV.', type: 'error' });
            return;
          }

          // State synchronization: reset filters immediately so all records are visible
          setSearchTerm('');
          setChurchFilter('الكل');
          setStageFilter('الكل');
          setStatusFilter('الكل');
          setExcellenceFilter('all');
          setCurrentPage(1);

          setCsvResults(mapped);
          setCsvFileName(file.name);
          setDataSourceMode('csv');

          try {
            localStorage.setItem('cached_bishopric_csv_results', JSON.stringify(mapped));
            localStorage.setItem('cached_bishopric_csv_filename', file.name);
          } catch (_) {}

          setActionFeedback({
            text: `تم استيراد (${mapped.length}) نتيجة بنجاح من ملف CSV: "${file.name}"`,
            type: 'success'
          });
        } catch (err: any) {
          console.error('CSV mapping error:', err);
          setActionFeedback({ text: 'حدث خطأ أثناء معالجة بيانات CSV: ' + (err?.message || ''), type: 'error' });
        }
      },
      error: (parseErr) => {
        setIsParsingCSV(false);
        console.error('PapaParse error:', parseErr);
        setActionFeedback({ text: 'فشل في قراءة ملف CSV: ' + parseErr.message, type: 'error' });
      }
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processCSVFile(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.name.toLowerCase().endsWith('.csv') || file.type.includes('csv') || file.type.includes('excel')) {
        processCSVFile(file);
      } else {
        setActionFeedback({ text: 'يرجى رفع ملف بصيغة CSV صالحة.', type: 'error' });
      }
    }
  };

  const handleClearCSV = () => {
    setCsvResults([]);
    setCsvFileName(null);
    setDataSourceMode('server');
    try {
      localStorage.removeItem('cached_bishopric_csv_results');
      localStorage.removeItem('cached_bishopric_csv_filename');
    } catch (_) {}
    setActionFeedback({
      text: 'تم تفريغ نتائج ملف CSV المحلي والرجوع إلى بيانات السيرفر.',
      type: 'success'
    });
  };

  // Download exact database schema CSV template
  const handleDownloadCSVTemplate = () => {
    const headers = [
      'id',
      'exam_code',
      'student_name',
      'church_name',
      'stage',
      'subject_name',
      'max_score',
      'percentage',
      'completed_at',
      'excellence_points',
      'answers',
      'excellence_answers',
      'excellence_categories',
      'excellence_unlocked',
      'max_excellence_points',
      'score',
      'submitted_at',
      'status',
      'student_code',
      'category',
      'score_darasi',
      'score_mahfoozat',
      'score_coptic',
      'grand_total_score'
    ];

    const sampleRow = [
      'rec_sample_1',
      'EXAM-2026-101',
      'مارك سامح كمال',
      'كنيسة السيدة العذراء مريم',
      'إعدادي بنين',
      'امتحان الأسقفية الOnline',
      '45',
      '96',
      new Date().toISOString(),
      '5',
      '{}',
      '{}',
      '["دراسي","محفوظات"]',
      'true',
      '15',
      '43',
      new Date().toISOString(),
      'ممتاز',
      'STU-101',
      'عام',
      '15',
      '14',
      '14',
      '48'
    ];

    const csvContent = '\uFEFF' + headers.join(',') + '\n' + sampleRow.map(v => `"${v}"`).join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bishopric_exam_results_schema_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // HYBRID COMBINED RESULTS RESOLUTION
  const results = useMemo(() => {
    let baseList: FlatBishopricExamResult[] = [];

    if (dataSourceMode === 'csv') {
      baseList = csvResults;
    } else if (dataSourceMode === 'server') {
      baseList = serverResults;
    } else {
      // Hybrid mode: Prioritize CSV records when available, merge with server
      const map = new Map<string, FlatBishopricExamResult>();

      // 1. Insert server records
      serverResults.forEach(r => {
        const key = (r.exam_code || r.student_code || r.id).trim().toLowerCase();
        map.set(key, r);
      });

      // 2. Overwrite / insert CSV records (CSV takes priority)
      csvResults.forEach(r => {
        const key = (r.exam_code || r.student_code || r.id).trim().toLowerCase();
        map.set(key, r);
      });

      baseList = Array.from(map.values());
    }

    // Church portal filter constraint:
    // When dataSourceMode is 'csv' or isBypassFilters is active, do not restrict CSV by parent church!
    if (dataSourceMode !== 'csv' && !isBypassFilters && userChurchName && userChurchName.trim() && userChurchName !== 'ALL' && userChurchName !== 'الكل') {
      const cleanTarget = userChurchName.trim();
      const normTarget = normalizeArabic(cleanTarget);
      return baseList.filter(r => {
        const chName = r.church_name;
        const normCh = normalizeArabic(chName);
        return isChurchMatch(chName, cleanTarget) ||
               normCh === normTarget ||
               normCh.includes(normTarget) ||
               normTarget.includes(normCh);
      });
    }

    return baseList;
  }, [dataSourceMode, csvResults, serverResults, userChurchName, isBypassFilters]);

  // Available Churches
  const availableChurches = useMemo(() => {
    const set = new Set<string>(dbChurches);
    results.forEach(r => {
      if (r.church_name && r.church_name !== 'غير محدد') set.add(r.church_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [dbChurches, results]);

  // Available Stages
  const availableStages = useMemo(() => {
    const set = new Set<string>(dbStages);
    results.forEach(r => {
      if (r.stage && r.stage !== 'غير محدد') set.add(r.stage);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [dbStages, results]);

  // Available Statuses
  const availableStatuses = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => {
      if (r.status) set.add(r.status);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [results]);

  // Summary Metrics / Displayed Stats with Safe Numeric Parsing
  const displayedStats = useMemo(() => {
    const parsedCsvData = csvResults;
    const isCsvMode = dataSourceMode === 'csv';

    // Base records for calculating stats:
    // When "ملف CSV" tab is selected, prioritize results (or parsedCsvData if results is empty)
    const listForStats = isCsvMode
      ? (results.length > 0 ? results : parsedCsvData)
      : results;

    // Total count: fallback uses parsedCsvData.length directly when "ملف CSV" tab is selected
    const initialTotal = isCsvMode
      ? (results.length > 0 ? results.length : parsedCsvData.length)
      : results.length;

    const totalCount = (isCsvMode && initialTotal === 0 && parsedCsvData.length > 0)
      ? parsedCsvData.length
      : initialTotal;

    let excellenceAchievers = 0;
    let totalScoreSum = 0;
    let topGrandTotal = 0;

    // Safe Numeric Parsing in Aggregations/Stats
    listForStats.forEach((row: any) => {
      const score = Number(row.grand_total_score || row.score || 0);
      const excellence = Number(row.excellence_points || row.excellencePoints || 0);
      const maxScore = Number(row.max_score || row.maxScore || 45);
      const percentage = Number(row.percentage || 0);

      if (excellence > 0 || row.excellence_unlocked || row.excellenceUnlocked) {
        excellenceAchievers++;
      }

      const effectivePct = percentage > 0
        ? percentage
        : (maxScore > 0 ? (score / maxScore) * 100 : 0);
      totalScoreSum += effectivePct;

      const grandTotal = Number(row.grand_total_score || row.grandTotalScore || (score + excellence));
      if (grandTotal > topGrandTotal) {
        topGrandTotal = grandTotal;
      }
    });

    const avgScore = listForStats.length > 0
      ? (totalScoreSum / listForStats.length).toFixed(1)
      : '0';

    return {
      totalCount,
      excellenceAchievers,
      avgScore,
      topGrandTotal: Math.round(topGrandTotal)
    };
  }, [results, csvResults, dataSourceMode]);

  // Backward compatibility alias so existing JSX references continue to work flawlessly
  const metrics = displayedStats;

  // 3. Search & Filter with immediate synchronization
  const filteredResults = useMemo(() => {
    // If in CSV mode and results is empty but csvResults has items, use csvResults
    const sourceList = (dataSourceMode === 'csv' && results.length === 0 && csvResults.length > 0)
      ? csvResults
      : results;

    if (isBypassFilters) {
      return sourceList;
    }

    const cleanSearch = searchTerm.trim().toLowerCase();
    const cleanSearchStripped = cleanSearch.replace(/[\s\-_#]/g, '');
    const normSearch = normalizeArabic(searchTerm);

    const hasSearch = cleanSearch.length > 0;
    const hasChurchFilter = churchFilter && churchFilter !== 'الكل' && churchFilter !== 'ALL';
    const hasStageFilter = stageFilter && stageFilter !== 'الكل' && stageFilter !== 'ALL';
    const hasStatusFilter = statusFilter && statusFilter !== 'الكل';
    const hasExcellenceFilter = excellenceFilter && excellenceFilter !== 'all';

    if (!hasSearch && !hasChurchFilter && !hasStageFilter && !hasStatusFilter && !hasExcellenceFilter) {
      return sourceList;
    }

    return sourceList.filter(r => {
      // Direct code matching
      const examCodeClean = String(r.exam_code || (r as any).examCode || '').toLowerCase();
      const examCodeStripped = examCodeClean.replace(/[\s\-_#]/g, '');
      const studentCodeClean = String(r.student_code || (r as any).studentCode || '').toLowerCase();
      const studentCodeStripped = studentCodeClean.replace(/[\s\-_#]/g, '');

      const matchesCode = hasSearch && (
        examCodeClean === cleanSearch ||
        examCodeClean.includes(cleanSearch) ||
        examCodeStripped === cleanSearchStripped ||
        studentCodeClean === cleanSearch ||
        studentCodeClean.includes(cleanSearch) ||
        studentCodeStripped === cleanSearchStripped
      );

      const normName = normalizeArabic(String(r.student_name || (r as any).studentName || ''));
      const normChurch = normalizeArabic(String(r.church_name || (r as any).churchName || ''));
      const normStage = normalizeArabic(String(r.stage || ''));

      const matchesSearch = !hasSearch ||
        matchesCode ||
        normName.includes(normSearch) ||
        normChurch.includes(normSearch) ||
        normStage.includes(normSearch);

      // Code exact priority match
      if (matchesCode && cleanSearch.length >= 3) {
        return true;
      }

      // Church Filter
      let matchesChurch = true;
      if (hasChurchFilter) {
        const normChurchFilter = normalizeArabic(churchFilter);
        matchesChurch = isChurchMatch(r.church_name, churchFilter) ||
          normChurch === normChurchFilter ||
          normChurch.includes(normChurchFilter) ||
          normChurchFilter.includes(normChurch);
      }

      // Stage Filter
      let matchesStage = true;
      if (hasStageFilter) {
        const normStageFilter = normalizeArabic(stageFilter);
        matchesStage = normStage === normStageFilter ||
          normStage.includes(normStageFilter) ||
          normStageFilter.includes(normStage);
      }

      // Status Filter
      let matchesStatus = true;
      if (hasStatusFilter) {
        matchesStatus = r.status === statusFilter;
      }

      // Excellence Filter with safe numeric coercion
      let matchesExcellence = true;
      if (excellenceFilter === 'has_excellence') {
        const excellence = Number((r as any).excellence_points || (r as any).excellencePoints || 0);
        matchesExcellence = excellence > 0 || Boolean(r.excellence_unlocked || (r as any).excellenceUnlocked);
      } else if (excellenceFilter === 'perfect') {
        matchesExcellence = Number(r.percentage || 0) >= 100;
      }

      return matchesSearch && matchesChurch && matchesStage && matchesStatus && matchesExcellence;
    });
  }, [results, csvResults, dataSourceMode, searchTerm, churchFilter, stageFilter, statusFilter, excellenceFilter, isBypassFilters]);

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const displayedResults = filteredResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Handle Delete / Reset Student Result
  const handleDeleteConfirm = async () => {
    if (!resultToDelete) return;
    setIsDeleting(true);
    try {
      if (resultToDelete.source === 'csv') {
        // Delete from local CSV results
        const updated = csvResults.filter(
          r => r.id !== resultToDelete.id && r.exam_code !== resultToDelete.exam_code
        );
        setCsvResults(updated);
        try {
          localStorage.setItem('cached_bishopric_csv_results', JSON.stringify(updated));
        } catch (_) {}
        setActionFeedback({
          text: `تم حذف نتيجة المشترك (${resultToDelete.student_name}) من ملف CSV المحلي بنجاح.`,
          type: 'success'
        });
        setResultToDelete(null);
        setTimeout(() => setActionFeedback({ text: '', type: null }), 4000);
      } else {
        const res = await deleteBishopricExamResult(resultToDelete.id, resultToDelete.exam_code);
        if (res.success) {
          setActionFeedback({ text: `تم حذف نتيجة المشترك (${resultToDelete.student_name}) وإعادة تفعيل الكود بنجاح.`, type: 'success' });
          setResultToDelete(null);
          await fetchOnlineExamResults();
          setTimeout(() => setActionFeedback({ text: '', type: null }), 4000);
        } else {
          setActionFeedback({ text: res.error || 'تعذر حذف النتيجة.', type: 'error' });
        }
      }
    } catch (err) {
      console.error('Delete error:', err);
      setActionFeedback({ text: 'حدث خطأ أثناء محاولة الحذف.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Export with Complete Column Breakdown
  const handleExportExcel = () => {
    if (filteredResults.length === 0) return;

    const exportRows = filteredResults.map((r, idx) => ({
      'م': idx + 1,
      'كود الامتحان': r.exam_code,
      'كود المتسابق': r.student_code || '-',
      'اسم المتسابق': r.student_name,
      'الكنيسة': r.church_name,
      'المرحلة': r.stage,
      'المسابقة': r.subject_name,
      'درجة الدراسي': r.score_darasi,
      'درجة المحفوظات': r.score_mahfoozat,
      'درجة القبطي': r.score_coptic,
      'مجموع المواد الأساسية': `${r.score} / ${r.max_score}`,
      'نقاط التميز': r.excellence_points > 0 ? `+${r.excellence_points}` : '0',
      'المجموع الكلي': r.grand_total_score,
      'النسبة المئوية': `${r.percentage}%`,
      'الحالة / التقدير': r.status,
      'تاريخ التسليم': r.completed_at ? new Date(r.completed_at).toLocaleString('ar-EG') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف نتائج امتحانات الأسقفية');
    XLSX.writeFile(wb, `كشف_نتائج_امتحانات_الأسقفية_المفصل_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!printRef.current || filteredResults.length === 0) return;
    setIsExportingPDF(true);

    try {
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `كشف_نتائج_امتحانات_الأسقفية_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      } as any;

      await html2pdf().set(opt).from(printRef.current).save();
    } catch (err) {
      console.error('PDF Export Error:', err);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6 font-arabic text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-lg font-black text-slate-800 flex items-center gap-2">
            <Award className="text-indigo-600" size={24} />
            <span>كشف نتائج امتحانات أونلاين الأسقفية 2026 (مفصل ومباشر)</span>
          </h4>
          <p className="text-xs font-bold text-slate-500 mt-1">
            عرض وتوثيق مباشر لدرجات المواد (دراسي، محفوظات، قبطي)، ونقاط التميز، والمجموع الكلي من قاعدة البيانات
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden CSV File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Upload CSV Results Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isParsingCSV}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="رفع ملف نتائج CSV محلي ومطابقة الأعمدة الـ 24 المعتمدة"
          >
            <Upload size={15} className={isParsingCSV ? 'animate-bounce' : ''} />
            <span>{isParsingCSV ? 'جاري التحليل...' : 'رفع ملف النتائج CSV'}</span>
          </button>

          {/* Download CSV Template Button */}
          <button
            type="button"
            onClick={handleDownloadCSVTemplate}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
            title="تحميل قالب ملف CSV بالأعمدة الـ 24 المعتمدة لقاعدة البيانات"
          >
            <FileText size={15} />
            <span>نموذج CSV</span>
          </button>

          {/* Debug Mode Button */}
          <button
            onClick={() => setIsDebugMode(prev => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              isDebugMode 
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
            }`}
            title="فحص استجابة Supabase الخام"
          >
            <Bug size={15} />
            <span>{isDebugMode ? 'إغلاق الفحص (Debug)' : 'وضع الفحص (Debug)'}</span>
          </button>

          {/* Bypass All Filters Button */}
          <button
            onClick={() => setIsBypassFilters(prev => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              isBypassFilters 
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
            }`}
            title="إلغاء جميع شروط التصفية والبحث وعرض كافة السجلات فوراً"
          >
            <Unlock size={15} />
            <span>{isBypassFilters ? 'الفلاتر معطلة (Bypass ON)' : 'تجاوز الفلاتر (Bypass)'}</span>
          </button>

          <button
            onClick={() => {
              fetchFilterOptions();
              fetchOnlineExamResults();
            }}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportExcel}
            disabled={filteredResults.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <FileSpreadsheet size={15} />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={filteredResults.length === 0 || isExportingPDF}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-sm cursor-pointer"
          >
            <Download size={15} />
            <span>{isExportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}</span>
          </button>
        </div>
      </div>

      {/* DATA SOURCE STATUS & HYBRID CONTROLS BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black text-slate-700">حالة مصدر البيانات:</span>

          {dataSourceMode === 'csv' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-black shadow-2xs">
              <HardDrive size={14} className="text-amber-700" />
              <span>مصدر البيانات: ملف CSV محلي ({csvResults.length} نتيجة)</span>
              {csvFileName && (
                <span className="text-[10px] text-amber-800 font-bold bg-amber-200/70 px-1.5 py-0.5 rounded">
                  {csvFileName}
                </span>
              )}
            </span>
          )}

          {dataSourceMode === 'server' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-100 text-sky-950 border border-sky-300 rounded-xl text-xs font-black shadow-2xs">
              <Database size={14} className="text-sky-700" />
              <span>مصدر البيانات: السيرفر المباشر ({serverResults.length} نتيجة)</span>
            </span>
          )}

          {dataSourceMode === 'hybrid' && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-xl text-xs font-black shadow-2xs">
              <Layers size={14} className="text-emerald-700" />
              <span>مصدر البيانات: هجين مدمج (CSV + السيرفر: {results.length} نتيجة معتمدة)</span>
              {csvFileName && (
                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-200/70 px-1.5 py-0.5 rounded">
                  {csvFileName}
                </span>
              )}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Data Source Switcher Buttons */}
          <div className="flex items-center bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setDataSourceMode('server')}
              className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                dataSourceMode === 'server'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              السيرفر ({serverResults.length})
            </button>

            {csvResults.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => setDataSourceMode('csv')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    dataSourceMode === 'csv'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ملف CSV ({csvResults.length})
                </button>

                <button
                  type="button"
                  onClick={() => setDataSourceMode('hybrid')}
                  className={`px-3 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                    dataSourceMode === 'hybrid'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  دمج كلاهما ({results.length})
                </button>
              </>
            )}
          </div>

          {/* Quick upload trigger */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1 text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="تحديد ملف CSV بديل أو جديد"
          >
            <Upload size={13} />
            <span>استيراد CSV</span>
          </button>

          {/* Clear CSV Button */}
          {csvResults.length > 0 && (
            <button
              type="button"
              onClick={handleClearCSV}
              className="px-2.5 py-1 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="حذف بيانات CSV والرجوع للسيرفر فقط"
            >
              <Trash2 size={13} />
              <span>تفريغ CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* CSV DROP ZONE AREA (Interactive Fallback) */}
      {(isDragging || (csvResults.length === 0 && serverResults.length === 0 && !isLoading)) && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/80 scale-[1.01]'
              : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100/80'
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <FileUp size={32} className="text-indigo-600" />
            <p className="text-sm font-black text-slate-800">
              اسحب وأفلت ملف نتائج الامتحانات (CSV) هنا، أو انقر للاختيار من جهازك
            </p>
            <p className="text-xs font-bold text-slate-500">
              يقوم النظام تلقائياً بمطابقة الأعمدة الـ 24 المعتمدة وعرض النتائج فوراً دون الحاجة للاتصال بالسيرفر
            </p>
          </div>
        </div>
      )}

      {/* RAW DATA CHECK - DEBUG MODE PANEL */}
      {isDebugMode && (
        <div className="bg-slate-950 border-2 border-amber-500 rounded-2xl p-4 text-left space-y-3 font-mono shadow-xl" dir="ltr">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 text-amber-400 font-black text-xs">
              <Terminal size={16} />
              <span>[SUPABASE LIVE RAW DATA INSPECTOR]</span>
            </div>
            <div className="text-[11px] text-slate-400 space-x-2">
              <span className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400 font-bold">
                Records: {rawSupabaseData.length}
              </span>
              <span className="bg-slate-800 px-2 py-0.5 rounded text-indigo-400 font-bold">
                Parsed: {results.length}
              </span>
              <span className="bg-slate-800 px-2 py-0.5 rounded text-amber-400 font-bold">
                Filtered: {filteredResults.length}
              </span>
            </div>
          </div>

          {rawSupabaseError && (
            <div className="p-3 bg-rose-950/80 border border-rose-600 rounded-xl text-rose-300 text-xs">
              <strong>Supabase Error:</strong> {JSON.stringify(rawSupabaseError, null, 2)}
            </div>
          )}

          <div>
            <p className="text-slate-400 text-xs mb-1 font-bold">
              Raw records from table: <span className="text-amber-300">`bishopric_exam_results`</span>:
            </p>
            <pre className="text-left rtl:text-left bg-gray-900 text-green-400 p-4 overflow-auto max-h-72 rounded-xl text-xs leading-relaxed border border-slate-800">
              {rawSupabaseData.length === 0 
                ? (isLoading ? "// Loading raw data from Supabase..." : "// Table returned 0 records: []") 
                : JSON.stringify(rawSupabaseData, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Bypass Active Notice Banner */}
      {isBypassFilters && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs font-bold text-rose-900 animate-pulse">
          <div className="flex items-center gap-2">
            <Unlock size={16} className="text-rose-600 shrink-0" />
            <span>تنبيه: وضع تجاوز الفلاتر نشط (Bypass Active). يتم عرض جميع النتائج المخزنة بدون أي شروط تصفية أو بحث.</span>
          </div>
          <button 
            onClick={() => setIsBypassFilters(false)}
            className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[11px] font-black hover:bg-rose-700 cursor-pointer"
          >
            إعادة تفعيل الفلاتر
          </button>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
          <p className="text-[11px] font-bold text-slate-500">إجمالي النتائج المسجلة</p>
          <p className="text-lg font-black text-slate-900 mt-1">{metrics.totalCount} مشترك</p>
        </div>
        <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-2xl">
          <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
            <Sparkles size={12} /> الحاصلين على تميز
          </p>
          <p className="text-lg font-black text-amber-950 mt-1">{metrics.excellenceAchievers} مشترك</p>
        </div>
        <div className="bg-indigo-50/60 border border-indigo-200 p-3.5 rounded-2xl">
          <p className="text-[11px] font-bold text-indigo-800">متوسط النسب المئوية</p>
          <p className="text-lg font-black text-indigo-950 mt-1">{metrics.avgScore}%</p>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-2xl">
          <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
            <Trophy size={12} /> أعلى مجموع كلي شامل
          </p>
          <p className="text-lg font-black text-emerald-950 mt-1">{metrics.topGrandTotal} درجة</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-xs font-bold text-rose-800">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchOnlineExamResults}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1 shadow-xs"
          >
            <RefreshCw size={12} />
            <span>إعادة المحاولة</span>
          </button>
        </div>
      )}

      {/* Action Feedback Banner */}
      {actionFeedback.text && (
        <div className={`p-3.5 rounded-2xl flex items-center justify-between text-xs font-bold ${
          actionFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionFeedback.text}</span>
          </div>
          <button onClick={() => setActionFeedback({ text: '', type: null })}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1">بحث في النتائج</label>
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="اسم المتسابق، الكود، أو الكنيسة..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pr-8 pl-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1">تصفية حسب الكنيسة</label>
          <select
            value={churchFilter}
            onChange={(e) => { setChurchFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="الكل">كل الكنائس ({availableChurches.length})</option>
            {availableChurches.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1">تصفية حسب المرحلة</label>
          <select
            value={stageFilter}
            onChange={(e) => { setStageFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="الكل">كل المراحل ({availableStages.length})</option>
            {availableStages.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1">تصفية حسب الحالة / التقدير</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="الكل">كل التقديرات والحالات</option>
            {availableStatuses.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1">تصفية مسار التميز</label>
          <select
            value={excellenceFilter}
            onChange={(e) => { setExcellenceFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">الكل</option>
            <option value="has_excellence">الحاصلين على نقاط تميز 🌟</option>
            <option value="perfect">الدرجة الكاملة 100% فأعلى 💯</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 font-bold flex flex-col items-center gap-2">
          <RefreshCw size={24} className="animate-spin text-indigo-600" />
          <span>جاري تحميل نتائج امتحانات الأسقفية...</span>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-3">
          <p className="text-sm">لا توجد نتائج مسجلة تطابق محددات البحث والتصفية الحالية.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
            >
              <Upload size={14} />
              <span>رفع ملف نتائج CSV</span>
            </button>
            <button
              onClick={() => setIsBypassFilters(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            >
              <Unlock size={14} />
              <span>تجاوز الفلاتر وعرض النتائج فوراً ({results.length})</span>
            </button>
            <button
              onClick={() => setIsDebugMode(true)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-amber-400 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            >
              <Bug size={14} />
              <span>فحص استجابة السيرفر</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
            <table className="w-full text-right border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/90 text-slate-800 font-black border-b border-slate-200">
                  <th className="p-3 text-center border-l border-slate-200 w-16">إجراءات</th>
                  <th className="p-3 border-l border-slate-200">كود المتسابق</th>
                  <th className="p-3 border-l border-slate-200 min-w-[140px]">اسم المتسابق</th>
                  <th className="p-3 border-l border-slate-200 min-w-[130px]">الكنيسة</th>
                  <th className="p-3 border-l border-slate-200">المرحلة</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-sky-50/70 text-sky-950">دراسي</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-emerald-50/70 text-emerald-950">محفوظات</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-amber-50/70 text-amber-950">قبطي</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-slate-50 font-black">مجموع المواد</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-amber-100/60 text-amber-950 font-black">بونص التميز</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-indigo-50/80 text-indigo-950 font-black">المجموع الكلي</th>
                  <th className="p-3 text-center border-l border-slate-200">النسبة والتقدير</th>
                  <th className="p-3 text-center">تاريخ التسليم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {displayedResults.map((row, idx) => (
                  <tr key={row.id || row.exam_code || idx} className="hover:bg-indigo-50/30 transition-all">
                    {/* Actions */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setSelectedResultForDetails(row)}
                          className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                          title="عرض بيان الدرجات الرسمي المعتمد"
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          onClick={() => setResultToDelete(row)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="حذف النتيجة وإعادة تفعيل الكود"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>

                    {/* Student Code / Exam Code */}
                    <td className="p-2.5 font-mono font-black border-l border-slate-100">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1">
                          <span className="bg-slate-100 text-indigo-950 px-2 py-0.5 rounded-md border border-slate-200 text-[11px] w-fit">
                            {row.exam_code || 'بدون كود'}
                          </span>
                          {row.source === 'csv' ? (
                            <span className="text-[9px] bg-amber-100 text-amber-900 border border-amber-300 font-bold px-1.5 py-0.5 rounded">
                              CSV
                            </span>
                          ) : (
                            <span className="text-[9px] bg-sky-50 text-sky-800 border border-sky-200 font-bold px-1.5 py-0.5 rounded">
                              سيرفر
                            </span>
                          )}
                        </div>
                        {row.student_code && row.student_code !== row.exam_code && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            كود: {row.student_code}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Student Name */}
                    <td className="p-2.5 text-slate-900 font-black border-l border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedResultForDetails(row)}
                        className="text-right font-black text-indigo-950 hover:text-indigo-600 hover:underline flex items-center gap-1.5 cursor-pointer group transition-colors"
                        title="اضغط هنا لإظهار بيان درجات المشترك"
                      >
                        <span>{row.student_name}</span>
                        <Eye size={13} className="text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
                      </button>
                    </td>

                    {/* Church */}
                    <td className="p-2.5 text-slate-700 border-l border-slate-100">
                      {row.church_name}
                    </td>

                    {/* Stage */}
                    <td className="p-2.5 text-slate-700 border-l border-slate-100">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {row.stage}
                      </span>
                    </td>

                    {/* Score Darasi */}
                    <td className="p-2.5 text-center font-mono font-bold text-sky-900 border-l border-slate-100 bg-sky-50/30">
                      {row.score_darasi}
                    </td>

                    {/* Score Mahfoozat */}
                    <td className="p-2.5 text-center font-mono font-bold text-emerald-900 border-l border-slate-100 bg-emerald-50/30">
                      {row.score_mahfoozat}
                    </td>

                    {/* Score Coptic */}
                    <td className="p-2.5 text-center font-mono font-bold text-amber-900 border-l border-slate-100 bg-amber-50/30">
                      {row.score_coptic}
                    </td>

                    {/* Main Total Score */}
                    <td className="p-2.5 text-center font-mono font-bold text-slate-800 border-l border-slate-100">
                      <span>{row.score}</span>
                      <span className="text-slate-400 text-[10px] mr-0.5">/{row.max_score}</span>
                    </td>

                    {/* Excellence Points */}
                    <td className="p-2.5 text-center border-l border-slate-100 bg-amber-50/30">
                      {row.excellence_points > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          +{row.excellence_points} 🌟
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">0</span>
                      )}
                    </td>

                    {/* Grand Total Score */}
                    <td className="p-2.5 text-center border-l border-slate-100 bg-indigo-50/40">
                      <span className="font-mono font-black text-indigo-950 text-xs px-2 py-0.5 rounded-lg bg-indigo-100/70 border border-indigo-200">
                        {row.grand_total_score}
                      </span>
                    </td>

                    {/* Percentage & Status */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span className="font-black text-xs text-indigo-950">
                          {row.percentage}%
                        </span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                          row.percentage >= 100 
                            ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                            : row.percentage >= 85 
                            ? 'bg-emerald-100 text-emerald-900' 
                            : row.percentage >= 70 
                            ? 'bg-sky-100 text-sky-900' 
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {row.status}
                        </span>
                      </div>
                    </td>

                    {/* Submission Date */}
                    <td className="p-2.5 text-center text-slate-500 text-[11px] font-mono" dir="ltr">
                      {row.completed_at 
                        ? new Date(row.completed_at).toLocaleDateString('ar-EG', { 
                            month: 'numeric', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) 
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pt-2">
              <PaginationComponent
                currentPage={currentPage}
                totalItems={filteredResults.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </div>
          )}
        </>
      )}

      {/* Student Grade Statement (بيان الدرجات الرسمي) Modal */}
      {selectedResultForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col font-arabic text-right overflow-hidden animate-fade-in" dir="rtl">
            {/* Modal Header */}
            <div className="p-6 bg-linear-to-l from-indigo-950 via-indigo-900 to-slate-900 text-white border-b border-indigo-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-white/10 text-amber-300 border border-white/10">
                    <Award size={22} />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-white">
                      بيان درجات المشترك الرسمي - كنترول الأسقفية 2026
                    </h3>
                    <p className="text-[11px] text-indigo-200 font-bold">
                      مهرجان الكرازة المرقسية - أسقفية الشباب المركزية
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-black transition-colors flex items-center gap-1.5 border border-white/20 cursor-pointer"
                  title="طباعة بيان الدرجات"
                >
                  <Printer size={15} />
                  <span className="hidden sm:inline">طباعة البيان</span>
                </button>
                <button 
                  onClick={() => setSelectedResultForDetails(null)}
                  className="p-2 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Student Metadata Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black block">اسم المتسابق</span>
                    <span className="text-base font-black text-slate-900">{selectedResultForDetails.student_name}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs bg-indigo-50 text-indigo-900 px-3 py-1 rounded-xl border border-indigo-200 font-mono font-black">
                      كود الامتحان: {selectedResultForDetails.exam_code}
                    </span>
                    {selectedResultForDetails.student_code && (
                      <span className="text-xs bg-slate-200 text-slate-800 px-2.5 py-1 rounded-xl font-mono font-bold">
                        كود: {selectedResultForDetails.student_code}
                      </span>
                    )}
                    {selectedResultForDetails.source === 'csv' ? (
                      <span className="text-xs bg-amber-100 text-amber-950 px-2.5 py-1 rounded-xl border border-amber-300 font-bold flex items-center gap-1">
                        <HardDrive size={12} />
                        <span>ملف CSV محلي</span>
                      </span>
                    ) : (
                      <span className="text-xs bg-sky-100 text-sky-950 px-2.5 py-1 rounded-xl border border-sky-300 font-bold flex items-center gap-1">
                        <Database size={12} />
                        <span>السيرفر المباشر</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-bold text-slate-700 pt-1">
                  <div>
                    <span className="text-slate-400 block text-[10px]">الكنيسة</span>
                    <span className="text-slate-900 font-black">{selectedResultForDetails.church_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">المرحلة الدراسية</span>
                    <span className="text-slate-900 font-black">{selectedResultForDetails.stage}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">المسابقة / المادة</span>
                    <span className="text-slate-900 font-black">{selectedResultForDetails.subject_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">تاريخ التسليم</span>
                    <span className="text-slate-900 font-mono text-[11px]" dir="ltr">
                      {selectedResultForDetails.completed_at 
                        ? new Date(selectedResultForDetails.completed_at).toLocaleDateString('ar-EG', { 
                            month: 'numeric', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) 
                        : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Core Subject Breakdown */}
              <div className="space-y-2">
                <h5 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                  <BookOpen size={15} className="text-indigo-600" />
                  <span>تفصيل درجات المواد الأساسية (Core Subject Scores)</span>
                </h5>

                <div className="grid grid-cols-3 gap-3">
                  {/* Darasi */}
                  <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-200 text-center space-y-1">
                    <span className="text-[11px] font-black text-sky-900 flex items-center justify-center gap-1">
                      <BookOpen size={13} />
                      <span>المحور الدراسي</span>
                    </span>
                    <div className="text-2xl font-black text-sky-950 font-mono">
                      {selectedResultForDetails.score_darasi}
                    </div>
                    <span className="text-[10px] text-sky-700 font-bold block">درجة دراسي</span>
                  </div>

                  {/* Mahfoozat */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-center space-y-1">
                    <span className="text-[11px] font-black text-emerald-900 flex items-center justify-center gap-1">
                      <Bookmark size={13} />
                      <span>المحفوظات</span>
                    </span>
                    <div className="text-2xl font-black text-emerald-950 font-mono">
                      {selectedResultForDetails.score_mahfoozat}
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold block">درجة محفوظات</span>
                  </div>

                  {/* Coptic */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-center space-y-1">
                    <span className="text-[11px] font-black text-amber-900 flex items-center justify-center gap-1">
                      <Languages size={13} />
                      <span>اللغة القبطية</span>
                    </span>
                    <div className="text-2xl font-black text-amber-950 font-mono">
                      {selectedResultForDetails.score_coptic}
                    </div>
                    <span className="text-[10px] text-amber-700 font-bold block">درجة قبطي</span>
                  </div>
                </div>

                {/* Subtotal */}
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-black text-slate-800">
                  <span>مجموع المواد الأساسية:</span>
                  <span className="font-mono text-indigo-950 text-sm">
                    {selectedResultForDetails.score} / {selectedResultForDetails.max_score}
                  </span>
                </div>
              </div>

              {/* Excellence Track Card */}
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Sparkles size={15} className="text-amber-600" />
                    <span>مسار التميز الإضافي (Excellence Track)</span>
                  </h5>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    selectedResultForDetails.excellence_unlocked 
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                      : 'bg-slate-200 text-slate-700'
                  }`}>
                    {selectedResultForDetails.excellence_unlocked ? 'تم فتح مسار التميز ✅' : 'لم يفتح المسار'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs font-bold text-amber-900">
                    نقاط التميز المكتسبة المعتمدة:
                  </p>
                  <span className="font-mono font-black text-lg text-amber-950 bg-white px-3 py-1 rounded-xl border border-amber-200 shadow-xs">
                    +{selectedResultForDetails.excellence_points} 🌟
                  </span>
                </div>

                {selectedResultForDetails.excellence_categories && selectedResultForDetails.excellence_categories.length > 0 && (
                  <div className="text-[11px] text-amber-800 pt-1 font-bold">
                    <span>فئات التميز المنجزة: </span>
                    <span className="font-black">{selectedResultForDetails.excellence_categories.join('، ')}</span>
                  </div>
                )}
              </div>

              {/* Final Totals Card */}
              <div className="bg-linear-to-l from-indigo-900 to-slate-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                <div>
                  <p className="text-xs font-bold text-indigo-200">التقييم العام المعتمد والنتيجة النهائية</p>
                  <p className="text-xl font-black text-white mt-1">
                    الحالة والتقدير: <span className="text-amber-300">{selectedResultForDetails.status}</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 text-center">
                    <span className="text-[10px] text-indigo-200 font-bold block">المجموع الكلي</span>
                    <span className="text-2xl font-black text-white font-mono">
                      {selectedResultForDetails.grand_total_score}
                    </span>
                  </div>
                  <div className="bg-amber-400 text-slate-950 px-4 py-2.5 rounded-xl text-center shadow-xs">
                    <span className="text-[10px] text-slate-900 font-black block">النسبة المئوية</span>
                    <span className="text-2xl font-black font-mono">
                      {selectedResultForDetails.percentage}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs font-bold text-center">
                تم استخراج هذا البيان مباشرة من قاعدة بيانات وسجلات كنترول أسقفية الشباب لعام 2026.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 text-xs font-black rounded-xl transition-colors flex items-center gap-1.5 border border-indigo-200 cursor-pointer"
              >
                <Printer size={15} />
                <span>طباعة بيان الدرجات</span>
              </button>
              <button 
                onClick={() => setSelectedResultForDetails(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black rounded-xl transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {resultToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-6 rounded-3xl shadow-2xl border border-slate-200 font-arabic text-right space-y-4" dir="rtl">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="font-black text-sm text-slate-900">تأكيد حذف النتيجة وإعادة تفعيل الكود</h4>
                <p className="text-[11px] font-bold text-slate-500">هذا الإجراء سيسمح للطالب بدخول الامتحان مرة أخرى</p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-bold space-y-1.5 text-slate-700">
              <p>المتسابق: <span className="text-slate-900 font-black">{resultToDelete.student_name}</span></p>
              <p>الكود: <span className="font-mono text-indigo-900 font-black">{resultToDelete.exam_code || 'بدون كود'}</span></p>
              <p>الكنيسة: <span>{resultToDelete.church_name}</span></p>
              <p>المجموع الكلي: <span className="text-indigo-600 font-black">{resultToDelete.grand_total_score} ({resultToDelete.percentage}%)</span></p>
            </div>

            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              سيتم حذف سجل النتيجة الحالي من قاعدة البيانات بشكل نهائي، وسيتم تعديل حالة الكود ليصبح جاهزاً ومتاحاً للاستخدام من جديد.
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setResultToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-rose-600/10 cursor-pointer"
              >
                {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Printable Container */}
      <div className="hidden">
        <div ref={printRef} className="p-6 font-arabic text-right bg-white text-slate-900" dir="rtl">
          <div className="text-center border-b-2 border-indigo-900 pb-4 mb-4">
            <h2 className="text-xl font-black text-indigo-900">مهرجان الكرازة المرقسية - أسقفية الشباب</h2>
            <h3 className="text-base font-black text-slate-800 mt-1">كشف درجات ونتائج امتحانات الأسقفية أونلاين 2026 (مفصل)</h3>
            <p className="text-xs font-bold text-slate-600 mt-1">
              إجمالي النتائج: {filteredResults.length} مشترك | استخراج بتاريخ: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>

          <table className="w-full text-right border-collapse text-[10px] border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-black border-b border-slate-300 text-slate-800">
                <th className="p-1.5 border border-slate-300 text-center w-8">م</th>
                <th className="p-1.5 border border-slate-300">كود المتسابق</th>
                <th className="p-1.5 border border-slate-300">اسم المتسابق</th>
                <th className="p-1.5 border border-slate-300">الكنيسة</th>
                <th className="p-1.5 border border-slate-300">المرحلة</th>
                <th className="p-1.5 border border-slate-300 text-center">دراسي</th>
                <th className="p-1.5 border border-slate-300 text-center">محفوظات</th>
                <th className="p-1.5 border border-slate-300 text-center">قبطي</th>
                <th className="p-1.5 border border-slate-300 text-center">مجموع المواد</th>
                <th className="p-1.5 border border-slate-300 text-center bg-amber-50">تميز</th>
                <th className="p-1.5 border border-slate-300 text-center bg-indigo-50 font-black">المجموع الكلي</th>
                <th className="p-1.5 border border-slate-300 text-center">النسبة</th>
                <th className="p-1.5 border border-slate-300 text-center">التقدير</th>
                <th className="p-1.5 border border-slate-300 text-center">تاريخ التسليم</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-200 font-bold">
                  <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-1.5 border border-slate-300 font-mono font-black">{r.exam_code || 'بدون كود'}</td>
                  <td className="p-1.5 border border-slate-300">{r.student_name}</td>
                  <td className="p-1.5 border border-slate-300">{r.church_name}</td>
                  <td className="p-1.5 border border-slate-300">{r.stage}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-mono">{r.score_darasi}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-mono">{r.score_mahfoozat}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-mono">{r.score_coptic}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-mono">{r.score} / {r.max_score}</td>
                  <td className="p-1.5 border border-slate-300 text-center text-amber-800 font-mono">{r.excellence_points > 0 ? `+${r.excellence_points}` : '0'}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-black bg-indigo-50/50 font-mono">{r.grand_total_score}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-black">{r.percentage}%</td>
                  <td className="p-1.5 border border-slate-300 text-center">{r.status}</td>
                  <td className="p-1.5 border border-slate-300 text-center text-[9px]" dir="ltr">
                    {r.completed_at ? new Date(r.completed_at).toLocaleDateString('ar-EG') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
