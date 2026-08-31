import React from 'react';
import { BishopricStudentExamEngine } from './BishopricStudentExamEngine';
import logo from '../by-logo.jpeg';
import { Sparkles, ShieldCheck, ArrowRight, Home } from 'lucide-react';

interface PublicBishopricExamPortalProps {
  onClose?: () => void;
}

export const PublicBishopricExamPortal: React.FC<PublicBishopricExamPortalProps> = ({
  onClose
}) => {
  const handleExit = () => {
    if (onClose) {
      onClose();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div 
      id="public-bishopric-exam-portal"
      className="min-h-screen w-full bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 flex flex-col justify-between font-arabic relative overflow-x-hidden selection:bg-indigo-500 selection:text-white"
      dir="rtl"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 sticky top-0 z-50 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3.5">
          <img 
            src={logo} 
            alt="شعار المهرجان" 
            className="w-10 h-10 rounded-xl object-cover border border-white/20 shadow-sm"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-black text-white">
                منصة امتحانات الأسقفية المركزية 2026
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Sparkles size={10} /> أونلاين
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-bold hidden sm:block">
              أسقفية الشباب • مهرجان الكرازة المرقسية
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
            <ShieldCheck size={14} />
            <span>بوابة الطلاب العامة (Public Portal)</span>
          </div>

          <button
            type="button"
            onClick={handleExit}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-sm"
          >
            <Home size={14} />
            <span className="hidden sm:inline">الرئيسية</span>
          </button>
        </div>
      </header>

      {/* Main Content Area: Public Exam Engine */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 w-full max-w-5xl mx-auto relative z-10">
        <div className="w-full">
          <BishopricStudentExamEngine 
            onClose={handleExit}
            onComplete={() => {}}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 px-6 text-center text-xs text-slate-500 font-bold border-t border-slate-800/60 bg-slate-950/60">
        <span>الدخول متاح لجميع المتسابقين الحاصلين على كود الامتحان المركزي • أسقفية الشباب 2026</span>
      </footer>
    </div>
  );
};
