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
  Printer
} from 'lucide-react';
import * as XLSX from 'xlsx';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { withStylesCleaned } from '../utils/oklchCleaner';
import { 
  BishopricExamRecord, 
  fetchBishopricExamConfig, 
  fetchChurchBishopricRecordsFromDb,
  normalizeArabic
} from '../utils/bishopricExamStorage';
import PaginationComponent from './Pagination';

interface ChurchBishopricExamCodesViewProps {
  churchName: string;
}

export const ChurchBishopricExamCodesView: React.FC<ChurchBishopricExamCodesViewProps> = ({ churchName }) => {
  const [records, setRecords] = useState<BishopricExamRecord[]>([]);
  const [portalUrl, setPortalUrl] = useState<string>('https://mahragan-al-karma.org/exams');
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState('الكل');
  const [currentPage, setCurrentPage] = useState(1);
  const printableRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 15;

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch portal URL & settings
      const cfg = await fetchBishopricExamConfig();
      if (cfg.portalUrl) {
        setPortalUrl(cfg.portalUrl);
      }

      // 2. Fetch records strictly from bishopric_exam_codes table for this church
      const churchData = await fetchChurchBishopricRecordsFromDb(churchName);
      setRecords(churchData);
    } catch (e) {
      console.error('Error loading bishopric exam codes for church:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [churchName]);

  // Unique stages for filter
  const uniqueStages = useMemo(() => {
    const s = new Set<string>();
    records.forEach(r => {
      if (r.stage) s.add(r.stage);
    });
    return Array.from(s).sort();
  }, [records]);

  // Filtered records by search & stage
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      const normSearch = normalizeArabic(searchTerm);
      const normName = normalizeArabic(r.student_name);
      const normCode = String(r.exam_code || '').toLowerCase();

      const matchesSearch = !searchTerm || 
        normName.includes(normSearch) || 
        normCode.includes(searchTerm.toLowerCase());

      const matchesStage = selectedStage === 'الكل' || r.stage === selectedStage;

      return matchesSearch && matchesStage;
    });
  }, [records, searchTerm, selectedStage]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const displayedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Handle Export Excel
  const handleExportExcel = () => {
    if (records.length === 0) return;

    const rows = records.map((r, idx) => ({
      'م': idx + 1,
      'اسم المشترك': r.student_name,
      'المرحلة': r.stage,
      'اسم الكنيسة': r.church_name,
      'كود امتحان الأسقفية': r.exam_code
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'أكواد امتحانات الأسقفية');
    XLSX.writeFile(workbook, `أكواد_امتحانات_الأسقفية_${(churchName || 'الكنيسة').replace(/\s+/g, '_')}.xlsx`);
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
        filename: `كشف_أكواد_امتحانات_الأسقفية_${(churchName || 'الكنيسة').replace(/\s+/g, '_')}.pdf`,
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
              <QrCode size={13} /> منصة امتحانات أسقفية الشباب
            </div>
            <h3 className="text-xl font-black text-slate-800">أكواد امتحانات الأسقفية الإلكترونية</h3>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              كنيسة: <strong className="text-slate-700">{churchName || 'غير محددة'}</strong> • الكشوف الرسمية المعتمدة للامتحانات المركزية
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Header Action Button: الانتقال إلى منصة امتحانات الأسقفية */}
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 md:flex-none px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
          >
            <ExternalLink size={16} />
            الانتقال إلى منصة امتحانات الأسقفية
          </a>

          {/* PDF Export Button: تحميل كشف أكواد الأسقفية (PDF) */}
          <button
            onClick={handleExportPdf}
            disabled={isExportingPdf || records.length === 0}
            className="flex-1 md:flex-none px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs md:text-sm font-black flex items-center justify-center gap-2 shadow-md shadow-emerald-600/10 transition-all disabled:opacity-50 cursor-pointer"
          >
            <FileText size={16} />
            {isExportingPdf ? 'جاري تجهيز الـ PDF...' : 'تحميل كشف أكواد الأسقفية (PDF)'}
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">المراحل المشمولة للكنيسة</div>
            <div className="text-lg font-black text-slate-800">{uniqueStages.length} مراحل</div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">حالة الكشف الرسمي</div>
            <div className="text-sm font-black text-emerald-700">
              {records.length > 0 ? 'معتمد ومحدث' : 'في انتظار الرفع المركزي'}
            </div>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600 w-4 h-4" />
              جدول أكواد امتحانات الأسقفية [اسم المشترك | المرحلة | كود امتحان الأسقفية]
            </h4>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              يمكن استخدام هذه الأكواد للدخول لمنصة امتحانات الأسقفية مباشرة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
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
          </div>
        </div>

        {records.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <FileSpreadsheet className="mx-auto text-slate-300" size={40} />
            <p className="text-sm font-black text-slate-700">لم يتم رفع كشف أكواد الأسقفية لكنيسة {churchName || ''} حتى الآن</p>
            <p className="text-xs text-slate-400 font-bold max-w-md mx-auto leading-relaxed">
              سيقوم مسؤولو الكنترول برفع الكشف المعتمد من الأسقفية وستظهر الأكواد هنا تلقائياً فور اعتمادها.
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
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {displayedRecords.map((r, idx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
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

      {/* Hidden Printable PDF Container */}
      <div className="hidden">
        <div ref={printableRef} className="p-8 bg-white font-arabic text-slate-900" dir="rtl">
          {/* Header */}
          <div className="text-center pb-6 border-b-2 border-indigo-600 mb-6">
            <h2 className="text-2xl font-black text-indigo-950 mb-1">مهرجان الكرازة المرقسية 2026</h2>
            <h3 className="text-lg font-black text-slate-800 mb-2">كشف أكواد امتحانات الأسقفية الإلكترونية</h3>
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 mt-3 pt-2 border-t border-slate-200">
              <div>كنيسة: <strong className="text-slate-900">{churchName || 'عام'}</strong></div>
              <div>إجمالي المشتركين: <strong className="text-slate-900">{records.length}</strong></div>
              <div>تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</div>
            </div>
            {portalUrl && (
              <div className="text-[11px] font-mono text-indigo-700 mt-2 bg-indigo-50 p-2 rounded-lg border border-indigo-100">
                رابط المنصة: {portalUrl}
              </div>
            )}
          </div>

          {/* Table */}
          <table className="w-full text-right border-collapse text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 font-black text-slate-800 border-b border-slate-300">
                <th className="p-2 border border-slate-300 text-center w-12">م</th>
                <th className="p-2 border border-slate-300">اسم المشترك</th>
                <th className="p-2 border border-slate-300 w-32">المرحلة</th>
                <th className="p-2 border border-slate-300 text-center w-40">كود امتحان الأسقفية</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, idx) => (
                <tr key={idx} className="border-b border-slate-200 font-bold">
                  <td className="p-2 border border-slate-300 text-center text-slate-600">{idx + 1}</td>
                  <td className="p-2 border border-slate-300 font-black text-slate-900">{r.student_name}</td>
                  <td className="p-2 border border-slate-300 text-slate-700">{r.stage}</td>
                  <td className="p-2 border border-slate-300 text-center font-mono font-black text-indigo-900">{r.exam_code}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Voucher Note */}
          <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] font-bold text-slate-500">
            <span>ملاحظة: يتم استخدام هذه الأكواد لتسجيل الدخول وأداء الامتحان عبر منصة الأسقفية المركزية.</span>
            <span>كنترول المهرجان • أسقفية الشباب</span>
          </div>
        </div>
      </div>
    </div>
  );
};
