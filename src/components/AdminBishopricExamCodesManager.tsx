import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Search, 
  RefreshCw, 
  Users, 
  Building2, 
  ExternalLink,
  ShieldCheck,
  Save,
  HelpCircle,
  FileCheck,
  BookOpen,
  Award
} from 'lucide-react';
import { 
  BishopricExamRecord, 
  BishopricExamConfig,
  downloadBlankBishopricTemplate, 
  parseBishopricExcelFile, 
  fetchBishopricExamConfig, 
  saveBishopricExamConfig,
  syncBishopricRecordsToSupabase,
  normalizeArabic,
  PUBLIC_BASE_URL
} from '../utils/bishopricExamStorage';
import PaginationComponent from './Pagination';
import { AdminBishopricQuestionsManager } from './AdminBishopricQuestionsManager';
import { BishopricChurchCodesExporter } from './BishopricChurchCodesExporter';
import { BishopricPortalLinkShare } from './BishopricPortalLinkShare';

export const AdminBishopricExamCodesManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'codes' | 'questions'>('codes');
  const [config, setConfig] = useState<BishopricExamConfig>({
    portalUrl: '',
    records: []
  });
  const [portalUrlInput, setPortalUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });

  // Filtering & Pagination for preview table
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChurchFilter, setSelectedChurchFilter] = useState('الكل');
  const [selectedStageFilter, setSelectedStageFilter] = useState('الكل');
  const [currentPage, setCurrentPage] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 15;

  // Load config on mount
  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const data = await fetchBishopricExamConfig();
      setConfig(data);
      const defaultPublicUrl = `${PUBLIC_BASE_URL}?view=bishopric-exam`;
      setPortalUrlInput(data.portalUrl || defaultPublicUrl);
    } catch (err) {
      console.error('Failed to load Bishopric Exam Config:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Handle Save Portal URL
  const handleSavePortalUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!portalUrlInput.trim()) {
      setStatusMessage({ text: 'يرجى إدخال رابط صالح لمنصة الامتحانات', type: 'error' });
      return;
    }

    setIsSavingUrl(true);
    const updated: BishopricExamConfig = {
      ...config,
      portalUrl: portalUrlInput.trim()
    };

    const res = await saveBishopricExamConfig(updated);
    setIsSavingUrl(false);

    if (res.success) {
      setConfig(updated);
      setStatusMessage({ text: 'تم حفظ وتحديث رابط منصة امتحانات الأسقفية بنجاح', type: 'success' });
      setTimeout(() => setStatusMessage({ text: '', type: null }), 4000);
    } else {
      setStatusMessage({ text: res.error || 'فشل في حفظ الرابط', type: 'error' });
    }
  };

  // Handle File Upload & Supabase sync
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setStatusMessage({ text: 'يرجى اختيار ملف Excel بصيغة xlsx أو xls', type: 'error' });
      return;
    }

    setIsUploading(true);
    setStatusMessage({ text: 'جاري قراءة ومعالجة كشف الأكواد ومزامنته مع قاعدة البيانات...', type: 'info' });

    try {
      const parsedRecords = await parseBishopricExcelFile(file);

      if (parsedRecords.length === 0) {
        setStatusMessage({ text: 'لم يتم العثور على أي سجلات صالحة في الملف المرفوع', type: 'error' });
        setIsUploading(false);
        return;
      }

      const updatedConfig: BishopricExamConfig = {
        ...config,
        records: parsedRecords,
        lastUploadedAt: new Date().toLocaleString('ar-EG'),
        fileName: file.name
      };

      const res = await saveBishopricExamConfig(updatedConfig);

      if (res.success) {
        setConfig(updatedConfig);
        setCurrentPage(1);
        setStatusMessage({ 
          text: `تم رفع ومعالجة كشف أكواد الأسقفية ومزامنته في الجدول bishopric_exam_codes بنجاح! إجمالي المشتركين: ${parsedRecords.length} عبر ${new Set(parsedRecords.map(r => r.church_name)).size} كنيسة.`, 
          type: 'success' 
        });
      } else {
        setStatusMessage({ text: res.error || 'فشل في حفظ السجلات في قاعدة البيانات', type: 'error' });
      }
    } catch (err: any) {
      console.error('Error parsing Bishopric Excel:', err);
      setStatusMessage({ text: err.message || 'حدث خطأ أثناء قراءة ملف Excel', type: 'error' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Clear All Records
  const handleClearRecords = async () => {
    if (!window.confirm('هل أنت متأكد من مسح جميع أكواد امتحانات الأسقفية المرفوعة من قاعدة البيانات؟')) {
      return;
    }

    const updated: BishopricExamConfig = {
      ...config,
      records: [],
      lastUploadedAt: undefined,
      fileName: undefined
    };

    const res = await saveBishopricExamConfig(updated);
    if (res.success) {
      setConfig(updated);
      setStatusMessage({ text: 'تم تفريغ كشف الأكواد من قاعدة البيانات بنجاح', type: 'info' });
      setTimeout(() => setStatusMessage({ text: '', type: null }), 3000);
    }
  };

  // Derived statistics
  const uniqueChurches = useMemo(() => {
    const s = new Set<string>();
    config.records.forEach(r => {
      if (r.church_name) s.add(r.church_name);
    });
    return Array.from(s).sort();
  }, [config.records]);

  const uniqueStages = useMemo(() => {
    const s = new Set<string>();
    config.records.forEach(r => {
      if (r.stage) s.add(r.stage);
    });
    return Array.from(s).sort();
  }, [config.records]);

  // Filtered records for table preview
  const filteredRecords = useMemo(() => {
    return config.records.filter(r => {
      const normSearch = normalizeArabic(searchTerm);
      const normName = normalizeArabic(r.student_name);
      const normCode = String(r.exam_code || '').toLowerCase();
      const normChurch = normalizeArabic(r.church_name);

      const matchesSearch = !searchTerm || 
        normName.includes(normSearch) || 
        normCode.includes(searchTerm.toLowerCase()) || 
        normChurch.includes(normSearch);

      const matchesChurch = selectedChurchFilter === 'الكل' || r.church_name === selectedChurchFilter;
      const matchesStage = selectedStageFilter === 'الكل' || r.stage === selectedStageFilter;

      return matchesSearch && matchesChurch && matchesStage;
    });
  }, [config.records, searchTerm, selectedChurchFilter, selectedStageFilter]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const displayedRecords = filteredRecords.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6 font-arabic text-right" dir="rtl">
      {/* Top Banner */}
      <div className="bg-gradient-to-l from-indigo-900 via-indigo-800 to-indigo-950 text-white p-6 md:p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-80 h-80 bg-indigo-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-inner">
              <ShieldCheck className="text-indigo-300" size={34} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-xs font-bold mb-2 border border-indigo-400/30">
                <FileSpreadsheet size={13} /> وحدة التحكم المستقلة لأكواد الأسقفية
              </div>
              <h3 className="text-2xl font-black">إدارة ورفع كشوف أكواد امتحانات الأسقفية</h3>
              <p className="text-indigo-200/80 text-xs md:text-sm font-bold mt-1">
                تنزيل القالب الفارغ، رفع كشف الأكواد، ومزامنته مع جدول bishopric_exam_codes وتعيين رابط المنصة الرسمي
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadBlankBishopricTemplate}
              className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Download size={16} />
              تحميل قالب أكواد الأسقفية الفارغ (Excel)
            </button>
            <button
              onClick={loadConfig}
              className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer border border-white/10"
              title="تحديث البيانات"
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {statusMessage.text && (
        <div className={`p-4 rounded-2xl flex items-start gap-3 border transition-all ${
          statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
          statusMessage.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-800' :
          'bg-indigo-50 border-indigo-200 text-indigo-800'
        }`}>
          {statusMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" /> :
           statusMessage.type === 'error' ? <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" /> :
           <FileCheck className="w-5 h-5 shrink-0 text-indigo-600" />}
          <div className="text-xs font-black leading-relaxed">{statusMessage.text}</div>
          <button 
            className="mr-auto text-xs opacity-50 hover:opacity-100 font-black cursor-pointer" 
            onClick={() => setStatusMessage({ text: '', type: null })}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('codes')}
          className={`px-6 py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'codes'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileSpreadsheet size={18} />
          <span>كشوف أكواد الأسقفية (رفع وتصدير)</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`px-6 py-3 rounded-2xl font-black text-xs md:text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'questions'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <BookOpen size={18} />
          <span>بنك الأسئلة والنتائج المركزية</span>
        </button>
      </div>

      {activeTab === 'questions' ? (
        <div className="animate-fade-in">
          <AdminBishopricQuestionsManager />
        </div>
      ) : (
        <>
          {/* Dynamic Link Display & One-Click Copy Section */}
          <BishopricPortalLinkShare />

          {/* Grid: Action Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Official Portal Link Setup */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                  <Globe size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">رابط منصة امتحانات الأسقفية الإلكترونية</h4>
                  <p className="text-[11px] text-slate-400 font-bold">يظهر لجميع مسؤولي الكنائس للانتقال المباشر للمنصة</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSavePortalUrl} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-600 mb-2">
                  عنوان الرابط الرسمي (URL):
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={portalUrlInput}
                    onChange={(e) => setPortalUrlInput(e.target.value)}
                    placeholder="https://your-domain.com/bishopric-portal"
                    dir="ltr"
                    className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                  <Globe size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={isSavingUrl}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10 disabled:opacity-50 cursor-pointer"
                >
                  <Save size={14} />
                  {isSavingUrl ? 'جاري الحفظ...' : 'حفظ الرابط'}
                </button>
                {config.portalUrl && (
                  <a
                    href={config.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink size={14} />
                    تجربة فتح الرابط
                  </a>
                )}
              </div>
            </form>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400 font-bold">
            <HelpCircle size={14} className="text-slate-400 shrink-0" />
            <span>سيتم توجيه الخدام والمخدومين عند النقر على "الانتقال إلى منصة امتحانات الأسقفية" إلى هذا الرابط.</span>
          </div>
        </div>

        {/* Card 2: Upload Excel File */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold">
                  <Upload size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-800">رفع كشف الأكواد المكتمل ومزامنته</h4>
                  <p className="text-[11px] text-slate-400 font-bold">يتم استيراد الكشف وحفظه في جدول bishopric_exam_codes</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>

            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-500 bg-slate-50/70 hover:bg-indigo-50/30 rounded-2xl p-6 text-center transition-all cursor-pointer group"
            >
              <FileSpreadsheet className="mx-auto text-slate-400 group-hover:text-indigo-600 mb-2 transition-colors" size={36} />
              <p className="text-xs font-black text-slate-700 mb-1">
                {isUploading ? 'جاري رفع وتحليل الكشف...' : 'انقر هنا لاختيار ملف الـ Excel المكتمل أو سحبه وإسقاطه'}
              </p>
              <p className="text-[10px] text-slate-400 font-bold">
                الأعمدة المطلوبة: [اسم المشترك | المرحلة | اسم الكنيسة | كود امتحان الأسقفية]
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
            <div className="text-[11px] text-slate-500 font-bold">
              {config.fileName ? (
                <span>الملف الحالي: <strong className="text-indigo-600">{config.fileName}</strong> ({config.lastUploadedAt})</span>
              ) : (
                <span>لم يتم رفع أي ملف بعد</span>
              )}
            </div>
            {config.records.length > 0 && (
              <button
                onClick={handleClearRecords}
                className="text-rose-600 hover:text-rose-700 text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 size={13} />
                مسح الكشف الحالي
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">إجمالي المشتركين بالكشف</div>
            <div className="text-lg font-black text-slate-800">{config.records.length} مشترك</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">عدد الكنائس المشمولة</div>
            <div className="text-lg font-black text-slate-800">{uniqueChurches.length} كنيسة</div>
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white border border-slate-200/80 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-bold">المراحل المشمولة</div>
            <div className="text-lg font-black text-slate-800">{uniqueStages.length} مرحلة</div>
          </div>
        </div>
      </div>

      {/* Dedicated Church Codes Exporter (Excel / CSV / PDF) */}
      <BishopricChurchCodesExporter churchList={uniqueChurches} />

      {/* Preview Table Section */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <FileSpreadsheet className="text-indigo-600 w-4 h-4" />
              معاينة كشف الأكواد المرفوعة من جدول bishopric_exam_codes
            </h4>
            <p className="text-[11px] text-slate-400 font-bold mt-0.5">
              عرض السجلات المعتمدة ومطابقتها وتوزيعها الآلي لكل كنيسة
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="بحث بالاسم أو الكود أو الكنيسة..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={selectedChurchFilter}
              onChange={(e) => { setSelectedChurchFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="الكل">كل الكنائس ({uniqueChurches.length})</option>
              {uniqueChurches.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <select
              value={selectedStageFilter}
              onChange={(e) => { setSelectedStageFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="الكل">كل المراحل</option>
              {uniqueStages.map(stg => (
                <option key={stg} value={stg}>{stg}</option>
              ))}
            </select>
          </div>
        </div>

        {displayedRecords.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <FileSpreadsheet className="mx-auto text-slate-300 mb-2" size={38} />
            <p className="text-xs font-black text-slate-600">لا توجد سجلات مطابقة في كشف الأكواد</p>
            <p className="text-[10px] text-slate-400 font-bold mt-1">
              قم بتحميل القالب الفارغ وتعبئته ثم رفعه من النموذج أعلاه
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-black text-slate-500 border-b border-slate-100">
                  <th className="p-3">م</th>
                  <th className="p-3">اسم المشترك</th>
                  <th className="p-3">المرحلة</th>
                  <th className="p-3">اسم الكنيسة</th>
                  <th className="p-3 text-center">كود امتحان الأسقفية</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {displayedRecords.map((r, idx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx + 1;
                  return (
                    <tr key={r.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-slate-400 font-black text-[11px]">{globalIdx}</td>
                      <td className="p-3 font-black text-slate-900">{r.student_name}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold">
                          {r.stage}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">{r.church_name}</td>
                      <td className="p-3 text-center">
                        <code className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg font-mono font-black text-xs">
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
        </>
      )}
    </div>
  );
};
