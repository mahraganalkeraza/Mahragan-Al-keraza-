import React, { useState, useEffect } from 'react';
import { ChurchQualificationFeesCard } from './ChurchQualificationFeesCard';
import { ChurchBishopricExamCodesView } from './ChurchBishopricExamCodesView';
import { 
  BookOpen, 
  QrCode, 
  Receipt,
  Globe,
  Building2
} from 'lucide-react';
import { fetchAllBishopricRecordsFromDb } from '../utils/bishopricExamStorage';

interface ChurchOnlineExamsViewProps {
  churchName: string;
  onOpenPortal?: () => void;
  allParticipants?: any[];
}

export const ChurchOnlineExamsView: React.FC<ChurchOnlineExamsViewProps> = ({
  churchName: propChurchName,
  onOpenPortal
}) => {
  // Determine active sub-tab from URL parameter (e.g. ?tab=bishopric-online)
  const [activeTab, setActiveTab] = useState<'church_subscriptions' | 'bishopric_codes'>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const path = window.location.pathname || '';
      if (
        search.includes('tab=bishopric-online') ||
        search.includes('tab=bishopric_online') ||
        search.includes('tab=bishopric_codes') ||
        search.includes('tab=bishopric') ||
        hash.includes('tab=bishopric') ||
        path.includes('/church/bishopric-online-exams') ||
        path.includes('/church-page/bishopric-online')
      ) {
        return 'bishopric_codes';
      }
    }
    return 'church_subscriptions';
  });

  const [activeChurchName, setActiveChurchName] = useState<string>(() => {
    if (propChurchName && propChurchName.trim()) return propChurchName.trim();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlChurch = params.get('church');
      if (urlChurch) return decodeURIComponent(urlChurch);
      if (window.location.hash.includes('church=')) {
        const hashQuery = window.location.hash.split('?')[1] || '';
        const hashParams = new URLSearchParams(hashQuery);
        const hashChurch = hashParams.get('church');
        if (hashChurch) return decodeURIComponent(hashChurch);
      }
    }
    return '';
  });

  const [allChurches, setAllChurches] = useState<string[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Synchronize when prop changes
  useEffect(() => {
    if (propChurchName && propChurchName.trim()) {
      setActiveChurchName(propChurchName.trim());
    }
  }, [propChurchName]);

  // Listen to popstate/hashchange for dynamic deep linking
  useEffect(() => {
    const handleUrlState = () => {
      const search = window.location.search || '';
      const hash = window.location.hash || '';
      const path = window.location.pathname || '';

      if (
        search.includes('tab=bishopric-online') ||
        search.includes('tab=bishopric_online') ||
        search.includes('tab=bishopric_codes') ||
        search.includes('tab=bishopric') ||
        hash.includes('tab=bishopric') ||
        path.includes('/church/bishopric-online-exams') ||
        path.includes('/church-page/bishopric-online')
      ) {
        setActiveTab('bishopric_codes');
      }

      const params = new URLSearchParams(search);
      const churchFromQuery = params.get('church');
      if (churchFromQuery) {
        setActiveChurchName(decodeURIComponent(churchFromQuery));
      }
    };

    window.addEventListener('popstate', handleUrlState);
    window.addEventListener('hashchange', handleUrlState);
    return () => {
      window.removeEventListener('popstate', handleUrlState);
      window.removeEventListener('hashchange', handleUrlState);
    };
  }, []);

  // Fetch available churches if church name is not set
  useEffect(() => {
    if (!activeChurchName) {
      fetchAllBishopricRecordsFromDb()
        .then(records => {
          const list = Array.from(new Set(records.map(r => r.church_name).filter(Boolean))).sort();
          setAllChurches(list);
          if (list.length > 0 && !activeChurchName) {
            setActiveChurchName(list[0]);
          }
        })
        .catch(err => console.warn('Could not load churches for ChurchOnlineExamsView:', err));
    }
  }, [activeChurchName]);

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
                <QrCode size={14} /> امتحانات واشتراكات الأونلاين
              </div>
              <h3 className="text-2xl font-black">امتحانات الأسقفية واشتراكات الكنيسة</h3>
              <p className="text-indigo-200/80 text-sm font-bold mt-1">
                كنيسة: {activeChurchName || 'غير محددة'} • اشتراكات الكنائس وأكواد امتحانات الأسقفية
              </p>
            </div>
          </div>
          {onOpenPortal && (
            <button
              onClick={onOpenPortal}
              className="px-6 py-3.5 bg-white text-indigo-900 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <BookOpen size={18} />
              <span>دخول بوابة الامتحانات</span>
            </button>
          )}
        </div>
      </div>

      {/* Church Selector Bar if multiple churches are available or user is exploring */}
      {allChurches.length > 1 && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-black text-slate-700">
            <Building2 size={16} className="text-indigo-600" />
            <span>عرض بيانات وأكواد كنيسة:</span>
          </div>
          <div className="flex-1 max-w-md">
            <select
              value={activeChurchName}
              onChange={(e) => setActiveChurchName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {allChurches.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

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
            churchName={activeChurchName} 
            refreshTrigger={refreshTrigger} 
          />
        </div>
      )}

      {activeTab === 'bishopric_codes' && (
        <div className="transition-all animate-fade-in">
          <ChurchBishopricExamCodesView churchName={activeChurchName} />
        </div>
      )}
    </div>
  );
};
