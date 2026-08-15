import React, { useState, useEffect } from 'react';
import { ChurchQualificationFeesCard } from './ChurchQualificationFeesCard';
import { ChurchBishopricExamCodesView } from './ChurchBishopricExamCodesView';
import { 
  BookOpen, 
  QrCode, 
  RefreshCw,
  Receipt,
  Globe
} from 'lucide-react';

interface ChurchOnlineExamsViewProps {
  churchName: string;
  onOpenPortal?: () => void;
  allParticipants?: any[];
}

export const ChurchOnlineExamsView: React.FC<ChurchOnlineExamsViewProps> = ({
  churchName,
  onOpenPortal
}) => {
  const [activeTab, setActiveTab] = useState<'church_subscriptions' | 'bishopric_codes'>('church_subscriptions');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="space-y-8 font-arabic text-right" dir="rtl">
      {/* Header Banner */}
      <div className="bg-gradient-to-l from-indigo-900 via-indigo-800 to-indigo-950 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
              <BookOpen className="text-indigo-300" size={32} />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/30 text-indigo-200 rounded-full text-xs font-bold mb-2 border border-indigo-400/30">
                <QrCode size={14} /> بوابة امتحانات واشتراكات الأونلاين
              </div>
              <h3 className="text-2xl font-black">امتحانات الأونلاين واشتراكات الكنيسة</h3>
              <p className="text-indigo-200/80 text-sm font-bold mt-1">
                كنيسة: {churchName || 'غير محددة'} • إدارة اشتراكات الكنائس وكشوف أكواد امتحانات الأسقفية
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onOpenPortal && (
              <button
                onClick={onOpenPortal}
                className="px-6 py-3.5 bg-white text-indigo-950 rounded-2xl text-sm font-black flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
              >
                <QrCode size={18} className="text-indigo-600" />
                بدء دخول الامتحان الإلكتروني (QR)
              </button>
            )}
            <button
              onClick={() => {
                setRefreshTrigger(prev => prev + 1);
              }}
              className="p-3.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all cursor-pointer border border-white/10"
              title="تحديث البيانات"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
        {/* Sub-Tab 1: اشتراكات الكنائس */}
        <button
          onClick={() => setActiveTab('church_subscriptions')}
          className={`px-6 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'church_subscriptions'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Receipt size={18} />
          <span>اشتراكات الكنائس</span>
        </button>

        {/* Sub-Tab 2: أكواد أونلاين الأسقفية */}
        <button
          onClick={() => setActiveTab('bishopric_codes')}
          className={`px-6 py-3.5 rounded-2xl font-black text-sm transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'bishopric_codes'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Globe size={18} />
          <span>أكواد أونلاين الأسقفية</span>
        </button>
      </div>

      {/* Content Section */}
      {activeTab === 'church_subscriptions' && (
        <div className="transition-all animate-fade-in">
          <ChurchQualificationFeesCard 
            churchName={churchName} 
            refreshTrigger={refreshTrigger} 
          />
        </div>
      )}

      {activeTab === 'bishopric_codes' && (
        <div className="transition-all animate-fade-in">
          <ChurchBishopricExamCodesView churchName={churchName} />
        </div>
      )}
    </div>
  );
};
