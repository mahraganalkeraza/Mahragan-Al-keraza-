import React, { useState, useEffect, useMemo } from 'react';
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

// Default Birth Year Ranges for each stage
const DEFAULT_BIRTH_YEARS: Record<string, { min: number; max: number }> = {
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

  // Get unique churches from participants
  const churchOptions = useMemo(() => {
    const list = Array.from(new Set(participants.map(p => p.churchName || p.charchName || 'كنيسة غير معروفة')))
      .filter(Boolean)
      .sort();
    return list;
  }, [participants]);

  // Helper: map stage to template details
  const getTemplateForStage = (stage: string): { templateName: string; displayName: string; category: 'primary' | 'prep_servants' | 'special' } => {
    const primaryStages = ['حضانة', 'أولى وثانية', 'ثالثة ورابعة', 'خامسة وسادسة'];
    const specialStages = [' صم وبكم', 'صم وبكم', 'سمعان الشيخ', 'ذوي القدرات', 'ديديموس', 'بولس وسيلا'];
    
    const cleanStage = (stage || '').trim();
    if (primaryStages.includes(cleanStage)) {
      return {
        templateName: 'تسجيل مشتركين ابتدائي 2026.xls',
        displayName: 'تسجيل مشتركين ابتدائي 2026.xls',
        category: 'primary'
      };
    } else if (specialStages.includes(cleanStage)) {
      return {
        templateName: 'تسجيل مشتركين فئات خاصة 2026.xls',
        displayName: 'تسجيل مشتركين فئات خاصة 2026.xls',
        category: 'special'
      };
    } else {
      return {
        templateName: 'تسجيل مشتركين من اعدادي لخدام 2026.xls',
        displayName: 'تسجيل مشتركين من اعدادي لخدام 2026.xls',
        category: 'prep_servants'
      };
    }
  };

  // Organize and filter participants
  const filteredParticipants = useMemo(() => {
    if (selectedChurch === 'الكل') return participants;
    return participants.filter(p => (p.churchName || p.charchName) === selectedChurch);
  }, [participants, selectedChurch]);

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

  // Helper: get base URL for public templates
  const getTemplateUrl = (templateName: string) => {
    const base = import.meta.env.BASE_URL || '/';
    const cleanBase = base.endsWith('/') ? base : `${base}/`;
    return `${cleanBase}templates/${templateName}`;
  };

  // Core Function: Fill a specific Excel workbook
  const fillTemplateBuffer = async (
    templateName: string,
    studentsList: any[]
  ): Promise<ArrayBuffer> => {
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    let ws: any;
    let loaded = false;

    const templateUrl = getTemplateUrl(templateName);

    try {
      const response = await fetch(templateUrl);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        await workbook.xlsx.load(buffer);
        ws = workbook.getWorksheet("تسجيل مشتركين");
        if (ws) {
          loaded = true;
          console.log(`Successfully loaded official template: ${templateName}`);
        }
      } else {
        console.warn(`Template not found at ${templateUrl} (status ${response.status}). Creating workbook dynamically.`);
      }
    } catch (e) {
      console.error(`Error fetching/parsing template ${templateName}:`, e);
    }

    if (!loaded) {
      throw new Error(`خطأ حرج: تعذر تحميل الملف الفعلي للقالب المعتمد المرفوع من المستخدم: "${templateName}". النظام مبرمج للعمل كمحقن بيانات فقط ولا يمكنه إنشاء قالب برمجي لتجنب فقدان صيغ التحقق والتنسيقات المعتمدة للوزارة.`);
    }

    // Row writing starts at Row Index 2 (0-indexed) which is Row 3 in ExcelJS
    let currentRow = 3;

    studentsList.forEach(student => {
      const row = ws.getRow(currentRow);
      
      // Column A (1): Name
      row.getCell(1).value = student.name || student.studentName || '';
      
      // Column B (2): Phone number
      row.getCell(2).value = student.phoneNumber || student.phone || student.mobile || fallbackPhone;
      
      // Column C (3): Gender
      const gender = student.gender === 'أنثى' || student.gender === 'female' ? 'أنثى' : 'ذكر';
      row.getCell(3).value = gender;
      
      // Birthdate split
      const { day, month, year } = getRandomBirthdate(student.stage);
      // Column D (4): Day
      row.getCell(4).value = day;
      // Column E (5): Month
      row.getCell(5).value = month;
      // Column F (6): Year
      row.getCell(6).value = year;

      // Columns G to N (7 to 14): Registered Competitions
      const competitions = student.competitions || [];
      for (let i = 0; i < 8; i++) {
        row.getCell(7 + i).value = competitions[i] || '';
      }

      currentRow++;
    });

    const outBuffer = await workbook.xlsx.writeBuffer();
    return outBuffer;
  };

  // Trigger download of a single filled Excel file
  const handleSingleExport = async (category: 'primary' | 'prep_servants' | 'special') => {
    setIsExporting(true);
    setStatusMessage({ text: '', type: null });

    let templateName = '';
    let categoryTitle = '';
    const students = filteredParticipants.filter(p => {
      const t = getTemplateForStage(p.stage);
      return t.category === category;
    });

    if (category === 'primary') {
      templateName = 'تسجيل مشتركين ابتدائي 2026.xls';
      categoryTitle = 'ابتدائي';
    } else if (category === 'prep_servants') {
      templateName = 'تسجيل مشتركين من اعدادي لخدام 2026.xls';
      categoryTitle = 'إعدادي لخدام';
    } else {
      templateName = 'تسجيل مشتركين فئات خاصة 2026.xls';
      categoryTitle = 'فئات خاصة';
    }

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
      const buffer = await fillTemplateBuffer(templateName, students);
      const { saveAs } = await import('file-saver');
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      saveAs(blob, templateName);
      
      setStatusMessage({ 
        text: `تم تصدير ملف "${templateName}" بنجاح وتعبئة ${students.length} مشترك!`, 
        type: 'success' 
      });
    } catch (e) {
      console.error(e);
      setStatusMessage({ text: 'حدث خطأ أثناء محاولة تصدير الملف.', type: 'error' });
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
      const { saveAs } = await import('file-saver');
      saveAs(content, `تسجيل مشتركين - ${churchNameStr} 2026.zip`);

      setStatusMessage({ 
        text: `تم تصدير ملف الأرشيف المضغوط لكنيسة "${churchNameStr}" بنجاح يحتوي على ${addedFilesCount} ملفات!`, 
        type: 'success' 
      });
    } catch (e) {
      console.error(e);
      setStatusMessage({ text: 'حدث خطأ أثناء تصدير الأرشيف المضغوط.', type: 'error' });
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
      participants.forEach(p => {
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
      const { saveAs } = await import('file-saver');
      saveAs(content, `تسجيل المشتركين المجمع - جميع الكنائس 2026.zip`);

      setStatusMessage({ 
        text: `نجاح! تم تصدير بيانات ${churchNames.length} كنائس وتوليد ${totalFilesCreated} ملفات Excel مهيأة ومقسمة داخل الأرشيف بنجاح!`, 
        type: 'success' 
      });
    } catch (e) {
      console.error(e);
      setStatusMessage({ text: 'حدث خطأ غير متوقع أثناء توليد الأرشيف المضغوط المجمع للكنائس.', type: 'error' });
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
                <div className="relative min-w-[240px]">
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
              </div>
            )}

            {!isAdmin && (
              <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl mb-6 text-xs text-emerald-800 font-bold flex items-center gap-2">
                <Info size={16} className="text-emerald-600 shrink-0" />
                <span>أنت تقوم بتصدير البيانات الرسمية الخاصة بكنيستك: <strong>{userChurch || 'كنيسة غير معروفة'}</strong></span>
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
                    <tr className="bg-slate-55 bg-slate-50 border-b border-slate-100 text-[11px] font-black text-slate-500">
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
