import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  ExternalLink, 
  Search, 
  FileText, 
  CheckCircle2, 
  Users, 
  Building2, 
  Globe, 
  QrCode, 
  RefreshCw,
  Printer,
  Award,
  BookOpen,
  Play,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { withStylesCleaned } from '../utils/oklchCleaner';
import { 
  BishopricExamRecord, 
  BishopricExamResult,
  fetchBishopricExamConfig, 
  fetchChurchBishopricRecordsFromDb,
  fetchBishopricExamResults,
  normalizeArabic
} from '../utils/bishopricExamStorage';
import PaginationComponent from './Pagination';
import { BishopricStudentExamEngine } from './BishopricStudentExamEngine';

interface ChurchBishopricExamCodesViewProps {
  churchName: string;
}

export const ChurchBishopricExamCodesView: React.FC<ChurchBishopricExamCodesViewProps> = ({ churchName }) => {
  const [records, setRecords] = useState<BishopricExamRecord[]>([]);
  const [results, setResults] = useState<BishopricExamResult[]>([]);
  const [portalUrl, setPortalUrl] = useState<string>('https://mahragan-al-karma.org/exams');
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('الكل');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'completed' | 'pending'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [takingExamCode, setTakingExamCode] = useState<string | null>(null);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const printableRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 15;

  // Generate QR Codes for PDF export
  useEffect(() => {
    const generateQrs = async () => {
      const urls: Record<string, string> = {};
      const baseUrl = window.location.origin + window.location.pathname;
      for (const r of records) {
        if (r.exam_code && r.exam_code !== '-') {
          try {
            const cleanCode = r.exam_code.trim();
            const targetUrl = `${baseUrl}#/bishopric-exam?code=${encodeURIComponent(cleanCode)}`;
            const dataUrl = await QRCode.toDataURL(targetUrl, {
              width: 150,
              margin: 1,
              color: { dark: '#000000', light: '#ffffff' },
              errorCorrectionLevel: 'H'
            });
            urls[cleanCode.toLowerCase()] = dataUrl;
          } catch (err) {
            console.warn('QR generation error for code:', r.exam_code, err);
          }
        }
      }
      setQrDataUrls(urls);
    };

    if (records.length > 0) {
      generateQrs();
    }
  }, [records]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch portal URL & settings
      const cfg = await fetchBishopricExamConfig();
      if (cfg.portalUrl) {
        setPortalUrl(cfg.portalUrl);
      }

      // 2. Fetch records strictly from bishopric_exam_codes table for this church
      const [churchData, churchResults] = await Promise.all([
        fetchChurchBishopricRecordsFromDb(churchName),
        fetchBishopricExamResults(churchName)
      ]);
      setRecords(churchData);
      setResults(churchResults);
    } catch (e) {
      console.error('Error loading bishopric exam codes for church:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [churchName]);

  // Results Map by exam_code
  const resultsMap = useMemo(() => {
    const map = new Map<string, BishopricExamResult>();
    results.forEach(res => {
      if (res.exam_code) {
        map.set(res.exam_code.trim().toLowerCase(), res);
      }
    });
    return map;
  }, [results]);

  // Unique stages for filter
  const uniqueStages = useMemo(() => {
    const s = new Set<string>();
    records.forEach(r => {
      if (r.stage) s.add(r.stage);
    });
    return Array.from(s).sort();
  }, [records]);

  // Stats
  const completedCount = useMemo(() => {
    return records.filter(r => resultsMap.has(r.exam_code.trim().toLowerCase())).length;
  }, [records, resultsMap]);

  const avgPercentage = useMemo(() => {
    const scores = records
      .map(r => resultsMap.get(r.exam_code.trim().toLowerCase()))
      .filter((res): res is BishopricExamResult => !!res)
      .map(res => Number(res.percentage) || 0);

    if (scores.length === 0) return 0;
    const sum = scores.reduce((acc, v) => acc + v, 0);
    return Math.round(sum / scores.length);
  }, [records, resultsMap]);

  // Filtered records by search, stage, and status
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const normSearch = normalizeArabic(searchTerm);
      const normName = normalizeArabic(r.student_name);
      const normCode = String(r.exam_code || '').toLowerCase();

      const matchesSearch = !searchTerm || 
        normName.includes(normSearch) || 
        normCode.includes(searchTerm.toLowerCase());

      const matchesStage = selectedStage === 'الكل' || r.stage === selectedStage;

      const isCompleted = resultsMap.has(r.exam_code.trim().toLowerCase());
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'completed' && isCompleted) ||
        (selectedStatus === 'pending' && !isCompleted);

      return matchesSearch && matchesStage && matchesStatus;
    });
  }, [records, searchTerm, selectedStage, selectedStatus, resultsMap]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const displayedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Handle Export Excel
  const handleExportExcel = () => {
    if (records.length === 0) return;

    const rows = records.map((r, idx) => {
      const res = resultsMap.get(r.exam_code.trim().toLowerCase());
      return {
        'م': idx + 1,
        'اسم المشترك': r.student_name,
        'المرحلة': r.stage,
        'اسم الكنيسة': r.church_name,
        'كود امتحان الأسقفية': r.exam_code,
        'حالة الامتحان': res ? 'تم أداء الامتحان' : 'في انتظار الاختبار',
        'الدرجة الحاصل عليها': res ? res.total_score : '-',
        'الدرجة النهائية': res ? res.max_score : '-',
        'النسبة المئوية %': res ? `${res.percentage}%` : '-',
        'تاريخ التسليم': res?.completed_at ? new Date(res.completed_at).toLocaleString('ar-EG') : '-'
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'أكواد ونتائج الأسقفية');
    XLSX.writeFile(workbook, `أكواد_ونتائج_الأسقفية_${(churchName || 'الكنيسة').replace(/\s+/g, '_')}.xlsx`);
  };

  // Handle PDF Export / Printable Voucher Sheet
  const handleExportPdf = async () => {
    if (records.length === 0) {
      alert('لا توجد سجلات لتصديرها كملف PDF');
      return;
    }

    if (!printableRef.current) return;
    setIsExportingPdf(true);

    try {
      const element = printableRef.current;
      const opt = {
        margin: [8, 8, 8, 8],
        filename: `كشف_أكواد_ونتائج_الأسقفية_${(churchName || 'الكنيسة').replace(/\s+/g, '_')}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, allowTaint: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as any;

      await withStylesCleaned(async () => {
        await html2pdf().set(opt).from(element).save();
      });
    } catch (err) {
      console.error('PDF export error:', err);
      alert('حدث خطأ أثناء تحميل ملف PDF. يرجى المحاولة مرة أخرى.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6 font-arabic text-right" dir="rtl">
      {/* Action Header Card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold shadow-inner shrink-0">
            <Globe size={28} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold mb-1 border border-indigo-100">
              <QrCode size={13} /> موقع امتحانات الأسقفية
            </div>
            <h3 className="text-xl font-black text-slate-800">أكواد ونتائج امتحانات الأسقفية الأونلاين</h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              كنيسة: <strong className="text-slate-700">{churchName || 'غير محددة'}</strong> •
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Direct Exam Login Launcher */}
          <button
            onClick={() => setTakingExamCode('')}
            className="flex-1 md:flex-none px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <BookOpen size={16} />
            دخول وبدء الامتحان الإلكتروني
          </button>

          {/* PDF Export Button */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || records.length === 0}
            className="flex-1 md:flex-none px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileText size={16} />
            {isExportingPdf ? 'جاري تجهيز الـ PDF...' : 'تحميل كشف الأكواد والنتائج (PDF)'}
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            disabled={records.length === 0}
            className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all disabled:opacity-50 cursor-pointer"
            title="تصدير Excel"
          >
            <FileSpreadsheet size={18} className="text-emerald-600" />
          </button>

          {/* Refresh */}
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">المشتركين المسجلين بالكشف</div>
            <div className="text-lg font-black text-slate-800">{records.length} مشترك</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">تم أداء الامتحان</div>
            <div className="text-lg font-black text-emerald-700">
              {completedCount} <span className="text-xs text-slate-400 font-bold">({records.length > 0 ? Math.round((completedCount / records.length) * 100) : 0}%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Award size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">متوسط درجات الكنيسة</div>
            <div className="text-lg font-black text-purple-700">{avgPercentage}%</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">المراحل</div>
            <div className="text-lg font-black text-slate-800">{uniqueStages.length} مراحل</div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600 w-4 h-4" />
              جدول أكواد ونتائج امتحانات الأسقفية
            </h4>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              بيانات المشتركين، الأكواد، والدرجات
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالاسم أو الكود..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={selectedStage}
              onChange={(e) => { setSelectedStage(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="الكل">كل المراحل</option>
              {uniqueStages.map(stg => (
                <option key={stg} value={stg}>{stg}</option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value as any); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">كل الحالات</option>
              <option value="completed">تم الامتحان فقط</option>
              <option value="pending">في انتظار الامتحان</option>
            </select>
          </div>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <FileSpreadsheet className="mx-auto text-slate-300" size={40} />
            <p className="text-sm font-black text-slate-700">لم يتم رفع كشف أكواد الأسقفية لكنيسة {churchName || ''} حتى الآن</p>
            <p className="text-xs text-slate-400 font-bold max-w-md mx-auto leading-relaxed">
              ستقوم اللجنة المركزية برفع الأكواد وستظهر الأكواد هنا تلقائيًا فورًا.
            </p>
          </div>
        ) : displayedRecords.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <Search className="mx-auto text-slate-300 mb-2" size={32} />
            <p className="text-xs font-black text-slate-600">لا توجد نتائج مطابقة لبحثك</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-black text-slate-500 border-b border-slate-100">
                  <th className="p-3.5">م</th>
                  <th className="p-3.5">اسم المشترك</th>
                  <th className="p-3.5">المرحلة</th>
                  <th className="p-3.5 text-center">كود امتحان الأسقفية</th>
                  <th className="p-3.5 text-center">حالة ونتيجة الامتحان</th>
                  <th className="p-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {displayedRecords.map((r, idx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  const res = resultsMap.get(r.exam_code.trim().toLowerCase());
                  const isCompleted = !!res;

                  return (
                    <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 text-slate-400 font-black text-[11px]">{globalIdx}</td>
                      <td className="p-3.5 font-black text-slate-900">{r.student_name}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-black">
                          {r.stage}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <code className="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-mono font-black text-xs inline-block">
                          {r.exam_code}
                        </code>
                      </td>
                      <td className="p-3.5 text-center">
                        {isCompleted ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-black text-xs">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>{res.total_score}/{res.max_score} ({res.percentage}%)</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-[11px] font-bold">
                            في انتظار الاختبار
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => setTakingExamCode(r.exam_code)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer ${
                            isCompleted 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
                          }`}
                        >
                          {isCompleted ? (
                            <>
                              <Award size={13} />
                              <span>عرض النتيجة</span>
                            </>
                          ) : (
                            <>
                              <Play size={13} />
                              <span>بدء الامتحان</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <PaginationComponent
                  currentPage={currentPage}
                  totalItems={filteredRecords.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* STUDENT EXAM MODAL */}
      {takingExamCode !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="bg-slate-50 w-full max-w-3xl rounded-3xl p-4 md:p-6 shadow-2xl relative my-8">
            <button
              onClick={() => { setTakingExamCode(null); loadData(); }}
              className="absolute top-6 left-6 p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-800 transition-colors z-10 cursor-pointer"
              title="إغلاق"
            >
              <X size={20} />
            </button>

            <BishopricStudentExamEngine
              initialExamCode={takingExamCode}
              onClose={() => { setTakingExamCode(null); loadData(); }}
              onComplete={() => { loadData(); }}
            />
          </div>
        </div>
      )}

      {/* Hidden Printable PDF Container */}
      <div className="hidden">
        <div ref={printableRef} className="p-8 bg-white font-arabic text-slate-900" dir="rtl">
          {/* Header */}
          <div className="text-center pb-6 border-b-2 border-indigo-600 mb-6">
            <h2 className="text-2xl font-black text-indigo-950 mb-1">مهرجان الكرازة المرقسية 2026</h2>
            <h3 className="text-lg font-black text-slate-800 mb-2">كشف أكواد ونتائج امتحانات الأسقفية الأونلاين</h3>
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mt-3 pt-2 border-t border-slate-200">
              <div>كنيسة: <strong className="text-slate-900">{churchName || 'عام'}</strong></div>
              <div>إجمالي المشتركين: <strong className="text-slate-900">{records.length}</strong></div>
              <div>تم أداء الامتحان: <strong className="text-slate-900">{completedCount}</strong></div>
              <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
            </div>
          </div>

          {/* Table */}
          <table className="w-full text-right border-collapse text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-black text-slate-800 border-b border-slate-300">
                <th className="p-2 border border-slate-300 text-center w-10">م</th>
                <th className="p-2 border border-slate-300">اسم المشترك</th>
                <th className="p-2 border border-slate-300 w-24">المرحلة</th>
                <th className="p-2 border border-slate-300 text-center w-28">QRCode(QR)</th>
                <th className="p-2 border border-slate-300 text-center w-32">كود الامتحان</th>
                <th className="p-2 border border-slate-300 text-center w-24">الدرجة</th>
                <th className="p-2 border border-slate-300 text-center w-20">النسبة %</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => {
                const cleanCode = r.exam_code.trim().toLowerCase();
                const res = resultsMap.get(cleanCode);
                const qrUrl = qrDataUrls[cleanCode];

                return (
                  <tr key={idx} className="border-b border-slate-200 font-bold">
                    <td className="p-2 border border-slate-300 text-center text-slate-600">{idx + 1}</td>
                    <td className="p-2 border border-slate-300 font-black text-slate-900">{r.student_name}</td>
                    <td className="p-2 border border-slate-300 text-slate-700">{r.stage}</td>
                    <td className="p-1.5 border border-slate-300 text-center">
                      {qrUrl ? (
                        <img 
                          src={qrUrl} 
                          alt="QR" 
                          style={{ width: '1.2cm', height: '1.2cm' }}
                          className="object-contain mx-auto border border-slate-300 rounded p-0.5 bg-white inline-block"
                        />
                      ) : (
                        <span className="text-[9px] font-mono text-slate-400">QR</span>
                      )}
                    </td>
                    <td className="p-2 border border-slate-300 text-center">
                      <span className="font-mono font-black text-indigo-900 text-xs tracking-wider inline-block px-2 py-0.5 bg-slate-50 border border-slate-200 rounded">
                        {r.exam_code}
                      </span>
                    </td>
                    <td className="p-2 border border-slate-300 text-center text-slate-800">
                      {res ? `${res.total_score} / ${res.max_score}` : '-'}
                    </td>
                    <td className="p-2 border border-slate-300 text-center font-black text-emerald-800">
                      {res ? `${res.percentage}%` : 'في الانتظار'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Footer Voucher Note */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>لجنة المهرجان • المنطقة - 18 </span>
          </div>
        </div>
      </div>
    </div>
  );
};
