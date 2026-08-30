import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import { useNotificationBubble } from '../context/NotificationContext';
import { isChurchMatch } from '../utils/bishopricExamStorage';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import { withStylesCleaned } from '../utils/oklchCleaner';
import { 
  FileText, 
  Loader2, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Users
} from 'lucide-react';

export interface BishopricExamCodeRecord {
  id?: string;
  student_name: string;
  stage: string;
  church_name: string;
  code?: string;
  exam_code?: string;
  is_used?: boolean;
  status?: string;
  created_at?: string;
}

export interface BishopricChurchCodesPdfExporterProps {
  churchList?: string[];
  className?: string;
}

export const BishopricChurchCodesPdfExporter: React.FC<BishopricChurchCodesPdfExporterProps> = ({ 
  churchList: initialChurchList = [],
  className = ''
}) => {
  const [selectedChurch, setSelectedChurch] = useState<string>('');
  const [churchList, setChurchList] = useState<string[]>(initialChurchList);
  const [isLoadingChurches, setIsLoadingChurches] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  
  // Preview / Loaded data for selected church
  const [churchCodes, setChurchCodes] = useState<BishopricExamCodeRecord[]>([]);
  const [isLoadingCodes, setIsLoadingCodes] = useState<boolean>(false);
  const [hasFetchedOnce, setHasFetchedOnce] = useState<boolean>(false);

  const { showBubble } = useNotificationBubble();
  const printRef = useRef<HTMLDivElement>(null);

  // 1. Fetch distinct church list for dropdown
  const loadChurches = async () => {
    setIsLoadingChurches(true);
    try {
      const churchesSet = new Set<string>(initialChurchList.filter(Boolean));

      // Fetch from churches table
      const { data: dbChurches, error: churchErr } = await supabase
        .from('churches')
        .select('name')
        .order('name');

      if (!churchErr && dbChurches) {
        dbChurches.forEach((c: any) => {
          if (c.name) churchesSet.add(c.name.trim());
        });
      }

      // Also fetch distinct churches from bishopric_exam_codes table
      const { data: codeChurches, error: codesErr } = await supabase
        .from('bishopric_exam_codes')
        .select('church_name');

      if (!codesErr && codeChurches) {
        codeChurches.forEach((c: any) => {
          if (c.church_name) churchesSet.add(c.church_name.trim());
        });
      }

      const sortedList = Array.from(churchesSet).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ar'));
      setChurchList(sortedList);
    } catch (err) {
      console.warn('Error loading church list for bishopric exporter:', err);
    } finally {
      setIsLoadingChurches(false);
    }
  };

  useEffect(() => {
    loadChurches();
  }, [initialChurchList.length]);

  // Query helper to fetch codes from bishopric_exam_codes with flexible matching
  const fetchCodesForChurch = async (churchName: string): Promise<BishopricExamCodeRecord[]> => {
    const cleanChurchName = (churchName || '').trim();
    if (!cleanChurchName) return [];

    try {
      // 1. Primary Query: ILIKE with cleanChurchName
      const { data: ilikeData, error: ilikeError } = await supabase
        .from('bishopric_exam_codes')
        .select('*')
        .ilike('church_name', `%${cleanChurchName}%`);

      if (!ilikeError && ilikeData && ilikeData.length > 0) {
        return ilikeData.map(item => ({
          ...item,
          code: item.code || item.exam_code || '',
          is_used: Boolean(item.is_used === true || String(item.is_used).toLowerCase() === 'true' || item.status === 'completed')
        }));
      }

      // 2. Query without 'كنيسة' prefix if present
      const coreName = cleanChurchName.replace(/^كنيسة\s*/, '').trim();
      if (coreName && coreName !== cleanChurchName) {
        const { data: coreData, error: coreErr } = await supabase
          .from('bishopric_exam_codes')
          .select('*')
          .ilike('church_name', `%${coreName}%`);

        if (!coreErr && coreData && coreData.length > 0) {
          return coreData.map(item => ({
            ...item,
            code: item.code || item.exam_code || '',
            is_used: Boolean(item.is_used === true || String(item.is_used).toLowerCase() === 'true' || item.status === 'completed')
          }));
        }
      }

      // 3. Fallback: Fetch all and perform normalized Arabic church matching
      const { data: allData, error: allErr } = await supabase
        .from('bishopric_exam_codes')
        .select('*');

      if (!allErr && allData && allData.length > 0) {
        const matched = allData.filter(item => isChurchMatch(item.church_name, cleanChurchName));
        if (matched.length > 0) {
          return matched.map(item => ({
            ...item,
            code: item.code || item.exam_code || '',
            is_used: Boolean(item.is_used === true || String(item.is_used).toLowerCase() === 'true' || item.status === 'completed')
          }));
        }
      }

      return [];
    } catch (err) {
      console.error('Error in fetchCodesForChurch:', err);
      return [];
    }
  };

  // Automatically fetch preview codes when selected church changes
  useEffect(() => {
    if (!selectedChurch) {
      setChurchCodes([]);
      setHasFetchedOnce(false);
      return;
    }

    let isMounted = true;
    const loadPreview = async () => {
      setIsLoadingCodes(true);
      try {
        const data = await fetchCodesForChurch(selectedChurch);
        if (isMounted) {
          setChurchCodes(data);
          setHasFetchedOnce(true);
        }
      } catch (err) {
        console.error('Error fetching preview codes for church:', err);
      } finally {
        if (isMounted) setIsLoadingCodes(false);
      }
    };

    loadPreview();

    return () => {
      isMounted = false;
    };
  }, [selectedChurch]);

  // Dynamic statistics calculation based on fetched records
  const stats = useMemo(() => {
    const total = churchCodes.length;
    const available = churchCodes.filter(item => !item.is_used).length;
    const used = churchCodes.filter(item => item.is_used).length;
    return { total, used, available };
  }, [churchCodes]);

  // Helper to format date
  const getFormattedDate = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Helper to sanitize church name for file naming
  const getSanitizedChurchName = (name: string) => {
    return (name || 'الكنيسة').trim().replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
  };

  // Handle PDF Export
  const handleDownloadChurchCodesPdf = async () => {
    const cleanChurchName = selectedChurch.trim();
    if (!cleanChurchName) {
      showBubble({
        type: 'warning',
        title: 'تنبيه',
        message: 'يرجى اختيار الكنيسة أولاً لتنزيل الأكواد الخاصة بها.'
      });
      return;
    }

    setIsExporting(true);
    try {
      // 1. Fetch data from table bishopric_exam_codes
      const data = await fetchCodesForChurch(cleanChurchName);

      if (!data || data.length === 0) {
        showBubble({
          type: 'error',
          title: 'لا توجد بيانات',
          message: `لا توجد أكواد أسقفية مسجلة لكنيسة ${cleanChurchName}.`
        });
        return;
      }

      setChurchCodes(data);
      setHasFetchedOnce(true);

      if (!printRef.current) {
        showBubble({
          type: 'error',
          title: 'خطأ',
          message: 'تعذر تجهيز قالب الطباعة، يرجى المحاولة مرة أخرى.'
        });
        return;
      }

      // 2. Generate PDF
      const cleanChurch = getSanitizedChurchName(cleanChurchName);
      const fileName = `أكواد_الأسقفية_${cleanChurch}.pdf`;

      const opt = {
        margin: [10, 10, 10, 10],
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, allowTaint: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      } as any;

      await withStylesCleaned(async () => {
        await html2pdf().set(opt).from(printRef.current).save();
      });

      showBubble({
        type: 'success',
        title: 'تم التنزيل بنجاح',
        message: `تم تحميل ملف PDF لأكواد كنيسة ${cleanChurchName} بنجاح (${data.length} كود).`
      });
    } catch (err) {
      console.error('PDF export error:', err);
      showBubble({
        type: 'error',
        title: 'خطأ',
        message: 'حدث خطأ أثناء استخراج ملف الـ PDF، يرجى المحاولة مرة أخرى.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div 
      className={`bg-white border border-slate-200/90 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 font-arabic text-right ${className}`}
      dir="rtl"
      id="bishopric-church-codes-pdf-exporter"
    >
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-50 to-blue-100 text-indigo-700 rounded-2xl flex items-center justify-center font-bold shadow-inner shrink-0 border border-indigo-200/50">
            <Building2 size={28} />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-[11px] font-black mb-1.5 border border-indigo-200/50">
              <Sparkles size={12} className="text-indigo-600" />
              تصدير رسمي كملف PDF
            </div>
            <h3 className="text-xl md:text-2xl font-black text-slate-800">
              تحميل أكواد الأسقفية حسب الكنيسة (PDF)
            </h3>
            <p className="text-xs md:text-sm text-slate-500 font-bold mt-1">
              اختر الكنيسة المطلوبة لتوليد وتنزيل كشف أكواد امتحانات الأسقفية المعتمد بصيغة PDF جاهز للطباعة والتوزيع
            </p>
          </div>
        </div>

        <button
          onClick={loadChurches}
          disabled={isLoadingChurches}
          className="p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-700 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
          title="تحديث قائمة الكنائس"
        >
          <RefreshCw size={16} className={isLoadingChurches ? 'animate-spin text-indigo-600' : ''} />
          <span className="hidden sm:inline">تحديث الكنائس</span>
        </button>
      </div>

      {/* Control Panel: Church Dropdown & Export PDF Button */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-5 md:p-6 space-y-4">
        <label className="block text-xs font-black text-slate-700">
          اختر الكنيسة المراد استخراج وتنزيل كشف أكوادها:
        </label>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Church Select */}
          <div className="relative flex-1">
            <select
              value={selectedChurch}
              onChange={(e) => setSelectedChurch(e.target.value)}
              className="w-full pl-4 pr-11 py-3 bg-white border border-slate-200 rounded-2xl text-xs sm:text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer shadow-sm appearance-none"
              id="bishopric-church-select-dropdown"
            >
              <option value="">-- اضغط هنا لاختيار الكنيسة ({churchList.length} كنيسة مسجلة) --</option>
              {churchList.map((church) => (
                <option key={church} value={church}>
                  {church}
                </option>
              ))}
            </select>
            <Building2 size={18} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <ChevronDown size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          {/* Primary PDF Download Button */}
          <button
            onClick={handleDownloadChurchCodesPdf}
            disabled={isExporting || !selectedChurch}
            id="download-church-codes-pdf-btn"
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition-all shadow-md shadow-indigo-600/25 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isExporting ? (
              <>
                <Loader2 size={18} className="animate-spin text-white" />
                <span>جاري توليد ملف الـ PDF...</span>
              </>
            ) : (
              <>
                <FileText size={18} />
                <span>تنزيل الأكواد (ملف PDF)</span>
              </>
            )}
          </button>
        </div>

        {/* Informative helper note */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold pt-1">
          <ShieldCheck size={14} className="text-indigo-600 shrink-0" />
          <span>
            يتم جلب البيانات مباشرة من جدول <code>bishopric_exam_codes</code> بالأعمدة: [ م | اسم الطالب | المرحلة | الكنيسة | كود الامتحان | حالة الاستخدام ].
          </span>
        </div>
      </div>

      {/* Dynamic Statistics Bar based on fetched records */}
      {selectedChurch && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold shrink-0">
              <Users size={20} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-bold">إجمالي المسجلين (Total Registered)</div>
              <div className="text-base font-black text-slate-800">
                {isLoadingCodes ? <Loader2 size={14} className="animate-spin text-indigo-600" /> : `${stats.total} مشترك`}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-bold">الأكواد المتاحة (Available Codes)</div>
              <div className="text-base font-black text-emerald-600">
                {isLoadingCodes ? <Loader2 size={14} className="animate-spin text-emerald-600" /> : `${stats.available} كود متاح`}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-bold">الأكواد المستخدمة (Used Codes)</div>
              <div className="text-base font-black text-amber-600">
                {isLoadingCodes ? <Loader2 size={14} className="animate-spin text-amber-600" /> : `${stats.used} كود مستخدم`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Preview Table of the selected church codes */}
      {selectedChurch && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" />
              <span className="text-xs font-black text-slate-800">
                معاينة كشف أكواد: <strong className="text-indigo-700 font-black">{selectedChurch}</strong>
              </span>
            </div>
            <span className="text-[11px] font-bold text-slate-500">
              {churchCodes.length} مشترك
            </span>
          </div>

          {isLoadingCodes ? (
            <div className="p-10 text-center space-y-3">
              <Loader2 size={28} className="animate-spin text-indigo-600 mx-auto" />
              <p className="text-xs font-bold text-slate-500">جاري استرجاع الأكواد من قاعدة البيانات...</p>
            </div>
          ) : churchCodes.length === 0 && hasFetchedOnce ? (
            <div className="p-8 text-center space-y-2">
              <AlertCircle size={32} className="text-amber-500 mx-auto" />
              <p className="text-xs font-black text-slate-700">لا توجد أكواد أسقفية مسجلة لهذه الكنيسة حالياً</p>
              <p className="text-[11px] text-slate-400 font-bold">
                تأكد من رفع كشف الأكواد العام أو مراجعة تطابق اسم الكنيسة.
              </p>
            </div>
          ) : churchCodes.length > 0 ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-right border-collapse text-xs font-bold">
                <thead className="sticky top-0 bg-slate-100 text-[11px] font-black text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">م</th>
                    <th className="p-2.5">اسم الطالب</th>
                    <th className="p-2.5">المرحلة</th>
                    <th className="p-2.5">الكنيسة</th>
                    <th className="p-2.5 text-center">كود الامتحان</th>
                    <th className="p-2.5 text-center">حالة الاستخدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {churchCodes.map((item, idx) => {
                    const isUsed = item.is_used === true;
                    const codeVal = item.code || '-';
                    return (
                      <tr key={item.id || idx} className="hover:bg-indigo-50/40 transition-colors">
                        <td className="p-2.5 text-slate-400 font-black text-[11px]">{idx + 1}</td>
                        <td className="p-2.5 font-black text-slate-900">{item.student_name}</td>
                        <td className="p-2.5 text-slate-600">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px]">
                            {item.stage}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{item.church_name}</td>
                        <td className="p-2.5 text-center">
                          <code className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md font-mono font-black text-xs">
                            {codeVal}
                          </code>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black ${
                            isUsed 
                              ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {isUsed ? 'تم الاستخدام' : 'متاح'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      )}

      {/* Hidden Printable PDF Document Template */}
      <div className="hidden">
        <div 
          ref={printRef} 
          className="p-8 bg-white font-arabic text-right text-slate-900" 
          dir="rtl"
          style={{ width: '100%', maxWidth: '800px', margin: '0 auto', fontFamily: "'Cairo', sans-serif" }}
        >
          {/* Printable Header */}
          <div className="text-center pb-5 mb-5 border-b-2 border-indigo-900 space-y-1.5">
            <h1 className="text-xl font-black text-indigo-950">
              كشف أكواد امتحانات الأسقفية - {selectedChurch}
            </h1>
            <h2 className="text-sm font-black text-indigo-800">
              مهرجان الكرازة المرقسية 2026 • منصة الامتحانات الإلكترونية المركزية
            </h2>
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 pt-3 px-2 border-t border-slate-200 mt-3">
              <span>الكنيسة: <strong className="text-slate-900">{selectedChurch}</strong></span>
              <span>إجمالي الأكواد: <strong className="text-slate-900">{churchCodes.length}</strong></span>
              <span>تاريخ الاستخراج: <strong>{getFormattedDate()}</strong></span>
            </div>
          </div>

          {/* Printable Table */}
          <table className="w-full text-right border-collapse text-xs border border-slate-300">
            <thead>
              <tr className="bg-indigo-50/70 font-black text-slate-900 border-b border-slate-300">
                <th className="p-2.5 border border-slate-300 text-center w-10">م</th>
                <th className="p-2.5 border border-slate-300">اسم الطالب</th>
                <th className="p-2.5 border border-slate-300 w-28">المرحلة</th>
                <th className="p-2.5 border border-slate-300 w-36">الكنيسة</th>
                <th className="p-2.5 border border-slate-300 text-center w-32">كود الامتحان</th>
                <th className="p-2.5 border border-slate-300 text-center w-24">حالة الاستخدام</th>
              </tr>
            </thead>
            <tbody>
              {churchCodes.map((item, index) => {
                const isUsed = item.is_used === true;
                const codeVal = item.code || '-';
                return (
                  <tr key={index} className="border-b border-slate-200">
                    <td className="p-2 border border-slate-300 text-center font-bold">{index + 1}</td>
                    <td className="p-2 border border-slate-300 font-bold">{item.student_name}</td>
                    <td className="p-2 border border-slate-300">{item.stage}</td>
                    <td className="p-2 border border-slate-300">{item.church_name}</td>
                    <td className="p-2 border border-slate-300 text-center font-mono font-bold">{codeVal}</td>
                    <td className="p-2 border border-slate-300 text-center font-bold">
                      {isUsed ? 'تم الاستخدام' : 'متاح'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Printable Footer */}
          <div className="mt-8 pt-4 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-bold">
            <span>منظومة امتحانات الأسقفية المركزية الإلكترونية</span>
            <span>كشف رسمي معتمد</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Aliases for compatibility
export const BishopricChurchCodesExporter = BishopricChurchCodesPdfExporter;
