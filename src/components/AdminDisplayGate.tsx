import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { getDailyExamToken } from '../utils/dailyToken';
import { QrCode, Printer, RefreshCw, Clock, Calendar, CheckCircle, ShieldAlert } from 'lucide-react';
import logo from '../by-logo.jpeg';

export default function AdminDisplayGate({ onClose, isInline = false }: { onClose?: () => void; isInline?: boolean }) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [cairoDateStr, setCairoDateStr] = useState('');
  const [cairoTimeStr, setCairoTimeStr] = useState('');
  const dailyToken = getDailyExamToken();
  const qrValue = `${window.location.origin}/exam-login?gateway_token=${dailyToken}`;

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

        // Countdown to Midnight Cairo
        const cairoString = now.toLocaleString('en-US', { timeZone: 'Africa/Cairo' });
        const cairoNow = new Date(cairoString);
        
        const cairoMidnight = new Date(cairoString);
        cairoMidnight.setHours(24, 0, 0, 0); // Moves to midnight
        
        const diffSeconds = Math.max(0, Math.floor((cairoMidnight.getTime() - cairoNow.getTime()) / 1000));
        
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
          <h1 className="text-2xl font-black text-amber-400 print:text-black print:text-3xl">بوابة الـ QR Code الدوارة للاختبارات</h1>
        </div>
        <p className="text-slate-400 text-xs font-bold print:text-slate-700">مهرجان الكرازة المرقسية - إيبارشية مغاغة والعدوة (منطقة 18)</p>
      </div>

      {/* Info Ribbon */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 mb-6 flex flex-wrap justify-around items-center gap-4 text-xs font-bold print:border-slate-300 print:bg-slate-50 print:text-black">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-amber-500 print:text-black" />
          <div>
            <p className="text-slate-500 text-[10px] text-right print:text-slate-600">التاريخ اليومي (القاهرة)</p>
            <p className="text-slate-200 font-black print:text-black">{cairoDateStr || 'جاري الحساب...'}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-slate-800 hidden md:block print:bg-slate-300" />
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-emerald-500 print:text-black" />
          <div>
            <p className="text-slate-500 text-[10px] text-right print:text-slate-600">الوقت الحالي (القاهرة)</p>
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
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-wider print:text-slate-500">رمز التوثيق اليومي</p>
          <p className="text-slate-900 text-lg font-black font-mono tracking-widest mt-1 bg-slate-100 inline-block px-4 py-1.5 rounded-xl print:bg-slate-200">
            {dailyToken}
          </p>
        </div>
      </div>

      {/* Rotation Alert/Countdown */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 text-xs font-bold print:hidden">
        <div className="flex items-center gap-2.5 text-right">
          <ShieldAlert className="text-amber-500 shrink-0" size={20} />
          <div>
            <p className="text-slate-200 font-black">حماية وتحديث ذاتي 24 ساعة</p>
            <p className="text-slate-400 text-[11px] font-semibold">يتغير كود التوثيق تلقائياً عند الساعة 12:00 منتصف الليل بتوقيت القاهرة.</p>
          </div>
        </div>
        <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 font-mono text-emerald-400 text-sm font-black flex flex-col items-center shrink-0">
          <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">صلاحية الرمز</span>
          <span>{timeRemaining || '--:--:--'}</span>
        </div>
      </div>

      {/* User instructions */}
      <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 text-right text-xs font-bold leading-relaxed mb-6 text-amber-300 print:text-slate-800 print:border-slate-300 print:bg-slate-50">
        💡 <span className="font-black text-amber-400 print:text-black">تعليمات الاستخدام:</span> وجه كاميرا هاتف الطالب أو الخادم لمسح الـ QR Code لتفعيل صلاحية دخول بوابة الامتحانات للـ 24 ساعة القادمة فوراً دون الحاجة لأي تفعيل يدوي.
      </div>

      {/* Actions Button */}
      <div className="flex flex-wrap gap-3 justify-center items-center print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-amber-500/20"
        >
          <Printer size={16} />
          طباعة الـ QR Code
        </button>
        
        <button
          type="button"
          onClick={handleCopyLink}
          className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all active:scale-95 border ${
            copied 
              ? 'bg-emerald-600 text-white border-emerald-500' 
              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
          }`}
        >
          {copied ? <CheckCircle size={16} /> : <RefreshCw size={16} />}
          {copied ? 'تم نسخ رابط التفعيل' : 'نسخ رابط التفعيل اليومي'}
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
