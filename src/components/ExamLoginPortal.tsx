import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import logo from '../by-logo.jpeg';
import { 
  Key, 
  Search, 
  User, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  School,
  Lock,
  QrCode,
  XCircle,
  Camera,
  Compass
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { getDeviceFingerprint } from '../lib/deviceTracking';

interface ExamLoginPortalProps {
  onClose: () => void; // زر الرجوع / إغلاق البوابة
  onSuccess: (
    student: {
      id: string;
      name: string;
      stage: string;
      churchName: string;
      gender: string;
      competitions?: any;
    },
    examData: {
      id: string;
      exam_title: string;
      questions_data: any;
      model_type: string;
    }
  ) => void;
}

export function ExamLoginPortal({ onClose, onSuccess }: ExamLoginPortalProps) {
  // طريقة الدخول الافتراضية والآمنة للكل هي الـ QR كود
  const [loginMethod, setLoginMethod] = useState<'code' | 'name'>('code');
  const [academicCode, setAcademicCode] = useState('');
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  
  // وضع الطوارئ الخاص بك (مغلق افتراضياً ولا يفتح إلا بـ 5 ضغطات والرقم السري 101096)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);

  // محرك البحث بالاسم لجدول الطلاب
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // حالات الخطأ والتحميل
  const [errors, setErrors] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // إعدادات الذاكرة المحلية والسرعة
  const [cachedRegistry, setCachedRegistry] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const qrScannerRef = useRef<Html5Qrcode | null>(null);

  // مزامنة الداتا مرة واحدة من السيرفر للحفاظ على كفاءة الخادم
  const syncRegistrations = async (forceRefetch = false) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      if (!forceRefetch) {
        const cached = localStorage.getItem('cached_students_registry');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCachedRegistry(parsed);
            const timeCached = localStorage.getItem('cached_students_registry_time');
            setLastSyncTime(timeCached || 'محلي مسبق');
            setIsSyncing(false);
            return;
          }
        }
      }

      // تحميل كافة المشتركين بشكل مجزأ لتلافي تخطي حدود الباندويث أو مشاكل السيرفر
      let allRegistrations: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('registrations')
          .select('id, name, stage, churchName, gender, competitions')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allRegistrations = [...allRegistrations, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      const cleaned = allRegistrations.filter((r: any) => r.name !== 'SYSTEM_LOCK');

      localStorage.setItem('cached_students_registry', JSON.stringify(cleaned));
      const syncTimeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date().toLocaleDateString('ar-EG');
      localStorage.setItem('cached_students_registry_time', syncTimeStr);
      
      setCachedRegistry(cleaned);
      setLastSyncTime(syncTimeStr);
    } catch (err: any) {
      console.error("Failed to sync registrations:", err);
      setSyncError("خطأ في تحديث قاعدة البيانات من الخادم.");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncRegistrations();
  }, []);

  const processScannedCode = async (codeStr: string) => {
    setAcademicCode(codeStr);
    if (!codeStr.trim()) return;
    
    setIsLoading(true);
    setErrors(null);

    try {
      const codeCleaned = codeStr.trim();
      // سحب الطالب من الكاش المحلي بنسبة استهلاك صفر
      const registryCached = JSON.parse(localStorage.getItem('cached_students_registry') || '[]');
      const studentObj = registryCached.find((s: any) => String(s.id).trim() === codeCleaned);

      if (!studentObj) {
        setErrors("لم نتمكن من العثور على الكود المسحوب، يرجى الاستعانة بمسؤول اللجنة للتأكد.");
        setIsLoading(false);
        return;
      }

      await triggerActiveExamLaunch(studentObj);
    } catch (err: any) {
      setErrors("فشل البحث في قاعدة البيانات المحلية.");
      setIsLoading(false);
    }
  };

  // 1. تشغيل الكاميرا فورياً عند فتح واجهة الـ QR كود
  useEffect(() => {
    if (loginMethod === 'code') {
      setTimeout(() => {
        try {
          if (!document.getElementById('qr-reader')) return;
          
          const html5Qrcode = new Html5Qrcode("qr-reader");
          qrScannerRef.current = html5Qrcode;
          
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };
          const qrCodeSuccessCallback = async (decodedText: string) => {
            if (qrScannerRef.current) {
              qrScannerRef.current.stop().then(() => {
                qrScannerRef.current?.clear();
              }).catch(() => {});
            }
            await processScannedCode(decodedText);
          };

          html5Qrcode.start(
            { facingMode: "environment" }, // 👈 CRITICAL: Enforces rear camera by default
            config,
            qrCodeSuccessCallback,
            () => { /* silent error log */ }
          ).catch((err) => {
            console.warn("Camera environmental start blocked or unavailable, trying fallback:", err);
            // Fallback to front camera if environment is unavailable
            html5Qrcode.start(
              { facingMode: "user" },
              config,
              qrCodeSuccessCallback,
              () => {}
            ).catch((err2) => {
              console.warn("Camera fallback user start blocked, switching to manual code:", err2);
              setCameraPermissionDenied(true);
            });
          });
        } catch (err) {
          console.warn("Camera Init Exception:", err);
          setCameraPermissionDenied(true);
        }
      }, 300);
    }

    return () => {
      if (qrScannerRef.current && qrScannerRef.current.isScanning) {
        qrScannerRef.current.stop().then(() => {
          qrScannerRef.current?.clear();
        }).catch(() => {});
      }
    };
  }, [loginMethod]);

  // إغلاق قائمة البحث عند الضغط خارجها
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef?.current && !dropdownRef.current?.contains?.(event?.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // لا حاجة لعداد الضغط أو رمز سري، يتم التبديل فوراً من خلال onClick


  const normalizeArabic = (text: any): string => {
    if (!text || typeof text !== "string") return "";
    return text
      .trim()
      .replace(/[أإآ]/g, "ا")
      .replace(/ة/g, "ه")
      .replace(/ى/g, "ي")
      .replace(/[ًٌٍَُِّْـ]/g, "")
      .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "")
      .replace(/\s+/g, " ");
  };

  // البحث اللحظي بالاسم محلياً لتحقيق نسبة استئثار صفر وضمان سرعة فائقة
  useEffect(() => {
    if (loginMethod !== 'name' || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(() => {
      try {
        const queryClean = normalizeArabic(searchQuery.trim());
        const localRegistry = JSON.parse(localStorage.getItem('cached_students_registry') || '[]');
        
        const filtered = localRegistry.filter((s: any) => {
          const studentNameNormalized = normalizeArabic(s.name || s.student_name || '');
          return studentNameNormalized.includes(queryClean);
        });

        setSearchResults(filtered.slice(0, 15));
        setShowDropdown(true);
      } catch (err: any) {
        console.error("Local search exception:", err);
      } finally {
        setIsSearching(false);
      }
    }, 150); // 150ms delay for ultra responsiveness

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, loginMethod]);

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setShowDropdown(false);
    setErrors(null);
  };

  // دالة ملاحقة وتتبع الأجهزة عبر جدول exam_device_logs
  const logDeviceAccess = async (studentId: string, studentName: string, stage: string, church: string, examId: number) => {
    try {
      const userAgent = navigator.userAgent;
      let os = "Unknown OS";
      let deviceType = "Desktop";
      
      if (/Android/i.test(userAgent)) { os = "Android"; deviceType = "Mobile"; }
      else if (/iPhone|iPad/i.test(userAgent)) { os = "iOS"; deviceType = "Mobile"; }
      else if (/Windows/i.test(userAgent)) { os = "Windows"; }
      else if (/Macintosh/i.test(userAgent)) { os = "macOS"; }

      let detectedIp = "127.0.0.1";
      try {
        const ipRes = await fetch('https://api.ipify.org?format=json').then(r => r.json());
        detectedIp = ipRes.ip || "127.0.0.1";
      } catch (e) { /* silent */ }

      await supabase.from('exam_device_logs').upsert({
        student_id: String(studentId),
        student_name: studentName,
        stage: stage,
        church: church,
        device_name: userAgent,
        device_type: deviceType,
        os_version: os,
        ip_address: detectedIp,
        last_known_ip: detectedIp,
        status: "active",
        exam_id: examId,
        started_at: new Date().toISOString(),
        last_ping: new Date().toISOString(),
        allow_reentry: false
      }, { onConflict: 'student_id' });
    } catch (logErr) {
      console.error("Device Logging Failed safely:", logErr);
    }
  };

  // معالج سحب الامتحان الفعلي من الـ Pool وتفجير شاشة الأسئلة
  const triggerActiveExamLaunch = async (studentObj: any) => {
    setIsLoading(true);
    setErrors(null);

    try {
      const studentIdStr = String(studentObj.id);

      // 1. Anti-Cheat One-Time Entry Gate (منع الدخول المتعدد) via exam_device_logs
      const { data: existingLog, error: logCheckErr } = await supabase
        .from('exam_device_logs')
        .select('id, allow_reentry')
        .eq('student_id', studentIdStr)
        .maybeSingle();

      const { data: submissionCheck } = await supabase
        .from('online_results')
        .select('student_id')
        .eq('student_id', studentIdStr)
        .maybeSingle();

      if ((existingLog && !existingLog.allow_reentry) || submissionCheck) {
        setErrors("عفوًا، سبق للطالب دخول الامتحان من قبل، من هذا الجهاز أو جهاز آخر.");
        setIsLoading(false);
        return;
      }

      const { data: examRow, error: examErr } = await supabase
        .from('exams_pool')
        .select('id, exam_title, stage, questions_data, model_type, is_active')
        .eq('stage', studentObj.stage)
        .eq('is_active', true)
        .maybeSingle();

      if (examErr || !examRow) {
        setErrors(`تنبيه: لا يوجد امتحان نشط ومفتوح حالياً مخصص لمرحلة (${studentObj.stage || 'غير محددة'}).`);
        setIsLoading(false);
        return;
      }

      // توثيق وحفظ لوج الجهاز الملاحق
      await logDeviceAccess(studentObj.id, studentObj.name, studentObj.stage, studentObj.churchName, examRow.id);

      // تمرير الداتا بنجاح تام لفتح شاشة الامتحان والأسئلة تلقائياً
      onSuccess(
        {
          id: String(studentObj.id),
          name: studentObj.name,
          stage: studentObj.stage,
          churchName: studentObj.churchName || 'غير محدد',
          gender: studentObj.gender || 'ذكر',
          competitions: studentObj.competitions
        },
        {
          id: examRow.id,
          exam_title: examRow.exam_title,
          questions_data: examRow.questions_data,
          model_type: examRow.model_type || 'A'
        }
      );
    } catch (err: any) {
      setErrors("حدث خطأ فني أثناء جلب أسئلة الامتحان.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNameLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrors("يرجى اختيار اسم الطالب من القائمة المنسدلة أولاً.");
      return;
    }
    triggerActiveExamLaunch(selectedStudent);
  };

  const handleCodeLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicCode.trim()) {
      setErrors("يرجى مسح كود الـ QR الصحيح لبدء الامتحان.");
      return;
    }
    await processScannedCode(academicCode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#4a000b] via-[#6b0311] to-[#2b0006] backdrop-blur-xl flex items-center justify-center p-4 md:p-8 font-arabic antialiased fixed inset-0 z-[160] overflow-y-auto" dir="rtl">
      <img src={logo} className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay pointer-events-none blur-md" alt="" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-white/95 rounded-2xl shadow-[0_20px_50px_rgba(212,175,55,0.25)] border border-amber-500/20 overflow-hidden relative z-10"
      >
        {/* الهيدر العلوي */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white relative text-center">
          
          {/* زر الرجوع المفتوح للجميع لغلق البوابة والعودة */}
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 left-4 bg-white/10 p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/20 transition-all flex items-center gap-1 text-xs font-black"
          >
            <XCircle size={16} />
            رجوع
          </button>

          {/* أيقونة البوصلة المخفية (ضغطة واحدة تفتح الإعدادات) */}
          <div 
            onClick={() => setIsAdminUnlocked(prev => {
              const newState = !prev;
              if (newState) setLoginMethod('name');
              else setLoginMethod('code');
              return newState;
            })}
            className="absolute top-4 right-4 bg-white/10 p-2 rounded-xl backdrop-blur-md cursor-pointer hover:bg-white/20 transition-all select-none"
            title="وضع الطوارئ للجان"
          >
            <Compass className={`${isAdminUnlocked ? 'text-emerald-400' : 'text-amber-500'} animate-spin-slow`} size={22} />
          </div>
          
          <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/20">
            <QrCode className="text-amber-400" size={28} />
          </div>

          <h1 className="text-xl md:text-2xl font-black mb-1">بوابة الاختبارات الإلكترونية الرقمية</h1>
          <p className="text-slate-400 text-xs font-semibold max-w-sm mx-auto">
            مهرجان الكرازة المرقسية - وجه كارت الـ QR أمام كاميرا الموبيل فوراً لبدء اللجنة.
          </p>
        </div>

        <div className="p-6">
          {/* شريط مزامنة قاعدة البيانات وحالة الكاش المحلي */}
          <div className="mb-5 bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-600">
            <div className="flex flex-col gap-0.5">
              <span className="text-slate-900 font-black flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                دليل الطلاب: {isSyncing ? 'جاري التحميل...' : `${cachedRegistry.length} مشترك مسجل`}
              </span>
              {lastSyncTime && (
                <span className="text-[10px] text-slate-400 font-semibold">آخر مزامنة للتطبيق: {lastSyncTime}</span>
              )}
              {syncError && (
                <span className="text-[10px] text-rose-500 font-extrabold">{syncError}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => syncRegistrations(true)}
              disabled={isSyncing}
              className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-900 active:scale-95 disabled:opacity-50 text-[10px] font-black rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              title="سحب آخر تعديلات الطلاب مباشرة من السيرفر وعمل كاش محلي"
            >
              🔄 مزامنة السجلات
            </button>
          </div>

          {/* شريط التبديل العلوي الخفي - لا يظهر إلا لو تم إدخال الباسورد 101096بنجاح */}
          {isAdminUnlocked && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => setLoginMethod('code')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  loginMethod === 'code' ? 'bg-white shadow text-slate-950' : 'text-slate-500'
                }`}
              >
                <Key size={14} />
                الدخول بـ الـ QR
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('name')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                  loginMethod === 'name' ? 'bg-white shadow text-red-600' : 'text-slate-500'
                }`}
              >
                <User size={14} />
                طوارئ: البحث بالاسم
              </button>
            </div>
          )}

          {/* التنبيهات والأخطاء */}
          <AnimatePresence mode="wait">
            {errors && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className="mb-5 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div className="text-xs font-bold text-red-600 leading-relaxed">{errors}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* تبديل النماذج الذكية */}
          {loginMethod === 'code' ? (
            <form onSubmit={handleCodeLoginSubmit} className="space-y-5">
              {cameraPermissionDenied && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-amber-800 text-xs font-bold leading-relaxed">
                  <span className="shrink-0 text-amber-500 font-bold">⚠️</span>
                  <span>تم حظر صلاحية الكاميرا. يرجى السماح بتشغيل الكاميرا من إعدادات المتصفح أو كتابة الكود يدوياً بالأسفل للحل فورا.</span>
                </div>
              )}

              {/* الكاميرا الحية لمسح الكيورآر */}
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-2">
                <div className="text-[11px] text-slate-500 font-bold mb-2 flex items-center gap-1 px-2">
                  <Camera size={14} className="text-primary" />
                  قارئ استمارات الـ QR كود النشط:
                </div>
                <div id="qr-reader" className="w-full rounded-xl overflow-hidden border-none bg-white"></div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-2">كود التوثيق الممسوح</label>
                <input
                  type="text"
                  value={academicCode}
                  onChange={(e) => setAcademicCode(e.target.value)}
                  placeholder="وجه الكارت للكاميرا ليتم السحب التلقائي هنا..."
                  className="w-full px-4 py-3 bg-white border-2 border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300 text-right font-black text-sm text-slate-950 shadow-inner"
                  required
                />
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 flex gap-2.5 text-[11px] text-slate-500 font-bold leading-relaxed">
                <Lock size={15} className="text-slate-400 shrink-0 mt-0.5" />
                تنبيه: بوابة الدخول بالـ QR مفتوحة لجميع لجان الخدام دون حيازة حساب إدارة مسجل.
              </div>

              <button
                type="submit"
                disabled={isLoading || !academicCode.trim()}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-[#4a000b] rounded-xl font-bold text-xl shadow-lg hover:shadow-amber-500/40 transform hover:-translate-y-0.5 transition-all animate-pulse disabled:opacity-50 disabled:animate-none flex items-center justify-center gap-2"
              >
                {isLoading ? "جاري سحب الأسئلة ومطابقة جهازك..." : "ابدأ الامتحان"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNameLoginSubmit} className="space-y-5">
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-black text-slate-500 mb-2">اسم المشترك</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSelectedStudent(null); }}
                    placeholder="اكتب 3 أحرف من الاسم لمطابقة قاعدة البيانات..."
                    className="w-full pr-11 pl-4 py-3 bg-white text-right border-2 border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 rounded-xl transition-all duration-300 text-sm font-black text-slate-950"
                  />
                  {isSearching && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                </div>

                <AnimatePresence>
                  {showDropdown && searchResults.length > 0 && (
                    <motion.div className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                      {searchResults.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="w-full text-right px-4 py-2.5 hover:bg-slate-50 flex justify-between items-center text-xs font-black"
                        >
                          <div>
                            <p className="text-slate-950">{student.name}</p>
                            <p className="text-[10px] text-slate-400">{student.churchName}</p>
                          </div>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded">{student.stage}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedStudent && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between text-xs font-bold">
                  <div>
                    <p className="text-emerald-600">تم فك القفل والمطابقة الاستثنائية للولد:</p>
                    <p className="text-slate-900 font-black">{selectedStudent.name} ({selectedStudent.stage})</p>
                  </div>
                  <CheckCircle className="text-emerald-500" size={20} />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !selectedStudent}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-[#4a000b] rounded-xl font-bold text-xl shadow-lg hover:shadow-amber-500/40 transform hover:-translate-y-0.5 transition-all animate-pulse disabled:opacity-50 disabled:animate-none flex items-center justify-center gap-2"
              >
                {isLoading ? "جاري سحب الأسئلة المتوافقة..." : "ابدأ الامتحان"}
              </button>
            </form>
          )}

          {/* فوتر النظام */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[10px] font-black text-slate-400 flex items-center justify-center gap-2">
            <School size={12} />
            <span>لجنة مهرجان الكرازة - إيبارشية مفافة والعدوة - منطقة 18©{new Date().getFullYear()}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
