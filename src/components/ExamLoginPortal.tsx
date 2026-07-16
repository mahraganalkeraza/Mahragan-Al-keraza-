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
  Compass,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Html5Qrcode } from 'html5-qrcode';
import { getDeviceFingerprint } from '../lib/deviceTracking';
import { getDailyExamToken, validateHourlyExamToken } from '../utils/dailyToken';

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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');

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
  const [isScanningActive, setIsScanningActive] = useState(false);

  // Gate check for Daily Rotating Gate
  const [gateAccessGranted, setGateAccessGranted] = useState(false);
  const [isPortalLockedByAdmin, setIsPortalLockedByAdmin] = useState(() => {
    return localStorage.getItem('portal_locked_by_admin') === 'true';
  });

  useEffect(() => {
    const checkEmergencyLockAndSeed = async () => {
      try {
        const { data: sysData } = await supabase
          .from('system_settings')
          .select('is_exam_locked, content')
          .eq('id', 1)
          .maybeSingle();

        if (sysData) {
          const isLocked = !!sysData.is_exam_locked;
          setIsPortalLockedByAdmin(isLocked);
          localStorage.setItem('portal_locked_by_admin', isLocked ? 'true' : 'false');
          if (isLocked) {
            setGateAccessGranted(false);
            // Clear credentials
            localStorage.removeItem('gate_access_granted_hourly');
            localStorage.removeItem('gate_access_granted');
            localStorage.removeItem('gateway_exam_token');
            localStorage.removeItem('active_student_session');
            localStorage.removeItem('active_student_id');
          }

          const seedVal = sysData.content || '';
          localStorage.setItem('manual_seed_modifier', seedVal);
        }
      } catch (err) {
        console.error("Failed to check global lock/seed in Portal:", err);
      }
    };

    checkEmergencyLockAndSeed();
  }, []);

  useEffect(() => {
    if (localStorage.getItem('portal_locked_by_admin') === 'true') {
      setGateAccessGranted(false);
      return;
    }

    let providedToken = new URLSearchParams(window.location.search).get('gateway_token');
    
    // Support hash-routed query parameters
    if (!providedToken && window.location.hash.includes('?')) {
      const hashQuery = window.location.hash.split('?')[1];
      providedToken = new URLSearchParams(hashQuery).get('gateway_token');
    }

    if (providedToken) {
      if (validateHourlyExamToken(providedToken)) {
        localStorage.setItem('gate_access_granted_hourly', providedToken);
        setGateAccessGranted(true);
      } else {
        // Scenario B: Expired token in URL
        localStorage.removeItem('gate_access_granted_hourly');
        localStorage.removeItem('gate_access_granted');
        localStorage.removeItem('gateway_exam_token');
        localStorage.removeItem('active_student_session');
        setGateAccessGranted(false);
        alert("عفواً، انتهت صلاحية رمز الدخول.");
        if (onClose) onClose();
      }
    } else {
      // Missing token from URL - check stored token
      const storedToken = localStorage.getItem('gate_access_granted_hourly');
      if (storedToken && validateHourlyExamToken(storedToken)) {
        setGateAccessGranted(true);
      } else {
        // Scenario B: Missing token / Direct shortcut access
        localStorage.removeItem('gate_access_granted_hourly');
        localStorage.removeItem('gate_access_granted');
        localStorage.removeItem('gateway_exam_token');
        localStorage.removeItem('active_student_session');
        setGateAccessGranted(false);
        alert("عفواً، انتهت صلاحية رمز الدخول.");
        if (onClose) onClose();
      }
    }
  }, [onClose]);

  // مزامنة الداتا مرة واحدة من السيرفر للحفاظ على كفاءة الباندويث ودعم التحديث الجزئي (Delta Sync)
  const syncRegistrations = async (forceRefetch = false) => {
    setIsSyncing(true);
    setSyncError(null);
    try {
      // 1. محاولة جلب البيانات من بوابة الخدمة الموحدة (التي يراقبها الـ Service Worker)
      try {
        const url = forceRefetch ? '/api/roster?sync=true' : '/api/roster';
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          if (data && Array.isArray(data.roster)) {
            setCachedRegistry(data.roster);
            localStorage.setItem('cached_students_registry', JSON.stringify(data.roster));
            if (data.syncTime) {
              setLastSyncTime(data.syncTime);
              localStorage.setItem('cached_students_registry_time', data.syncTime);
            }
            setIsSyncing(false);
            return;
          }
        }
      } catch (swError) {
        console.warn("Service Worker roster gateway not ready or failed, falling back to direct query:", swError);
      }

      // 2. البديل المباشر: تحميل الكاش المحلي الحالي إن وجد
      const cached = localStorage.getItem('cached_students_registry');
      let existingStudents: any[] = [];
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            existingStudents = parsed;
          }
        } catch (e) {
          console.error("Failed to parse local students registry cache:", e);
        }
      }

      // إذا لم يطلب المستخدم تحديثاً إجبارياً وكان الكاش ممتلئاً، نعرضه مباشرة وننهي المزامنة فوراً لتوفير الباندويث
      if (!forceRefetch && existingStudents.length > 0) {
        setCachedRegistry(existingStudents);
        const timeCached = localStorage.getItem('cached_students_registry_time');
        setLastSyncTime(timeCached || 'محلي مسبق');
        setIsSyncing(false);
        return;
      }

      // 3. تفعيل المزامنة الجزئية (Delta Sync) باستخدام حقل updated_at لتقليص حجم البيانات المستهلكة
      const lastSyncTimestamp = localStorage.getItem('cached_students_last_sync_timestamp');
      let newOrUpdatedRows: any[] = [];
      let page = 0;
      const pageSize = 1000;
      let hasMore = true;
      let useDelta = !!lastSyncTimestamp && existingStudents.length > 0;

      while (hasMore) {
        let query = supabase
          .from('registrations')
          .select('student_id, name, stage, churchName, gender, competitions, updated_at')
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (useDelta && lastSyncTimestamp) {
          query = query.gt('updated_at', lastSyncTimestamp);
        }

        const { data, error } = await query;

        if (error) {
          // في حال حدوث خطأ بسبب المزامنة الجزئية (مثل عدم وجود العمود)، يتم التراجع تلقائياً للمزامنة الكاملة
          if (useDelta) {
            console.warn("Delta sync failed, falling back to full sync:", error);
            useDelta = false;
            page = 0;
            newOrUpdatedRows = [];
            continue;
          }
          throw error;
        }

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          newOrUpdatedRows = [...newOrUpdatedRows, ...data];
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        }
      }

      // دمج البيانات الجديدة/المحدثة مع الكاش الحالي لحفظ البنية وتجنب التكرار
      let mergedRegistry = [...existingStudents];
      if (newOrUpdatedRows.length > 0) {
        const studentMap = new Map<string, any>();
        existingStudents.forEach((s: any) => {
          if (s && s.student_id) studentMap.set(String(s.student_id).trim(), s);
        });

        newOrUpdatedRows.forEach((s: any) => {
          if (s && s.student_id) {
            // تجاهل سجلات قفل النظام من الدخول للكاش
            if (s.name !== 'SYSTEM_LOCK') {
              studentMap.set(String(s.student_id).trim(), s);
            }
          }
        });

        mergedRegistry = Array.from(studentMap.values());
      } else if (existingStudents.length === 0) {
        mergedRegistry = [];
      }

      const cleaned = mergedRegistry.filter((r: any) => r && r.name !== 'SYSTEM_LOCK');

      // حفظ الكاش وتحديث البصومة الزمنية لآخر مزامنة ناجحة
      localStorage.setItem('cached_students_registry', JSON.stringify(cleaned));
      
      let latestTimestamp = lastSyncTimestamp || new Date(0).toISOString();
      newOrUpdatedRows.forEach((r: any) => {
        if (r.updated_at && r.updated_at > latestTimestamp) {
          latestTimestamp = r.updated_at;
        }
      });
      localStorage.setItem('cached_students_last_sync_timestamp', latestTimestamp);

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
      
      // 🌟 التميز وتوفير الاستهلاك: البحث في الكاش المحلي أولاً قبل التواصل مع السيرفر
      let studentObj = cachedRegistry.find((s: any) => s && String(s.student_id).trim() === codeCleaned);
      
      if (!studentObj) {
        const cached = localStorage.getItem('cached_students_registry');
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              studentObj = parsed.find((s: any) => s && String(s.student_id).trim() === codeCleaned);
            }
          } catch (e) {
            console.error(e);
          }
        }
      }

      if (!studentObj) {
        // بديل أخير: جلب هذا الطالب الفردي فقط لتوفير الباندويث وحماية السقف المجاني
        const { data: fetchedStudent, error } = await supabase
          .from('registrations')
          .select('student_id, name, stage, churchName, gender, competitions')
          .eq('student_id', codeCleaned)
          .maybeSingle();

        if (error || !fetchedStudent) {
          setErrors("لم نتمكن من العثور على الكود المسحوب، يرجى الاستعانة بمسؤول اللجنة للتأكد.");
          setIsLoading(false);
          return;
        }
        studentObj = fetchedStudent;
      }

      await triggerActiveExamLaunch(studentObj);
    } catch (err: any) {
      setErrors("فشل البحث في قاعدة البيانات.");
      setIsLoading(false);
    }
  };

  const startCamera = () => {
    setErrors(null);
    setCameraPermissionDenied(false);

    // If already scanning, stop first, then run startup
    if (qrScannerRef.current && qrScannerRef.current.isScanning) {
      qrScannerRef.current.stop().then(() => {
        qrScannerRef.current?.clear();
        doStart();
      }).catch(() => {
        doStart();
      });
    } else {
      doStart();
    }

    function doStart() {
      setTimeout(() => {
        try {
          const element = document.getElementById('qr-reader');
          if (!element) return;

          // Clear any dynamic elements leftover inside qr-reader container
          element.innerHTML = '';

          const html5Qrcode = new Html5Qrcode("qr-reader");
          qrScannerRef.current = html5Qrcode;

          const config = { fps: 10, qrbox: { width: 250, height: 250 } };
          const qrCodeSuccessCallback = async (decodedText: string) => {
            setIsScanningActive(false);
            if (qrScannerRef.current) {
              qrScannerRef.current.stop().then(() => {
                qrScannerRef.current?.clear();
              }).catch(() => {});
            }
            await processScannedCode(decodedText);

            // AUTOMATIC RESUME TIMEOUT (Solution A):
            // After 3 seconds, automatically re-activate the camera to allow scanning the next card without manual click
            setTimeout(() => {
              if (loginMethod === 'code' && (!qrScannerRef.current || !qrScannerRef.current.isScanning)) {
                startCamera();
              }
            }, 3000);
          };

          html5Qrcode.start(
            { facingMode: "environment" }, // Enforces rear camera by default
            config,
            qrCodeSuccessCallback,
            () => { /* silent error log */ }
          ).then(() => {
            setIsScanningActive(true);
          }).catch((err) => {
            console.warn("Camera environmental start blocked or unavailable, trying fallback:", err);
            // Fallback to front camera if environment is unavailable
            html5Qrcode.start(
              { facingMode: "user" },
              config,
              qrCodeSuccessCallback,
              () => {}
            ).then(() => {
              setIsScanningActive(true);
            }).catch((err2) => {
              console.warn("Camera fallback user start blocked, switching to manual code:", err2);
              setCameraPermissionDenied(true);
              setIsScanningActive(false);
            });
          });
        } catch (err) {
          console.warn("Camera Init Exception:", err);
          setCameraPermissionDenied(true);
          setIsScanningActive(false);
        }
      }, 100);
    }
  };

  // 1. تشغيل الكاميرا فورياً عند فتح واجهة الـ QR كود
  useEffect(() => {
    if (loginMethod === 'code') {
      startCamera();
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

  // البحث اللحظي بالاسم عبر قاعدة البيانات
  useEffect(() => {
    if (loginMethod !== 'name' || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const queryClean = searchQuery.trim();
        
        const { data, error } = await supabase
          .from('registrations')
          .select('student_id, name, stage, churchName, gender, competitions')
          .ilike('name', `%${queryClean}%`)
          .limit(15);

        if (error) throw error;
        
        setSearchResults(data || []);
        setShowDropdown(true);
      } catch (err: any) {
        console.error("Local search exception:", err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, loginMethod]);

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setShowDropdown(false);
    setErrors(null);
  };

  // معالج سحب الامتحان الفعلي من الـ Pool وتفجير شاشة الأسئلة
  const triggerActiveExamLaunch = async (studentObj: any) => {
    setIsLoading(true);
    setErrors(null);
    
    try {
      console.log("Success! Proceeding directly to the competition choices dashboard (cards screen).");
      onSuccess(
        {
          id: String(studentObj.student_id),
          name: studentObj.name,
          stage: studentObj.stage,
          churchName: studentObj.churchName || 'غير محدد',
          gender: studentObj.gender || 'ذكر',
          competitions: studentObj.competitions
        },
        null
      );
    } catch (error) {
      console.error("Critical Failure in Launch Pipeline:", error);
      setErrors("Mission Standby: حدث خطأ غير متوقع في نظام التشغيل.");
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
    <div className="relative min-h-screen w-full overflow-x-hidden overflow-y-auto z-[160] bg-gradient-to-br from-[#4a000b] via-[#6b0311] to-[#2b0006] backdrop-blur-xl flex flex-col items-center justify-start md:justify-center p-4 md:p-8 pt-12 md:pt-8 font-arabic antialiased" dir="rtl">
      <img src={logo} className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay pointer-events-none blur-md" alt="" />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md mx-auto bg-white/95 rounded-2xl shadow-[0_20px_50px_rgba(212,175,55,0.25)] border border-amber-500/20 overflow-hidden relative z-10"
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

          {/* أيقونة البوصلة المخفية (تتطلب الرقم السري لتفعيل وضع الطوارئ) */}
          <div 
            onClick={() => {
              if (isAdminUnlocked) {
                setIsAdminUnlocked(false);
                setLoginMethod('code');
              } else {
                setShowPasswordModal(true);
                setPasswordInput('');
                setPasswordError('');
              }
            }}
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
          {!gateAccessGranted || isPortalLockedByAdmin ? (
            <div className="text-center py-10 px-4 space-y-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-red-50 border border-red-200 rounded-full flex items-center justify-center animate-bounce text-red-500">
                <Lock size={40} />
              </div>
              <h2 className="text-xl font-black text-red-600">
                {isPortalLockedByAdmin ? "عفوًا تم غلق بوابة الأونلاين من قبل لجنة المهرجان" : "البوابة مغلقة حالياً"}
              </h2>
              <p className="text-slate-600 text-sm font-bold leading-relaxed max-w-sm">
                {isPortalLockedByAdmin 
                  ? "عفوًا تم غلق بوابة الأونلاين من قبل لجنة المهرجان" 
                  : "عذراً، البوابة مغلقة. برجاء مسح الـ QR Code المعتمد الساعي من مقر اللجنة لتفعيل الدخول."}
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-bold max-w-sm">
                تنبيه: يتغير رمز الدخول الخاص بالبوابة تلقائياً كل ساعة (ساعي ديناميكي متزامن) لتأمين الاختبارات ومنع التمرير غير المصرح به.
              </div>
            </div>
          ) : (
            <>
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
                    
                    <div className="relative w-full aspect-video min-h-[220px] bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center">
                      {/* The QR reader div - must remain in DOM */}
                      <div 
                        id="qr-reader" 
                        className="w-full h-full rounded-xl overflow-hidden border-none bg-black"
                      ></div>

                      {/* Fallback Placeholder Overlay when camera is inactive */}
                      {!isScanningActive && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-slate-200 p-4 text-center z-10 transition-all">
                          <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mb-3 animate-pulse">
                            <Camera size={22} />
                          </div>
                          <p className="text-xs font-black mb-1 text-slate-300">الكاميرا متوقفة حالياً</p>
                          <p className="text-[10px] text-slate-500 max-w-[240px] leading-relaxed mb-4">
                            تم إيقاف قارئ الـ QR لحماية الطاقة والخصوصية، أو بسبب انتهاء المسح السابق.
                          </p>
                          <button
                            type="button"
                            onClick={() => startCamera()}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw size={14} />
                            إعادة تشغيل الكاميرا
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Permanent Button to Re-activate Camera (Solution B) */}
                    <div className="mt-2.5 px-1">
                      <button
                        type="button"
                        onClick={() => startCamera()}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 hover:text-white border border-slate-700 font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm cursor-pointer"
                      >
                        <RefreshCw size={14} className={isScanningActive ? "animate-spin text-emerald-400" : "text-amber-400"} />
                        <span>إعادة تنشيط الكاميرا يدويًا</span>
                      </button>
                    </div>
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
                              key={student.student_id}
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
            </>
          )}

          {/* فوتر النظام */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center text-[10px] font-black text-slate-400 flex items-center justify-center gap-2">
            <School size={12} />
            <span>لجنة مهرجان الكرازة - إيبارشية مفافة والعدوة - منطقة 18©{new Date().getFullYear()}</span>
          </div>
        </div>
      </motion.div>

      {/* Password Verification Modal for Compass Unlock */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[200]"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 text-white relative shadow-2xl"
              dir="rtl"
            >
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 left-4 bg-white/10 hover:bg-white/20 p-2 rounded-xl text-slate-400 hover:text-white transition-all"
              >
                <XCircle size={18} />
              </button>

              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Lock size={22} />
                </div>
                <h3 className="text-base font-black">رمز حماية وضع الطوارئ</h3>
                <p className="text-[11px] text-slate-400 mt-1">يرجى إدخال الرقم السري المخصص لتفعيل البحث بالاسم للجان الطوارئ</p>
              </div>

               <form 
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    // التحقق من الرقم السري عبر السيرفر بشكل آمن وبدون أي تحقق محلي
                    const response = await fetch('/api/verify-gate-password', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json'
                      },
                      body: JSON.stringify({ password: passwordInput })
                    });

                    if (!response.ok) {
                      throw new Error('فشل الاتصال بخادم التحقق');
                    }

                    const resData = await response.json();

                    if (resData.success) {
                      setIsAdminUnlocked(true);
                      setLoginMethod('name');
                      setShowPasswordModal(false);
                      setPasswordInput('');
                      setPasswordError('');
                      
                      // حفظ إصدار الصلاحيات الحالي في الكاش لضمان توافق الجلسة
                      if (resData.auth_version) {
                        localStorage.setItem('cached_auth_version', String(resData.auth_version));
                      }
                    } else {
                      setPasswordError('رمز المرور غير صحيح! يرجى المحاولة مرة أخرى.');
                    }
                  } catch (err) {
                    console.error("خطأ أثناء التحقق من رمز المرور:", err);
                    setPasswordError('حدث خطأ في الاتصال بالخادم، يرجى التحقق من الشبكة وإعادة المحاولة.');
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <input
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] font-mono py-3.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-lg font-bold text-white placeholder:text-slate-700 outline-none transition-all"
                    autoFocus
                  />
                  {passwordError && (
                    <p className="text-red-500 text-[10px] font-bold mt-2 text-center">{passwordError}</p>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 rounded-xl font-black text-xs transition-all active:scale-95 shadow-lg cursor-pointer"
                  >
                    تأكيد الرمز
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
