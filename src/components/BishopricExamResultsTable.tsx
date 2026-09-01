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
  ChevronRight
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
  const [questions, setQuestions] = useState<BishopricExamQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter States
  const [churchFilter, setChurchFilter] = useState('الكل');
  const [stageFilter, setStageFilter] = useState('الكل');
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

  const fetchOnlineExamResults = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching results from bishopric_exam_results...", { userChurchName });

      let query = supabase
        .from('bishopric_exam_results')
        .select('*', { count: 'exact' })
        .order('submitted_at', { ascending: false });

      if (userChurchName && userChurchName.trim()) {
        query = query.eq('church_name', userChurchName.trim());
      }

      const [{ data, error: fetchErr, count }, questionsData] = await Promise.all([
        query,
        fetchBishopricQuestions()
      ]);

      if (fetchErr) {
        console.error("Supabase Fetch Error:", fetchErr.message, fetchErr.details || fetchErr);
        setError("خطأ في جلب البيانات: " + fetchErr.message);
        setResults([]);
      } else {
        console.log("Retrieved Records Count:", count);
        console.log("Raw Retrieved Data:", data);

        if (!data || data.length === 0) {
          console.warn("Query succeeded but returned zero records.");
          // Fallback: If userChurchName filter was applied but exact match yielded 0 records, retry without church filter to check fuzzy church match
          if (userChurchName && userChurchName.trim()) {
            console.log("Retrying fetch without church query filter to apply fuzzy matching...");
            const { data: allData, error: allErr, count: allCount } = await supabase
              .from('bishopric_exam_results')
              .select('*', { count: 'exact' })
              .order('submitted_at', { ascending: false });

            if (!allErr && allData && allData.length > 0) {
              const matched = allData.filter(r => isChurchMatch(String(r.church_name || '').trim(), userChurchName.trim()));
              console.log(`Fuzzy matched ${matched.length} records out of ${allCount} total records for church "${userChurchName}".`);
              setResults(matched);
            } else {
              setResults([]);
            }
          } else {
            setResults([]);
          }
        } else {
          setResults(data);
        }
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
    fetchOnlineExamResults();
  }, [userChurchName]);

  // Parse results into granular category score models
  const parsedGranularResults: GranularExamResult[] = useMemo(() => {
    return results.map(r => parseGranularScores(r, questions));
  }, [results, questions]);

  // Unique Filter Lists (safe fallback for church_name / church and stage / grade)
  const availableChurches = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r: any) => {
      const ch = r.church_name || r.church;
      if (ch) set.add(String(ch).trim());
    });
    parsedGranularResults.forEach((r: any) => {
      const ch = r.church_name || (r.raw && (r.raw.church_name || r.raw.church));
      if (ch) set.add(String(ch).trim());
    });
    return Array.from(set).sort();
  }, [results, parsedGranularResults]);

  const availableStages = useMemo(() => {
    const set = new Set<string>();
    results.forEach((r: any) => {
      const st = r.stage || r.grade;
      if (st) set.add(String(st).trim());
    });
    parsedGranularResults.forEach((r: any) => {
      const st = r.stage || (r.raw && (r.raw.stage || r.raw.grade));
      if (st) set.add(String(st).trim());
    });
    return Array.from(set).sort();
  }, [results, parsedGranularResults]);

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

  // Filtered List
  const filteredResults = useMemo(() => {
    return parsedGranularResults.filter(r => {
      const normSearch = normalizeArabic(searchTerm);
      const normName = normalizeArabic(r.student_name || '');
      const normCode = String(r.exam_code || '').toLowerCase();
      const normChurch = normalizeArabic(r.church_name || '');

      const matchesSearch = !searchTerm ||
        normName.includes(normSearch) ||
        normCode.includes(searchTerm.toLowerCase()) ||
        normChurch.includes(normSearch);

      const matchesChurch = churchFilter === 'الكل' || churchFilter === 'ALL' || r.church_name === churchFilter || (r.raw && (r.raw.church_name === churchFilter || (r.raw as any).church === churchFilter));
      const matchesStage = stageFilter === 'الكل' || stageFilter === 'ALL' || r.stage === stageFilter || (r.raw && (r.raw.stage === stageFilter || (r.raw as any).grade === stageFilter));

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

      return matchesSearch && matchesChurch && matchesStage && matchesExcellence;
    });
  }, [parsedGranularResults, searchTerm, churchFilter, stageFilter, excellenceFilter]);

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
          <button
            onClick={fetchOnlineExamResults}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
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
        <div className="py-12 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <p>لا توجد نتائج مسجلة تطابق محددات البحث والتصفية.</p>
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
                      {row.curriculum.score > 0 || row.curriculum.maxScore > 0 
                        ? row.curriculum.score 
                        : (row.totalStandardScore > 0 && !row.hymns.score && !row.coptic1.score && !row.coptic2.score ? row.totalStandardScore : '-')}
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
                      {row.hymns.score > 0 || row.hymns.maxScore > 0 ? row.hymns.score : '-'}
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
                      {row.coptic1.score > 0 || row.coptic1.maxScore > 0 ? row.coptic1.score : '-'}
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
                      {row.coptic2.score > 0 || row.coptic2.maxScore > 0 ? row.coptic2.score : '-'}
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

      {/* Details Modal */}
      {selectedResultForDetails && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col font-arabic text-right overflow-hidden animate-fade-in" dir="rtl">
            {/* Modal Header */}
            <div className="p-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Award className="text-indigo-600" size={20} />
                  <span>تفاصيل نتيجة: {selectedResultForDetails.student_name}</span>
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-1">
                  كود المشترك: <span className="font-mono text-indigo-900 font-black">{selectedResultForDetails.exam_code}</span> | المرحلة: {selectedResultForDetails.stage} | الكنيسة: {selectedResultForDetails.church_name}
                </p>
              </div>
              <button 
                onClick={() => setSelectedResultForDetails(null)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-500 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Category Scores Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Curriculum */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
                  <p className="text-xs font-black text-slate-700">دراسي</p>
                  <p className="text-base font-black text-slate-900 mt-1">{selectedResultForDetails.curriculum.score} درجة</p>
                  {selectedResultForDetails.curriculum.excellence > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{selectedResultForDetails.curriculum.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* Hymns */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
                  <p className="text-xs font-black text-slate-700">محفوظات</p>
                  <p className="text-base font-black text-slate-900 mt-1">{selectedResultForDetails.hymns.score} درجة</p>
                  {selectedResultForDetails.hymns.excellence > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{selectedResultForDetails.hymns.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* Coptic L1 */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
                  <p className="text-xs font-black text-slate-700">قبطي م1</p>
                  <p className="text-base font-black text-slate-900 mt-1">{selectedResultForDetails.coptic1.score} درجة</p>
                  {selectedResultForDetails.coptic1.excellence > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{selectedResultForDetails.coptic1.excellence} تميز 🌟
                    </span>
                  )}
                </div>

                {/* Coptic L2 */}
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl text-center">
                  <p className="text-xs font-black text-slate-700">قبطي م2</p>
                  <p className="text-base font-black text-slate-900 mt-1">{selectedResultForDetails.coptic2.score} درجة</p>
                  {selectedResultForDetails.coptic2.excellence > 0 && (
                    <span className="inline-block mt-1 text-[10px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                      +{selectedResultForDetails.coptic2.excellence} تميز 🌟
                    </span>
                  )}
                </div>
              </div>

              {/* Total Card */}
              <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-indigo-900">المجموع الكلي النهائي</p>
                  <p className="text-[11px] font-bold text-indigo-700 mt-0.5">
                    مجموع الدرجات الأساسية: {selectedResultForDetails.totalStandardScore} + نقاط التميز: {selectedResultForDetails.totalExcellencePoints}
                  </p>
                </div>
                <div className="text-left">
                  <span className="text-2xl font-black text-indigo-950 font-mono">
                    {selectedResultForDetails.grandTotal}
                  </span>
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
                  const rawAnswers = selectedResultForDetails.raw.answers || {};
                  const rawExcellence = selectedResultForDetails.raw.excellence_answers || {};
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

                    const studentAns = rawAnswers[q.id] !== undefined
                      ? rawAnswers[q.id]
                      : (rawAnswers[qKey] !== undefined ? rawAnswers[qKey] : rawAnswers[q.question_text]);

                    const hasAns = studentAns !== undefined && studentAns !== null && String(studentAns).trim() !== '';
                    const isCorrect = hasAns && String(studentAns).trim() === String(q.correct_answer || '').trim();

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
                    const matchedQ = questions.find(q => q.id === key || q.question_text === key || `q_${q.question_text}` === key);
                    const hasAns = val !== undefined && val !== null && String(val).trim() !== '';

                    if (matchedQ) {
                      const isCorrect = hasAns && String(val).trim() === String(matchedQ.correct_answer || '').trim();
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
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs font-bold text-slate-500">
                        لا تتوفر إجابات مخزنة في سجل هذا الطالب.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {/* Standard & Stage Questions List */}
                      <div className="space-y-3">
                        {items.map((q, qIdx) => {
                          const isCoptic = selectedResultForDetails.stage?.includes('قبطي') || selectedResultForDetails.stage?.includes('م1') || selectedResultForDetails.stage?.includes('م2') || q.subject_name?.includes('قبطي') || q.subject_name?.includes('م1') || q.subject_name?.includes('م2');
                          return (
                          <div 
                            key={q.id || qIdx}
                            className={`p-3.5 rounded-2xl border text-xs transition-all ${
                              q.is_excellence 
                                ? (q.is_correct ? 'bg-amber-50/70 border-amber-300' : 'bg-slate-50 border-slate-200')
                                : (q.has_answer 
                                    ? (q.is_correct ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/30 border-rose-200')
                                    : 'bg-slate-50 border-slate-200 opacity-70')
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className={`font-black text-slate-800 flex items-center gap-1.5 ${isCoptic ? 'coptic-font' : ''}`}>
                                <span className="w-5 h-5 rounded-full bg-slate-200/80 text-slate-700 flex items-center justify-center text-[10px] shrink-0 font-bold">
                                  {qIdx + 1}
                                </span>
                                {q.question_text}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200/80 text-slate-700">
                                  {q.subject_name}
                                </span>
                                {q.is_excellence ? (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 border border-amber-300">
                                    سؤال تميز 🌟
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                    {q.score} د
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] mt-2 pt-2 border-t border-slate-200/60">
                              <div className="flex items-start gap-1">
                                <span className="text-slate-500 font-bold shrink-0">إجابة الطالب المخزنة: </span>
                                <span className={`font-black ${
                                  !q.has_answer ? 'text-slate-400 italic' : (q.is_correct ? 'text-emerald-700' : 'text-rose-700')
                                } ${isCoptic ? 'coptic-font' : ''}`}>
                                  {q.student_answer}
                                </span>
                              </div>
                              {q.correct_answer && (
                                <div className="flex items-start gap-1">
                                  <span className="text-slate-500 font-bold shrink-0">الإجابة الصحيحة: </span>
                                  <span className={`font-black text-emerald-800 ${isCoptic ? 'coptic-font' : ''}`}>
                                    {q.correct_answer}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                        })}
                      </div>

                      {/* Saved Excellence Answers Section if present */}
                      {Object.keys(rawExcellence).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                          <h5 className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                            <Sparkles size={15} className="text-amber-600" />
                            <span>إجابات أسئلة التميز المحفوظة (excellence_answers)</span>
                          </h5>
                          <div className="grid grid-cols-1 gap-2">
                            {Object.entries(rawExcellence).map(([catKey, excData]: [string, any]) => (
                              <div key={catKey} className="p-3 bg-amber-50/60 border border-amber-200 rounded-2xl text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-amber-950">
                                  <span>فئة التميز: {catKey}</span>
                                  <span className="text-[10px] font-black px-2 py-0.5 bg-amber-200 text-amber-900 rounded-full">
                                    +{excData?.score || 1} نقطة تميز
                                  </span>
                                </div>
                                {excData?.question && (
                                  <p className="text-[11px] font-bold text-slate-700">
                                    السؤال: <span className="text-slate-900 font-black">{excData.question}</span>
                                  </p>
                                )}
                                {excData?.answer && (
                                  <p className="text-[11px] font-bold text-slate-700">
                                    الإجابة المسجلة: <span className="text-amber-900 font-black">{excData.answer}</span>
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedResultForDetails(null)}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all cursor-pointer"
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
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 font-arabic text-right space-y-4" dir="rtl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 size={24} />
            </div>
            
            <div className="text-center">
              <h3 className="text-base font-black text-slate-900">تأكيد حذف النتيجة وإعادة تفعيل الكود</h3>
              <p className="text-xs font-bold text-slate-500 mt-2 leading-relaxed">
                هل أنت متأكد من رغبتك في حذف نتيجة المشترك <span className="text-slate-900 font-black">({resultToDelete.student_name})</span> صاحب الكود <span className="font-mono text-indigo-900 font-black">({resultToDelete.exam_code})</span>؟
                <br />
                <span className="text-amber-700 mt-1 inline-block">سيتم مسح النتيجة وإعادة فتح الكود لتمكينه من إعادة الامتحان إن لزم.</span>
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
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
