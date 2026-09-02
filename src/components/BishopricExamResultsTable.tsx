import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Award, 
  Search, 
  Filter, 
  FileSpreadsheet, 
  RefreshCw, 
  Download,
  BookOpen,
  Building2,
  GraduationCap,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
  Star,
  Layers,
  X,
  AlertTriangle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Trophy,
  Bug,
  Unlock,
  Terminal,
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { supabase } from '../utils/supabaseClient';
import { 
  BishopricExamResult, 
  BishopricExamQuestion,
  GranularExamResult,
  fetchBishopricExamResults, 
  fetchBishopricQuestions,
  parseGranularScores,
  deleteBishopricExamResult,
  normalizeArabic,
  normalizeCategoryType,
  isChurchMatch
} from '../utils/bishopricExamStorage';
import PaginationComponent from './Pagination';

interface BishopricExamResultsTableProps {
  userChurchName?: string;
}

export const BishopricExamResultsTable: React.FC<BishopricExamResultsTableProps> = ({ userChurchName }) => {
  const [results, setResults] = useState<BishopricExamResult[]>([]);
  const [rawSupabaseData, setRawSupabaseData] = useState<any[]>([]);
  const [rawSupabaseError, setRawSupabaseError] = useState<any>(null);
  const [questions, setQuestions] = useState<BishopricExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug & Filter Bypass Controls
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isBypassFilters, setIsBypassFilters] = useState(false);

  // Dynamic Filter Lists from Supabase
  const [dbChurches, setDbChurches] = useState<string[]>([]);
  const [dbStages, setDbStages] = useState<string[]>([]);
  const [dbCompetitions, setDbCompetitions] = useState<string[]>([]);
  
  // Filter States
  const [churchFilter, setChurchFilter] = useState('الكل');
  const [stageFilter, setStageFilter] = useState('الكل');
  const [competitionFilter, setCompetitionFilter] = useState('الكل');
  const [excellenceFilter, setExcellenceFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Modal States
  const [selectedResultForDetails, setSelectedResultForDetails] = useState<GranularExamResult | null>(null);
  const [resultToDelete, setResultToDelete] = useState<GranularExamResult | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ text: string; type: 'success' | 'error' | null }>({ text: '', type: null });

  const ITEMS_PER_PAGE = 15;
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Dynamic Filter Options Fetching from Supabase
  const fetchFilterOptions = async () => {
    try {
      const [churchesRes, stagesRes, competitionsRes] = await Promise.all([
        supabase.from('church_access_codes').select('church_name').range(0, 9999),
        supabase.from('stage_competitions').select('stage_name').range(0, 9999),
        supabase.from('competition_bank').select('name').range(0, 9999)
      ]);

      // Churches from church_access_codes
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

      // Stages from stage_competitions
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

      // Competitions from competition_bank
      if (competitionsRes.data) {
        const uniqueCompetitions = Array.from(
          new Set(
            competitionsRes.data
              .map((comp: any) => String(comp.name || '').trim())
              .filter((comp: string) => comp.length > 0)
          )
        ).sort((a, b) => a.localeCompare(b, 'ar'));
        setDbCompetitions(uniqueCompetitions);
      }
    } catch (err) {
      console.warn("Error fetching dynamic filter options from Supabase:", err);
    }
  };

  // 2. Fetch all bishopric exam results with detailed logging and error capture
  const fetchOnlineExamResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching all results from bishopric_exam_results without restrictive SQL filters...", { userChurchName });

      let data: any[] | null = null;
      let fetchErr: any = null;

      // Try 1: Order by created_at
      try {
        const res = await supabase
          .from('bishopric_exam_results')
          .select('*')
          .order('created_at', { ascending: false });
        if (!res.error && res.data) {
          data = res.data;
        } else {
          fetchErr = res.error;
        }
      } catch (err) {
        fetchErr = err;
      }

      // Try 2 Fallback: Order by submitted_at
      if (fetchErr || !data) {
        console.warn("First fetch attempt failed, trying fallback by submitted_at...", fetchErr);
        try {
          const res = await supabase
            .from('bishopric_exam_results')
            .select('*')
            .order('submitted_at', { ascending: false });
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

      // Try 3 Fallback: Unordered
      if (fetchErr || !data) {
        console.warn("Second fetch attempt failed, trying fallback without sorting...", fetchErr);
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

      // Strict tracking & raw state saving for debug UI
      console.log("1. Raw Supabase Data:", data);
      console.log("2. Supabase Error:", fetchErr);
      setRawSupabaseData(data || []);
      setRawSupabaseError(fetchErr || null);

      const questionsData = await fetchBishopricQuestions();

      if (fetchErr) {
        console.error("Supabase Fetch Error:", fetchErr.message, fetchErr.details || fetchErr);
        setError("خطأ في جلب البيانات: " + fetchErr.message);
        setResults([]);
      } else {
        const rawList: any[] = data || [];
        console.log("Total Retrieved Records Count from DB:", rawList.length);

        // Apply flexible matching (Fuzzy Match / normalizeArabic) post-fetch only if userChurchName is specifically provided and not ALL/الكل
        let finalData = rawList;
        if (userChurchName && userChurchName.trim() && userChurchName !== 'ALL' && userChurchName !== 'الكل') {
          const cleanTarget = userChurchName.trim();
          const normTarget = normalizeArabic(cleanTarget);
          finalData = rawList.filter(r => {
            const chName = String(r.church_name || r.church || '').trim();
            const normCh = normalizeArabic(chName);
            return isChurchMatch(chName, cleanTarget) ||
                   normCh === normTarget ||
                   normCh.includes(normTarget) ||
                   normTarget.includes(normCh);
          });
          console.log(`Fuzzy matched ${finalData.length} records out of ${rawList.length} total records for userChurchName "${userChurchName}".`);
        }

        setResults(finalData);
      }
      setQuestions(questionsData || []);
    } catch (err: any) {
      console.error("Unexpected Error:", err?.message || err);
      setError("حدث خطأ في جلب البيانات: " + (err?.message || 'خطأ غير متوقع'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
    fetchOnlineExamResults();
  }, [userChurchName]);

  // 3. Safe Parsing Strategy (No Silent Fails with Try/Catch fallback per row)
  const parsedGranularResults: GranularExamResult[] = useMemo(() => {
    const parsedData = results.map((r, index) => {
      try {
        // Safely extract properties
        const rawAnswers = typeof (r as any)?.answers === 'string'
          ? JSON.parse((r as any).answers)
          : ((r as any)?.answers || {});

        // Safely call granular score parser with guaranteed object answers
        const parsed = parseGranularScores({ ...r, answers: rawAnswers }, questions);
        return parsed;
      } catch (err) {
        console.error("Row Parsing Failed for row index:", index, "Record:", r, "Error:", err);
        // Safe Fallback Object so the row is NEVER lost or silenced
        const rawScore = Number((r as any)?.total_score || (r as any)?.score || 0);
        let fallbackAnswers = {};
        try {
          fallbackAnswers = typeof (r as any)?.answers === 'string'
            ? JSON.parse((r as any).answers)
            : ((r as any)?.answers || {});
        } catch {
          fallbackAnswers = {};
        }

        const extractedCode = (
          (r as any)?.exam_code ||
          (r as any)?.coupon_code ||
          (r as any)?.coupon ||
          (r as any)?.code ||
          (r as any)?.student_code ||
          (r as any)?.ticket_code ||
          (r as any)?.access_code ||
          (r as any)?.user_code ||
          'N/A'
        ).toString().trim();

        return {
          id: (r as any)?.id || `fallback_${index}_${Math.random()}`,
          exam_code: extractedCode,
          student_name: (r as any)?.student_name || (r as any)?.full_name || (r as any)?.name || 'بدون اسم',
          church_name: (r as any)?.church_name || (r as any)?.church || 'غير محدد',
          stage: (r as any)?.stage || (r as any)?.grade_name || (r as any)?.grade || 'غير محدد',
          subject_name: (r as any)?.subject_name || 'امتحان الأسقفية',
          completed_at: (r as any)?.completed_at || (r as any)?.submitted_at || (r as any)?.created_at || new Date().toISOString(),
          submitted_at: (r as any)?.submitted_at || (r as any)?.completed_at || new Date().toISOString(),
          raw: {
            ...r,
            exam_code: extractedCode,
            answers: fallbackAnswers
          },
          curriculum: { participated: true, score: rawScore, excellence: 0, total: rawScore, maxScore: 50, maxExcellence: 0 },
          hymns: { participated: false, score: 0, excellence: 0, total: 0, maxScore: 0, maxExcellence: 0 },
          coptic1: { participated: false, score: 0, excellence: 0, total: 0, maxScore: 0, maxExcellence: 0 },
          coptic2: { participated: false, score: 0, excellence: 0, total: 0, maxScore: 0, maxExcellence: 0 },
          totalStandardScore: rawScore,
          totalExcellencePoints: Number((r as any)?.excellence_points || 0),
          grandTotal: rawScore + Number((r as any)?.excellence_points || 0),
          maxScore: Number((r as any)?.max_score || 50),
          maxExcellencePoints: Number((r as any)?.max_excellence_points || 0),
          percentage: Number((r as any)?.percentage || 0),
          attemptedCategoriesCount: 1
        };
      }
    });

    console.log("3. Data after JSON parsing:", parsedData);
    return parsedData;
  }, [results, questions]);

  // Combined Unique Filter Lists (Supabase dynamic master lists + records fallback)
  const availableChurches = useMemo(() => {
    const set = new Set<string>(dbChurches);
    results.forEach((r: any) => {
      const ch = r.church_name || r.church;
      if (ch && String(ch).trim()) set.add(String(ch).trim());
    });
    parsedGranularResults.forEach((r: any) => {
      const ch = r.church_name || (r.raw && (r.raw.church_name || r.raw.church));
      if (ch && String(ch).trim()) set.add(String(ch).trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [dbChurches, results, parsedGranularResults]);

  const availableStages = useMemo(() => {
    const set = new Set<string>(dbStages);
    results.forEach((r: any) => {
      const st = r.stage || r.grade;
      if (st && String(st).trim()) set.add(String(st).trim());
    });
    parsedGranularResults.forEach((r: any) => {
      const st = r.stage || (r.raw && (r.raw.stage || r.raw.grade));
      if (st && String(st).trim()) set.add(String(st).trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [dbStages, results, parsedGranularResults]);

  const availableCompetitions = useMemo(() => {
    const set = new Set<string>(dbCompetitions);
    // Add standard categories
    set.add('الدراسي');
    set.add('المحفوظات');
    set.add('القبطي');
    results.forEach((r: any) => {
      const subj = r.subject_name || r.competition_name || (r.raw && r.raw.subject_name);
      if (subj && String(subj).trim()) set.add(String(subj).trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [dbCompetitions, results]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = parsedGranularResults.length;
    const excellenceAchievers = parsedGranularResults.filter(r => r.totalExcellencePoints > 0).length;
    const avgScore = totalCount > 0 
      ? (parsedGranularResults.reduce((acc, curr) => acc + curr.grandTotal, 0) / totalCount).toFixed(1)
      : '0';
    const topScore = totalCount > 0
      ? Math.max(...parsedGranularResults.map(r => r.grandTotal))
      : 0;

    return { totalCount, excellenceAchievers, avgScore, topScore };
  }, [parsedGranularResults]);

  // 4. Flexible Filtered List with Bypass Mode Support & Multi-Column Coupon Lookup
  const filteredResults = useMemo(() => {
    // If Bypass All Filters is ON, return all parsed data immediately
    if (isBypassFilters) {
      console.log("4. Final Filtered Data passed to Table (Bypass Mode Active):", parsedGranularResults);
      return parsedGranularResults;
    }

    const cleanSearch = searchTerm.trim().toLowerCase();
    const cleanSearchStripped = cleanSearch.replace(/[\s\-_#]/g, '');
    const normSearch = normalizeArabic(searchTerm);

    const filtered = parsedGranularResults.filter(r => {
      // Multi-column code candidates for case & space insensitive matching
      const candidateCodes = [
        r.exam_code,
        (r.raw as any)?.exam_code,
        (r.raw as any)?.coupon_code,
        (r.raw as any)?.coupon,
        (r.raw as any)?.code,
        (r.raw as any)?.student_code,
        (r.raw as any)?.ticket_code,
        (r.raw as any)?.access_code,
        (r.raw as any)?.user_code
      ].filter(Boolean).map(c => String(c).trim().toLowerCase());

      const matchesCode = cleanSearch.length > 0 && candidateCodes.some(c => {
        const strippedC = c.replace(/[\s\-_#]/g, '');
        return c === cleanSearch ||
               c.includes(cleanSearch) ||
               cleanSearch.includes(c) ||
               (cleanSearchStripped.length > 0 && (
                 strippedC === cleanSearchStripped ||
                 strippedC.includes(cleanSearchStripped) ||
                 cleanSearchStripped.includes(strippedC)
               ));
      });

      const normName = normalizeArabic(r.student_name || '');
      const normChurch = normalizeArabic(r.church_name || '');
      const normStage = normalizeArabic(r.stage || '');
      const normSubject = normalizeArabic(r.subject_name || '');

      const matchesSearch = !cleanSearch ||
        matchesCode ||
        normName.includes(normSearch) ||
        normChurch.includes(normSearch) ||
        normStage.includes(normSearch) ||
        normSubject.includes(normSearch);

      // Direct coupon / code priority match: if user explicitly typed a code, display immediately
      if (matchesCode && cleanSearch.length >= 3) {
        return true;
      }

      // Flexible Church Matching
      let matchesChurch = true;
      if (churchFilter && churchFilter !== 'الكل' && churchFilter !== 'ALL') {
        const normChurchFilter = normalizeArabic(churchFilter);
        const studentChurch = r.church_name || (r.raw && (r.raw.church_name || (r.raw as any).church)) || '';
        matchesChurch = isChurchMatch(studentChurch, churchFilter) ||
          normChurch === normChurchFilter ||
          normChurch.includes(normChurchFilter) ||
          normChurchFilter.includes(normChurch);
      }

      // Flexible Stage Matching
      let matchesStage = true;
      if (stageFilter && stageFilter !== 'الكل' && stageFilter !== 'ALL') {
        const normStageFilter = normalizeArabic(stageFilter);
        const rawStage = r.stage || (r.raw && (r.raw.stage || (r.raw as any).grade)) || '';
        const studentNormStage = normalizeArabic(rawStage);
        matchesStage = studentNormStage === normStageFilter ||
          studentNormStage.includes(normStageFilter) ||
          normStageFilter.includes(studentNormStage);
      }

      // Flexible Competition Matching
      let matchesCompetition = true;
      if (competitionFilter && competitionFilter !== 'الكل' && competitionFilter !== 'ALL') {
        const normCompFilter = normalizeArabic(competitionFilter);
        const normSubj = normalizeArabic(r.subject_name || '');
        const normStageField = normalizeArabic(r.stage || '');

        if (normCompFilter.includes('دراسي') || normCompFilter === 'دراسي') {
          matchesCompetition = r.curriculum.score > 0 || r.curriculum.excellence > 0 || normSubj.includes('دراسي');
        } else if (normCompFilter.includes('محفوظ') || normCompFilter === 'محفوظات') {
          matchesCompetition = r.hymns.score > 0 || r.hymns.excellence > 0 || normSubj.includes('محفوظ');
        } else if (normCompFilter.includes('قبط') || normCompFilter === 'قبطي') {
          matchesCompetition = r.coptic1.score > 0 || r.coptic2.score > 0 || r.coptic1.excellence > 0 || r.coptic2.excellence > 0 || normSubj.includes('قبط') || normStageField.includes('قبط');
        } else {
          matchesCompetition = normSubj.includes(normCompFilter) ||
            normCompFilter.includes(normSubj) ||
            normStageField.includes(normCompFilter);
        }
      }

      // Excellence Filter
      let matchesExcellence = true;
      if (excellenceFilter === 'has_excellence') {
        matchesExcellence = r.totalExcellencePoints > 0;
      } else if (excellenceFilter === 'curriculum_excellence') {
        matchesExcellence = r.curriculum.excellence > 0;
      } else if (excellenceFilter === 'hymns_excellence') {
        matchesExcellence = r.hymns.excellence > 0;
      } else if (excellenceFilter === 'coptic1_excellence') {
        matchesExcellence = r.coptic1.excellence > 0;
      } else if (excellenceFilter === 'coptic2_excellence') {
        matchesExcellence = r.coptic2.excellence > 0;
      } else if (excellenceFilter === 'perfect') {
        matchesExcellence = r.percentage >= 100;
      }

      return matchesSearch && matchesChurch && matchesStage && matchesCompetition && matchesExcellence;
    });

    console.log("4. Final Filtered Data passed to Table:", filtered);
    return filtered;
  }, [parsedGranularResults, searchTerm, churchFilter, stageFilter, competitionFilter, excellenceFilter, isBypassFilters]);

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const displayedResults = filteredResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Handle Delete / Reset Student Result
  const handleDeleteConfirm = async () => {
    if (!resultToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteBishopricExamResult(resultToDelete.id, resultToDelete.exam_code);
      if (res.success) {
        setActionFeedback({ text: `تم حذف نتيجة المشترك (${resultToDelete.student_name}) وإعادة تفعيل الكود بنجاح.`, type: 'success' });
        setResultToDelete(null);
        await fetchOnlineExamResults();
        setTimeout(() => setActionFeedback({ text: '', type: null }), 4000);
      } else {
        setActionFeedback({ text: res.error || 'تعذر حذف النتيجة.', type: 'error' });
      }
    } catch (err) {
      console.error('Delete error:', err);
      setActionFeedback({ text: 'حدث خطأ أثناء محاولة الحذف.', type: 'error' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Excel Export with Granular Columns
  const handleExportExcel = () => {
    if (filteredResults.length === 0) return;

    const exportRows = filteredResults.map((r, idx) => ({
      'م': idx + 1,
      'كود المتسابق': r.exam_code,
      'اسم المتسابق': r.student_name,
      'الكنيسة': r.church_name,
      'المرحلة': r.stage,
      'دراسي': r.curriculum.score,
      'تميز دراسي': r.curriculum.excellence ? `+${r.curriculum.excellence}` : '0',
      'محفوظات': r.hymns.score,
      'تميز محفوظات': r.hymns.excellence ? `+${r.hymns.excellence}` : '0',
      'قبطي م1': r.coptic1.score,
      'تميز قبطي م1': r.coptic1.excellence ? `+${r.coptic1.excellence}` : '0',
      'قبطي م2': r.coptic2.score,
      'تميز قبطي م2': r.coptic2.excellence ? `+${r.coptic2.excellence}` : '0',
      'المجموع الكلي': r.grandTotal,
      'تاريخ التسليم': r.completed_at ? new Date(r.completed_at).toLocaleString('ar-EG') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف نتائج أونلاين الأسقفية');
    XLSX.writeFile(wb, `كشف_نتائج_امتحانات_أونلاين_الأسقفية_المفصل_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!printRef.current || filteredResults.length === 0) return;
    setIsExportingPDF(true);

    try {
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `كشف_نتائج_امتحانات_أونلاين_الأسقفية_المفصل_${new Date().toISOString().slice(0, 10)}.pdf`,
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
            <span>نتائج امتحانات أونلاين الأسقفية المركزية 2026</span>
          </h4>
          <p className="text-xs font-bold text-slate-500 mt-1">
            كشف تفصيلي يوضح درجات كل مسابقة بشكل مستقل ونقاط التميز الإضافية والمجموع النهائي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Debug Mode Button */}
          <button
            onClick={() => setIsDebugMode(prev => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              isDebugMode 
                ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
            }`}
            title="فحص البيانات الخام من Supabase"
          >
            <Bug size={15} />
            <span>{isDebugMode ? 'إغلاق وضع الفحص (Debug)' : 'وضع الفحص (Debug)'}</span>
          </button>

          {/* Bypass All Filters Button */}
          <button
            onClick={() => setIsBypassFilters(prev => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer border ${
              isBypassFilters 
                ? 'bg-rose-600 text-white border-rose-700 shadow-sm' 
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-300'
            }`}
            title="إلغاء كل فلاتر البحث والمطابقة وعرض كل البيانات فوراً"
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

      {/* 1. RAW DATA CHECK - DEBUG MODE PANEL */}
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
                Parsed: {parsedGranularResults.length}
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
              Raw response from table: <span className="text-amber-300">`bishopric_exam_results`</span>:
            </p>
            <pre className="text-left rtl:text-left bg-gray-900 text-green-400 p-4 overflow-auto max-h-72 rounded-xl text-xs leading-relaxed border border-slate-800">
              {rawSupabaseData.length === 0 
                ? (isLoading ? "// Loading raw data from Supabase..." : "// Table returned 0 records: [] (Check Supabase RLS policies or Table contents)") 
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
            <span>تنبيه: وضع تجاوز الفلاتر نشط (Bypass Filter Active). يتم عرض جميع النتائج المخزنة بدون أي شروط تصفية أو بحث.</span>
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
          <p className="text-[11px] font-bold text-indigo-800">متوسط المجموع الكلي</p>
          <p className="text-lg font-black text-indigo-950 mt-1">{metrics.avgScore}</p>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-2xl">
          <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
            <Star size={12} /> أعلى مجموع مسجل
          </p>
          <p className="text-lg font-black text-emerald-950 mt-1">{metrics.topScore}</p>
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

      {/* Feedback Banner */}
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
              placeholder="اسم المتسابق أو الكود أو الكنيسة..."
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
          <label className="text-[11px] font-black text-slate-600 block mb-1">تصفية حسب المسابقة</label>
          <select
            value={competitionFilter}
            onChange={(e) => { setCompetitionFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="الكل">كل المسابقات ({availableCompetitions.length})</option>
            {availableCompetitions.map(comp => (
              <option key={comp} value={comp}>{comp}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1">تصفية حسب التميز والدرجات</label>
          <select
            value={excellenceFilter}
            onChange={(e) => { setExcellenceFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">كل النتائج</option>
            <option value="has_excellence">الحاصلين على نقاط تميز إضافية 🌟</option>
            <option value="curriculum_excellence">تميز دراسي 🌟</option>
            <option value="hymns_excellence">تميز محفوظات 🌟</option>
            <option value="coptic1_excellence">تميز قبطي مستوى أول 🌟</option>
            <option value="coptic2_excellence">تميز قبطي مستوى ثان 🌟</option>
            <option value="perfect">الحاصلين على 100% فأعلى 💯</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 font-bold flex flex-col items-center gap-2">
          <RefreshCw size={24} className="animate-spin text-indigo-600" />
          <span>جاري تحميل وتحليل نتائج أونلاين الأسقفية...</span>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="py-12 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
          <p>لا توجد نتائج مسجلة تطابق محددات البحث والتصفية.</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <button
              onClick={() => setIsBypassFilters(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            >
              <Unlock size={14} />
              <span>تجاوز الفلاتر وعرض النتائج الخام ({parsedGranularResults.length})</span>
            </button>
            <button
              onClick={() => setIsDebugMode(true)}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-amber-400 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-all shadow-xs"
            >
              <Bug size={14} />
              <span>فحص استجابة Supabase</span>
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
                  
                  {/* Granular Categories Headers */}
                  <th className="p-3 text-center border-l border-slate-200 bg-slate-100">دراسي</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-amber-50/80 text-amber-900 font-black">تميز دراسي</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-slate-100">محفوظات</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-amber-50/80 text-amber-900 font-black">تميز محفوظات</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-slate-100">قبطي م1</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-amber-50/80 text-amber-900 font-black">تميز قبطي م1</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-slate-100">قبطي م2</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-amber-50/80 text-amber-900 font-black">تميز قبطي م2</th>
                  
                  {/* Totals */}
                  <th className="p-3 text-center border-l border-slate-200 bg-indigo-50/70 text-indigo-950 font-black">المجموع الكلي</th>
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
                          title="عرض تفاصيل ورقة الإجابة والمسابقات"
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

                    {/* Student Code */}
                    <td className="p-2.5 font-mono font-black border-l border-slate-100">
                      <span className="bg-slate-100 text-indigo-900 px-2 py-0.5 rounded-md border border-slate-200 text-[11px]">
                        {row.exam_code}
                      </span>
                    </td>

                    {/* Student Name (Clickable to open answers Modal) */}
                    <td className="p-2.5 text-slate-900 font-black border-l border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedResultForDetails(row)}
                        className="text-right font-black text-indigo-950 hover:text-indigo-600 hover:underline flex items-center gap-1.5 cursor-pointer group transition-colors"
                        title="اضغط هنا لإظهار تفاصيل الأسئلة والإجابات المحفوظة للطالب"
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

                    {/* 1. دراسي (Curriculum Score) */}
                    <td className="p-2.5 text-center border-l border-slate-100 font-bold text-slate-800">
                      {row.curriculum.participated ? (
                        <span className="font-black text-slate-900">{row.curriculum.score}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">غير مشترك</span>
                      )}
                    </td>

                    {/* 1. تميز دراسي (Curriculum Excellence) */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      {row.curriculum.excellence > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          +{row.curriculum.excellence} 🌟
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* 2. محفوظات (Hymns Score) */}
                    <td className="p-2.5 text-center border-l border-slate-100 font-bold text-slate-800">
                      {row.hymns.participated ? (
                        <span className="font-black text-slate-900">{row.hymns.score}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">غير مشترك</span>
                      )}
                    </td>

                    {/* 2. تميز محفوظات (Hymns Excellence) */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      {row.hymns.excellence > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          +{row.hymns.excellence} 🌟
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* 3. قبطي م1 (Coptic L1 Score) */}
                    <td className="p-2.5 text-center border-l border-slate-100 font-bold text-slate-800">
                      {row.coptic1.participated ? (
                        <span className="font-black text-slate-900">{row.coptic1.score}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">غير مشترك</span>
                      )}
                    </td>

                    {/* 3. تميز قبطي م1 (Coptic L1 Excellence) */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      {row.coptic1.excellence > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          +{row.coptic1.excellence} 🌟
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* 4. قبطي م2 (Coptic L2 Score) */}
                    <td className="p-2.5 text-center border-l border-slate-100 font-bold text-slate-800">
                      {row.coptic2.participated ? (
                        <span className="font-black text-slate-900">{row.coptic2.score}</span>
                      ) : (
                        <span className="text-slate-400 font-normal text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60">غير مشترك</span>
                      )}
                    </td>

                    {/* 4. تميز قبطي م2 (Coptic L2 Excellence) */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      {row.coptic2.excellence > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          +{row.coptic2.excellence} 🌟
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">-</span>
                      )}
                    </td>

                    {/* المجموع الكلي (Grand Total) */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-black text-xs text-indigo-950 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 shadow-xs">
                          {row.grandTotal}
                        </span>
                        {row.totalExcellencePoints > 0 && (
                          <span className="text-[10px] text-amber-700 font-black mt-0.5">
                            (+{row.totalExcellencePoints} تميز)
                          </span>
                        )}
                      </div>
                    </td>

                    {/* تاريخ التسليم (Submission Date) */}
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

      {/* Student Grade Statement (بيان الدرجات) Modal */}
      {selectedResultForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col font-arabic text-right overflow-hidden animate-fade-in" dir="rtl">
            {/* Modal Header */}
            <div className="p-6 bg-linear-to-l from-indigo-900 to-slate-900 text-white border-b border-indigo-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-white/10 text-amber-300 border border-white/10">
                    <Award size={20} />
                  </span>
                  <h3 className="text-base font-black text-white">
                    بيان درجات المشترك (كشف النتيجة الرسمي)
                  </h3>
                </div>
                <p className="text-xs text-indigo-200 font-bold">
                  المتسابق: <span className="text-white font-black">{selectedResultForDetails.student_name}</span> | كود الكوبون: <span className="font-mono text-amber-300 font-black px-1.5 py-0.5 rounded bg-white/10">{selectedResultForDetails.exam_code}</span>
                </p>
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
              {/* Student Metadata Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700">
                <div>
                  <span className="text-slate-400 block text-[10px]">الكنيسة</span>
                  <span className="text-slate-900 font-black">{selectedResultForDetails.church_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">المرحلة الدراسية</span>
                  <span className="text-slate-900 font-black">{selectedResultForDetails.stage}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">النسبة المئوية</span>
                  <span className="text-indigo-700 font-black font-mono">{selectedResultForDetails.percentage}%</span>
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

              {/* Category Scores Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Curriculum */}
                <div className={`border p-3.5 rounded-2xl text-center flex flex-col justify-between ${
                  selectedResultForDetails.curriculum.participated
                    ? 'bg-slate-50/90 border-indigo-200'
                    : 'bg-slate-50/40 border-slate-200 opacity-80'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800">المنهج الدراسي</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedResultForDetails.curriculum.participated 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {selectedResultForDetails.curriculum.participated ? 'مشترك ✅' : 'غير مشترك'}
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {selectedResultForDetails.curriculum.participated ? `${selectedResultForDetails.curriculum.score} درجة` : '-'}
                    </p>
                  </div>
                  {selectedResultForDetails.curriculum.excellence > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{selectedResultForDetails.curriculum.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* Hymns */}
                <div className={`border p-3.5 rounded-2xl text-center flex flex-col justify-between ${
                  selectedResultForDetails.hymns.participated
                    ? 'bg-slate-50/90 border-indigo-200'
                    : 'bg-slate-50/40 border-slate-200 opacity-80'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800">الألحان والمحفوظات</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedResultForDetails.hymns.participated 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {selectedResultForDetails.hymns.participated ? 'مشترك ✅' : 'غير مشترك'}
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {selectedResultForDetails.hymns.participated ? `${selectedResultForDetails.hymns.score} درجة` : '-'}
                    </p>
                  </div>
                  {selectedResultForDetails.hymns.excellence > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{selectedResultForDetails.hymns.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* Coptic L1 */}
                <div className={`border p-3.5 rounded-2xl text-center flex flex-col justify-between ${
                  selectedResultForDetails.coptic1.participated
                    ? 'bg-slate-50/90 border-indigo-200'
                    : 'bg-slate-50/40 border-slate-200 opacity-80'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800">اللغة القبطية (م1)</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedResultForDetails.coptic1.participated 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {selectedResultForDetails.coptic1.participated ? 'مشترك ✅' : 'غير مشترك'}
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {selectedResultForDetails.coptic1.participated ? `${selectedResultForDetails.coptic1.score} درجة` : '-'}
                    </p>
                  </div>
                  {selectedResultForDetails.coptic1.excellence > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{selectedResultForDetails.coptic1.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* Coptic L2 */}
                <div className={`border p-3.5 rounded-2xl text-center flex flex-col justify-between ${
                  selectedResultForDetails.coptic2.participated
                    ? 'bg-slate-50/90 border-indigo-200'
                    : 'bg-slate-50/40 border-slate-200 opacity-80'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-black text-slate-800">اللغة القبطية (م2)</p>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        selectedResultForDetails.coptic2.participated 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-slate-200 text-slate-600'
                      }`}>
                        {selectedResultForDetails.coptic2.participated ? 'مشترك ✅' : 'غير مشترك'}
                      </span>
                    </div>
                    <p className="text-base font-black text-slate-900 mt-1">
                      {selectedResultForDetails.coptic2.participated ? `${selectedResultForDetails.coptic2.score} درجة` : '-'}
                    </p>
                  </div>
                  {selectedResultForDetails.coptic2.excellence > 0 && (
                    <span className="inline-block mt-2 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{selectedResultForDetails.coptic2.excellence} تميز 🌟
                    </span>
                  )}
                </div>
              </div>

              {/* Total Card */}
              <div className="bg-indigo-50/90 border border-indigo-200 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-indigo-950">المجموع الكلي النهائي المعتمد (للمسابقات المشترك بها)</p>
                  <p className="text-[11px] font-bold text-indigo-700 mt-0.5">
                    الدرجات الأساسية: <span className="font-black">{selectedResultForDetails.totalStandardScore} / {selectedResultForDetails.maxScore}</span>
                    {selectedResultForDetails.totalExcellencePoints > 0 && (
                      <span className="mr-2 text-amber-800 font-black">+ نقاط التميز: {selectedResultForDetails.totalExcellencePoints} 🌟</span>
                    )}
                    <span className="mr-2 text-indigo-900 font-black">({selectedResultForDetails.percentage}%)</span>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white px-4 py-2 rounded-xl border border-indigo-200 text-center">
                    <span className="text-[10px] text-slate-400 font-black block">النسبة المئوية</span>
                    <span className="text-xl font-black text-indigo-600 font-mono">
                      {selectedResultForDetails.percentage}%
                    </span>
                  </div>
                  <div className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-center shadow-xs">
                    <span className="text-[10px] text-indigo-200 font-black block">المجموع النهائي</span>
                    <span className="text-2xl font-black font-mono">
                      {selectedResultForDetails.grandTotal}
                    </span>
                  </div>
                </div>
              </div>

              {/* Detailed Questions & Answers Review */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <BookOpen size={16} className="text-indigo-600" />
                    <span>ورقة الإجابات والأسئلة المحفوظة للطالب (answers)</span>
                  </h4>
                  <span className="text-[11px] font-black px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-900 border border-indigo-200">
                    عدد الإجابات المخزنة: {Object.keys(selectedResultForDetails.raw.answers || {}).length} إجابة
                  </span>
                </div>

                {(() => {
                  let rawAnswers: Record<string, any> = {};
                  try {
                    if (typeof selectedResultForDetails.raw.answers === 'string') {
                      rawAnswers = JSON.parse(selectedResultForDetails.raw.answers);
                    } else if (selectedResultForDetails.raw.answers && typeof selectedResultForDetails.raw.answers === 'object') {
                      rawAnswers = selectedResultForDetails.raw.answers;
                    }
                  } catch {
                    rawAnswers = {};
                  }

                  let rawExcellence: Record<string, any> = {};
                  try {
                    if (typeof selectedResultForDetails.raw.excellence_answers === 'string') {
                      rawExcellence = JSON.parse(selectedResultForDetails.raw.excellence_answers);
                    } else if (selectedResultForDetails.raw.excellence_answers && typeof selectedResultForDetails.raw.excellence_answers === 'object') {
                      rawExcellence = selectedResultForDetails.raw.excellence_answers;
                    }
                  } catch {
                    rawExcellence = {};
                  }
                  const stageNorm = normalizeArabic(selectedResultForDetails.stage || '');

                  // Get questions for this stage from question bank
                  const stageQuestions = questions.filter(q => normalizeArabic(q.stage) === stageNorm);
                  const processedKeys = new Set<string>();

                  const items: Array<{
                    id: string;
                    question_text: string;
                    subject_name: string;
                    student_answer: string;
                    correct_answer?: string;
                    is_correct: boolean;
                    is_excellence: boolean;
                    score: number;
                    has_answer: boolean;
                  }> = [];

                  // 1. Process stage questions
                  stageQuestions.forEach((q, idx) => {
                    const qKey = q.id || `q_${q.question_text}`;
                    if (q.id) processedKeys.add(q.id);
                    if (q.question_text) processedKeys.add(q.question_text);
                    if (q.question_text) processedKeys.add(`q_${q.question_text}`);

                    let studentAns = rawAnswers[q.id];
                    if (studentAns === undefined && q.id) {
                      studentAns = rawAnswers[String(q.id).trim()];
                    }
                    if (studentAns === undefined && qKey) {
                      studentAns = rawAnswers[qKey];
                    }
                    if (studentAns === undefined && q.question_text) {
                      studentAns = rawAnswers[`q_${q.question_text}`] ?? rawAnswers[q.question_text];
                    }
                    if (studentAns === undefined && rawAnswers[idx] !== undefined) {
                      studentAns = rawAnswers[idx];
                    }

                    const hasAns = studentAns !== undefined && studentAns !== null && String(studentAns).trim() !== '';
                    const isCorrect = hasAns && String(studentAns).trim().toLowerCase() === String(q.correct_answer || '').trim().toLowerCase();

                    items.push({
                      id: q.id || `q_${idx}`,
                      question_text: q.question_text,
                      subject_name: q.subject_name || 'عام',
                      student_answer: hasAns ? String(studentAns) : '(لم تتم الإجابة)',
                      correct_answer: q.correct_answer,
                      is_correct: isCorrect,
                      is_excellence: !!q.is_excellence,
                      score: q.score || 1,
                      has_answer: hasAns
                    });
                  });

                  // 2. Process any additional keys in rawAnswers not in stageQuestions
                  Object.entries(rawAnswers).forEach(([key, val]) => {
                    if (processedKeys.has(key)) return;
                    if (key.startsWith('_')) return; // skip metadata keys like _completed_categories
                    const matchedQ = questions.find(q => q.id === key || q.question_text === key || `q_${q.question_text}` === key);
                    const hasAns = val !== undefined && val !== null && String(val).trim() !== '';

                    if (matchedQ) {
                      const isCorrect = hasAns && String(val).trim().toLowerCase() === String(matchedQ.correct_answer || '').trim().toLowerCase();
                      items.push({
                        id: matchedQ.id || key,
                        question_text: matchedQ.question_text,
                        subject_name: matchedQ.subject_name || 'عام',
                        student_answer: hasAns ? String(val) : '(لم تتم الإجابة)',
                        correct_answer: matchedQ.correct_answer,
                        is_correct: isCorrect,
                        is_excellence: !!matchedQ.is_excellence,
                        score: matchedQ.score || 1,
                        has_answer: hasAns
                      });
                    } else {
                      items.push({
                        id: key,
                        question_text: key.startsWith('q_') ? key.slice(2) : key,
                        subject_name: 'إجابة محفوظة',
                        student_answer: hasAns ? String(val) : '(لم تتم الإجابة)',
                        correct_answer: undefined,
                        is_correct: true,
                        is_excellence: false,
                        score: 1,
                        has_answer: hasAns
                      });
                    }
                  });

                  if (items.length === 0 && Object.keys(rawAnswers).length === 0) {
                    return (
                      <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <HelpCircle size={24} className="mx-auto text-slate-400 mb-2" />
                        <p className="font-bold text-xs">تم تسجيل الدرجة الإجمالية والمواد بنجاح في قاعدة البيانات لهذا المشترك.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {items.map((item, idx) => (
                        <div 
                          key={item.id || idx}
                          className={`p-3 rounded-xl border transition-all text-xs font-bold ${
                            !item.has_answer 
                              ? 'bg-slate-50 border-slate-200 text-slate-500'
                              : item.is_correct 
                                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
                                : 'bg-rose-50/70 border-rose-200 text-rose-950'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-white/80 border border-slate-200">
                                  س{idx + 1}
                                </span>
                                <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  {item.subject_name}
                                </span>
                                {item.is_excellence && (
                                  <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                                    سؤال تميز 🌟
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-900 font-bold text-xs mt-1">
                                {item.question_text}
                              </p>
                              <div className="pt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                                <div>
                                  <span className="text-slate-500 font-normal">إجابة المشترك: </span>
                                  <span className="font-black">{item.student_answer}</span>
                                </div>
                                {item.correct_answer && !item.is_correct && (
                                  <div>
                                    <span className="text-emerald-700 font-normal">الإجابة النموذجية: </span>
                                    <span className="font-black text-emerald-800">{item.correct_answer}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1">
                              {!item.has_answer ? (
                                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                  متروك
                                </span>
                              ) : item.is_correct ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 size={12} />
                                  <span>صحيحة (+{item.score})</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                                  <XCircle size={12} />
                                  <span>خاطئة (0)</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
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
              <p>الكود: <span className="font-mono text-indigo-900 font-black">{resultToDelete.exam_code}</span></p>
              <p>الكنيسة: <span>{resultToDelete.church_name}</span></p>
              <p>المجموع النهائي: <span className="text-indigo-600 font-black">{resultToDelete.grandTotal}</span></p>
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
            <h3 className="text-base font-black text-slate-800 mt-1">كشف النتائج والدرجات التفصيلية لامتحانات الأسقفية أونلاين 2026</h3>
            <p className="text-xs font-bold text-slate-600 mt-1">
              إجمالي النتائج المسجلة: {filteredResults.length} طالب وطالبة | تم الاستخراج بتاريخ: {new Date().toLocaleDateString('ar-EG')}
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
                <th className="p-1.5 border border-slate-300 text-center bg-amber-50">تميز دراسي</th>
                <th className="p-1.5 border border-slate-300 text-center">محفوظات</th>
                <th className="p-1.5 border border-slate-300 text-center bg-amber-50">تميز محفوظات</th>
                <th className="p-1.5 border border-slate-300 text-center">قبطي م1</th>
                <th className="p-1.5 border border-slate-300 text-center bg-amber-50">تميز قبطي م1</th>
                <th className="p-1.5 border border-slate-300 text-center">قبطي م2</th>
                <th className="p-1.5 border border-slate-300 text-center bg-amber-50">تميز قبطي م2</th>
                <th className="p-1.5 border border-slate-300 text-center font-black bg-indigo-50">المجموع الكلي</th>
                <th className="p-1.5 border border-slate-300 text-center">تاريخ التسليم</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-200 font-bold">
                  <td className="p-1.5 border border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-1.5 border border-slate-300 font-mono font-black">{r.exam_code}</td>
                  <td className="p-1.5 border border-slate-300">{r.student_name}</td>
                  <td className="p-1.5 border border-slate-300">{r.church_name}</td>
                  <td className="p-1.5 border border-slate-300">{r.stage}</td>
                  <td className="p-1.5 border border-slate-300 text-center">{r.curriculum.score || (r.totalStandardScore && !r.hymns.score && !r.coptic1.score && !r.coptic2.score ? r.totalStandardScore : '-')}</td>
                  <td className="p-1.5 border border-slate-300 text-center text-amber-800">{r.curriculum.excellence ? `+${r.curriculum.excellence}` : '-'}</td>
                  <td className="p-1.5 border border-slate-300 text-center">{r.hymns.score || '-'}</td>
                  <td className="p-1.5 border border-slate-300 text-center text-amber-800">{r.hymns.excellence ? `+${r.hymns.excellence}` : '-'}</td>
                  <td className="p-1.5 border border-slate-300 text-center">{r.coptic1.score || '-'}</td>
                  <td className="p-1.5 border border-slate-300 text-center text-amber-800">{r.coptic1.excellence ? `+${r.coptic1.excellence}` : '-'}</td>
                  <td className="p-1.5 border border-slate-300 text-center">{r.coptic2.score || '-'}</td>
                  <td className="p-1.5 border border-slate-300 text-center text-amber-800">{r.coptic2.excellence ? `+${r.coptic2.excellence}` : '-'}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-black bg-indigo-50/50">{r.grandTotal}</td>
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
