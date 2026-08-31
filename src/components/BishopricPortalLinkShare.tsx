import React, { useState, useEffect, useMemo } from 'react';
import { 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Link2, 
  Building2,
  ShieldCheck,
  GraduationCap,
  Users,
  Key
} from 'lucide-react';
import { useNotificationBubble } from '../context/NotificationContext';
import { fetchAllBishopricRecordsFromDb } from '../utils/bishopricExamStorage';

export const PUBLIC_BASE_URL = 'https://mahraganalkeraza.github.io/Mahragan-Al-keraza-/';
export const BISHOPRIC_EXAM_PUBLIC_URL = 'https://mahraganalkeraza.github.io/Mahragan-Al-keraza-/?view=bishopric-exam';

interface BishopricPortalLinkShareProps {
  customPortalUrl?: string;
  className?: string;
}

export const BishopricPortalLinkShare: React.FC<BishopricPortalLinkShareProps> = ({
  customPortalUrl,
  className = ''
}) => {
  const { showBubble } = useNotificationBubble();
  const [copied, setCopied] = useState(false);
  const [linkType, setLinkType] = useState<'public_student' | 'church_servants'>('public_student');
  const [selectedChurch, setSelectedChurch] = useState<string>('');
  const [availableChurches, setAvailableChurches] = useState<string[]>([]);
  const [isLoadingChurches, setIsLoadingChurches] = useState(false);

  // Fetch unique church names from bishopric records to populate the selector
  useEffect(() => {
    const loadChurches = async () => {
      setIsLoadingChurches(true);
      try {
        const records = await fetchAllBishopricRecordsFromDb();
        const churchSet = new Set<string>();
        records.forEach(r => {
          if (r.church_name && r.church_name.trim() && r.church_name.trim() !== '-') {
            churchSet.add(r.church_name.trim());
          }
        });
        setAvailableChurches(Array.from(churchSet).sort());
      } catch (err) {
        console.warn('Could not load church list for portal link share:', err);
      } finally {
        setIsLoadingChurches(false);
      }
    };
    loadChurches();
  }, []);

  // Compute dynamic Portal URL pointing to the Public Production URL on GitHub Pages
  const portalUrl = useMemo(() => {
    if (customPortalUrl && customPortalUrl.trim() && customPortalUrl !== 'https://') {
      return customPortalUrl.trim();
    }
    
    // Construct base link pointing directly to GitHub Pages production deployment with ?view=bishopric-exam
    const basePublicUrl = `${PUBLIC_BASE_URL}?view=bishopric-exam`;
    if (selectedChurch && selectedChurch.trim()) {
      return `${basePublicUrl}&church=${encodeURIComponent(selectedChurch.trim())}`;
    }
    return basePublicUrl;
  }, [customPortalUrl, selectedChurch]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(portalUrl);
      } else {
        // Fallback for non-secure contexts or embedded iframes
        const textArea = document.createElement('textarea');
        textArea.value = portalUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 3000);

      showBubble({
        type: 'success',
        title: 'تم النسخ',
        message: 'تم نسخ رابط منصة امتحانات الأسقفية بنجاح!'
      });
    } catch (err) {
      console.error('Copy failed:', err);
      showBubble({
        type: 'error',
        title: 'خطأ',
        message: 'تعذر نسخ الرابط تلقائيًا، يرجى نسخه يدويًا من الحقل أدناه.'
      });
    }
  };

  return (
    <div 
      id="bishopric-portal-link-share-card"
      className={`p-6 bg-gradient-to-br from-white via-indigo-50/50 to-blue-50/30 rounded-3xl border border-indigo-100 shadow-sm transition-all text-right font-arabic my-4 ${className}`}
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <Link2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                <ShieldCheck size={11} /> رابط عام ومباشر (Public Route)
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-700">
                <Sparkles size={11} /> امتحانات الأسقفية 2026
              </span>
            </div>
            <h3 className="text-base md:text-lg font-black text-slate-800 mt-1">
              🔗 رابط منصة امتحانات الأسقفية المركزية 2026 (للمتسابقين والخدام)
            </h3>
          </div>
        </div>

        {/* Link Type Selector Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold w-full sm:w-auto justify-center">
          <button
            type="button"
            onClick={() => setLinkType('public_student')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              linkType === 'public_student'
                ? 'bg-white text-indigo-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GraduationCap size={15} className="text-indigo-600" />
            <span>رابط الطلاب (عام بدون تسجيل)</span>
          </button>
          <button
            type="button"
            onClick={() => setLinkType('church_servants')}
            className={`px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
              linkType === 'church_servants'
                ? 'bg-white text-indigo-900 shadow-sm font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users size={15} className="text-blue-600" />
            <span>صفحة الكنيسة (للخدام)</span>
          </button>
        </div>
      </div>

      <p className="text-xs md:text-sm text-slate-600 font-bold mb-4 leading-relaxed">
        {linkType === 'public_student' ? (
          <span>
            هذا الرابط <strong>عام ومتاح للجميع بدون أي كلمة سر أو تسجيل دخول</strong>. يدخل الطالب مباشرة ويكتب <strong>كود الامتحان الخاص به</strong> لبدء الاختبار المركزي.
          </span>
        ) : (
          <span>
            يوجه الخدام ومسؤولي الكنائس إلى <strong>صفحة الكنيسة</strong> مباشرة مع تفعيل تبويب <strong>امتحانات الأسقفية المركزية أونلاين</strong> لمتابعة الأكواد والاشتراكات.
          </span>
        )}
      </p>

      {/* Church Selector (Optional Church-specific filter) */}
      <div className="mb-4 bg-white/90 p-3.5 rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-black text-slate-700 whitespace-nowrap">
          <Building2 size={16} className="text-indigo-600" />
          <span>تخصيص الرابط لكنيسة محددة:</span>
        </div>
        <div className="relative flex-1">
          <select
            id="select-church-portal-link"
            value={selectedChurch}
            onChange={(e) => setSelectedChurch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- رابط عام لجميع الكنائس (General Public Route) --</option>
            {availableChurches.map((church) => (
              <option key={church} value={church}>
                {church}
              </option>
            ))}
          </select>
        </div>
        {selectedChurch && (
          <button
            type="button"
            onClick={() => setSelectedChurch('')}
            className="text-[11px] font-bold text-slate-500 hover:text-red-600 px-2.5 py-1.5 bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            إلغاء التخصيص
          </button>
        )}
      </div>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5" dir="ltr">
        {/* Copy Button */}
        <button
          id="btn-copy-bishopric-portal-url"
          type="button"
          onClick={handleCopyLink}
          className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-blue-600/20 whitespace-nowrap cursor-pointer text-sm"
        >
          {copied ? (
            <>
              <Check size={16} className="text-emerald-300" />
              <span>تم النسخ!</span>
            </>
          ) : (
            <>
              <Copy size={16} />
              <span>نسخ الرابط</span>
            </>
          )}
        </button>

        {/* Read-Only Input Field */}
        <div className="relative flex-1">
          <input
            id="input-bishopric-portal-url"
            type="text"
            readOnly
            value={portalUrl}
            onFocus={(e) => e.target.select()}
            className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs md:text-sm text-gray-700 font-mono text-left focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner select-all font-semibold"
          />
          <Globe size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Open / Test Link Button */}
        <a
          id="link-open-bishopric-portal"
          href={portalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-700 font-bold px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer text-sm"
        >
          <ExternalLink size={16} className="text-blue-600" />
          <span>فتح</span>
        </a>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-500 font-bold gap-1">
        <span className="flex items-center gap-1">
          <Key size={13} className="text-indigo-600" />
          {linkType === 'public_student' 
            ? 'بوابة مفتوحة للعامة: يتم التحقق والامتحان بكود المتسابق فقط دون طلب تسجيل دخول.'
            : 'يوجه المستخدم تلقائياً إلى صفحة الكنيسة مع تفعيل تبويب امتحانات الأسقفية المركزية أونلاين.'}
        </span>
        <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
          Public URL: {PUBLIC_BASE_URL}?view=bishopric-exam
        </span>
      </div>
    </div>
  );
};
