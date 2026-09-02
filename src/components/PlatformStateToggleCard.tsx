import React, { useState, useEffect } from 'react';
import { 
  Power, 
  RefreshCw, 
  Radio, 
  CheckCircle2, 
  Clock,
  Sparkles,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { 
  fetchPlatformState, 
  updateBishopricExamDisabled,
  subscribeToPlatformState,
  PlatformState 
} from '../utils/platformSettings';

interface PlatformStateToggleCardProps {
  title?: string;
  description?: string;
  className?: string;
  compact?: boolean;
  onStateChange?: (isOpen: boolean) => void;
}

export const PlatformStateToggleCard: React.FC<PlatformStateToggleCardProps> = ({
  title = 'حالة منصة امتحانات الأسقفية',
  description = 'التحكم الفوري في فتح أو إغلاق منصة وبوابة امتحانات الأسقفية للطلاب وجميع الكنائس (مربوط بالعمود is_bishopric_exam_disabled في الصف id=1)',
  className = '',
  compact = false,
  onStateChange
}) => {
  const [platformState, setPlatformState] = useState<PlatformState>({
    isBishopricExamDisabled: false,
    isOpen: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadState = async () => {
    setIsLoading(true);
    try {
      const state = await fetchPlatformState();
      setPlatformState(state);
      if (onStateChange) onStateChange(state.isOpen);
    } catch (err) {
      console.error('Error loading platform state:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadState();

    // Supabase Realtime active subscription on system_settings
    const unsubscribe = subscribeToPlatformState((newState) => {
      setPlatformState(newState);
      if (onStateChange) onStateChange(newState.isOpen);
      setFeedback({
        text: newState.isOpen 
          ? 'تم تحديث الحالة لحظياً: منصة امتحانات الأسقفية مفتوحة الآن ✅' 
          : 'تم تحديث الحالة لحظياً: منصة امتحانات الأسقفية مغلقة الآن 🔒',
        type: 'info'
      });
      setTimeout(() => setFeedback(null), 4000);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggle = async (targetOpen: boolean) => {
    if (isUpdating) return;

    const previousDisabled = platformState.isBishopricExamDisabled;
    const targetDisabled = !targetOpen;

    // Optimistic UI update
    setPlatformState(prev => ({
      ...prev,
      isBishopricExamDisabled: targetDisabled,
      isOpen: targetOpen
    }));
    setIsUpdating(true);
    setFeedback(null);

    const res = await updateBishopricExamDisabled(targetDisabled);

    if (res.success) {
      setFeedback({
        text: targetOpen 
          ? 'تم فتح وتفعيل منصة امتحانات الأسقفية بنجاح (is_bishopric_exam_disabled = false) ✅' 
          : 'تم إغلاق وتعطيل منصة امتحانات الأسقفية بنجاح (is_bishopric_exam_disabled = true) 🔒',
        type: 'success'
      });
      if (onStateChange) onStateChange(targetOpen);
    } else {
      // Revert optimistic change
      setPlatformState(prev => ({
        ...prev,
        isBishopricExamDisabled: previousDisabled,
        isOpen: !previousDisabled
      }));
      setFeedback({
        text: `فشل في حفظ التعديل: ${res.error || 'خطأ غير معروف'}`,
        type: 'error'
      });
    }

    setIsUpdating(false);
    setTimeout(() => setFeedback(null), 5000);
  };

  const isOpen = platformState.isOpen;

  if (compact) {
    return (
      <div 
        id="platform-state-toggle-compact" 
        className={`p-4 rounded-2xl border transition-all ${
          isOpen 
            ? 'bg-emerald-50/70 border-emerald-200' 
            : 'bg-rose-50/70 border-rose-200'
        } ${className}`}
        dir="rtl"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              isOpen ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
            }`}>
              {isOpen ? <Unlock size={20} /> : <Lock size={20} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">حالة امتحانات الأسقفية:</span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                  isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-ping' : 'bg-rose-500'}`} />
                  {isOpen ? 'مفتوحة (is_bishopric_exam_disabled = false)' : 'مغلقة (is_bishopric_exam_disabled = true)'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                {isOpen ? 'متاحة لدخول وامتحان جميع الطلاب' : 'محظورة ومغلقة بقرار إدارة الأسقفية'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUpdating || isLoading}
              onClick={() => handleToggle(!isOpen)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50 ${
                isOpen
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {isUpdating ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Power size={14} />
              )}
              <span>{isOpen ? 'إغلاق منصة الأسقفية 🔒' : 'فتح منصة الأسقفية ✅'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      id="platform-state-toggle-master-card"
      className={`p-6 md:p-8 rounded-3xl border transition-all font-arabic text-right relative overflow-hidden shadow-sm ${
        isOpen
          ? 'bg-gradient-to-br from-white via-emerald-50/30 to-slate-50 border-emerald-200/80 shadow-emerald-500/5'
          : 'bg-gradient-to-br from-white via-rose-50/30 to-slate-50 border-rose-200/80 shadow-rose-500/5'
      } ${className}`}
      dir="rtl"
    >
      {/* Top ambient color glow */}
      <div 
        className={`absolute top-0 right-0 left-0 h-2 ${
          isOpen ? 'bg-emerald-500' : 'bg-rose-600'
        }`} 
      />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 mb-6">
        <div className="flex items-start gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
            isOpen 
              ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-emerald-600/20' 
              : 'bg-gradient-to-tr from-rose-600 to-red-500 text-white shadow-rose-600/20'
          }`}>
            {isOpen ? <Unlock size={28} /> : <Lock size={28} />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black ${
                isOpen 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-rose-100 text-rose-800 border border-rose-200'
              }`}>
                <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {isOpen ? 'منصة الأسقفية مفتوحة (false)' : 'منصة الأسقفية مغلقة (true)'}
              </span>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                <Radio size={10} className={isOpen ? 'text-emerald-600 animate-pulse' : 'text-slate-400'} /> 
                مزامنة فورية (Realtime Active)
              </span>

              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                <Sparkles size={10} /> row id: 1
              </span>
            </div>

            <h3 className="text-lg md:text-xl font-black text-slate-800">
              {title}
            </h3>
            <p className="text-xs md:text-sm text-slate-500 font-bold mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Master Toggle Action Switch */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
          <button
            id="btn-toggle-bishopric-exam-master"
            type="button"
            disabled={isUpdating || isLoading}
            onClick={() => handleToggle(!isOpen)}
            className={`px-6 py-3.5 rounded-2xl font-black text-sm text-white transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95 cursor-pointer disabled:opacity-50 ${
              isOpen
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
            }`}
          >
            {isUpdating ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <Power size={18} />
            )}
            <span>{isOpen ? 'إغلاق منصة امتحانات الأسقفية 🔒' : 'فتح وتفعيل منصة امتحانات الأسقفية ✅'}</span>
          </button>

          <button
            type="button"
            onClick={loadState}
            disabled={isLoading || isUpdating}
            title="إعادة فحص الحالة المباشرة من قاعدة البيانات"
            className="p-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl transition-all cursor-pointer shadow-sm flex items-center justify-center disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin text-indigo-600' : ''} />
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div className={`p-3.5 rounded-2xl mb-4 flex items-center gap-2.5 text-xs font-black transition-all ${
          feedback.type === 'success' ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' :
          feedback.type === 'error' ? 'bg-rose-100 text-rose-900 border border-rose-200' :
          'bg-indigo-100 text-indigo-900 border border-indigo-200'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-700 shrink-0" /> :
           feedback.type === 'error' ? <AlertTriangle size={16} className="text-rose-700 shrink-0" /> :
           <Sparkles size={16} className="text-indigo-700 shrink-0" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* State details footer */}
      <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-bold gap-3">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={12} className="text-slate-400" />
            <span>آخر تحديث لقاعدة البيانات:</span>
            <strong className="text-slate-700 font-mono">
              {platformState.updatedAt ? new Date(platformState.updatedAt).toLocaleString('ar-EG') : 'غير محدد'}
            </strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            حقل الجدول: <code className="px-1.5 py-0.5 bg-slate-100 rounded text-indigo-700 font-mono font-bold">is_bishopric_exam_disabled = {String(platformState.isBishopricExamDisabled)}</code>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className={isOpen ? 'text-emerald-700 font-black' : 'text-rose-700 font-black'}>
            {isOpen ? 'بوابة امتحانات الأسقفية متاحة لدخول الطلاب' : 'بوابة امتحانات الأسقفية مغلقة ومحظورة'}
          </span>
        </div>
      </div>
    </div>
  );
};
