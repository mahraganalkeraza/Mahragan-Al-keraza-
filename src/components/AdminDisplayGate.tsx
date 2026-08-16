import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getHourlyExamToken } from '../utils/dailyToken';
import { triggerGlobalRefresh, performPurgeAndReload } from '../utils/forceRefreshManager';
import { QrCode, Printer, RefreshCw, Clock, Calendar, CheckCircle, ShieldAlert, AlertTriangle, LogOut, X } from 'lucide-react';
import logo from '../by-logo.jpeg';
import { supabase } from '../lib/supabaseClient';

export default function AdminDisplayGate({ onClose, isInline = false }: { onClose?: () => void; isInline?: boolean }) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [cairoDateStr, setCairoDateStr] = useState('');
  const [cairoTimeStr, setCairoTimeStr] = useState('');
  const [hourlyToken, setHourlyToken] = useState(() => getHourlyExamToken());

  const qrValue = `https://mahraganalkeraza.github.io/Mahragan-Al-keraza-/#/Exam_engine?gateway_token=${hourlyToken}`;

  const [isLocked, setIsLocked] = useState(false);
  const [isUpdatingLock, setIsUpdatingLock] = useState(false);
  const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
  const [isHardRefreshing, setIsHardRefreshing] = useState(false);
  const [showRefreshConfirmModal, setShowRefreshConfirmModal] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const { data: sysData } = await supabase
          .from('system_settings')
          .select('is_exam_locked, content')
          .eq('id', 1)
          .maybeSingle();
        if (sysData) {
          setIsLocked(!!sysData.is_exam_locked);
          const seedVal = sysData.content || '';
          localStorage.setItem('manual_seed_modifier', seedVal);
          setHourlyToken(getHourlyExamToken());
        }
      } catch (err) {
        console.error("Failed to load initial lock/seed status in AdminDisplayGate:", err);
      }
    };

    fetchInitialData();
  }, []);

  const handleToggleLock = async () => {
    setIsUpdatingLock(true);
    const targetState = !isLocked;
    try {
      // 1. Update database
      const { error } = await supabase
        .from('system_settings')
        .update({ is_exam_locked: targetState })
        .eq('id', 1);

      if (error) {
        throw error;
      }

      // 2. Update local state
      setIsLocked(targetState);
      localStorage.setItem('portal_locked_by_admin', targetState ? 'true' : 'false');
      
      if (targetState) {
        // If locked, clear student sessions immediately
        localStorage.removeItem('gate_access_granted_hourly');
        localStorage.removeItem('gate_access_granted');
        localStorage.removeItem('gateway_exam_token');
        localStorage.removeItem('active_student_session');
        localStorage.removeItem('active_student_id');
      }
    } catch (err: any) {
      console.error(err);
      alert(`خطأ أثناء التحديث حالة : ${err.message || err}`);
    } finally {
      setIsUpdatingLock(false);
    }
  };

  const handleForceRegenerateQR = async () => {
    setIsRegeneratingToken(true);
    try {
      const newSeed = String(Date.now());
      
      // 1. Update database content field on row 1 to modify the active seed
      const { error } = await supabase
        .from('system_settings')
        .update({ content: newSeed })
        .eq('id', 1);

      if (error) {
        throw error;
      }

      // 2. Save locally
      localStorage.setItem('manual_seed_modifier', newSeed);
      
      // 3. Force recalculation of token
      const newToken = getHourlyExamToken();
      setHourlyToken(newToken);
    } catch (err: any) {
      console.error(err);
      alert(`خطأ أثناء إعادة استخراج الرمز: ${err.message || err}`);
    } finally {
      setIsRegeneratingToken(false);
    }
  };

  const handleHardRefreshPortal = () => {
    setShowRefreshConfirmModal(true);
  };

  const executeHardRefresh = async () => {
    setShowRefreshConfirmModal(false);
    setIsHardRefreshing(true);
    try {
      // 1. Trigger DB timestamp update & Realtime broadcast to all devices
      const nowMs = await triggerGlobalRefresh();

      // 2. Clear local storage gate tokens and recalculate token
      localStorage.setItem('manual_seed_modifier', String(nowMs));
      localStorage.setItem('app_version', `v-${nowMs}`);
      
      const newToken = getHourlyExamToken();
      setHourlyToken(newToken);

      // 3. Perform purge and hard reload on admin device
      await performPurgeAndReload(nowMs);

    } catch (err: any) {
      console.error("Hard refresh error:", err);
      alert(`حدث خطأ أثناء إجراء الـ Refresh: ${err.message || err}`);
      setIsHardRefreshing(false);
    }
  };

  // Generate QR Code
  useEffect(() => {
    QRCode.toDataURL(qrValue, {
      width: 512,
      margin: 2,
      color: {
        dark: '#0f172a', // deep slate
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Failed to generate gate QR code:', err));
  }, [qrValue]);

  // Clock & Countdown & Timezone Info
  useEffect(() => {
    const updateTime = () => {
      try {
        const now = new Date();
        
        // Formatted Cairo Date
        const formatterDate = new Intl.DateTimeFormat('ar-EG', {
          timeZone: 'Africa/Cairo',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        setCairoDateStr(formatterDate.format(now));

        // Formatted Cairo Time
        const formatterTime = new Intl.DateTimeFormat('ar-EG', {
          timeZone: 'Africa/Cairo',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });
        setCairoTimeStr(formatterTime.format(now));

        // Sync token value dynamically
        const currentTk = getHourlyExamToken();
        setHourlyToken(prev => prev !== currentTk ? currentTk : prev);

        // Countdown to the next 10:00 PM rollover in Cairo time timezone
        const cairoString = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
        const cairoNow = new Date(cairoString);
        
        const cairoRollover = new Date(cairoString);
        cairoRollover.setHours(22, 0, 0, 0);
        
        if (cairoNow.getTime() >= cairoRollover.getTime()) {
          cairoRollover.setDate(cairoRollover.getDate() + 1);
        }
        
        const diffSeconds = Math.max(0, Math.floor((cairoRollover.getTime() - cairoNow.getTime()) / 1000));
        
        const h = Math.floor(diffSeconds / 3600);
        const m = Math.floor((diffSeconds % 3600) / 60);
        const s = diffSeconds % 60;
        
        const pad = (n: number) => String(n).padStart(2, '0');
        setTimeRemaining(`${pad(h)}:${pad(m)}:${pad(s)}`);
      } catch (err) {
        console.error(err);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const content = (
    <div className={`w-full max-w-2xl bg-slate-950/85 backdrop-blur-md rounded-3xl border border-slate-800 p-6 md:p-8 text-center relative z-10 shadow-2xl print:border-none print:bg-white print:text-black print:shadow-none print:p-0 ${isInline ? 'mx-auto' : ''}`}>
      
      {/* Header - Hidden in Print if needed, but QR needs header */}
      <div className="mb-6 print:mb-4">
        <div className="flex justify-center items-center gap-3 mb-2">
          <span className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl print:hidden">
            <QrCode size={28} />
          </span>
          <h1 className="text-2xl font-black text-amber-400 print:text-black print:text-3xl">الـ QRCode اليومية لمنصة الامتحانات</h1>
        </div>
        <p className="text-slate-400 text-xs font-bold print:text-slate-700">مهرجان الكرازة المرقسية - إيبارشية مغاغة والعدوة (منطقة 18)</p>
      </div>

      {/* Info Ribbon */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap justify-around items-center gap-4 text-xs font-bold print:border-slate-300 print:bg-slate-50 print:text-black">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-amber-500 print:text-black" />
          <div>
            <p className="text-slate-500 text-[10px] text-right print:text-slate-600">التاريخ اليومي (مصر)</p>
            <p className="text-slate-200 font-black print:text-black">{cairoDateStr || 'جاري الحساب...'}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-slate-800 hidden md:block print:bg-slate-300" />
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-emerald-500 print:text-black" />
          <div>
            <p className="text-slate-500 text-[10px] text-right print:text-slate-600">الوقت الحالي (مصر)</p>
            <p className="text-slate-200 font-black print:text-black">{cairoTimeStr || 'جاري الحساب...'}</p>
          </div>
        </div>
      </div>

      {/* The QR Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xl max-w-sm mx-auto border-2 border-amber-500/30 mb-6 print:shadow-none print:border-none print:p-2">
        {qrCodeDataUrl ? (
          <img 
            src={qrCodeDataUrl} 
            alt="Gate Access QR Code" 
            className="w-full h-auto mx-auto rounded-xl shadow-sm print:shadow-none"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-64 h-64 flex items-center justify-center mx-auto text-slate-400 animate-pulse">
            <RefreshCw className="animate-spin" size={32} />
          </div>
        )}
        
        <div className="mt-4 border-t border-slate-100 pt-3 text-center">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider print:text-slate-500">رمز الـ QRCode اليومي</p>
          <p className="text-slate-900 text-lg font-black font-mono tracking-widest mt-1 bg-slate-100 inline-block px-4 py-1.5 rounded-xl print:bg-slate-200">
            {hourlyToken}
          </p>
        </div>
      </div>

      {/* Control Panel: Emergency Lock & Force Regeneration */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 mb-6 text-right space-y-4 print:hidden">
        <h3 className="text-sm font-black text-slate-200 flex items-center gap-2 border-b border-slate-800 pb-2">
          ⚙️ التحكم في المنصة والـ QR
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Button One: Emergency Lock */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 block">التحكم في غلق المنصة الطارئ:</label>
            <button
              type="button"
              onClick={handleToggleLock}
              disabled={isUpdatingLock}
              className={`w-full py-3 px-4 rounded-xl font-bold text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 text-sm ${
                isLocked 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/25' 
                  : 'bg-red-600 hover:bg-red-700 shadow-red-950/50'
              }`}
            >
              {isUpdatingLock ? (
                <RefreshCw className="animate-spin text-white" size={18} />
              ) : isLocked ? (
                <>🔓 فتح منصة الامتحانات للكل</>
              ) : (
                <>🔒 غلق المنصة</>
              )}
            </button>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
              {isLocked 
                ? '🔴 المنصة مغلقة حاليًا . تم تسجيل خروج كافة الأجهزة.' 
                : '🟢 المنصة متاحة للأجهزةالمصرح لها من خلال رمز الـ QR اليومي.'}
            </p>
          </div>

          {/* Button Two: Force Regeneration & Hard Refresh */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 block">تحديث كود الدخول اليومي:</label>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleForceRegenerateQR}
                disabled={isRegeneratingToken || isHardRefreshing}
                className="flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/25 disabled:opacity-50 text-xs sm:text-sm"
              >
                {isRegeneratingToken ? (
                  <RefreshCw className="animate-spin text-white" size={18} />
                ) : (
                  <>🔄 QR جديد</>
                )}
              </button>

              <button
                type="button"
                onClick={handleHardRefreshPortal}
                disabled={isRegeneratingToken || isHardRefreshing}
                className="flex-1 py-3 px-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 disabled:opacity-50 text-xs sm:text-sm"
                title="مسح الكاش، طرد الجلسات القديمة، وطلب آخر تحديث للبوابة"
              >
                {isHardRefreshing ? (
                  <RefreshCw className="animate-spin text-white" size={18} />
                ) : (
                  <> Refresh </>
                )}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
              <span className="text-emerald-400 font-bold">QR جديد:</span> توليد كود جديد. | <span className="text-cyan-400 font-bold">Refresh:</span> مسح الكاش وطرد الدخول وجلب أحدث تحديث للبوابة فوراً.
            </p>
          </div>
        </div>
      </div>

      {/* Rotation Alert/Countdown */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 text-xs font-bold print:hidden">
        <div className="flex items-center gap-2.5 text-right">
          <ShieldAlert className="text-amber-500 shrink-0" size={20} />
          <div>
            <p className="text-slate-200 font-black"> تحديث يومي</p>
            <p className="text-slate-400 text-[11px] font-semibold">يتغير كود الـ QRCode تلقائيًا يوميًا في تمام الساعة 10:00 مساءً بالتوقيت المحلي لتأمين الاختبارات ومنع تسريب الرابط.</p>
          </div>
        </div>
        <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 font-mono text-emerald-400 text-sm font-black flex flex-col items-center shrink-0 animate-pulse">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">التحديث القادم</span>
          <span>{timeRemaining || '--:--:--'}</span>
        </div>
      </div>

      {/* User instructions */}
      <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-right text-xs font-bold leading-relaxed mb-6 text-amber-300 print:text-slate-800 print:border-slate-300 print:bg-slate-50">
        💡 <span className="font-black text-amber-400 print:text-black">تعليمات الاستخدام:</span> وجه كاميرا هاتفك لمسح الـ QR Code لتفعيل صلاحية دخول منصة الامتحانات فورًا. الرمز صالح لمدة 24 ساعة.
      </div>

      {/* Actions Button */}
      <div className="flex flex-wrap gap-3 justify-center items-center print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-400"
        >
          <Printer size={16} className="text-slate-950" />
          طباعة الـ QR Code
        </button>
        
        <button
          type="button"
          onClick={handleCopyLink}
          className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 border ${
            copied 
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-md' 
              : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-amber-500/50 shadow-sm'
          }`}
        >
          {copied ? <CheckCircle size={16} /> : <RefreshCw size={16} />}
          {copied ? 'تم نسخ رابط التفعيل' : 'نسخ رابط التفعيل'}
        </button>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white font-black text-xs rounded-xl border border-slate-800 transition-all active:scale-95"
          >
            إغلاق لوحة العرض
          </button>
        )}
      </div>

      {/* Confirmation Modal for Hard Refresh */}
      {showRefreshConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in" dir="rtl">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5 text-right overflow-hidden">
            
            {/* Background Glow */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-100">تأكيد التحديث الإجباري (Hard Refresh)</h3>
                  <p className="text-xs text-rose-400 font-bold mt-0.5">إجراء حساس على مستوى المنصة العامة</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRefreshConfirmModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-800/80 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="space-y-3 text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold">
              <p className="text-slate-200">
                هل أنت متأكد من رغبتك في تفعيل <span className="text-rose-400 font-bold">التحديث الإجباري للمنصة</span>؟
              </p>

              <div className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5 text-xs text-slate-300">
                <div className="flex items-start gap-2 text-rose-300">
                  <LogOut size={16} className="shrink-0 mt-0.5 text-rose-400" />
                  <span><strong>طرد الأجهزة:</strong> سيتم تسجيل الخروج فورًا وطرد جميع المستخدمين المتصلين حاليًا.</span>
                </div>

                <div className="flex items-start gap-2 text-amber-300">
                  <RefreshCw size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <span><strong>Refresh :</strong> سيتم تفريغ Cache Storage وملفات الـ Service Worker القديمة.</span>
                </div>

                <div className="flex items-start gap-2 text-cyan-300">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5 text-cyan-400" />
                  <span><strong>جلب النسخة الجديدة:</strong> سيُجبر التطبيق على تحميل أحدث ملفات المنصة مباشرة على كافة الأجهزة.</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={executeHardRefresh}
                disabled={isHardRefreshing}
                className="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-black text-xs sm:text-sm rounded-xl transition-all shadow-lg shadow-rose-950/50 flex items-center justify-center gap-2"
              >
                {isHardRefreshing ? (
                  <RefreshCw className="animate-spin" size={18} />
                ) : (
                  <> تأكيد التحديث</>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowRefreshConfirmModal(false)}
                disabled={isHardRefreshing}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-300 font-bold text-xs sm:text-sm rounded-xl border border-slate-700 transition-all"
              >
                إلغاء
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );

  if (isInline) {
    return (
      <div className="w-full flex justify-center p-2 text-slate-100 font-arabic" dir="rtl">
        {content}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 flex flex-col items-center justify-center font-arabic relative" dir="rtl">
      {/* Background decoration */}
      <img src={logo} className="absolute inset-0 w-full h-full object-cover opacity-5 mix-blend-overlay pointer-events-none blur-sm" alt="" />
      {content}
    </div>
  );
}
