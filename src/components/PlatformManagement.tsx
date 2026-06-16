import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Lock, Unlock, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function PlatformManagement() {
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  const checkRegistrationStatus = async () => {
    setLoading(true);
    setErrorHeader(null);
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('name')
        .eq('name', 'SYSTEM_LOCK')
        .maybeSingle();

      if (error) throw error;
      setIsRegistrationOpen(!data);
    } catch (err: any) {
      console.error('Fetch status error:', err.message);
      setErrorHeader('فشل الاتصال بجدول التسجيلات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkRegistrationStatus();
  }, []);

  const handleToggleRegistration = async () => {
    const originalState = isRegistrationOpen;
    setActionLoading(true);
    setErrorHeader(null);

    // Optimistic Update UI
    setIsRegistrationOpen(!originalState);

    try {
      if (originalState) {
        // Locking the system
        const { error } = await supabase
          .from('registrations')
          .insert([{ name: 'SYSTEM_LOCK', churchName: 'SYSTEM' }]);
        
        if (error) throw error;
      } else {
        // Unlocking the system
        const { error } = await supabase
          .from('registrations')
          .delete()
          .eq('name', 'SYSTEM_LOCK');
        
        if (error) throw error;
      }
    } catch (err: any) {
      // Rollback UI state on error
      setIsRegistrationOpen(originalState);
      setErrorHeader(`خطأ: ${err.message}`);
      alert(`حدث خطأ أثناء تعديل الحالة: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Lock size={24} className="text-primary" />
            التحكم السيادي في التسجيل
          </h3>
          <p className="text-slate-500 text-sm font-bold mt-1">إغلاق وفتح باب التسجيل لكافة الكنائس على مستوى المنصة</p>
        </div>
        
        <button 
          onClick={checkRegistrationStatus}
          disabled={loading || actionLoading}
          className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-400 hover:text-primary"
          title="تحديث الحالة"
        >
          <RefreshCw size={20} className={(loading || actionLoading) ? 'animate-spin' : ''} />
        </button>
      </div>

      {errorHeader && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-600 text-sm font-bold">
          <AlertTriangle size={18} />
          {errorHeader}
        </div>
      )}
      
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center gap-4">
        <div className="flex items-center gap-3 mb-2">
          <div className={`w-3 h-3 rounded-full animate-pulse ${isRegistrationOpen ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`} />
          <span className={`font-black text-lg ${isRegistrationOpen ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isRegistrationOpen ? 'وضع التسجيل: مفتوح حالياً' : 'وضع التسجيل: مغلق ومحمي'}
          </span>
        </div>

        <button
          onClick={handleToggleRegistration}
          disabled={loading || actionLoading}
          className={`w-full max-w-sm p-4 rounded-xl font-black text-white transition-all shadow-lg flex items-center justify-center gap-3 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-300 ${
            isRegistrationOpen 
              ? 'bg-rose-500 hover:bg-rose-600' 
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          {actionLoading ? (
            <RefreshCw size={22} className="animate-spin" />
          ) : isRegistrationOpen ? (
            <>
              <Lock size={22} />
              إغلاق التسجيل فوراً 🔒
            </>
          ) : (
            <>
              <Unlock size={22} />
              فتح باب التسجيل الآن 🔓
            </>
          )}
        </button>

        <p className="text-slate-400 text-[10px] text-center max-w-xs font-bold leading-relaxed">
          * قفل التسجيل معناه منع كافة المستخدمين من إضافة أي مشترك جديد في جدول registrations عن طريق وضع علامة SYSTEM_LOCK.
        </p>
      </div>
    </div>
  );
}
