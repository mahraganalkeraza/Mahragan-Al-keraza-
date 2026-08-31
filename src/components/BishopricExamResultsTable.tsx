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
  GraduationCap
} from 'lucide-react';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { 
  BishopricExamResult, 
  fetchBishopricExamResults, 
  normalizeArabic 
} from '../utils/bishopricExamStorage';
import PaginationComponent from './Pagination';

interface BishopricExamResultsTableProps {
  userChurchName?: string;
}

export const BishopricExamResultsTable: React.FC<BishopricExamResultsTableProps> = ({ userChurchName }) => {
  const [results, setResults] = useState<BishopricExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter States
  const [churchFilter, setChurchFilter] = useState('الكل');
  const [stageFilter, setStageFilter] = useState('الكل');
  const [subjectFilter, setSubjectFilter] = useState('الكل');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const ITEMS_PER_PAGE = 15;
  const printRef = useRef<HTMLDivElement>(null);

  const loadResults = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBishopricExamResults(userChurchName);
      setResults(data);
    } catch (err) {
      console.error('Error fetching bishopric exam results:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, [userChurchName]);

  // Unique Filter Lists
  const churchesList = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => { if (r.church_name) set.add(r.church_name); });
    return Array.from(set).sort();
  }, [results]);

  const stagesList = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => { if (r.stage) set.add(r.stage); });
    return Array.from(set).sort();
  }, [results]);

  const subjectsList = useMemo(() => {
    const set = new Set<string>();
    results.forEach(r => { if (r.subject_name) set.add(r.subject_name); });
    return Array.from(set).sort();
  }, [results]);

  // Filtered List
  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const normSearch = normalizeArabic(searchTerm);
      const normName = normalizeArabic(r.student_name || '');
      const normCode = String(r.exam_code || '').toLowerCase();
      const normChurch = normalizeArabic(r.church_name || '');

      const matchesSearch = !searchTerm ||
        normName.includes(normSearch) ||
        normCode.includes(searchTerm.toLowerCase()) ||
        normChurch.includes(normSearch);

      const matchesChurch = churchFilter === 'الكل' || r.church_name === churchFilter;
      const matchesStage = stageFilter === 'الكل' || r.stage === stageFilter;
      const matchesSubject = subjectFilter === 'الكل' || r.subject_name === subjectFilter;

      return matchesSearch && matchesChurch && matchesStage && matchesSubject;
    });
  }, [results, searchTerm, churchFilter, stageFilter, subjectFilter]);

  const totalPages = Math.ceil(filteredResults.length / ITEMS_PER_PAGE);
  const displayedResults = filteredResults.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Excel Export
  const handleExportExcel = () => {
    if (filteredResults.length === 0) return;

    const exportRows = filteredResults.map((r, idx) => ({
      'م': idx + 1,
      'كود الأسقفية': r.exam_code,
      'اسم المشترك': r.student_name,
      'المرحلة': r.stage,
      'الكنيسة': r.church_name,
      'المسابقة': r.subject_name || 'امتحان الأسقفية',
      'الدرجة الأساسية': `${r.total_score} / ${r.max_score}`,
      'النسبة المئوية': `${r.percentage}%`,
      'نقاط التميز': r.excellence_points ? `+${r.excellence_points}` : '0',
      'تاريخ التسليم': r.completed_at ? new Date(r.completed_at).toLocaleString('ar-EG') : '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'نتائج أونلاين الأسقفية');
    XLSX.writeFile(wb, `نتائج_امتحانات_أونلاين_الأسقفية_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // PDF Export
  const handleExportPDF = async () => {
    if (!printRef.current || filteredResults.length === 0) return;
    setIsExportingPDF(true);

    try {
      console.log('Fetched rows for PDF:', filteredResults.length);
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `نتائج_امتحانات_أونلاين_الأسقفية_${new Date().toISOString().slice(0, 10)}.pdf`,
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
            <Award className="text-indigo-600" size={22} />
            <span>نتائج امتحانات أونلاين الأسقفية المركزية</span>
          </h4>
          <p className="text-xs font-bold text-slate-500 mt-1">
            عرض مباشر وكشوف نتائج الطلاب المؤدين لامتحانات الأسقفية أونلاين
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadResults}
            disabled={isLoading}
            className="p-2 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
            title="تحديث النتائج"
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

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1">بحث عام</label>
          <div className="relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="اسم المشترك أو الكود..."
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
            <option value="الكل">كل الكنائس ({churchesList.length})</option>
            {churchesList.map(c => (
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
            <option value="الكل">كل المراحل ({stagesList.length})</option>
            {stagesList.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[11px] font-black text-slate-600 block mb-1">تصفية حسب المسابقة</label>
          <select
            value={subjectFilter}
            onChange={(e) => { setSubjectFilter(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="الكل">كل المسابقات ({subjectsList.length})</option>
            {subjectsList.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
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
        <div className="py-12 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl border border-dashed border-slate-300">
          <p>لا توجد نتائج مسجلة تطابق محددات البحث والتصفية.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-200">
                  <th className="p-3 text-center w-12 border-l border-slate-200">م</th>
                  <th className="p-3 border-l border-slate-200">كود الأسقفية</th>
                  <th className="p-3 border-l border-slate-200">اسم المشترك</th>
                  <th className="p-3 border-l border-slate-200">المرحلة</th>
                  <th className="p-3 border-l border-slate-200">الكنيسة</th>
                  <th className="p-3 border-l border-slate-200">المسابقة</th>
                  <th className="p-3 text-center border-l border-slate-200">الدرجة الأساسية</th>
                  <th className="p-3 text-center border-l border-slate-200">نقاط التميز</th>
                  <th className="p-3 text-center">النسبة المئوية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-bold">
                {displayedResults.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-indigo-50/40 transition-all">
                    <td className="p-3 text-center text-slate-500 border-l border-slate-100">
                      {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                    </td>
                    <td className="p-3 font-mono font-black text-indigo-900 border-l border-slate-100">
                      {row.exam_code}
                    </td>
                    <td className="p-3 text-slate-900 font-black border-l border-slate-100">
                      {row.student_name}
                    </td>
                    <td className="p-3 text-slate-700 border-l border-slate-100">
                      {row.stage}
                    </td>
                    <td className="p-3 text-slate-700 border-l border-slate-100">
                      {row.church_name}
                    </td>
                    <td className="p-3 text-slate-700 border-l border-slate-100">
                      {row.subject_name || 'امتحان الأسقفية'}
                    </td>
                    <td className="p-3 text-center text-slate-900 font-black border-l border-slate-100">
                      {row.total_score} / {row.max_score}
                    </td>
                    <td className="p-3 text-center border-l border-slate-100">
                      {Number(row.excellence_points) > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-black bg-amber-100 text-amber-900 border border-amber-300">
                          +{row.excellence_points} 🌟
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-black">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs ${
                        row.percentage >= 85 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                        row.percentage >= 70 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {row.percentage}%
                      </span>
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

      {/* Hidden PDF Printable Container */}
      <div className="hidden">
        <div ref={printRef} className="p-6 font-arabic text-right bg-white text-slate-900" dir="rtl">
          <div className="text-center border-b-2 border-indigo-900 pb-4 mb-4">
            <h2 className="text-xl font-black text-indigo-900">مهرجان الكرازة المرقسية - أسقفية الشباب</h2>
            <h3 className="text-base font-black text-slate-800 mt-1">كشف نتائج امتحانات أونلاين الأسقفية المركزية</h3>
            <p className="text-xs font-bold text-slate-600 mt-1">
              عدد النتائج المسجلة: {filteredResults.length} طالب وطالبة
            </p>
          </div>

          <table className="w-full text-right border-collapse text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-black border-b border-slate-300">
                <th className="p-2 border border-slate-300 text-center w-10">م</th>
                <th className="p-2 border border-slate-300">كود الأسقفية</th>
                <th className="p-2 border border-slate-300">اسم المشترك</th>
                <th className="p-2 border border-slate-300">المرحلة</th>
                <th className="p-2 border border-slate-300">الكنيسة</th>
                <th className="p-2 border border-slate-300">المسابقة</th>
                <th className="p-2 border border-slate-300 text-center">الدرجة</th>
                <th className="p-2 border border-slate-300 text-center">نقاط التميز</th>
                <th className="p-2 border border-slate-300 text-center">النسبة %</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-200 font-bold">
                  <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                  <td className="p-2 border border-slate-300 font-mono font-black">{r.exam_code}</td>
                  <td className="p-2 border border-slate-300">{r.student_name}</td>
                  <td className="p-2 border border-slate-300">{r.stage}</td>
                  <td className="p-2 border border-slate-300">{r.church_name}</td>
                  <td className="p-2 border border-slate-300">{r.subject_name || 'امتحان الأسقفية'}</td>
                  <td className="p-2 border border-slate-300 text-center">{r.total_score} / {r.max_score}</td>
                  <td className="p-2 border border-slate-300 text-center text-amber-800">{r.excellence_points ? `+${r.excellence_points}` : '-'}</td>
                  <td className="p-2 border border-slate-300 text-center font-black">{r.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
