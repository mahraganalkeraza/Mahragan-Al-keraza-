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
  Printer
} from 'lucide-react';
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

export interface FlatBishopricExamResult {
  id: string;
  exam_code: string;
  student_name: string;
  church_name: string;
  stage: string;
  subject_name: string;
  percentage: number;
  excellence_points: number;
  total_score: number;
  completed_at: string;
  raw: any;
}

interface BishopricExamResultsTableProps {
  userChurchName?: string;
}

export const BishopricExamResultsTable: React.FC<BishopricExamResultsTableProps> = ({ userChurchName }) => {
  const [results, setResults] = useState<FlatBishopricExamResult[]>([]);
  const [rawSupabaseData, setRawSupabaseData] = useState<any[]>([]);
  const [rawSupabaseError, setRawSupabaseError] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug & Filter Controls
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
  const [selectedResultForDetails, setSelectedResultForDetails] = useState<FlatBishopricExamResult | null>(null);
  const [resultToDelete, setResultToDelete] = useState<FlatBishopricExamResult | null>(null);
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

  // 2. Fetch all bishopric exam results with direct column mapping (NO JSON PARSING)
  const fetchOnlineExamResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
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
        setError("خطأ في جلب البيانات: " + fetchErr.message);
        setResults([]);
      } else {
        const rawList: any[] = data || [];

        // Direct Flat Column Mapping - 100% crash-proof without touching row.answers
        const mappedList: FlatBishopricExamResult[] = rawList.map((row, idx) => {
          const studentName = String(row.student_name || row.full_name || row.name || 'بدون اسم').trim();
          const churchName = String(row.church_name || row.church || 'غير محدد').trim();
          const stage = String(row.stage || row.grade || row.grade_name || 'غير محدد').trim();
          const subjectName = String(row.subject_name || row.competition_name || 'امتحان الأسقفية').trim();
          const examCode = String(
            row.exam_code || 
            row.coupon_code || 
            row.coupon || 
            row.code || 
            row.student_code || 
            row.access_code || 
            row.ticket_code || 
            ''
          ).trim();
          const percentage = Number(row.percentage) || Number(row.total_score) || Number(row.score) || 0;
          const excellencePoints = Number(row.excellence_points) || 0;
          const totalScore = Number(row.total_score) || Number(row.score) || percentage;
          const completedAt = String(row.completed_at || row.submitted_at || row.created_at || '');

          return {
            id: String(row.id || `row_${idx}_${Date.now()}`),
            exam_code: examCode,
            student_name: studentName,
            church_name: churchName,
            stage: stage,
            subject_name: subjectName,
            percentage: percentage,
            excellence_points: excellencePoints,
            total_score: totalScore,
            completed_at: completedAt,
            raw: row
          };
        });

        // Church Filter for church portal view if applicable
        let finalData = mappedList;
        if (userChurchName && userChurchName.trim() && userChurchName !== 'ALL' && userChurchName !== 'الكل') {
          const cleanTarget = userChurchName.trim();
          const normTarget = normalizeArabic(cleanTarget);
          finalData = mappedList.filter(r => {
            const chName = r.church_name;
            const normCh = normalizeArabic(chName);
            return isChurchMatch(chName, cleanTarget) ||
                   normCh === normTarget ||
                   normCh.includes(normTarget) ||
                   normTarget.includes(normCh);
          });
        }

        setResults(finalData);
      }
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

  // Combined Unique Filter Lists
  const availableChurches = useMemo(() => {
    const set = new Set<string>(dbChurches);
    results.forEach(r => {
      if (r.church_name && r.church_name !== 'غير محدد') set.add(r.church_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [dbChurches, results]);

  const availableStages = useMemo(() => {
    const set = new Set<string>(dbStages);
    results.forEach(r => {
      if (r.stage && r.stage !== 'غير محدد') set.add(r.stage);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [dbStages, results]);

  const availableCompetitions = useMemo(() => {
    const set = new Set<string>(dbCompetitions);
    set.add('الدراسي');
    set.add('المحفوظات');
    set.add('القبطي');
    results.forEach(r => {
      if (r.subject_name) set.add(r.subject_name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ar'));
  }, [dbCompetitions, results]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const totalCount = results.length;
    const excellenceAchievers = results.filter(r => r.excellence_points > 0).length;
    const avgScore = totalCount > 0 
      ? (results.reduce((acc, curr) => acc + curr.percentage, 0) / totalCount).toFixed(1)
      : '0';
    const topScore = totalCount > 0
      ? Math.max(...results.map(r => r.percentage))
      : 0;

    return { totalCount, excellenceAchievers, avgScore, topScore };
  }, [results]);

  // 3. Filtered Results with Direct Matching
  const filteredResults = useMemo(() => {
    if (isBypassFilters) {
      return results;
    }

    const cleanSearch = searchTerm.trim().toLowerCase();
    const cleanSearchStripped = cleanSearch.replace(/[\s\-_#]/g, '');
    const normSearch = normalizeArabic(searchTerm);

    return results.filter(r => {
      const candidateCode = r.exam_code.toLowerCase();
      const strippedCode = candidateCode.replace(/[\s\-_#]/g, '');

      const matchesCode = cleanSearch.length > 0 && (
        candidateCode === cleanSearch ||
        candidateCode.includes(cleanSearch) ||
        cleanSearch.includes(candidateCode) ||
        (cleanSearchStripped.length > 0 && (
          strippedCode === cleanSearchStripped ||
          strippedCode.includes(cleanSearchStripped) ||
          cleanSearchStripped.includes(strippedCode)
        ))
      );

      const normName = normalizeArabic(r.student_name);
      const normChurch = normalizeArabic(r.church_name);
      const normStage = normalizeArabic(r.stage);
      const normSubject = normalizeArabic(r.subject_name);

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

      // Church Filter
      let matchesChurch = true;
      if (churchFilter && churchFilter !== 'الكل' && churchFilter !== 'ALL') {
        const normChurchFilter = normalizeArabic(churchFilter);
        matchesChurch = isChurchMatch(r.church_name, churchFilter) ||
          normChurch === normChurchFilter ||
          normChurch.includes(normChurchFilter) ||
          normChurchFilter.includes(normChurch);
      }

      // Stage Filter
      let matchesStage = true;
      if (stageFilter && stageFilter !== 'الكل' && stageFilter !== 'ALL') {
        const normStageFilter = normalizeArabic(stageFilter);
        matchesStage = normStage === normStageFilter ||
          normStage.includes(normStageFilter) ||
          normStageFilter.includes(normStage);
      }

      // Competition Filter
      let matchesCompetition = true;
      if (competitionFilter && competitionFilter !== 'الكل' && competitionFilter !== 'ALL') {
        const normCompFilter = normalizeArabic(competitionFilter);
        matchesCompetition = normSubject.includes(normCompFilter) ||
          normCompFilter.includes(normSubject) ||
          normStage.includes(normCompFilter);
      }

      // Excellence Filter
      let matchesExcellence = true;
      if (excellenceFilter === 'has_excellence') {
        matchesExcellence = r.excellence_points > 0;
      } else if (excellenceFilter === 'perfect') {
        matchesExcellence = r.percentage >= 100;
      }

      return matchesSearch && matchesChurch && matchesStage && matchesCompetition && matchesExcellence;
    });
  }, [results, searchTerm, churchFilter, stageFilter, competitionFilter, excellenceFilter, isBypassFilters]);

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

  // Excel Export with Direct Flat Columns
  const handleExportExcel = () => {
    if (filteredResults.length === 0) return;

    const exportRows = filteredResults.map((r, idx) => ({
      'م': idx + 1,
      'كود المتسابق': r.exam_code,
      'اسم المتسابق': r.student_name,
      'الكنيسة': r.church_name,
      'المرحلة': r.stage,
      'المادة / المسابقة': r.subject_name,
      'النسبة المئوية / الدرجة': `${r.percentage}%`,
      'نقاط التميز الإضافية': r.excellence_points > 0 ? `+${r.excellence_points}` : '0',
      'المجموع المسجل': r.total_score,
      'تاريخ التسليم': r.completed_at ? new Date(r.completed_at).toLocaleString('ar-EG') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'كشف نتائج أونلاين الأسقفية');
    XLSX.writeFile(wb, `كشف_نتائج_امتحانات_أونلاين_الأسقفية_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!printRef.current || filteredResults.length === 0) return;
    setIsExportingPDF(true);

    try {
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `كشف_نتائج_امتحانات_أونلاين_الأسقفية_${new Date().toISOString().slice(0, 10)}.pdf`,
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
            كشف معتمد يوضح درجات ونسب ونقاط التميز لجميع المتسابقين مباشرة من قاعدة البيانات
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
          <p className="text-[11px] font-bold text-indigo-800">متوسط الدرجات والنسب</p>
          <p className="text-lg font-black text-indigo-950 mt-1">{metrics.avgScore}%</p>
        </div>
        <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-2xl">
          <p className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
            <Star size={12} /> أعلى نسبة مسجلة
          </p>
          <p className="text-lg font-black text-emerald-950 mt-1">{metrics.topScore}%</p>
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
          <label className="text-[11px] font-black text-slate-600 block mb-1">تصفية حسب التميز</label>
          <select
            value={excellenceFilter}
            onChange={(e) => { setExcellenceFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">كل النتائج</option>
            <option value="has_excellence">الحاصلين على نقاط تميز إضافية 🌟</option>
            <option value="perfect">الحاصلين على 100% فأعلى 💯</option>
          </select>
        </div>
      </div>

      {/* Results Table */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 font-bold flex flex-col items-center gap-2">
          <RefreshCw size={24} className="animate-spin text-indigo-600" />
          <span>جاري تحميل نتائج أونلاين الأسقفية...</span>
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
              <span>تجاوز الفلاتر وعرض النتائج فوراً ({results.length})</span>
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
                  <th className="p-3 border-l border-slate-200">المادة / المسابقة</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-amber-50/80 text-amber-900 font-black">نقاط التميز</th>
                  <th className="p-3 text-center border-l border-slate-200 bg-indigo-50/70 text-indigo-950 font-black">النسبة / الدرجة</th>
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
                          title="عرض بيان الدرجات الرسمي"
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
                        {row.exam_code || 'بدون كود'}
                      </span>
                    </td>

                    {/* Student Name */}
                    <td className="p-2.5 text-slate-900 font-black border-l border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectedResultForDetails(row)}
                        className="text-right font-black text-indigo-950 hover:text-indigo-600 hover:underline flex items-center gap-1.5 cursor-pointer group transition-colors"
                        title="اضغط هنا لإظهار بيان درجات الطالب"
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

                    {/* Subject / Competition */}
                    <td className="p-2.5 text-slate-800 border-l border-slate-100">
                      <span className="text-xs font-bold text-indigo-950">
                        {row.subject_name}
                      </span>
                    </td>

                    {/* Excellence Points */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      {row.excellence_points > 0 ? (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-xs">
                          +{row.excellence_points} 🌟
                        </span>
                      ) : (
                        <span className="text-slate-300 font-normal">0</span>
                      )}
                    </td>

                    {/* Percentage / Score */}
                    <td className="p-2.5 text-center border-l border-slate-100">
                      <div className="flex flex-col items-center justify-center">
                        <span className="font-black text-xs text-indigo-950 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-200 shadow-xs">
                          {row.percentage}%
                        </span>
                        {row.excellence_points > 0 && (
                          <span className="text-[10px] text-amber-700 font-black mt-0.5">
                            (+{row.excellence_points} تميز)
                          </span>
                        )}
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

      {/* Student Grade Statement (بيان الدرجات) Modal */}
      {selectedResultForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col font-arabic text-right overflow-hidden animate-fade-in" dir="rtl">
            {/* Modal Header */}
            <div className="p-6 bg-linear-to-l from-indigo-900 to-slate-900 text-white border-b border-indigo-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-white/10 text-amber-300 border border-white/10">
                    <Award size={20} />
                  </span>
                  <h3 className="text-base font-black text-white">
                    بيان درجات المشترك الرسمي
                  </h3>
                </div>
                <p className="text-xs text-indigo-200 font-bold">
                  المتسابق: <span className="text-white font-black">{selectedResultForDetails.student_name}</span> | كود الكوبون: <span className="font-mono text-amber-300 font-black px-1.5 py-0.5 rounded bg-white/10">{selectedResultForDetails.exam_code || 'بدون كود'}</span>
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
                  <span className="text-slate-400 block text-[10px]">المادة / المسابقة</span>
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

              {/* Total Card */}
              <div className="bg-indigo-50/90 border border-indigo-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-indigo-950">النتيجة الإجمالية والتقييم المعتمد</p>
                  <p className="text-xs font-bold text-indigo-700 mt-1">
                    الدرجة المسجلة: <span className="font-black">{selectedResultForDetails.percentage}%</span>
                    {selectedResultForDetails.excellence_points > 0 && (
                      <span className="mr-2 text-amber-800 font-black">+ نقاط التميز: {selectedResultForDetails.excellence_points} 🌟</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white px-5 py-3 rounded-2xl border border-indigo-200 text-center shadow-xs">
                    <span className="text-[10px] text-slate-400 font-black block">النسبة المئوية</span>
                    <span className="text-2xl font-black text-indigo-600 font-mono">
                      {selectedResultForDetails.percentage}%
                    </span>
                  </div>
                  {selectedResultForDetails.excellence_points > 0 && (
                    <div className="bg-amber-500 text-white px-4 py-3 rounded-2xl text-center shadow-xs">
                      <span className="text-[10px] text-amber-100 font-black block">نقاط التميز</span>
                      <span className="text-xl font-black font-mono">
                        +{selectedResultForDetails.excellence_points} 🌟
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs font-bold text-center leading-relaxed">
                تم اعتماد وتوثيق نتيجة المتسابق رسمياً في سجلات كنترول أسقفية الشباب لعام 2026.
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
              <p>النسبة / الدرجة: <span className="text-indigo-600 font-black">{resultToDelete.percentage}%</span></p>
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
            <h3 className="text-base font-black text-slate-800 mt-1">كشف النتائج والدرجات لامتحانات الأسقفية أونلاين 2026</h3>
            <p className="text-xs font-bold text-slate-600 mt-1">
              إجمالي النتائج المسجلة: {filteredResults.length} طالب وطالبة | تم الاستخراج بتاريخ: {new Date().toLocaleDateString('ar-EG')}
            </p>
          </div>

          <table className="w-full text-right border-collapse text-[11px] border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-black border-b border-slate-300 text-slate-800">
                <th className="p-1.5 border border-slate-300 text-center w-8">م</th>
                <th className="p-1.5 border border-slate-300">كود المتسابق</th>
                <th className="p-1.5 border border-slate-300">اسم المتسابق</th>
                <th className="p-1.5 border border-slate-300">الكنيسة</th>
                <th className="p-1.5 border border-slate-300">المرحلة</th>
                <th className="p-1.5 border border-slate-300">المادة / المسابقة</th>
                <th className="p-1.5 border border-slate-300 text-center bg-amber-50">نقاط التميز</th>
                <th className="p-1.5 border border-slate-300 text-center font-black bg-indigo-50">النسبة / الدرجة</th>
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
                  <td className="p-1.5 border border-slate-300">{r.subject_name}</td>
                  <td className="p-1.5 border border-slate-300 text-center text-amber-800">{r.excellence_points > 0 ? `+${r.excellence_points}` : '0'}</td>
                  <td className="p-1.5 border border-slate-300 text-center font-black bg-indigo-50/50">{r.percentage}%</td>
                  <td className="p-1.5 border border-slate-300 text-center text-[10px]" dir="ltr">
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
