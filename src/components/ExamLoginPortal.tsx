import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { 
  Key, 
  Search, 
  User, 
  BookOpen, 
  CheckCircle, 
  AlertCircle, 
  Sparkles,
  School,
  Lock,
  Compass,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ExamLoginPortalProps {
  onSuccess: (student: {
    id: string;
    name: string;
    stage: string;
    churchName: string;
    gender: string;
    competitions: any;
  }) => void;
  systemSetting?: {
    allowRegistrationLogin?: boolean;
    requireValidation?: boolean;
    examOpen?: boolean;
    portalAnnouncement?: string;
  };
}

export function ExamLoginPortal({ onSuccess, systemSetting }: ExamLoginPortalProps) {
  // Authentication Method (Strictly default to 'code' for QR Scanning safety)
  const [loginMethod, setLoginMethod] = useState<'code' | 'name'>('code');
  const [academicCode, setAcademicCode] = useState('');
  
  // Emergency Mode State (Hidden Tab for Authorized Servants Only)
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [secretClickCount, setSecretClickCount] = useState(0);

  // Search with Dropdown States
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // General Portal Settings & Configurations
  const [errors, setErrors] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect clicks outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Secret Unlocking Feature (Clicking the Compass icon 5 times prompts for Admin OTP)
  const handleSecretIconClick = () => {
    if (isAdminUnlocked) return;
    
    const newCount = secretClickCount + 1;
    setSecretClickCount(newCount);
    
    if (newCount >= 5) {
      setSecretClickCount(0); // Reset
      const password = prompt("برجاء إدخال الرقم السري :");
      if (password === "2026") { // الرقم السري الخاص بـ كريم هندسة
        setIsAdminUnlocked(true);
        setLoginMethod('name'); // Switch immediately
        alert("تم تفعيل وضع الطوارئ والبحث بالاسم بنجاح.");
      } else if (password !== null) {
        alert("الرقم السري خاطئ! يرجى استخدام الـ QR كود.");
      }
    }
  };

  // Live search debounced matching exact DB columns
  useEffect(() => {
    if (loginMethod !== 'name' || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setIsSearching(true);
      setErrors(null);
      try {
        // Querying exactly from your 'registrations' table structure
        const { data, error } = await supabase
          .from('registrations')
          .select('id, name, stage, churchName, gender, competitions')
          .ilike('name', `%${searchQuery.trim()}%`)
          .range(0, 15);

        if (error) throw error;
        setSearchResults(data || []);
        setShowDropdown(true);
      } catch (err: any) {
        console.error("Error fetching students:", err.message);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, loginMethod]);

  const handleSelectStudent = (student: any) => {
    setSelectedStudent(student);
    setSearchQuery(student.name);
    setShowDropdown(false);
    setErrors(null);
  };

  // Submit Handler: Name-based Portal Login (Emergency Case)
  const handleNameLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setErrors("الرجاء اختيار الاسم بالكامل من قائمة البحث المنسدلة.");
      return;
    }

    setIsLoading(true);
    setErrors(null);

    try {
      const { data: studentObj, error: fetchErr } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', selectedStudent.id)
        .maybeSingle();

      if (fetchErr || !studentObj) {
        setErrors("فشل العثور على ملف المشترك بالخادم، راجع مسؤول اللجان.");
        setIsLoading(false);
        return;
      }

      // Success Payload mapped perfectly to registrations table columns
      onSuccess({
        id: String(studentObj.id),
        name: studentObj.name,
        stage: studentObj.stage || 'دراسي',
        churchName: studentObj.churchName || 'مارمينا والبابا كيرلس',
        gender: studentObj.gender || 'ذكر',
        competitions: studentObj.competitions || null
      });
    } catch (err: any) {
      setErrors("حدث خطأ تقني غير متوقع أثناء تسجيل الدخول.");
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Handler: Core QR Code / Numeric ID Entry Login
  const handleCodeLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!academicCode.trim()) {
      setErrors("يرجى مسح كود الـ QR الصحيح لبدء الامتحان.");
      return;
    }

    setIsLoading(true);
    setErrors(null);

    try {
      // Clean and query by exact registration ID field
      const targetId = academicCode.trim().toLowerCase();

      const { data: studentObj, error: dbErr } = await supabase
        .from('registrations')
        .select('*')
        .eq('id', targetId)
        .maybeSingle();

      if (dbErr || !studentObj) {
        setErrors("كود غير مسجل، يرجى التأكد من مسح كارت الـ QR المعتمد للمشترك.");
        setIsLoading(false);
        return;
      }

      // Fire success payload aligned exactly with DB constraints
      onSuccess({
        id: String(studentObj.id),
        name: studentObj.name,
        stage: studentObj.stage || 'دراسي',
        churchName: studentObj.churchName || 'مارمينا والبابا كيرلس',
        gender: studentObj.gender || 'ذكر',
        competitions: studentObj.competitions || null
      });
    } catch (err: any) {
      setErrors("خطأ تقني أثناء الاتصال بقاعدة البيانات.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-8 font-arabic antialiased" dir="rtl">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xl bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden relative z-10"
      >
        {/* Upper Brand Header */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white relative text-center">
          {/* Secret Compass Unlocker */}
          <div 
            onClick={handleSecretIconClick}
            className="absolute top-4 right-4 bg-white/10 p-2 rounded-xl backdrop-blur-md cursor-pointer hover:bg-white/20 transition-all select-none"
            title="إدارة اللجان"
          >
            <Compass className={`${isAdminUnlocked ? 'text-emerald-400' : 'text-amber-500'} animate-spin-slow`} size={24} />
          </div>
          
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-inner">
            <QrCode className="text-amber-400" size={32} />
          </div>

          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight mb-2">الاختبارات الإلكترونية</h1>
          <p className="text-slate-400 text-xs md:text-sm font-semibold max-w-sm mx-auto">
            مهرجان الكرازة المرقسية - امسح كارت الـ QR المخصص لك لبدء لجان الاختبارات فوراً.
          </p>

          {systemSetting?.portalAnnouncement && (
            <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-amber-300 font-bold flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              تنويه: {systemSetting.portalAnnouncement}
            </div>
          )}
        </div>

        <div className="p-6 md:p-8">
          
          {/* Hidden Tabs: Appears only when secret trigger is active */}
          {isAdminUnlocked && (
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => setLoginMethod('code')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                  loginMethod === 'code' ? 'bg-white shadow text-slate-950' : 'text-slate-500'
                }`}
              >
                <Key size={16} />
                الدخول بالـ QR / الكود
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('name')}
                className={`flex-1 py-3 px-4 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
                  loginMethod === 'name' ? 'bg-white shadow text-red-600' : 'text-slate-500'
                }`}
              >
                <User size={16} />
                طوارئ: البحث بالاسم
              </button>
            </div>
          )}

          {/* Error Alert Display */}
          <AnimatePresence mode="wait">
            {errors && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3"
              >
                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                <div className="text-sm font-bold text-red-600 leading-relaxed">{errors}</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form UI Switching logic */}
          {loginMethod === 'code' ? (
            <form onSubmit={handleCodeLoginSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">ضع كارت الـ QR أمام القارئ أو اكتب الكود</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <QrCode size={18} />
                  </span>
                  <input
                    type="text"
                    value={academicCode}
                    onChange={(e) => setAcademicCode(e.target.value)}
                    placeholder="وجه قارئ الـ QR الخاص بالموبايل..."
                    className="w-full pr-12 pl-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-sm font-black tracking-widest text-center text-slate-950 shadow-inner placeholder:text-slate-400 placeholder:tracking-normal"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex gap-3 text-xs text-slate-500 font-bold leading-relaxed">
                <Lock size={16} className="text-slate-400 shrink-0 mt-0.5" />
                تنبيه أمني: يُحظر تماماً مشاركة أكواد الامتحانات أو الدخول بأسماء غير مطابقة لكشوف اللجنة الرسمية.
              </div>

              <button
                type="submit"
                disabled={isLoading || !academicCode.trim()}
                className="w-full py-4 px-6 bg-primary text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-opacity-95 transition-all shadow-md disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    جاري سحب بيانات الكارت...
                  </>
                ) : (
                  <>
                    <BookOpen size={18} />
                    تحقق وبدء اللجنة
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNameLoginSubmit} className="space-y-6">
              <div className="relative" ref={dropdownRef}>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-wider mb-2">إدخل استثنائي: اسم المشترك المسجل</label>
                <div className="relative">
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    <Search size={18} />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedStudent(null);
                    }}
                    placeholder="اكتب 3 أحرف من اسم الطالب للضرورة القصوى..."
                    className="w-full pr-12 pl-10 py-3.5 bg-red-50/30 border border-red-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all text-sm font-black text-slate-950 shadow-inner"
                  />
                  {isSearching && (
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full" />
                  )}
                </div>

                <AnimatePresence>
                  {showDropdown && searchResults.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto divide-y divide-slate-100"
                    >
                      {searchResults.map((student) => (
                        <button
                          key={student.id}
                          type="button"
                          onClick={() => handleSelectStudent(student)}
                          className="w-full text-right px-4 py-3 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-1 md:gap-4 font-black"
                        >
                          <div>
                            <p className="text-sm text-slate-950 font-black">{student.name}</p>
                            <p className="text-xs text-slate-400 font-semibold">{student.churchName}</p>
                          </div>
                          <span className="self-start md:self-center px-2.5 py-1 bg-primary/10 text-primary text-[10px] font-black rounded-lg">
                            {student.stage}
                          </span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {selectedStudent && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-xs text-emerald-600 font-bold">تم المطابقة الاستثنائية بنجاح</p>
                    <p className="text-sm font-black text-slate-900">{selectedStudent.name}</p>
                    <p className="text-xs text-slate-500 font-semibold">{selectedStudent.churchName} ({selectedStudent.stage})</p>
                  </div>
                  <CheckCircle className="text-emerald-500 shrink-0" size={24} />
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !selectedStudent}
                className="w-full py-4 px-6 bg-red-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-md disabled:opacity-50"
              >
                <BookOpen size={18} />
                تأكيد الدخول الاستثنائي وبدء اللجنة
              </button>
            </form>
          )}

          {/* Footer Copyrights */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center text-[11px] font-black text-slate-400 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1">
              <School size={12} className="text-slate-400" />
              لجنة إيبارشية مغاغة والعدوة(المنطقة 18)
            </span>
            <span className="text-slate-200">|</span>
            <span className="text-slate-400">©{new Date().getFullYear()} جميع الحقوق محفوظة</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
