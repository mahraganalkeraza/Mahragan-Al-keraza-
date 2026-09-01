import React, { useState } from 'react';
import { 
  Globe, 
  Copy, 
  Check, 
  ExternalLink, 
  Sparkles, 
  Link2, 
  ShieldCheck
} from 'lucide-react';
import { useNotificationBubble } from '../context/NotificationContext';

export const PUBLIC_PORTAL_URL = 'https://mahraganalkeraza.github.io/Mahragan-Al-keraza-/#/bishopric-exam';
export const PUBLIC_BASE_URL = 'https://mahraganalkeraza.github.io/Mahragan-Al-keraza-/';
export const BISHOPRIC_EXAM_PUBLIC_URL = PUBLIC_PORTAL_URL;

interface BishopricPortalLinkShareProps {
  className?: string;
}

export const BishopricPortalLinkShare: React.FC<BishopricPortalLinkShareProps> = ({
  className = ''
}) => {
  const { showBubble } = useNotificationBubble();
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(PUBLIC_PORTAL_URL);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = PUBLIC_PORTAL_URL;
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
        message: 'تم نسخ رابط منصة الأسقفية المباشر بنجاح!'
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
              🔗 رابط منصة امتحانات الأسقفية المباشر (للمتسابقين والخدام)
            </h3>
          </div>
        </div>
      </div>

      <p className="text-xs md:text-sm text-slate-600 font-bold mb-4 leading-relaxed">
        هذا الرابط <strong>عام ومباشر ومتاح للجميع بدون أي كلمة سر أو تسجيل دخول أو إعادة توجيه</strong>. يدخل المتسابق مباشرة ويكتب <strong>كود الامتحان الخاص به</strong> لبدء الاختبار المركزي.
      </p>

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5" dir="ltr">
        {/* Copy Button */}
        <button
          id="btn-copy-bishopric-portal-url"
          type="button"
          onClick={handleCopyLink}
          className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm shadow-indigo-600/20 whitespace-nowrap cursor-pointer text-sm"
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
            value={PUBLIC_PORTAL_URL}
            onFocus={(e) => e.target.select()}
            className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs md:text-sm text-slate-700 font-mono text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner select-all font-bold"
          />
          <Globe size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Test / Open Link Button */}
        <a
          id="link-open-bishopric-portal"
          href={PUBLIC_PORTAL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-black px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer text-sm shadow-xs"
        >
          <ExternalLink size={16} className="text-indigo-600" />
          <span>تجربة الرابط</span>
        </a>
      </div>

      <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] text-slate-500 font-bold gap-1">
        <span>
          بوابة مفتوحة ومستقلة: يتم التحقق والامتحان بكود المتسابق فقط دون طلب تسجيل دخول أو تداخل مع لوحات التحكم.
        </span>
        <span className="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
          {PUBLIC_PORTAL_URL}
        </span>
      </div>
    </div>
  );
};
